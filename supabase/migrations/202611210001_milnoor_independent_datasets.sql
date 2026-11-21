-- Independent Milnoor content migration: copied datasets stored in MIFASK-owned tables.
create table if not exists public.ie_source_imports (
  id uuid primary key default gen_random_uuid(), source_name text not null, source_site text, source_path text, dataset_key text not null,
  import_version text, status text not null default 'pending' check (status in ('pending','running','completed','failed','partial')),
  records_total integer not null default 0, records_imported integer not null default 0, records_skipped integer not null default 0,
  content_hash text, notes text, source_manifest jsonb not null default '{}'::jsonb,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ie_quran_surahs (
  surah_number smallint primary key check (surah_number between 1 and 114), name_arabic text not null, name_transliteration text,
  name_english text, revelation_type text, ayah_count smallint, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.ie_quran_verses (
  surah_number smallint not null references public.ie_quran_surahs(surah_number) on delete cascade, ayah_number smallint not null,
  arabic text not null, transliteration text, translations jsonb not null default '{}'::jsonb, audio_urls jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb, source_import_id uuid references public.ie_source_imports(id) on delete set null,
  updated_at timestamptz not null default now(), primary key (surah_number, ayah_number)
);
create table if not exists public.ie_hadith_collections (
  collection_key text primary key, name text not null, name_arabic text, author text, description text, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.ie_hadith_books (
  collection_key text not null references public.ie_hadith_collections(collection_key) on delete cascade, book_number integer not null,
  name text, name_arabic text, metadata jsonb not null default '{}'::jsonb, source_import_id uuid references public.ie_source_imports(id) on delete set null,
  updated_at timestamptz not null default now(), primary key (collection_key, book_number)
);
create table if not exists public.ie_hadiths (
  collection_key text not null references public.ie_hadith_collections(collection_key) on delete cascade, hadith_number text not null,
  book_number integer, chapter_number integer, chapter_title text, arabic text, translations jsonb not null default '{}'::jsonb,
  narrator text, grading jsonb not null default '{}'::jsonb, source_refs jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now(),
  primary key (collection_key, hadith_number)
);
create table if not exists public.ie_adhkar (
  id text primary key, title text not null, category text, arabic text, transliteration text, translations jsonb not null default '{}'::jsonb,
  repetition integer, source_refs jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.ie_duas (
  id text primary key, title text not null, category text, arabic text, transliteration text, translations jsonb not null default '{}'::jsonb,
  source_reference text, metadata jsonb not null default '{}'::jsonb, source_import_id uuid references public.ie_source_imports(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.ie_names_of_allah (
  number smallint primary key check (number between 1 and 99), arabic text not null, transliteration text,
  meanings jsonb not null default '{}'::jsonb, explanation text, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.ie_seerah_events (
  id text primary key, event_date text, hijri_date text, title text not null, description text, location text,
  source_refs jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.ie_prophets (
  id text primary key, name text not null, name_arabic text, name_transliteration text, quran_references jsonb not null default '[]'::jsonb,
  story text, lessons jsonb not null default '[]'::jsonb, metadata jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.ie_source_imports(id) on delete set null, updated_at timestamptz not null default now()
);
create index if not exists ie_quran_verses_search_idx on public.ie_quran_verses using gin (to_tsvector('simple', coalesce(arabic,'') || ' ' || coalesce(transliteration,'') || ' ' || translations::text);
create index if not exists ie_hadiths_collection_book_idx on public.ie_hadiths(collection_key, book_number, chapter_number);
create index if not exists ie_hadiths_search_idx on public.ie_hadiths using gin (to_tsvector('simple', coalesce(arabic,'') || ' ' || translations::text || ' ' || coalesce(narrator,'')));
create index if not exists ie_adhkar_category_idx on public.ie_adhkar(category);
create index if not exists ie_duas_category_idx on public.ie_duas(category);
alter table public.ie_source_imports enable row level security;
alter table public.ie_quran_surahs enable row level security;
alter table public.ie_quran_verses enable row level security;
alter table public.ie_hadith_collections enable row level security;
alter table public.ie_hadith_books enable row level security;
alter table public.ie_hadiths enable row level security;
alter table public.ie_adhkar enable row level security;
alter table public.ie_duas enable row level security;
alter table public.ie_names_of_allah enable row level security;
alter table public.ie_seerah_events enable row level security;
alter table public.ie_prophets enable row level security;
grant select on public.ie_quran_surahs, public.ie_quran_verses, public.ie_hadith_collections, public.ie_hadith_books, public.ie_hadiths, public.ie_adhkar, public.ie_duas, public.ie_names_of_allah, public.ie_seerah_events, public.ie_prophets to anon, authenticated;
create policy "Public read Quran surahs" on public.ie_quran_surahs for select to anon, authenticated using (true);
create policy "Public read Quran verses" on public.ie_quran_verses for select to anon, authenticated using (true);
create policy "Public read hadith collections" on public.ie_hadith_collections for select to anon, authenticated using (true);
create policy "Public read hadith books" on public.ie_hadith_books for select to anon, authenticated using (true);
create policy "Public read hadiths" on public.ie_hadiths for select to anon, authenticated using (true);
create policy "Public read adhkar" on public.ie_adhkar for select to anon, authenticated using (true);
create policy "Public read duas" on public.ie_duas for select to anon, authenticated using (true);
create policy "Public read names" on public.ie_names_of_allah for select to anon, authenticated using (true);
create policy "Public read seerah" on public.ie_seerah_events for select to anon, authenticated using (true);
create policy "Public read prophets" on public.ie_prophets for select to anon, authenticated using (true);
