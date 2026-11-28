-- Phase 17: source URL and citation-anchor integrity audit.
-- Read-only. Run after inspecting ie_sources and ie_article_sources schemas.
-- Important: preserve URL fragments. Several TDV encyclopedia citations use
-- distinct #section anchors on the same article URL; stripping fragments
-- collapses distinct citations and creates false duplicate groups.

WITH source_rows AS (
  SELECT
    s.id,
    s.source_type,
    s.title,
    s.citation,
    s.url,
    s.notes,
    s.reliability_note,
    substring(lower(btrim(s.url)) FROM '^https?://([^/:?#]+)') AS host,
    CASE WHEN s.url LIKE '%#%' THEN split_part(s.url, '#', 1) END AS fragment_base,
    CASE WHEN s.url LIKE '%#%' THEN substring(s.url FROM '#(.*)$') END AS fragment_anchor,
    CASE
      WHEN s.url ~* '^https?://' THEN
        lower(substring(btrim(s.url) FROM '^https?://[^/]+'))
        || coalesce(substring(btrim(s.url) FROM '^https?://[^/]+(.*)$'), '')
    END AS canonical_url_preserving_path_query_fragment
  FROM public.ie_sources AS s
),
exact_duplicate_groups AS (
  SELECT canonical_url_preserving_path_query_fragment AS canonical_url,
         count(*)::integer AS records
  FROM source_rows
  WHERE canonical_url_preserving_path_query_fragment IS NOT NULL
  GROUP BY canonical_url_preserving_path_query_fragment
  HAVING count(*) > 1
),
fragment_anchor_groups AS (
  SELECT
    fragment_base,
    count(*)::integer AS records,
    count(DISTINCT fragment_anchor)::integer AS distinct_anchors,
    jsonb_agg(
      jsonb_build_object(
        'title', title,
        'url', url,
        'anchor', fragment_anchor
      ) ORDER BY title
    ) AS entries
  FROM source_rows
  WHERE fragment_base IS NOT NULL
  GROUP BY fragment_base
  HAVING count(DISTINCT fragment_anchor) > 1
),
source_domains AS (
  SELECT
    host,
    count(*)::integer AS records
  FROM source_rows
  WHERE host IS NOT NULL
  GROUP BY host
),
link_quality AS (
  SELECT
    count(*)::integer AS links,
    count(*) FILTER (
      WHERE nullif(btrim(als.citation_detail), '') IS NULL
    )::integer AS missing_citation_detail,
    count(*) FILTER (WHERE a.id IS NULL)::integer AS dangling_article_links,
    count(*) FILTER (WHERE s.id IS NULL)::integer AS dangling_source_links,
    count(*) FILTER (
      WHERE als.article_id IS NOT NULL AND als.source_id IS NOT NULL
    )::integer AS populated_links
  FROM public.ie_article_sources AS als
  LEFT JOIN public.ie_articles AS a ON a.id = als.article_id
  LEFT JOIN public.ie_sources AS s ON s.id = als.source_id
)
SELECT jsonb_build_object(
  'source_totals', (
    SELECT jsonb_build_object(
      'records', count(*),
      'null_urls', count(*) FILTER (WHERE url IS NULL),
      'blank_urls', count(*) FILTER (WHERE url IS NOT NULL AND btrim(url) = ''),
      'non_https_urls', count(*) FILTER (
        WHERE url IS NOT NULL AND btrim(url) <> '' AND url !~* '^https://'
      ),
      'whitespace_urls', count(*) FILTER (WHERE url ~ '\\s'),
      'query_string_urls', count(*) FILTER (WHERE url LIKE '%?%'),
      'fragment_anchor_urls', count(*) FILTER (WHERE url LIKE '%#%'),
      'missing_titles', count(*) FILTER (WHERE nullif(btrim(title), '') IS NULL),
      'missing_citations', count(*) FILTER (WHERE nullif(btrim(citation), '') IS NULL),
      'missing_notes', count(*) FILTER (WHERE nullif(btrim(notes), '') IS NULL),
      'missing_reliability_notes', count(*) FILTER (
        WHERE nullif(btrim(reliability_note), '') IS NULL
      )
    )
    FROM source_rows
  ),
  'exact_duplicate_url_groups', (
    SELECT coalesce(
      jsonb_agg(jsonb_build_object('url', canonical_url, 'records', records)),
      '[]'::jsonb
    )
    FROM exact_duplicate_groups
  ),
  'fragment_bases_with_distinct_anchors', (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'base_url', fragment_base,
          'records', records,
          'distinct_anchors', distinct_anchors,
          'entries', entries
        ) ORDER BY fragment_base
      ),
      '[]'::jsonb
    )
    FROM fragment_anchor_groups
  ),
  'unlinked_source_records', (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'title', sr.title,
          'source_type', sr.source_type,
          'url', sr.url,
          'reliability_note', sr.reliability_note
        ) ORDER BY sr.title
      ),
      '[]'::jsonb
    )
    FROM source_rows AS sr
    LEFT JOIN public.ie_article_sources AS als ON als.source_id = sr.id
    WHERE als.source_id IS NULL
  ),
  'unlinked_source_count', (
    SELECT count(*)::integer
    FROM source_rows AS sr
    LEFT JOIN public.ie_article_sources AS als ON als.source_id = sr.id
    WHERE als.source_id IS NULL
  ),
  'article_source_link_quality', (SELECT to_jsonb(link_quality) FROM link_quality),
  'source_domain_distribution', (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object('host', host, 'records', records)
        ORDER BY records DESC, host
      ),
      '[]'::jsonb
    )
    FROM source_domains
  )
) AS phase17_source_url_integrity;
