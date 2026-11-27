-- Phase 17 Adhkar source-parity and field-mapping audit (read-only).
-- Schema inspected 2026-11-27: public.ie_adhkar columns include id, category,
-- repetition, transliteration, source_refs JSONB, metadata JSONB,
-- source_import_id UUID, and translations JSONB.
-- External exact-content comparison was performed against immutable upstream
-- commit Seen-Arabic/Morning-And-Evening-Adhkar-DB@39d422fb3e3a6608b47a8f4e1040543220bfd215.
-- This SQL reports local coverage/shape only; it does not certify scholarly accuracy
-- or infer third-party rights from the repository-level MIT licence.

WITH ref_elements AS (
  SELECT a.id, e.ref
  FROM public.ie_adhkar AS a
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(a.source_refs) = 'array'
      THEN a.source_refs ELSE '[]'::jsonb END
  ) AS e(ref)
),
category_counts AS (
  SELECT coalesce(category, '<null>') AS category, count(*) AS records
  FROM public.ie_adhkar
  GROUP BY 1
),
review_status AS (
  SELECT coalesce(metadata->>'source_review_status', '<missing>') AS status, count(*) AS records
  FROM public.ie_adhkar
  GROUP BY 1
),
verification_status AS (
  SELECT coalesce(metadata->>'verification_status', '<missing>') AS status, count(*) AS records
  FROM public.ie_adhkar
  GROUP BY 1
)
SELECT jsonb_build_object(
  'record_coverage', (
    SELECT jsonb_build_object(
      'records', count(*),
      'transliteration_present', count(*) FILTER (
        WHERE nullif(btrim(transliteration), '') IS NOT NULL
      ),
      'transliteration_missing', count(*) FILTER (
        WHERE nullif(btrim(transliteration), '') IS NULL
      ),
      'source_order_present', count(*) FILTER (
        WHERE nullif(btrim(metadata->>'source_order'), '') IS NOT NULL
      ),
      'source_import_linked', count(*) FILTER (WHERE source_import_id IS NOT NULL),
      'source_import_unlinked', count(*) FILTER (WHERE source_import_id IS NULL),
      'source_refs_array', count(*) FILTER (
        WHERE jsonb_typeof(source_refs) = 'array'
      ),
      'repetition_present', count(*) FILTER (WHERE repetition IS NOT NULL)
    )
    FROM public.ie_adhkar
  ),
  'source_reference_shape', (
    SELECT jsonb_build_object(
      'elements', count(*),
      'plain_text_strings', count(*) FILTER (WHERE jsonb_typeof(ref) = 'string'),
      'structured_objects', count(*) FILTER (WHERE jsonb_typeof(ref) = 'object'),
      'elements_with_url', count(*) FILTER (
        WHERE jsonb_typeof(ref) = 'object'
          AND nullif(btrim(ref->>'url'), '') IS NOT NULL
      )
    )
    FROM ref_elements
  ),
  'metadata_mapping_coverage', (
    SELECT jsonb_build_object(
      'source_dataset', count(*) FILTER (WHERE metadata ? 'source_dataset'),
      'source_book', count(*) FILTER (WHERE metadata ? 'source_book'),
      'source_order', count(*) FILTER (WHERE metadata ? 'source_order'),
      'source_review_status', count(*) FILTER (WHERE metadata ? 'source_review_status'),
      'verification_status', count(*) FILTER (WHERE metadata ? 'verification_status'),
      'hadith_text', count(*) FILTER (WHERE metadata ? 'hadith_text'),
      'count_description', count(*) FILTER (WHERE metadata ? 'count_description'),
      'virtue_or_context', count(*) FILTER (WHERE metadata ? 'virtue_or_context'),
      'audio_url', count(*) FILTER (WHERE metadata ? 'audio_url'),
      'source_type', count(*) FILTER (WHERE metadata ? 'type'),
      'explanation_of_hadith_vocabulary', count(*) FILTER (
        WHERE metadata ? 'explanation_of_hadith_vocabulary'
      )
    )
    FROM public.ie_adhkar
  ),
  'audio_url_storage', (
    SELECT jsonb_build_object(
      'metadata_key_present', count(*) FILTER (WHERE metadata ? 'audio_url'),
      'json_null', count(*) FILTER (
        WHERE metadata ? 'audio_url' AND metadata->'audio_url' = 'null'::jsonb
      ),
      'empty_string', count(*) FILTER (
        WHERE metadata ? 'audio_url' AND metadata->>'audio_url' = ''
      ),
      'nonempty_string', count(*) FILTER (
        WHERE nullif(btrim(metadata->>'audio_url'), '') IS NOT NULL
      )
    )
    FROM public.ie_adhkar
  ),
  'category_distribution', (
    SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY category), '[]'::jsonb)
    FROM category_counts AS c
  ),
  'review_status_distribution', (
    SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY status), '[]'::jsonb)
    FROM review_status AS s
  ),
  'verification_status_distribution', (
    SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY status), '[]'::jsonb)
    FROM verification_status AS s
  )
) AS evidence;
