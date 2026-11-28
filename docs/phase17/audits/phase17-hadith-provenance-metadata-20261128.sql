-- Phase 17: Hadith provenance, metadata and book/chapter coverage audit
-- Read-only. Run only after confirming the inspected public table schemas.
-- No text, grading, book, chapter, source-import, or rights metadata is modified.

with per_collection as (
  select
    h.collection_key,
    count(*) as records,
    count(*) filter (where h.arabic is null or btrim(h.arabic) = '') as arabic_gaps,
    count(*) filter (where nullif(btrim(h.translations->>'en'), '') is null) as english_gaps,
    count(*) filter (where jsonb_typeof(h.translations->'en') is distinct from 'string') as non_string_english_values,
    count(*) filter (where h.narrator is null or btrim(h.narrator) = '') as narrator_gaps,
    count(*) filter (where h.book_number is null) as book_number_gaps,
    count(*) filter (where h.chapter_number is null) as chapter_number_gaps,
    count(*) filter (where h.chapter_title is null or btrim(h.chapter_title) = '') as chapter_title_gaps,
    count(*) filter (where h.source_import_id is null) as source_import_gaps,
    count(*) filter (where nullif(btrim(h.source_refs->>'dataset'), '') is null) as source_ref_dataset_gaps,
    count(*) filter (where nullif(btrim(h.source_refs->>'edition'), '') is null) as source_ref_edition_gaps,
    count(*) filter (where nullif(btrim(h.source_refs->>'source_url'), '') is null) as source_ref_url_gaps,
    count(*) filter (where h.grading = '{}'::jsonb or h.grading = '[]'::jsonb) as empty_grading,
    count(*) filter (where h.source_refs = '{}'::jsonb or h.source_refs = '[]'::jsonb) as empty_source_refs,
    count(*) filter (where h.metadata = '{}'::jsonb or h.metadata = '[]'::jsonb) as empty_metadata,
    count(distinct h.book_number) as distinct_book_numbers,
    min(h.book_number) as min_book_number,
    max(h.book_number) as max_book_number,
    count(distinct (h.chapter_number, h.chapter_title))
      filter (where h.chapter_number is not null and h.chapter_title is not null) as distinct_chapter_pairs
  from public.ie_hadiths h
  group by h.collection_key
),
field_keys as (
  select h.collection_key, 'source_refs'::text as field_name, k.key_name, count(*) as records_with_key
  from public.ie_hadiths h
  cross join lateral jsonb_object_keys(h.source_refs) as k(key_name)
  group by h.collection_key, k.key_name
  union all
  select h.collection_key, 'metadata'::text, k.key_name, count(*)
  from public.ie_hadiths h
  cross join lateral jsonb_object_keys(h.metadata) as k(key_name)
  group by h.collection_key, k.key_name
),
imports as (
  select
    s.dataset_key,
    s.source_name,
    s.source_site,
    s.import_version,
    s.status,
    s.records_total,
    s.records_imported,
    s.records_skipped,
    s.content_hash is not null as content_hash_present,
    s.source_manifest ? 'source_hash' as source_hash_key_present,
    nullif(btrim(s.source_manifest->>'source_hash'), '') is not null as source_hash_value_present,
    s.source_manifest->>'source_url' as manifest_source_url,
    (regexp_match(
      s.source_manifest->>'source_url',
      'hadith-json/([0-9a-f]{7,40})/'
    ))[1] as git_revision_prefix,
    position('@1/' in coalesce(s.source_manifest->>'source_url', '')) > 0 as source_url_uses_mutable_tag
  from public.ie_source_imports s
  where s.dataset_key in ('malik', 'riyad')
),
collection_catalogue as (
  select jsonb_agg(jsonb_build_object(
    'collection_key', c.collection_key,
    'name', c.name,
    'name_arabic_present', nullif(btrim(c.name_arabic), '') is not null,
    'author_present', nullif(btrim(c.author), '') is not null,
    'description_present', nullif(btrim(c.description), '') is not null,
    'source_import_linked', c.source_import_id is not null,
    'metadata_type', jsonb_typeof(c.metadata),
    'metadata_keys',
      case when jsonb_typeof(c.metadata) = 'object'
        then (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(c.metadata) k)
        else '[]'::jsonb end
  ) order by c.collection_key) as items
  from public.ie_hadith_collections c
),
duplicate_keys as (
  select count(*) as duplicate_key_groups
  from (
    select collection_key, hadith_number
    from public.ie_hadiths
    group by collection_key, hadith_number
    having count(*) > 1
  ) d
)
select jsonb_build_object(
  'per_collection',
    (select jsonb_agg(to_jsonb(p) order by p.collection_key) from per_collection p),
  'duplicate_collection_number_groups',
    (select duplicate_key_groups from duplicate_keys),
  'hadith_book_catalogue_rows',
    (select count(*) from public.ie_hadith_books),
  'collection_catalogue',
    (select items from collection_catalogue),
  'source_imports',
    (select jsonb_agg(jsonb_build_object(
      'dataset_key', i.dataset_key,
      'source_name', i.source_name,
      'source_site', i.source_site,
      'import_version', i.import_version,
      'status', i.status,
      'records_total', i.records_total,
      'records_imported', i.records_imported,
      'records_skipped', i.records_skipped,
      'content_hash_present', i.content_hash_present,
      'source_hash_key_present', i.source_hash_key_present,
      'source_hash_value_present', i.source_hash_value_present,
      'manifest_source_url', i.manifest_source_url,
      'git_revision_prefix', i.git_revision_prefix,
      'git_revision_prefix_length',
        case when i.git_revision_prefix is null then null else length(i.git_revision_prefix) end,
      'source_url_uses_mutable_tag', i.source_url_uses_mutable_tag
    ) order by i.dataset_key) from imports i),
  'json_key_coverage',
    (select jsonb_agg(to_jsonb(k) order by k.collection_key, k.field_name, k.key_name) from field_keys k)
) as phase17_hadith_provenance_audit;
