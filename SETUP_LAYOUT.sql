-- EINSATZDIALOG 0.11 · Visueller Seitenbaukasten
-- Einmal im Supabase SQL Editor ausführen.
-- Legt ausschließlich neue Layout-Einstellungen an und verändert KEINE Lernkarten.
CREATE TABLE IF NOT EXISTS public.site_layout (
  id TEXT PRIMARY KEY CHECK (id = 'public'),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_layout ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.site_layout TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_layout TO authenticated;
DROP POLICY IF EXISTS "Layout öffentlich lesen" ON public.site_layout;
CREATE POLICY "Layout öffentlich lesen" ON public.site_layout
  FOR SELECT TO anon, authenticated USING (id = 'public');
DROP POLICY IF EXISTS "Layout Admin anlegen" ON public.site_layout;
CREATE POLICY "Layout Admin anlegen" ON public.site_layout
  FOR INSERT TO authenticated WITH CHECK (
    id = 'public' AND EXISTS (
      SELECT 1 FROM public.einsatzdialog_admins a
      WHERE a.user_id = (SELECT auth.uid())
    )
  );
DROP POLICY IF EXISTS "Layout Admin bearbeiten" ON public.site_layout;
CREATE POLICY "Layout Admin bearbeiten" ON public.site_layout
  FOR UPDATE TO authenticated USING (
    id = 'public' AND EXISTS (
      SELECT 1 FROM public.einsatzdialog_admins a
      WHERE a.user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    id = 'public' AND EXISTS (
      SELECT 1 FROM public.einsatzdialog_admins a
      WHERE a.user_id = (SELECT auth.uid())
    )
  );
INSERT INTO public.site_layout (id, config) VALUES (
  'public',
  '{"version":1,"home":{"order":["organization","difficulty","trainingMode","topics","engineInfo","focus","actions"],"topicStyle":"tiles","topicMaxHeight":280,"organizationStyle":"grid","spacing":"comfortable"}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
SELECT id, config, updated_at FROM public.site_layout WHERE id = 'public';
