-- ============================================================================
-- Seed: Admin Account + Demo Data
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================================

-- เพิ่ม pgcrypto สำหรับ hash password
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. สร้าง TENANT
-- ============================================================================
INSERT INTO tenants (id, name, slug) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', '101 แบดมินตัน', '101-badminton')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. สร้าง AUTH USER (email/password)
-- ถ้าใช้ Supabase Dashboard ให้ใช้วิธี: Authentication → Users → Add User
-- แล้วข้ามส่วนนี้ ไปใช้ UUID ที่ได้มาแทน
-- ============================================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  confirmation_sent_at, created_at, updated_at,
  is_super_admin, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd5e6f7a8-b9c0-1234-5678-9abcdef01234',
  'authenticated',
  'authenticated',
  'admin@101badminton.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  false,
  '{"display_name":"Admin","phone":"0888888888"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 3. สร้าง PROFILE (role = owner)
-- ============================================================================
INSERT INTO profiles (id, tenant_id, role, display_name, phone) VALUES
  ('d5e6f7a8-b9c0-1234-5678-9abcdef01234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'owner', 'Admin', '0888888888')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. สร้าง WALLET + balance เริ่มต้น
-- ============================================================================
INSERT INTO wallets (user_id, tenant_id, balance) VALUES
  ('d5e6f7a8-b9c0-1234-5678-9abcdef01234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 10000.00)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================================
-- 5. สร้าง COURTS 4 คอร์ท
-- ============================================================================
INSERT INTO courts (tenant_id, name, hourly_rate) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท A', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท B', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท C', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท D', 100);

-- ============================================================================
-- 6. สร้าง MEMBER TIERS
-- ============================================================================
INSERT INTO member_tiers (tenant_id, name, min_points, discount_rate, color) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Bronze', 0, 0, '#CD7F32'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Silver', 100, 5, '#C0C0C0'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Gold', 500, 10, '#FFD700'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Platinum', 2000, 15, '#E5E4E2');

-- ============================================================================
-- ตรวจสอบผลลัพธ์
-- ============================================================================
SELECT '✅ Tenant:' as check, id, name, slug FROM tenants WHERE slug = '101-badminton'
UNION ALL
SELECT '✅ Auth User:', id, email, '' FROM auth.users WHERE email = 'admin@101badminton.com'
UNION ALL
SELECT '✅ Profile:', p.id, p.display_name, p.role FROM profiles p JOIN tenants t ON p.tenant_id = t.id WHERE t.slug = '101-badminton'
UNION ALL
SELECT '✅ Wallet:', w.id::text, 'Balance: ' || w.balance::text, '' FROM wallets w JOIN tenants t ON w.tenant_id = t.id WHERE t.slug = '101-badminton'
UNION ALL
SELECT '✅ Courts:', c.id::text, c.name, '' FROM courts c JOIN tenants t ON c.tenant_id = t.id WHERE t.slug = '101-badminton'
UNION ALL
SELECT '✅ Member Tiers:', mt.id::text, mt.name, '' FROM member_tiers mt JOIN tenants t ON mt.tenant_id = t.id WHERE t.slug = '101-badminton';
