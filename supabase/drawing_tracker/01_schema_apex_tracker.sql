-- ==============================================================================
-- APEX DRAWING TRACKER — SUPABASE SCHEMA
-- Project URL: https://cvecpplwoduujrvoduku.supabase.co
-- Tạo 4 bảng chuẩn hóa APEX_Tracker_*, phân quyền truy cập và bật Realtime
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public."APEX_Tracker_Project" (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  apex_project_id uuid,
  color           text,
  inserted_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."APEX_Tracker_Zone" (
  id          text PRIMARY KEY,
  project_id  text NOT NULL REFERENCES public."APEX_Tracker_Project"(id) ON DELETE CASCADE,
  level       text NOT NULL,
  zone        text NOT NULL DEFAULT '',
  sort        integer NOT NULL DEFAULT 0,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

-- Lần phát hành thực tế (ô xanh)
CREATE TABLE IF NOT EXISTS public."APEX_Tracker_Issue" (
  id          text PRIMARY KEY,
  zone_id     text NOT NULL REFERENCES public."APEX_Tracker_Zone"(id) ON DELETE CASCADE,
  date        date NOT NULL,
  link        text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  created_at  bigint NOT NULL DEFAULT 0,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, date)
);

-- Kế hoạch phát hành chưa issue (ô cam)
CREATE TABLE IF NOT EXISTS public."APEX_Tracker_Plan" (
  id          text PRIMARY KEY,
  zone_id     text NOT NULL REFERENCES public."APEX_Tracker_Zone"(id) ON DELETE CASCADE,
  date        date NOT NULL,
  note        text NOT NULL DEFAULT '',
  created_at  bigint NOT NULL DEFAULT 0,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, date)
);

CREATE INDEX IF NOT EXISTS apex_tracker_zones_project_idx ON public."APEX_Tracker_Zone"(project_id);
CREATE INDEX IF NOT EXISTS apex_tracker_issues_zone_idx   ON public."APEX_Tracker_Issue"(zone_id);
CREATE INDEX IF NOT EXISTS apex_tracker_plans_zone_idx    ON public."APEX_Tracker_Plan"(zone_id);

-- Phân quyền đồng bộ theo chuẩn bảng hệ thống APEX_*
ALTER TABLE public."APEX_Tracker_Project" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Zone"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Issue"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Plan"    DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public."APEX_Tracker_Project" TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Zone"    TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Issue"   TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Plan"    TO anon, authenticated, service_role;

-- Bật Realtime an toàn (không báo lỗi nếu chạy lại nhiều lần)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'APEX_Tracker_Project') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."APEX_Tracker_Project";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'APEX_Tracker_Zone') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."APEX_Tracker_Zone";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'APEX_Tracker_Issue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."APEX_Tracker_Issue";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'APEX_Tracker_Plan') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."APEX_Tracker_Plan";
  END IF;
END $$;
