-- Phase 17: Quranic Dua and Seerah reference-lineage audit
-- Date: 2026-11-28
-- Project: honsqapwikfghoubwhcf
-- READ ONLY. Schema inspected before execution:
--   ie_duas(id, arabic, transliteration, translations jsonb, metadata jsonb, source_import_id uuid)
--   ie_seerah_events(id, title, source_refs jsonb, metadata jsonb, source_import_id uuid)
--   ie_quran_verses(surah_number, ayah_number, arabic, translations jsonb, source_import_id uuid)
--   ie_source_imports(id, dataset_key, import_version, status, source_manifest jsonb)
--
-- Important JSON shape confirmed live:
--   ie_duas.translations->'en' is an OBJECT; its text is ->>'text'.
--   This supersedes the earlier mistaken assumption that Dua English values are strings.

-- 1. Complete Dua coverage using the confirmed nested JSON path.
select
  count(*) as total_duas,
  count(*) filter (where source_import_id is not null) as linked_source_imports,
  count(*) filter (where source_import_id is null) as unlinked_source_imports,
  count(*) filter (where jsonb_typeof(translations->'en')='object') as english_object_records,
  count(*) filter (where nullif(btrim(translations->'en'->>'text'),'') is not null) as nested_english_text_present,
  count(*) filter (
    where nullif(btrim(translations->'en'->>'edition'),'') is not null
      and nullif(btrim(translations->'en'->>'version'),'') is not null
      and nullif(btrim(translations->'en'->>'publisher'),'') is not null
      and nullif(btrim(translations->'en'->>'source_url'),'') is not null
  ) as nested_translation_provenance_complete,
  count(*) filter (where nullif(btrim(arabic),'') is null) as arabic_gaps,
  count(*) filter (where nullif(btrim(transliteration),'') is null) as transliteration_gaps
from public.ie_duas;

-- 2. Inspect each unlinked Qur'anic Dua against its explicit Surah/Ayah metadata
-- and the canonical local verse. No source_import_id is changed by this audit.
with dua_refs as (
  select d.id, d.title, d.arabic, d.translations, d.metadata,
    case when (d.metadata->'quran_reference'->>'surah') ~ '^[0-9]+$'
      then (d.metadata->'quran_reference'->>'surah')::integer end as surah_number,
    case when (d.metadata->'quran_reference'->>'ayah') ~ '^[0-9]+$'
      then (d.metadata->'quran_reference'->>'ayah')::integer end as ayah_number
  from public.ie_duas d
  where d.source_import_id is null
    and jsonb_typeof(d.metadata->'quran_reference')='object'
)
select d.id, d.surah_number, d.ayah_number,
  (d.arabic is not distinct from q.arabic) as arabic_exact_match,
  (d.translations->'en'->>'text' is not distinct from q.translations->'en'->>'text') as english_exact_match,
  d.metadata->>'translation_edition' as dua_translation_edition,
  q.translations->'en'->>'edition' as verse_edition,
  q.translations->'en'->>'version' as verse_version,
  q.translations->'en'->>'publisher' as verse_publisher,
  q.translations->'en'->>'source_url' as verse_source_url,
  q.source_import_id as candidate_verse_import_id,
  si.dataset_key, si.import_version, si.status as import_status,
  si.source_manifest->>'source_url' as manifest_source_url
from dua_refs d
left join public.ie_quran_verses q
  on q.surah_number=d.surah_number and q.ayah_number=d.ayah_number
left join public.ie_source_imports si on si.id=q.source_import_id
order by d.id;

-- 3. Inspect each unlinked Seerah record's explicit Qur'an reference against
-- the canonical local verse and its existing import manifest. This is reference
-- traceability only; the Seerah source_import_id remains NULL pending review.
with seerah_refs as (
  select e.id, e.title, e.source_refs, e.metadata,
    case when (e.source_refs->0->>'surah') ~ '^[0-9]+$'
      then (e.source_refs->0->>'surah')::integer end as surah_number,
    case when (e.source_refs->0->>'ayah') ~ '^[0-9]+$'
      then (e.source_refs->0->>'ayah')::integer end as ayah_number
  from public.ie_seerah_events e
  where e.source_import_id is null
)
select s.id, s.title,
  jsonb_array_length(s.source_refs) as source_ref_count,
  s.source_refs->0->>'url' as cited_url,
  s.source_refs->0->>'label' as cited_label,
  s.metadata->>'entry_type' as entry_type,
  s.metadata->>'narrative_status' as narrative_status,
  s.metadata->>'chronology_status' as chronology_status,
  (q.surah_number is not null) as local_quran_verse_exists,
  q.source_import_id as candidate_verse_import_id,
  si.dataset_key, si.import_version, si.status as import_status
from seerah_refs s
left join public.ie_quran_verses q
  on q.surah_number=s.surah_number and q.ayah_number=s.ayah_number
left join public.ie_source_imports si on si.id=q.source_import_id
order by s.id;
