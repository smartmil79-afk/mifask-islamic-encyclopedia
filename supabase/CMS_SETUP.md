# Mifask Islamic Encyclopedia CMS Setup

## Database
CMS tables use the isolated `ie_*` namespace. RLS is enabled. Public readers can access active categories and published articles. CMS access requires an active row in `ie_admins`.

## Configure Vercel
Set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable/anon key only; never expose service-role or secret keys)

## First administrator
The Admin page includes a one-time setup flow. The first CMS administrator is restricted to **smartmil79@gmail.com**:
1. Visit `/admin`.
2. Select **Set up first administrator**.
3. Create the account using the authorized email.
4. If email confirmation is required, confirm it, then return and sign in.
5. The app calls the one-time bootstrap RPC. It can only grant admin to the allowlisted email while `ie_admins` is empty; a database advisory lock prevents simultaneous claims.
6. Once the first admin exists, the bootstrap function refuses further claims.

The SQL function is in `supabase/migrations/20261120_secure_first_admin_bootstrap.sql`.

## CMS
Visit `/admin`, sign in, and create articles. New content should start as Draft or Review. Only explicitly Published articles are public. Keep citations specific and check references before publishing.
