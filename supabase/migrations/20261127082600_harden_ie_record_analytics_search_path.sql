-- Harden the SECURITY DEFINER analytics function against search_path shadowing.
-- The function contract, event validation, table policy, and EXECUTE grants remain unchanged.
CREATE OR REPLACE FUNCTION public.ie_record_analytics(event_kind text, article_slug text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF event_kind IS NULL OR event_kind NOT IN ('article_view', 'search') THEN
    RETURN;
  END IF;

  IF event_kind = 'article_view' THEN
    IF article_slug IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.ie_articles AS a
      WHERE a.slug = article_slug
        AND a.status = 'published'
    ) THEN
      RETURN;
    END IF;
  ELSE
    article_slug := '';
  END IF;

  INSERT INTO public.ie_analytics_daily (day, event_type, article_slug, event_count)
  VALUES (CURRENT_DATE, event_kind, article_slug, 1)
  ON CONFLICT (day, event_type, article_slug)
  DO UPDATE
    SET event_count = public.ie_analytics_daily.event_count + 1;
END;
$function$;
