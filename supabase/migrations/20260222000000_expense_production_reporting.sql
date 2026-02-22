-- ================================================================
--  Expense & Production Reporting – Schema Migration
--  Date: 2026-02-22
-- ================================================================

-- 1. Groups (Teams) table
--    Represents a team / group within the company hierarchy.
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Admins can do anything; all authenticated users can read
CREATE POLICY "Admins can manage groups"
  ON public.groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view groups"
  ON public.groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Add group_id to profiles (nullable – existing rows get NULL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- 3. Seed some default groups so the UI has real options to show
INSERT INTO public.groups (name, description) VALUES
  ('Legacy Builders',   'Legacy Builders team'),
  ('Metro Closers',     'Metro Closers team'),
  ('Summit Title',      'Summit Title team')
ON CONFLICT (name) DO NOTHING;

-- 4. Add financial columns to the deals table
--    These fields map 1-to-1 with the legacy settlement report columns.
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS settlement_fee    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lenders_insurance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owners_title      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lenders_title     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_status      TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS source_of_business TEXT;

-- 5. Indexes for performance on the reporting queries
CREATE INDEX IF NOT EXISTS idx_profiles_group_id
  ON public.profiles (group_id);

CREATE INDEX IF NOT EXISTS idx_deals_deal_date
  ON public.deals (deal_date);

CREATE INDEX IF NOT EXISTS idx_deals_bd_user_id
  ON public.deals (bd_user_id);
