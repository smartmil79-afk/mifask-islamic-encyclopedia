-- Secure one-time bootstrap for the first Mifask Islamic Encyclopedia CMS admin.
-- Only the explicitly authorized email may claim the role, and only while ie_admins is empty.
create or replace function public.ie_bootstrap_first_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(email) into current_email
  from auth.users
  where id = current_user_id;

  if current_email is distinct from 'smartmil79@gmail.com' then
    raise exception 'This email is not authorized for initial administrator setup';
  end if;

  perform pg_advisory_xact_lock(hashtext('mifask_ie_first_admin'));

  if exists (select 1 from public.ie_admins) then
    raise exception 'Initial administrator has already been created';
  end if;

  insert into public.ie_admins (user_id, display_name, role, active)
  values (current_user_id, 'Mifask Administrator', 'admin', true);

  return true;
end;
$$;

revoke all on function public.ie_bootstrap_first_admin() from public;
revoke all on function public.ie_bootstrap_first_admin() from anon;
grant execute on function public.ie_bootstrap_first_admin() to authenticated;
