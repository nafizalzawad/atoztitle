-- ================================================================
--  Admin Events RLS Policy
--  Date: 2026-02-23
--  Adds missing admin SELECT policy on events table so admins can
--  view events belonging to any user (required for UserReport page).
-- ================================================================

CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
