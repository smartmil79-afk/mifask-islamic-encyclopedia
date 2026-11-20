-- Mifask Islamic Encyclopedia isolated content schema (public namespace, ie_ prefix)
create table if not exists public.ie_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ie_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  content jsonb not null default '[]'::jsonb,
  arabic_text text,
  category_id uuid references public.ie_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','review','verified','published','archived')),
  author_name text,
  reviewer_name text,
  reading_minutes integer,
  tags text[] not null default '{}',
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ie_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('quran','hadith','book','scholar','website','other')),
  title text not null,
  citation text,
  url text,
  notes text,
  reliability_note text,
  created_at timestamptz not null default now()
);
create table if not exists public.ie_article_sources (
  article_id uuid not null references public.ie_articles(id) on delete cascade,
  source_id uuid not null references public.ie_sources(id) on delete cascade,
  citation_detail text,
  primary key (article_id, source_id)
);
create table if not exists public.ie_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.ie_articles(id) on delete cascade,
  revision_number integer not null,
  snapshot jsonb not null,
  changed_by text,
  change_note text,
  created_at timestamptz not null default now(),
  unique(article_id, revision_number)
);
create index if not exists ie_articles_category_idx on public.ie_articles(category_id);
create index if not exists ie_articles_status_idx on public.ie_articles(status);
create index if not exists ie_articles_published_idx on public.ie_articles(published_at desc) where status = 'published';
create index if not exists ie_articles_search_idx on public.ie_articles using gin (to_tsvector('english'::regconfig, coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(array_to_string(tags,' '),'')));
alter table public.ie_categories enable row level security;
alter table public.ie_articles enable row level security;
alter table public.ie_sources enable row level security;
alter table public.ie_article_sources enable row level security;
alter table public.ie_article_revisions enable row level security;
drop policy if exists "IE categories public read" on public.ie_categories;
create policy "IE categories public read" on public.ie_categories for select to anon, authenticated using (is_active = true);
drop policy if exists "IE published articles public read" on public.ie_articles;
create policy "IE published articles public read" on public.ie_articles for select to anon, authenticated using (status = 'published');
drop policy if exists "IE sources public read when attached to published article" on public.ie_sources;
create policy "IE sources public read when attached to published article" on public.ie_sources for select to anon, authenticated using (
  exists (select 1 from public.ie_article_sources x join public.ie_articles a on a.id=x.article_id where x.source_id=ie_sources.id and a.status='published')
);
drop policy if exists "IE article source links public read when article published" on public.ie_article_sources;
create policy "IE article source links public read when article published" on public.ie_article_sources for select to anon, authenticated using (
  exists (select 1 from public.ie_articles a where a.id=ie_article_sources.article_id and a.status='published')
);
grant select on public.ie_categories, public.ie_articles, public.ie_sources, public.ie_article_sources to anon, authenticated;
revoke all on public.ie_article_revisions from anon, authenticated;
grant all on public.ie_categories, public.ie_articles, public.ie_sources, public.ie_article_sources, public.ie_article_revisions to service_role;
insert into public.ie_categories (slug,name,description,icon,sort_order) values
('quran','The Qur’an','Surahs, verses, tafsir and Qur’anic themes','☾',1),
('hadith','Hadith & Sunnah','Prophetic sayings, actions and guidance','✧',2),
('prophets','The Prophets','Stories and lessons from the Prophets','◈',3),
('seerah','Seerah','The life and legacy of Prophet Muhammad ﷺ','۞',4),
('aqeedah','Aqeedah','The foundations of Islamic belief','◇',5),
('fiqh','Fiqh','Worship, transactions and Muslim life','⚖',6),
('history','Islamic History','Civilizations, events and timelines','⌛',7),
('companions','The Companions','Lives of the Sahabah and Sahabiyyat','✦',8),
('scholars','Scholars','Lives, works and contributions','▤',9),
('duas','Duas & Adhkar','Supplications for daily life','❋',10),
('muslim-life','Muslim Life','Family, character, community and ethics','⌂',11),
('dictionary','Islamic Dictionary','Terms, concepts and Arabic meanings','Aa',12)
on conflict (slug) do update set name=excluded.name, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order;
