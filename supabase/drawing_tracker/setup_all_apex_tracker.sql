-- ==============================================================================
-- APEX DRAWING TRACKER â€” SUPABASE SCHEMA
-- Project URL: https://cvecpplwoduujrvoduku.supabase.co
-- Táº¡o 4 báº£ng chuáº©n hÃ³a APEX_Tracker_*, phÃ¢n quyá»n truy cáº­p vÃ  báº­t Realtime
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

-- Láº§n phÃ¡t hÃ nh thá»±c táº¿ (Ã´ xanh)
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

-- Káº¿ hoáº¡ch phÃ¡t hÃ nh chÆ°a issue (Ã´ cam)
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

-- PhÃ¢n quyá»n Ä‘á»“ng bá»™ theo chuáº©n báº£ng há»‡ thá»‘ng APEX_*
ALTER TABLE public."APEX_Tracker_Project" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Zone"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Issue"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."APEX_Tracker_Plan"    DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public."APEX_Tracker_Project" TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Zone"    TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Issue"   TO anon, authenticated, service_role;
GRANT ALL ON public."APEX_Tracker_Plan"    TO anon, authenticated, service_role;

-- Báº­t Realtime an toÃ n (khÃ´ng bÃ¡o lá»—i náº¿u cháº¡y láº¡i nhiá»u láº§n)
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


-- ==============================================================================
-- APEX DRAWING TRACKER â€” INITIAL SEED DATA (11 Projects, 57 Zones, 85 Issues)
-- Cháº¡y sau 01_schema_apex_tracker.sql
-- ==============================================================================

BEGIN;

INSERT INTO public."APEX_Tracker_Project" (id, name, apex_project_id, color) VALUES
('p1',  'AVENUE',  'e9132fa4-a399-4f7a-9bb8-a23018516c39', '#3730A3'),
('p2',  'CW3',     'e742d27c-aa9c-43d4-8181-d85e61a5a4df', '#164E63'),
('p3',  'DEAKIN',  '2db8166a-a1cb-4dd1-9017-e5e88e1f671a', '#1F2937'),
('p4',  'DLD',     'f6ccfd82-347a-4a70-83c7-bb1e6efbae54', '#1E293B'),
('p5',  'ENCLVE',  'edf478c2-70a7-4e09-acc4-e389c77ec3a2', '#3F3F46'),
('p6',  'FGWB',    '2654fbad-3e30-456e-8ae1-a7c5d0130f5f', '#0080FF'),
('p7',  'LEEDS',   'c66187a1-a97f-4b2f-ba60-aae11cb3d8f6', '#0F766E'),
('p8',  'LOT 14',  '45a962e0-4af9-4244-8bb4-b70b4159c7ea', '#008040'),
('p9',  'MAC',     '8fd2a544-5521-42e9-8471-4f8de800ce06', '#7C2D12'),
('p10', 'MEL02',   '9ea343db-e42b-4a99-bd01-ce1ab0158771', '#1E3A8A'),
('p11', 'MEL03',   '65799e7b-60a6-4e26-8b8b-9c65450a659f', '#FF0080')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."APEX_Tracker_Zone" (id, project_id, level, zone, sort) VALUES
('p1-z2','p1','GF','',2),
('p1-z3','p1','L1','',3),
('p1-z4','p1','L2','',4),
('p1-z5','p1','L3','',5),
('p1-z6','p1','L4','',6),
('p1-z7','p1','L5','',7),
('p1-z8','p1','L6','',8),
('p1-z9','p1','L7','',9),
('p1-z10','p1','RF','',10),
('p2-z2','p2','L26','',2),
('p2-z3','p2','L27','',3),
('p2-z4','p2','L4','',4),
('p3-z2','p3','B1','',2),
('p3-z3','p3','B2','',3),
('p4-z2','p4','GF','',2),
('p5-z2','p5','B1','',2),
('p5-z3','p5','B2','',3),
('p5-z4','p5','B3','',4),
('p5-z5','p5','GF','',5),
('p5-z6','p5','L1','',6),
('p5-z7','p5','L10','',7),
('p5-z8','p5','L11','',8),
('p5-z9','p5','L12','',9),
('p5-z10','p5','L13','',10),
('p5-z11','p5','L14','',11),
('p5-z12','p5','L15','',12),
('p5-z13','p5','L16','',13),
('p5-z14','p5','L17','',14),
('p5-z15','p5','L18','',15),
('p5-z16','p5','L19','',16),
('p5-z17','p5','L2','',17),
('p5-z18','p5','L20','',18),
('p5-z19','p5','L3','',19),
('p5-z20','p5','L4','',20),
('p5-z21','p5','L5','',21),
('p5-z22','p5','L6','',22),
('p5-z23','p5','L7','',23),
('p5-z24','p5','L8','',24),
('p5-z25','p5','L9','',25),
('p6-z2','p6','B1','',2),
('p6-z3','p6','L2','',3),
('p7-z2','p7','GF','CD',2),
('p8-z2','p8','HIGH RISE','',2),
('p8-z3','p8','LOW RISE','',3),
('p9-z2','p9','L2','',2),
('p10-z2','p10','A1','',2),
('p10-z3','p10','B','',3),
('p10-z4','p10','B1','',4),
('p10-z5','p10','B2','',5),
('p10-z6','p10','GF','',6),
('p10-z7','p10','L1','',7),
('p10-z8','p10','L1','ZONE A',8),
('p10-z9','p10','L1','ZONE A2',9),
('p10-z10','p10','L2','',10),
('p11-z2','p11','GF','',2),
('p11-z3','p11','L1','',3),
('p11-z4','p11','L2','',4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."APEX_Tracker_Issue" (id, zone_id, date, link, note, created_at) VALUES
('p1-z2-4','p1-z2','2026-07-08','','',0),
('p1-z2-5','p1-z2','2026-11-11','','',0),
('p1-z2-9','p1-z2','2026-07-16','','',0),
('p1-z3-3','p1-z3','2026-11-06','','',0),
('p1-z3-6','p1-z3','2026-07-14','','',0),
('p1-z3-10','p1-z3','2026-10-16','','',0),
('p1-z3-11','p1-z3','2026-10-21','','',0),
('p1-z4-3','p1-z4','2026-11-06','','',0),
('p1-z4-7','p1-z4','2026-07-15','','',0),
('p1-z4-10','p1-z4','2026-10-16','','',0),
('p1-z4-11','p1-z4','2026-10-21','','',0),
('p1-z5-3','p1-z5','2026-11-06','','',0),
('p1-z5-7','p1-z5','2026-07-15','','',0),
('p1-z5-10','p1-z5','2026-10-16','','',0),
('p1-z5-11','p1-z5','2026-10-21','','',0),
('p1-z6-3','p1-z6','2026-11-06','','',0),
('p1-z6-8','p1-z6','2026-09-15','','',0),
('p1-z6-10','p1-z6','2026-10-16','','',0),
('p1-z6-11','p1-z6','2026-10-21','','',0),
('p1-z7-3','p1-z7','2026-11-06','','',0),
('p1-z7-8','p1-z7','2026-09-15','','',0),
('p1-z7-10','p1-z7','2026-10-16','','',0),
('p1-z7-11','p1-z7','2026-10-21','','',0),
('p1-z8-3','p1-z8','2026-11-06','','',0),
('p1-z8-8','p1-z8','2026-09-15','','',0),
('p1-z8-10','p1-z8','2026-10-16','','',0),
('p1-z8-11','p1-z8','2026-10-21','','',0),
('p1-z9-3','p1-z9','2026-11-06','','',0),
('p1-z9-8','p1-z9','2026-09-15','','',0),
('p1-z9-10','p1-z9','2026-10-16','','',0),
('p1-z9-11','p1-z9','2026-10-21','','',0),
('p1-z10-3','p1-z10','2026-11-06','','',0),
('p1-z10-8','p1-z10','2026-09-15','','',0),
('p1-z10-10','p1-z10','2026-10-16','','',0),
('p1-z10-11','p1-z10','2026-10-21','','',0),
('p2-z2-3','p2-z2','2026-07-27','','',0),
('p2-z3-3','p2-z3','2026-07-27','','',0),
('p2-z4-4','p2-z4','2026-10-27','','',0),
('p3-z2-3','p3-z2','2026-09-08','','',0),
('p3-z3-3','p3-z3','2026-09-08','','',0),
('p4-z2-3','p4-z2','2026-03-26','','',0),
('p5-z2-8','p5-z2','2026-01-30','','',0),
('p5-z3-8','p5-z3','2026-01-30','','',0),
('p5-z4-5','p5-z4','2026-02-13','','',0),
('p5-z5-8','p5-z5','2026-01-30','','',0),
('p5-z6-3','p5-z6','2026-07-04','','',0),
('p5-z7-4','p5-z7','2026-03-06','','',0),
('p5-z8-4','p5-z8','2026-03-06','','',0),
('p5-z9-4','p5-z9','2026-03-06','','',0),
('p5-z10-4','p5-z10','2026-03-06','','',0),
('p5-z11-4','p5-z11','2026-03-06','','',0),
('p5-z12-4','p5-z12','2026-03-06','','',0),
('p5-z13-4','p5-z13','2026-03-06','','',0),
('p5-z14-4','p5-z14','2026-03-06','','',0),
('p5-z15-4','p5-z15','2026-03-06','','',0),
('p5-z16-4','p5-z16','2026-03-06','','',0),
('p5-z17-7','p5-z17','2026-03-27','','',0),
('p5-z18-4','p5-z18','2026-03-06','','',0),
('p5-z19-4','p5-z19','2026-03-06','','',0),
('p5-z20-4','p5-z20','2026-03-06','','',0),
('p5-z21-4','p5-z21','2026-03-06','','',0),
('p5-z22-4','p5-z22','2026-03-06','','',0),
('p5-z23-4','p5-z23','2026-03-06','','',0),
('p5-z23-6','p5-z23','2026-03-20','','',0),
('p5-z24-4','p5-z24','2026-03-06','','',0),
('p5-z25-4','p5-z25','2026-03-06','','',0),
('p6-z2-3','p6-z2','2026-11-02','','',0),
('p6-z3-4','p6-z3','2026-11-13','','',0),
('p7-z2-3','p7-z2','2026-01-08','','',0),
('p8-z2-3','p8-z2','2026-08-12','','',0),
('p8-z2-4','p8-z2','2026-07-28','','',0),
('p8-z3-3','p8-z3','2026-08-12','','',0),
('p8-z3-4','p8-z3','2026-07-28','','',0),
('p9-z2-3','p9-z2','2026-08-14','','',0),
('p10-z2-5','p10-z2','2026-02-10','','',0),
('p10-z3-3','p10-z3','2026-03-04','','',0),
('p10-z4-3','p10-z4','2026-03-04','','',0),
('p10-z5-3','p10-z5','2026-03-04','','',0),
('p10-z6-6','p10-z6','2026-03-10','','',0),
('p10-z7-4','p10-z7','2026-05-04','','',0),
('p10-z8-5','p10-z8','2026-02-10','','',0),
('p10-z9-3','p10-z9','2026-03-04','','',0),
('p10-z10-4','p10-z10','2026-05-04','','',0),
('p11-z2-3','p11-z2','2026-11-09','','',0),
('p11-z3-4','p11-z3','2026-11-13','','',0)
ON CONFLICT (id) DO NOTHING;

COMMIT;

