-- Align privileged encyclopedia RLS with the server-side admin/editor role model.
-- Preserve the existing active-admin permissions. Editorial revision access remains
-- limited to active admin, editor, and reviewer roles.
-- auth.uid() is wrapped in a scalar SELECT to avoid per-row re-evaluation.

ALTER POLICY "Admin manage hadith collections" ON public.ie_hadith_collections
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "Admin manage hadith records" ON public.ie_hadiths
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "Admin manage Quran surahs" ON public.ie_quran_surahs
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "Admin manage Quran verses" ON public.ie_quran_verses
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "Admin manage hadith imports" ON public.ie_source_imports
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "IE admins read analytics" ON public.ie_analytics_daily
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = 'admin'
));

ALTER POLICY "IE admins add revisions" ON public.ie_article_revisions
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = ANY (ARRAY['admin'::text, 'editor'::text, 'reviewer'::text])
));

ALTER POLICY "IE admins read revisions" ON public.ie_article_revisions
USING (EXISTS (
  SELECT 1 FROM public.ie_admins a
  WHERE a.user_id = (SELECT auth.uid())
    AND a.active IS TRUE
    AND a.role = ANY (ARRAY['admin'::text, 'editor'::text, 'reviewer'::text])
));
