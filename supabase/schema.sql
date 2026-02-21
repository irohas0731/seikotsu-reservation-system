-- =============================================================================
-- 整骨院予約システム - Complete Database Schema
-- =============================================================================
-- PostgreSQL schema for Supabase.
-- Includes: tables, enums, indexes, constraints, RLS policies, seed data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 2. Custom ENUM Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('reserved', 'visited', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE line_notification_type AS ENUM ('confirm', 'remind', 'cancel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'staff', 'practitioner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

-- 患者テーブル
CREATE TABLE IF NOT EXISTS patients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  birth_date    DATE,
  pin_code      CHAR(4) NOT NULL,
  line_user_id  TEXT,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT patients_phone_format CHECK (phone ~ '^\d{10,11}$'),
  CONSTRAINT patients_pin_format  CHECK (pin_code ~ '^\d{4}$')
);

COMMENT ON TABLE patients IS '患者マスタ';
COMMENT ON COLUMN patients.phone IS '電話番号（ハイフンなし10~11桁）';
COMMENT ON COLUMN patients.pin_code IS '4桁PINコード（認証用）';

-- 施術者テーブル
CREATE TABLE IF NOT EXISTS practitioners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  photo_url     TEXT,
  bio           TEXT,
  specialties   TEXT[],
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE practitioners IS '施術者マスタ';

-- 施術メニューテーブル
CREATE TABLE IF NOT EXISTS menus (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_estimate    INTEGER,
  icon              TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_published      BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE menus IS '施術メニューマスタ';

-- 施術者×メニュー 中間テーブル
CREATE TABLE IF NOT EXISTS practitioner_menus (
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  menu_id         UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  PRIMARY KEY (practitioner_id, menu_id)
);

COMMENT ON TABLE practitioner_menus IS '施術者が対応可能なメニューの紐付け';

-- シフト・スケジュールテーブル
CREATE TABLE IF NOT EXISTS schedules (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id   UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  day_of_week       SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  is_available      BOOLEAN NOT NULL DEFAULT TRUE,
  specific_date     DATE,
  is_holiday        BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT schedules_time_order CHECK (start_time < end_time)
);

COMMENT ON TABLE schedules IS '施術者のシフトスケジュール';
COMMENT ON COLUMN schedules.day_of_week IS '曜日 (0=日, 1=月, ..., 6=土)';
COMMENT ON COLUMN schedules.specific_date IS '特定日付のオーバーライド（NULLなら曜日ベースの通常シフト）';
COMMENT ON COLUMN schedules.is_holiday IS '休業日フラグ（specific_dateと組み合わせて臨時休業に使用）';

-- 予約テーブル
CREATE TABLE IF NOT EXISTS reservations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  practitioner_id   UUID NOT NULL REFERENCES practitioners(id) ON DELETE RESTRICT,
  menu_id           UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  date              DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            reservation_status NOT NULL DEFAULT 'reserved',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reservations_time_order CHECK (start_time < end_time)
);

COMMENT ON TABLE reservations IS '予約';
COMMENT ON COLUMN reservations.status IS '予約ステータス: reserved=予約済, visited=来院済, cancelled=キャンセル, no_show=無断キャンセル';

-- ダブルブッキング防止のためのユニークインデックス
-- 同一施術者・同一日・同一開始時刻でキャンセル以外の予約は1件のみ
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_no_double_booking
  ON reservations (practitioner_id, date, start_time)
  WHERE status <> 'cancelled';

-- 時間帯の重複チェック用関数
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations
    WHERE practitioner_id = NEW.practitioner_id
      AND date = NEW.date
      AND id <> NEW.id
      AND status <> 'cancelled'
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'この時間帯は既に予約が入っています（ダブルブッキング防止）';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ダブルブッキング防止トリガー
DROP TRIGGER IF EXISTS trg_check_reservation_overlap ON reservations;
CREATE TRIGGER trg_check_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status <> 'cancelled')
  EXECUTE FUNCTION check_reservation_overlap();

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- LINE通知ログテーブル
CREATE TABLE IF NOT EXISTS line_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  type            line_notification_type NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'sent'
);

COMMENT ON TABLE line_notifications IS 'LINE通知送信ログ';

-- 管理スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  login_id        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            staff_role NOT NULL DEFAULT 'staff',
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL
);

COMMENT ON TABLE staff IS '管理画面ログイン用スタッフ';
COMMENT ON COLUMN staff.practitioner_id IS 'role=practitioner の場合に施術者レコードと紐付け';

-- ---------------------------------------------------------------------------
-- 4. Indexes (パフォーマンス最適化)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_line_user_id ON patients(line_user_id);
CREATE INDEX IF NOT EXISTS idx_practitioners_is_active ON practitioners(is_active);
CREATE INDEX IF NOT EXISTS idx_menus_sort_order ON menus(sort_order);
CREATE INDEX IF NOT EXISTS idx_menus_is_published ON menus(is_published);
CREATE INDEX IF NOT EXISTS idx_schedules_practitioner ON schedules(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_specific_date ON schedules(specific_date) WHERE specific_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_patient ON reservations(patient_id);
CREATE INDEX IF NOT EXISTS idx_reservations_practitioner ON reservations(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(date, status);
CREATE INDEX IF NOT EXISTS idx_line_notifications_reservation ON line_notifications(reservation_id);
CREATE INDEX IF NOT EXISTS idx_staff_login_id ON staff(login_id);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------------

-- 全テーブルで RLS を有効化
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- service_role は全操作可能（バックエンド API 用）
-- anon / authenticated は必要最小限の操作のみ許可

-- patients: service_role のみフルアクセス、匿名は電話番号で自分の情報のみ参照可
CREATE POLICY "service_role_full_access_patients" ON patients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_select_patients" ON patients
  FOR SELECT USING (true);

CREATE POLICY "anon_insert_patients" ON patients
  FOR INSERT WITH CHECK (true);

-- practitioners: 誰でも閲覧可（公開情報）
CREATE POLICY "anyone_select_practitioners" ON practitioners
  FOR SELECT USING (true);

CREATE POLICY "service_role_full_access_practitioners" ON practitioners
  FOR ALL USING (auth.role() = 'service_role');

-- menus: 公開メニューは誰でも閲覧可
CREATE POLICY "anyone_select_published_menus" ON menus
  FOR SELECT USING (is_published = true);

CREATE POLICY "service_role_full_access_menus" ON menus
  FOR ALL USING (auth.role() = 'service_role');

-- practitioner_menus: 誰でも閲覧可
CREATE POLICY "anyone_select_practitioner_menus" ON practitioner_menus
  FOR SELECT USING (true);

CREATE POLICY "service_role_full_access_practitioner_menus" ON practitioner_menus
  FOR ALL USING (auth.role() = 'service_role');

-- schedules: 誰でも閲覧可（空き枠確認用）
CREATE POLICY "anyone_select_schedules" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "service_role_full_access_schedules" ON schedules
  FOR ALL USING (auth.role() = 'service_role');

-- reservations: service_role フルアクセス、匿名は作成・参照可
CREATE POLICY "service_role_full_access_reservations" ON reservations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_select_reservations" ON reservations
  FOR SELECT USING (true);

CREATE POLICY "anon_insert_reservations" ON reservations
  FOR INSERT WITH CHECK (true);

-- line_notifications: service_role のみ
CREATE POLICY "service_role_full_access_line_notifications" ON line_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- staff: service_role のみ
CREATE POLICY "service_role_full_access_staff" ON staff
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 6. Seed Data (サンプルデータ)
-- ---------------------------------------------------------------------------

-- 施術者
INSERT INTO practitioners (id, name, photo_url, bio, specialties, is_active) VALUES
  ('a1111111-1111-1111-1111-111111111111', '田中 太郎', '/images/practitioners/tanaka.jpg',
   '柔道整復師歴15年。スポーツ障害と腰痛治療を得意としています。',
   ARRAY['スポーツ障害', '腰痛', '肩こり'], TRUE),
  ('a2222222-2222-2222-2222-222222222222', '鈴木 花子', '/images/practitioners/suzuki.jpg',
   '鍼灸師・柔道整復師。女性ならではの丁寧な施術を心がけています。',
   ARRAY['鍼灸', '美容鍼', '冷え性'], TRUE),
  ('a3333333-3333-3333-3333-333333333333', '佐藤 健一', '/images/practitioners/sato.jpg',
   '元プロスポーツトレーナー。的確な施術で早期回復をサポートします。',
   ARRAY['スポーツリハビリ', '骨盤矯正', '交通事故'], TRUE)
ON CONFLICT (id) DO NOTHING;

-- 施術メニュー
INSERT INTO menus (id, name, description, duration_minutes, price_estimate, icon, sort_order, is_published) VALUES
  ('b1111111-1111-1111-1111-111111111111', '初診・カウンセリング',
   '初めての方向け。お体の状態を詳しくお伺いし、最適な施術プランをご提案します。',
   60, 3000, 'clipboard-list', 1, TRUE),
  ('b2222222-2222-2222-2222-222222222222', '保険施術',
   '各種保険適用の施術です。捻挫・打撲・挫傷等が対象となります。',
   30, 1500, 'shield-check', 2, TRUE),
  ('b3333333-3333-3333-3333-333333333333', '骨盤矯正',
   '骨盤の歪みを整え、姿勢改善・腰痛緩和を目指します。',
   45, 5000, 'refresh-cw', 3, TRUE),
  ('b4444444-4444-4444-4444-444444444444', '鍼灸治療',
   '鍼とお灸を用いた東洋医学的アプローチ。肩こり・冷え性などに効果的です。',
   45, 4500, 'zap', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 施術者×メニュー 紐付け
INSERT INTO practitioner_menus (practitioner_id, menu_id) VALUES
  -- 田中先生: 初診、保険施術、骨盤矯正
  ('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'),
  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222'),
  ('a1111111-1111-1111-1111-111111111111', 'b3333333-3333-3333-3333-333333333333'),
  -- 鈴木先生: 初診、保険施術、鍼灸治療
  ('a2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111'),
  ('a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222'),
  ('a2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444'),
  -- 佐藤先生: 初診、保険施術、骨盤矯正
  ('a3333333-3333-3333-3333-333333333333', 'b1111111-1111-1111-1111-111111111111'),
  ('a3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222'),
  ('a3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333')
ON CONFLICT (practitioner_id, menu_id) DO NOTHING;

-- スケジュール（通常シフト）
-- 田中先生: 月〜金 9:00-18:00
INSERT INTO schedules (practitioner_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a1111111-1111-1111-1111-111111111111', 1, '09:00', '18:00', TRUE),
  ('a1111111-1111-1111-1111-111111111111', 2, '09:00', '18:00', TRUE),
  ('a1111111-1111-1111-1111-111111111111', 3, '09:00', '18:00', TRUE),
  ('a1111111-1111-1111-1111-111111111111', 4, '09:00', '18:00', TRUE),
  ('a1111111-1111-1111-1111-111111111111', 5, '09:00', '18:00', TRUE);

-- 鈴木先生: 月水金 10:00-17:00
INSERT INTO schedules (practitioner_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a2222222-2222-2222-2222-222222222222', 1, '10:00', '17:00', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 3, '10:00', '17:00', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 5, '10:00', '17:00', TRUE);

-- 佐藤先生: 火木土 9:00-19:00
INSERT INTO schedules (practitioner_id, day_of_week, start_time, end_time, is_available) VALUES
  ('a3333333-3333-3333-3333-333333333333', 2, '09:00', '19:00', TRUE),
  ('a3333333-3333-3333-3333-333333333333', 4, '09:00', '19:00', TRUE),
  ('a3333333-3333-3333-3333-333333333333', 6, '09:00', '19:00', TRUE);

-- 管理スタッフ（パスワードは bcrypt ハッシュ。初期パスワード: admin1234）
INSERT INTO staff (id, login_id, password_hash, name, role, practitioner_id) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'admin',
   '$2b$10$EIXe0.eFfGHD8vQKzRz5XOKwGJH.0sW2b8vLmN5pZ3qR7yD6W8i2K',
   '管理者', 'admin', NULL),
  ('c2222222-2222-2222-2222-222222222222', 'tanaka',
   '$2b$10$EIXe0.eFfGHD8vQKzRz5XOKwGJH.0sW2b8vLmN5pZ3qR7yD6W8i2K',
   '田中 太郎', 'practitioner', 'a1111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'suzuki',
   '$2b$10$EIXe0.eFfGHD8vQKzRz5XOKwGJH.0sW2b8vLmN5pZ3qR7yD6W8i2K',
   '鈴木 花子', 'practitioner', 'a2222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;
