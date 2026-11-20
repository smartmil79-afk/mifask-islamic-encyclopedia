# Mifask Islamic Encyclopedia CMS Setup

## Database
Migrations create isolated `ie_*` tables in the existing Supabase project. RLS is enabled. Public readers can access active categories and published articles. CMS editing is restricted to active records in `ie_admins`.

## Configure Vercel
Add these environment variables to the Vercel project and redeploy:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only; never use service-role or secret keys in the browser)

## Create the first CMS administrator
1. Create the intended editor account through Supabase Authentication (email/password) and confirm it.
2. Copy that user's UUID from Authentication > Users.
3. In Supabase SQL Editor, insert the UUID into the CMS admin table:

```sql
insert into public.ie_admins (user_id, display_name, role, active)
values ('YOUR-AUTH-USER-UUID', 'Encyclopedia Admin', 'admin', true);
```

## CMS
Visit `/admin`, sign in, and create articles. New content should start as Draft or Review. Only articles explicitly marked Published are publicly readable through database policies. Keep citations specific and check references before publishing.
