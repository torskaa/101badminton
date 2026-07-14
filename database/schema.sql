-- ============================================================================
-- Badminton Booking SaaS — Multi-Tenant Database Schema
-- Core Philosophy: ทุกข้อมูลต้องผูกกับ tenant_id เสมอ
-- RLS: ทุกตารางมีนโยบายป้องกันการเข้าถึงข้าม Tenant อย่างเคร่งครัด
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- ใช้สำหรับ EXCLUDE (prevent overlap booking)

-- ============================================================================
-- 1. TENANTS — เจ้าของสนาม / Venue
-- ============================================================================
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. PROFILES — ผู้ใช้ในระบบ (ผูกกับ auth.users และ tenant)
-- ============================================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('owner', 'admin', 'staff')),
  display_name  TEXT NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UTILITY FUNCTION: ดึง tenant_id ของผู้ใช้ที่ล็อกอินอยู่
-- ใช้ใน RLS policies เพื่อลดโค้ดซ้ำและป้องกัน logic พลาด
-- ต้องสร้างหลัง profiles table (LANGUAGE plpgsql validates at runtime)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid());
END;
$$;

-- RLS Policies สำหรับ tenants
CREATE POLICY tenant_isolation_select ON tenants
  FOR SELECT
  USING (id = get_user_tenant_id());

CREATE POLICY tenant_isolation_insert ON tenants
  FOR INSERT
  WITH CHECK (true);  -- registration ต้องเปิดให้ insert ได้

-- RLS Policies สำหรับ profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND tenant_id = get_user_tenant_id()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 3. COURTS — สนามแบดมินตันแต่ละคอร์ท
-- ============================================================================
CREATE TABLE courts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 100, -- ราคาต่อชั่วโมง (หน่วย: แต้ม)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_courts_tenant ON courts(tenant_id);

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

-- SELECT: เห็นเฉพาะคอร์ทใน tenant ของตัวเอง
CREATE POLICY courts_select ON courts
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- INSERT: เฉพาะ admin/owner ของ tenant นั้น
CREATE POLICY courts_insert ON courts
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND tenant_id = get_user_tenant_id()
        AND role IN ('owner', 'admin')
    )
  );

-- UPDATE: เฉพาะ admin/owner
CREATE POLICY courts_update ON courts
  FOR UPDATE
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- DELETE: เฉพาะ admin/owner
CREATE POLICY courts_delete ON courts
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND tenant_id = get_user_tenant_id()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 4. BOOKINGS — ตารางการจอง (หัวใจของระบบ)
-- ============================================================================
CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  court_id    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'confirmed'
              CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ป้องกันการจองซ้อนช่วงเวลาในคอร์ทเดียวกัน (Concurrency Control)
  CONSTRAINT no_overlap_booking
    EXCLUDE USING gist (
      court_id WITH =,
      tstzrange(start_time, end_time) WITH &&
    ),

  -- ตรวจสอบว่า เวลาเลิกต้องหลังเวลาเริ่ม
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_bookings_tenant     ON bookings(tenant_id);
CREATE INDEX idx_bookings_court      ON bookings(court_id);
CREATE INDEX idx_bookings_user       ON bookings(user_id);
CREATE INDEX idx_bookings_time_range ON bookings USING gist (tstzrange(start_time, end_time));

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- SELECT: เห็นเฉพาะการจองใน tenant ของตัวเอง
CREATE POLICY bookings_select ON bookings
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- INSERT: จองได้เฉพาะใน tenant ของตัวเอง
CREATE POLICY bookings_insert ON bookings
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

-- UPDATE: เฉพาะ user ที่จอง หรือ admin/owner ของ tenant
CREATE POLICY bookings_update ON bookings
  FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND tenant_id = get_user_tenant_id()
          AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id());

-- DELETE: เฉพาะ admin/owner หรือ user ที่เป็นเจ้าของการจอง
CREATE POLICY bookings_delete ON bookings
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND tenant_id = get_user_tenant_id()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- 5. MEMBERS — ระบบสมาชิก
-- ============================================================================
CREATE TABLE members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  line_user_id  TEXT,
  total_hours   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_spent   NUMERIC(10,2) NOT NULL DEFAULT 0,
  tier_id       UUID REFERENCES member_tiers(id) ON DELETE SET NULL,
  points        INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_members_tenant ON members(tenant_id);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_select ON members FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY members_insert ON members FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY members_update ON members FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY members_delete ON members FOR DELETE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 6. MEMBER_PACKAGES — แพ็กเกจชั่วโมงของสมาชิก
-- ============================================================================
CREATE TABLE member_packages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hours_total   NUMERIC(10,2) NOT NULL,
  hours_used    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price         NUMERIC(10,2) NOT NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_packages_tenant ON member_packages(tenant_id);

ALTER TABLE member_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY mp_select ON member_packages FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY mp_insert ON member_packages FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY mp_update ON member_packages FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 7. CHECK_INS — ประวัติ Check-in / Check-out
-- ============================================================================
CREATE TABLE check_ins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  court_id      UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  check_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_at  TIMESTAMPTZ,
  light_on      BOOLEAN NOT NULL DEFAULT FALSE,
  duration_min  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_check_ins_tenant ON check_ins(tenant_id);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_select ON check_ins FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY ci_insert ON check_ins FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY ci_update ON check_ins FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 8. POS_ITEMS — รายการสินค้า Mini Bar
-- ============================================================================
CREATE TABLE pos_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  cost          NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'other',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_items_tenant ON pos_items(tenant_id);

ALTER TABLE pos_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_select ON pos_items FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY pi_insert ON pos_items FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY pi_update ON pos_items FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY pi_delete ON pos_items FOR DELETE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 9. POS_ORDERS — ออเดอร์จาก Mini Bar
-- ============================================================================
CREATE TABLE pos_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  customer_name TEXT,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash'
                CHECK (payment_method IN ('cash', 'qr_promptpay', 'card', 'membership')),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_orders_tenant ON pos_orders(tenant_id);

ALTER TABLE pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY po_select ON pos_orders FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY po_insert ON pos_orders FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 10. POS_ORDER_ITEMS — รายการสินค้าในออเดอร์
-- ============================================================================
CREATE TABLE pos_order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES pos_items(id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(10,2) NOT NULL,
  line_total    NUMERIC(10,2) NOT NULL
);

ALTER TABLE pos_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY poi_select ON pos_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM pos_orders o WHERE o.id = order_id AND o.tenant_id = get_user_tenant_id())
);
CREATE POLICY poi_insert ON pos_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pos_orders o WHERE o.id = order_id AND o.tenant_id = get_user_tenant_id())
);

-- ============================================================================
-- 11. LIGHT_CONTROL_LOGS — ประวัติการเปิด-ปิดไฟ
-- ============================================================================
CREATE TABLE light_control_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  court_id      UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('on', 'off')),
  triggered_by  UUID REFERENCES auth.users(id),
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'checkin', 'schedule', 'iot')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_light_logs_tenant ON light_control_logs(tenant_id);

ALTER TABLE light_control_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ll_select ON light_control_logs FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY ll_insert ON light_control_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- TRIGGER: อัปเดต updated_at อัตโนมัติ
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pos_items_updated_at
  BEFORE UPDATE ON pos_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. MEMBER_POINTS — ประวัติแต้มสะสมของสมาชิก
-- ============================================================================
CREATE TABLE member_points (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  points        INTEGER NOT NULL,
  reason        TEXT NOT NULL, -- e.g. 'booking', 'pos_purchase', 'redeem', 'bonus'
  reference_id  UUID, -- booking_id, pos_order_id, etc.
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_points_member ON member_points(member_id);
CREATE INDEX idx_member_points_tenant ON member_points(tenant_id);

ALTER TABLE member_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY mp_select ON member_points FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY mp_insert ON member_points FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 13. COUPONS — คูปองส่วนลด (กำหนดโดย admin)
-- ============================================================================
CREATE TABLE coupons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  description   TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_spend     NUMERIC(10,2) DEFAULT 0,
  max_uses      INTEGER DEFAULT NULL,
  used_count    INTEGER NOT NULL DEFAULT 0,
  points_cost   INTEGER DEFAULT NULL, -- ต้องใช้กี่แต้มถึงจะแลกได้ (null = ไม่ต้องใช้แต้ม)
  starts_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY c_select ON coupons FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY c_insert ON coupons FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY c_update ON coupons FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY c_delete ON coupons FOR DELETE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 14. REDEEMED_COUPONS — ประวัติการใช้คูปองของสมาชิก
-- ============================================================================
CREATE TABLE redeemed_coupons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id     UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES pos_orders(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redeemed_coupons_tenant ON redeemed_coupons(tenant_id);
CREATE INDEX idx_redeemed_coupons_member ON redeemed_coupons(member_id);

ALTER TABLE redeemed_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY rc_select ON redeemed_coupons FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY rc_insert ON redeemed_coupons FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 15. MEMBER_TIERS — ระดับสมาชิก
-- ============================================================================
CREATE TABLE member_tiers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL, -- Bronze, Silver, Gold, Platinum
  min_points    INTEGER NOT NULL DEFAULT 0,
  discount_rate NUMERIC(5,2) DEFAULT 0, -- percent
  color         TEXT DEFAULT '#CD7F32', -- hex color
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO member_tiers (tenant_id, name, min_points, discount_rate, color) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Bronze', 0, 0, '#CD7F32'),
  ('00000000-0000-0000-0000-000000000000', 'Silver', 100, 5, '#C0C0C0'),
  ('00000000-0000-0000-0000-000000000000', 'Gold', 500, 10, '#FFD700'),
  ('00000000-0000-0000-0000-000000000000', 'Platinum', 2000, 15, '#E5E4E2');

ALTER TABLE member_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY mt_select ON member_tiers FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY mt_insert ON member_tiers FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY mt_update ON member_tiers FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 16. WALLETS — กระเป๋าเงินแต้มของผู้ใช้
-- ============================================================================
CREATE TABLE wallets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_tenant ON wallets(tenant_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallets_select ON wallets FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY wallets_insert ON wallets FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY wallets_update ON wallets FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 17. WALLET_TRANSACTIONS — ประวัติการเคลื่อนไหวของแต้ม
-- ============================================================================
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount          NUMERIC(10,2) NOT NULL,
  balance_before  NUMERIC(10,2) NOT NULL,
  balance_after   NUMERIC(10,2) NOT NULL,
  reason          TEXT NOT NULL, -- 'topup', 'booking', 'booking_cancel', 'refund', 'bonus'
  reference_type  TEXT, -- 'booking', 'topup_request'
  reference_id    UUID,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_tenant ON wallet_transactions(tenant_id);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_select ON wallet_transactions FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY wt_insert ON wallet_transactions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================================================
-- 18. TOPUP_REQUESTS — คำขอเติมเงิน
-- ============================================================================
CREATE TABLE topup_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  slip_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by  UUID REFERENCES auth.users(id),
  confirmed_at  TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topup_tenant ON topup_requests(tenant_id);
CREATE INDEX idx_topup_status ON topup_requests(status);

ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tr_select ON topup_requests FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY tr_insert ON topup_requests FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY tr_update ON topup_requests FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- Trigger for wallets
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
