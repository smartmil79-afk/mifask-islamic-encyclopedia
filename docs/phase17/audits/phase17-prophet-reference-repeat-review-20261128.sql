-- Phase 17 read-only audit: repeated Prophet-to-Qur'an reference coordinates.
-- Preserve array ordinality and full JSON objects for editorial review.
-- A repeated coordinate is not automatically invalid: the JSON entries can differ
-- in provenance/review metadata, and a verse may be referenced in more than one
-- Prophet record. This audit does not deduplicate or update any records.
with refs as (
  select
    p.id as prophet_id,
    p.name as prophet_name,
    e.ordinality,
    e.value as ref,
    case
      when jsonb_typeof(e.value->'surah') = 'number'
       and (e.value->>'surah') ~ '^[0-9]+$'
      then (e.value->>'surah')::integer
    end as surah,
    case
      when jsonb_typeof(e.value->'ayah') = 'number'
       and (e.value->>'ayah') ~ '^[0-9]+$'
      then (e.value->>'ayah')::integer
    end as ayah
  from public.ie_prophets p
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(p.quran_references) = 'array'
         then p.quran_references else '[]'::jsonb end
  ) with ordinality e(value, ordinality)
),
grouped as (
  select
    prophet_id, prophet_name, surah, ayah,
    count(*) as entry_count,
    count(distinct ref) as distinct_json_objects,
    count(*) - count(distinct ref) as exact_duplicate_json_objects,
    count(*) filter (where ref ? 'entry_type') as entries_with_entry_type,
    count(*) filter (where ref ? 'verification_status') as entries_with_verification_status,
    count(*) filter (where ref ? 'local_reader') as entries_with_local_reader,
    jsonb_agg(
      jsonb_build_object('ordinality', ordinality, 'reference', ref)
      order by ordinality
    ) as ordered_entries
  from refs
  where surah is not null and ayah is not null
  group by prophet_id, prophet_name, surah, ayah
),
multi_prophet_coordinates as (
  select surah, ayah
  from refs
  where surah is not null and ayah is not null
  group by surah, ayah
  having count(distinct prophet_id) > 1
)
select jsonb_build_object(
  'prophet_count', (select count(*) from public.ie_prophets),
  'reference_entries', (select count(*) from refs),
  'malformed_or_out_of_range_coordinates',
    (select count(*) from refs
     where surah is null or ayah is null
        or surah not between 1 and 114 or ayah < 1),
  'missing_local_quran_verses',
    (select count(*) from refs r
     where r.surah between 1 and 114 and r.ayah > 0
       and not exists (
         select 1 from public.ie_quran_verses q
         where q.surah_number = r.surah and q.ayah_number = r.ayah
       )),
  'distinct_prophet_surah_ayah_groups', (select count(*) from grouped),
  'repeated_groups_within_same_prophet',
    (select count(*) from grouped where entry_count > 1),
  'excess_entries_within_repeated_groups',
    (select coalesce(sum(entry_count - 1), 0) from grouped where entry_count > 1),
  'exact_duplicate_json_objects_within_groups',
    (select coalesce(sum(exact_duplicate_json_objects), 0) from grouped),
  'repeated_groups_with_metadata_variants',
    (select count(*) from grouped where entry_count > 1 and distinct_json_objects > 1),
  'repeated_groups_with_one_json_variant',
    (select count(*) from grouped where entry_count > 1 and distinct_json_objects = 1),
  'repeated_groups_missing_entry_type_on_some_entries',
    (select count(*) from grouped where entry_count > 1 and entries_with_entry_type < entry_count),
  'repeated_groups_missing_verification_status_on_some_entries',
    (select count(*) from grouped where entry_count > 1 and entries_with_verification_status < entry_count),
  'coordinates_shared_by_multiple_prophet_records',
    (select count(*) from multi_prophet_coordinates),
  'repeated_group_details',
    (select coalesce(
       jsonb_agg(to_jsonb(g) order by g.prophet_name, g.surah, g.ayah),
       '[]'::jsonb
     )
     from grouped g where g.entry_count > 1)
) as audit;
