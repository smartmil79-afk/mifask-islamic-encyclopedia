create or replace function public.ie_normalize_arabic(input_text text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $function$
  select translate(
    translate(coalesce(input_text, ''), 'ًٌٍَُِّْٰۣۡۢۤۥۦۧۨ۩۪ۭ۫۬ـ', ''),
    'ٱأإآى',
    'ااااي'
  );
$function$;

create or replace function public.ie_search_quran(p_query text, p_limit integer default 50)
returns table(surah_number smallint, ayah_number smallint, arabic text)
language sql
stable
security invoker
set search_path = public, pg_temp
as $function$
  with normalized_query as (
    select public.ie_normalize_arabic(p_query) as q
  )
  select v.surah_number, v.ayah_number, v.arabic
  from public.ie_quran_verses v
  cross join normalized_query q
  where q.q <> ''
    and strpos(public.ie_normalize_arabic(v.arabic), q.q) > 0
  order by v.surah_number, v.ayah_number
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$function$;

grant execute on function public.ie_normalize_arabic(text) to anon, authenticated;
grant execute on function public.ie_search_quran(text, integer) to anon, authenticated;
