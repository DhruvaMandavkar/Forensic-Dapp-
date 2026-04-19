-- =============================================
-- Forensic DApp — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM for roles ───────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'forensic_official',
  'police_official',
  'student',
  'public'
);

-- ─── USERS (extends Supabase auth.users) ─────────────────────
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL,
  wallet_address  TEXT,
  -- forensic official extras
  organization    TEXT,
  official_id_url TEXT,
  -- police extras
  badge_number    TEXT,
  department_name TEXT,
  -- student extras
  college_name    TEXT,
  student_id      TEXT,
  -- status
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "forensic_read_all" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'forensic_official'
    )
  );

-- Client-side insert still allowed (used as fallback)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ─── TRIGGER: auto-create profile row on signup ──────────────
-- SECURITY DEFINER bypasses RLS so the insert always succeeds
-- regardless of JWT timing after signUp()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, role,
    wallet_address, organization,
    badge_number, department_name,
    college_name, student_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    (NEW.raw_user_meta_data->>'role')::user_role,
    NEW.raw_user_meta_data->>'wallet_address',
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'badge_number',
    NEW.raw_user_meta_data->>'department_name',
    NEW.raw_user_meta_data->>'college_name',
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── CASES ───────────────────────────────────────────────────
CREATE TABLE public.cases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number     TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'open',
  is_public       BOOLEAN DEFAULT FALSE,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_public_read" ON public.cases
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "cases_auth_read" ON public.cases
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('forensic_official', 'police_official', 'student')
    )
  );

CREATE POLICY "cases_official_write" ON public.cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('forensic_official', 'police_official')
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('forensic_official', 'police_official')
  );

-- ─── EVIDENCE ────────────────────────────────────────────────
CREATE TABLE public.evidence (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id          UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  evidence_type    TEXT,
  is_confidential  BOOLEAN DEFAULT TRUE,
  blockchain_id    BIGINT,
  tx_hash          TEXT,
  verified         BOOLEAN DEFAULT FALSE,
  collected_by     UUID REFERENCES public.users(id),
  collected_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_official_all" ON public.evidence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "evidence_police_read" ON public.evidence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'police_official')
  );

CREATE POLICY "evidence_student_read" ON public.evidence
  FOR SELECT USING (
    is_confidential = FALSE AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'student')
  );

-- ─── DIGITAL EVIDENCE ────────────────────────────────────────
CREATE TABLE public.digital_evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id     UUID REFERENCES public.evidence(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_hash       TEXT,
  file_size       BIGINT,
  mime_type       TEXT,
  ipfs_cid        TEXT,
  uploaded_by     UUID REFERENCES public.users(id),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.digital_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digital_official_all" ON public.digital_evidence
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "digital_police_read" ON public.digital_evidence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'police_official')
  );

-- ─── CHAIN OF CUSTODY ────────────────────────────────────────
CREATE TABLE public.chain_of_custody (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id  UUID REFERENCES public.evidence(id) ON DELETE CASCADE,
  handler_id   UUID REFERENCES public.users(id),
  action       TEXT NOT NULL,
  notes        TEXT,
  tx_hash      TEXT,
  timestamp    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chain_of_custody ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custody_official_all" ON public.chain_of_custody
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "custody_police_read" ON public.chain_of_custody
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'police_official')
  );

-- ─── FORENSIC ANALYSIS ───────────────────────────────────────
CREATE TABLE public.forensic_analysis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id         UUID REFERENCES public.cases(id),
  evidence_id     UUID REFERENCES public.evidence(id),
  analyst_id      UUID REFERENCES public.users(id),
  analysis_type   TEXT,
  findings        TEXT,
  tools_used      TEXT,
  report_url      TEXT,
  is_confidential BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.forensic_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_official_all" ON public.forensic_analysis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "analysis_police_read" ON public.forensic_analysis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'police_official')
  );

-- ─── COURT VERIFICATION ──────────────────────────────────────
CREATE TABLE public.court_verification (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id         UUID REFERENCES public.evidence(id),
  case_id             UUID REFERENCES public.cases(id),
  verified_by         UUID REFERENCES public.users(id),
  court_name          TEXT,
  verification_status TEXT DEFAULT 'pending',
  blockchain_tx       TEXT,
  notes               TEXT,
  verified_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.court_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "court_official_all" ON public.court_verification
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "court_police_read" ON public.court_verification
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'police_official')
  );

-- ─── STORAGE BUCKET ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "storage_official_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence-files' AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'forensic_official')
  );

CREATE POLICY "storage_auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence-files' AND
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('forensic_official', 'police_official'))
  );
