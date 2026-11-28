-- Phase 17 read-only review of Prophet Qur'an-reference repetition.
-- This audit identifies exact duplicate JSON entries separately from metadata variants.
-- It preserves array positions and does not update or delete any reference.
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
    case
      when jsonb_typeof(p.quran_references) = 'array'
      then p.quran_references
      else '[]'::jsonb
    end
  ) with ordinality e(value, ordinality)
),
ranked_exact as (
  select
    r.*,
    row_number() over (
      partition by prophet_id, ref
      order by ordinality
    ) as exact_object_occurrence
  from refs r
),
coordinate_groups as (
  select
    prophet_id,
    prophet_name,
    surah,
    ayah,
    count(*) as entry_count,
    count(distinct ref) as distinct_json_variants,
    count(*) - count(distinct ref) as exact_duplicate_entries,
    count(*) filter (where not (ref ? 'entry_type')) as missing_entry_type,
    count(*) filter (where not (ref ? 'verification_status')) as missing_verification_status,
    count(*) filter (where not (ref ? 'local_reader')) as missing_local_reader,
    jsonb_agg(
      jsonb_build_object('ordinality', ordinality, 'reference', ref)
      order by ordinality
    ) as ordered_entries
  from refs
  where surah between 1 and 114 and ayah > 0
  group by prophet_id, prophet_name, surah, ayah
),
shared_coordinates as (
  select surah, ayah
  from refs
  where surah between 1 and 114 and ayah > 0
  group by surah, ayah
  having count(distinct prophet_id) > 1
)
select jsonb_build_object(
  'prophet_records', (select count(*) from public.ie_prophets),
  'reference_entries', (select count(*) from refs),
  'malformed_or_out_of_range_coordinates',
    (select count(*) from refs
     where surah is null or ayah is null
        or surah not between 1 and 114 or ayah < 1),
  'references_without_local_quran_verse',
    (select count(*) from refs r
     where r.surah between 1 and 114 and r.ayah > 0
       and not exists (
         select 1
         from public.ie_quran_verses q
         where q.surah_number = r.surah
           and q.ayah_number = r.ayah
       )),
  'distinct_prophet_coordinate_groups',
    (select count(*) from coordinate_groups),
  'repeated_coordinate_groups',
    (select count(*) from coordinate_groups where entry_count > 1),
  'exact_duplicate_json_entries',
    (select count(*) from ranked_exact where exact_object_occurrence > 1),
  'exact_duplicate_groups',
    (select count(*) from coordinate_groups where exact_duplicate_entries > 0),
  'metadata_variant_groups',
    (select count(*) from coordinate_groups where distinct_json_variants > 1),
  'references_missing_any_review_or_reader_metadata',
    (select count(*) from refs
     where not (ref ? 'entry_type')
        or not (ref ? 'verification_status')
        or not (ref ? 'local_reader')),
  'coordinates_shared_across_prophet_records',
    (select count(*) from shared_coordinates),
  'exact_duplicate_candidate_positions',
    (select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'prophet', prophet_name,
          'surah', surah,
          'ayah', ayah,
          'ordinality', ordinality,
          'reference', ref
        )
        order by prophet_name, surah, ayah, ordinality
      ),
      '[]'::jsonb
    )
    from ranked_exact
    where exact_object_occurrence > 1),
  'metadata_variant_group_details',
    (select coalesce(
      jsonb_agg(to_jsonb(g) order by g.prophet_name, g.surah, g.ayah),
      '[]'::jsonb
    )
    from coordinate_groups g
    where g.distinct_json_variants > 1)
) as audit;
