-- Phase 17: article reviewer-assignment and verification-readiness audit
-- Date: 2026-11-28
-- READ-ONLY. No records, policies, grants, or schema objects are modified.

-- 1. Confirm the exact editorial fields used by this audit.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ie_articles'
  and column_name in (
    'slug', 'title', 'status', 'author_name', 'reviewer_name',
    'verification_status', 'verified_by', 'verified_at',
    'verification_notes', 'reference_texts', 'content'
  )
order by ordinal_position;

-- 2. Coverage by publication and verification state.
select
  status,
  verification_status,
  count(*) as article_count,
  count(*) filter (where nullif(btrim(author_name), '') is null) as missing_author,
  count(*) filter (where nullif(btrim(reviewer_name), '') is null) as missing_reviewer,
  count(*) filter (where nullif(btrim(verified_by), '') is null) as missing_verified_by,
  count(*) filter (where verified_at is null) as missing_verified_at,
  count(*) filter (
    where verification_status = 'verified'
      and (nullif(btrim(verified_by), '') is null or verified_at is null)
  ) as verified_without_identity_or_timestamp,
  count(*) filter (
    where verification_status <> 'verified'
      and (verified_by is not null or verified_at is not null)
  ) as unverified_with_verifier_metadata,
  count(*) filter (
    where jsonb_typeof(content) <> 'array'
      or jsonb_array_length(case when jsonb_typeof(content) = 'array' then content else '[]'::jsonb end) = 0
  ) as empty_or_invalid_content
from public.ie_articles
group by status, verification_status
order by status, verification_status;

-- 3. Published article review readiness and linked-source counts.
select
  a.slug,
  a.title,
  a.status,
  a.verification_status,
  a.author_name,
  a.reviewer_name,
  a.verified_by,
  a.verified_at,
  count(s.source_id) as source_link_count,
  cardinality(a.reference_texts) as reference_text_count
from public.ie_articles a
left join public.ie_article_sources s on s.article_id = a.id
where a.status = 'published'
group by a.id
order by a.slug;

-- 4. Aggregate reviewer coverage for the complete editorial library.
select
  count(*) as total_articles,
  count(*) filter (where nullif(btrim(reviewer_name), '') is not null) as named_reviewers,
  count(*) filter (where nullif(btrim(reviewer_name), '') is null) as missing_reviewer,
  count(*) filter (where verification_status = 'verified') as verified_articles,
  count(*) filter (where status = 'published' and verification_status <> 'verified') as published_unverified,
  count(*) filter (where status = 'review' and verification_status = 'unverified') as review_unverified
from public.ie_articles;
