-- ============================================================
--  Construction PM – Supabase Schema  (v2)
--  Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Project identification
  project_name          TEXT NOT NULL,
  client_response       TEXT CHECK (client_response IN ('Won','Lost','Pending')),
  year_completed        INTEGER,
  date_of_bid           DATE,
  idapac_index          NUMERIC,
  contract_type         TEXT CHECK (contract_type IN ('Turn-Key','Labor')),

  -- Team
  architect             TEXT,
  engineer              TEXT,
  gc                    TEXT,

  -- Location
  city                  TEXT,
  state                 TEXT,

  -- Building specs
  building_type         TEXT,
  style                 TEXT,
  complexity            TEXT CHECK (complexity IN ('Easy','Medium','Hard')),
  wind_rating           NUMERIC,
  ibc_code_year         INTEGER,
  levels                INTEGER,
  wall_height           TEXT,
  stair_shaft           TEXT,
  stair_framing         TEXT,
  hardware_complexity   TEXT,
  clubhouse             BOOLEAN DEFAULT FALSE,

  -- Dimensions (all numeric)
  floor_sf              NUMERIC,
  siding_sf             NUMERIC,
  pct_siding_vs_floor   NUMERIC,           -- calculated: siding_sf / floor_sf
  exterior_wall_sf      NUMERIC,
  windows               INTEGER,
  patio_doors           INTEGER,
  entry_doors           INTEGER,
  shaftwall_lf_per_level NUMERIC,
  truss_depth           TEXT,              -- stored as text: e.g. 22" or 1'-10"
  truss_spacing         TEXT,             -- stored as text: e.g. 24" or 2'-0"

  -- Manual price inputs
  frame_lne_price       NUMERIC,
  frame_material        NUMERIC,
  truss_price           NUMERIC,
  siding_lm             NUMERIC,
  change_orders         NUMERIC DEFAULT 0,

  -- Auto-calculated (stored for dashboard/queries)
  frame_lne_price_sf    NUMERIC,           -- frame_lne_price / floor_sf
  frame_material_sf     NUMERIC,           -- frame_material / floor_sf
  truss_sf              NUMERIC,           -- truss_price / floor_sf
  siding_lm_sf          NUMERIC,           -- siding_lm / floor_sf
  total_price_sf        NUMERIC,           -- sum of all /SF
  total_contract_price  NUMERIC,           -- total_price_sf * floor_sf
  contract_price_cos    NUMERIC,           -- total_contract_price + change_orders

  -- Timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_name     ON public.projects (project_name);
CREATE INDEX IF NOT EXISTS idx_projects_response ON public.projects (client_response);
CREATE INDEX IF NOT EXISTS idx_projects_bid      ON public.projects (date_of_bid DESC);
CREATE INDEX IF NOT EXISTS idx_projects_state    ON public.projects (state);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
