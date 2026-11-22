-- Enforce editorial verification requirements at the database layer.
-- Legacy published/unverified rows are grandfathered until their verification
-- status changes or they are republished; no existing article is modified.

CREATE OR REPLACE FUNCTION public.ie_articles_verification_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  usable_reference_count integer;
BEGIN
  SELECT count(*) INTO usable_reference_count
  FROM (
    SELECT DISTINCT lower(btrim(reference)) AS reference
    FROM unnest(coalesce(NEW.reference_texts, ARRAY[]::text[])) AS reference
    WHERE btrim(reference) <> ''
      AND btrim(reference) !~* '(placeholder|to be verified|specific edition|add during editorial review)'
  ) usable;

  IF NEW.verification_status IN ('sources_checked', 'reviewed', 'verified')
     AND (usable_reference_count < 1
       OR btrim(coalesce(NEW.reviewer_name, '')) = ''
       OR btrim(coalesce(NEW.verification_notes, '')) = '') THEN
    RAISE EXCEPTION 'Source-checked/reviewed status requires at least one usable citation, a named reviewer, and verification notes';
  END IF;

  IF NEW.verification_status = 'verified'
     AND (usable_reference_count < 2
       OR btrim(coalesce(NEW.reviewer_name, '')) = ''
       OR btrim(coalesce(NEW.verification_notes, '')) = '') THEN
    RAISE EXCEPTION 'Verified status requires two distinct usable citations, a named reviewer, and verification notes';
  END IF;

  -- Enforce publication on new articles, status transitions, and verification
  -- changes. Existing published/unverified articles can remain untouched and
  -- may be edited without being silently promoted.
  IF NEW.status IN ('published', 'verified')
     AND (TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM NEW.status
       OR OLD.verification_status IS DISTINCT FROM NEW.verification_status
       OR NEW.verification_status = 'verified') THEN
    IF NEW.verification_status <> 'verified'
       OR usable_reference_count < 2
       OR btrim(coalesce(NEW.reviewer_name, '')) = ''
       OR btrim(coalesce(NEW.verification_notes, '')) = '' THEN
      RAISE EXCEPTION 'Publishing requires verified status, two distinct usable citations, a named reviewer, and verification notes';
    END IF;
  END IF;

  IF NEW.verification_status = 'verified' THEN
    NEW.verified_at := coalesce(NEW.verified_at, now());
    NEW.verified_by := coalesce(nullif(btrim(NEW.verified_by), ''), NEW.reviewer_name);
  ELSE
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER ie_articles_verification_guard
BEFORE INSERT OR UPDATE ON public.ie_articles
FOR EACH ROW EXECUTE FUNCTION public.ie_articles_verification_guard();
