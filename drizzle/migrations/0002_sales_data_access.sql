create or replace function public.can_access_sales()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('crm','manager','super_admin'))
$$;

do $$
declare t text;
begin
  foreach t in array array['customers','leads','quotations','quotation_items','follow_ups'] loop
    execute format('drop policy if exists "company read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company delete %1$s" on public.%1$I', t);
    execute format('create policy "sales read %1$s" on public.%1$I for select to authenticated using (company_id = public.current_company() and public.can_access_sales())', t);
    execute format('create policy "sales insert %1$s" on public.%1$I for insert to authenticated with check (company_id = public.current_company() and public.can_access_sales())', t);
    execute format('create policy "sales update %1$s" on public.%1$I for update to authenticated using (company_id = public.current_company() and public.can_access_sales())', t);
    execute format('create policy "sales delete %1$s" on public.%1$I for delete to authenticated using (company_id = public.current_company() and public.can_access_sales())', t);
  end loop;
end $$;