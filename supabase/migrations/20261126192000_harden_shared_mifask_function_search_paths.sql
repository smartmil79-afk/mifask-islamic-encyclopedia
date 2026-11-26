-- Pin search_path for shared marketplace functions flagged by Supabase's security advisor.
-- All relation and extension references are schema-qualified, so an empty path is safe.
-- Function volatility, signatures, defaults, ownership and existing EXECUTE ACLs are preserved.

CREATE OR REPLACE FUNCTION public.ads_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NOT public.is_admin() THEN
      NEW.views := OLD.views;
    END IF;
    NEW.seller_id := OLD.seller_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.category_counts()
RETURNS TABLE(category text, n bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT a.category, count(*)
  FROM public.ads AS a
  WHERE NOT a.sold
  GROUP BY a.category;
$function$;

CREATE OR REPLACE FUNCTION public.fuzzy_ads(
  p_term text,
  p_state text DEFAULT NULL::text,
  p_limit integer DEFAULT 24
)
RETURNS SETOF public.ads
LANGUAGE sql
STABLE
SET search_path = ''
AS $function$
  SELECT a.*
  FROM public.ads AS a
  WHERE NOT a.sold
    AND (p_state IS NULL OR a.state = p_state)
    AND extensions.word_similarity(p_term, a.title) > 0.45
  ORDER BY extensions.word_similarity(p_term, a.title) DESC, a.price ASC
  LIMIT greatest(p_limit, 1);
$function$;
