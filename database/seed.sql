-- ============================================================================
-- Migration: เพิ่ม role 'user' + line_user_id ใน profiles
-- ============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'staff', 'user'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_line_user ON profiles(line_user_id);

-- ============================================================================
-- Seed: Admin Account + Demo Data
-- ============================================================================
INSERT INTO tenants (id, name, slug) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', '101 แบดมินตัน', '101-badminton')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  confirmation_sent_at, created_at, updated_at,
  is_super_admin, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd5e6f7a8-b9c0-1234-5678-9abcdef01234',
  'authenticated', 'authenticated',
  'admin@101badminton.com',
  crypt('admin123', gen_salt('bf')),
  now(), now(), now(), now(),
  false,
  '{"display_name":"Admin","phone":"0888888888"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, tenant_id, role, display_name, phone) VALUES
  ('d5e6f7a8-b9c0-1234-5678-9abcdef01234', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'owner', 'Admin', '0888888888')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courts (tenant_id, name, hourly_rate) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท A', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท B', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท C', 100),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'คอร์ท D', 100);

INSERT INTO member_tiers (tenant_id, name, min_points, discount_rate, color) VALUES
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Bronze', 0, 0, '#CD7F32'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Silver', 100, 5, '#C0C0C0'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Gold', 500, 10, '#FFD700'),
  ('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Platinum', 2000, 15, '#E5E4E2');
