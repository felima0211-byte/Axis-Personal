-- Base RLS foundation for Axis Personal
-- Rule: every new table is born with RLS enabled and no policy = access denied.
-- Only explicit policies for the owner unlock access.

-- Helper function: returns true only for the owner's user ID.
-- The owner's UUID is stored in app metadata; set it via service role after first auth.
-- For simplicity we compare against auth.email() matching the OWNER_EMAIL env var.
-- A more robust approach (used in later migrations) stores the owner UUID in a config table.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
as $$
  select auth.role() = 'authenticated'
    and exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and u.email = current_setting('app.owner_email', true)
    );
$$;

comment on function public.is_owner() is
  'Returns true if the current session belongs to the single owner of this application.';

-- Revoke public execution; only authenticated role needs it.
revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;
