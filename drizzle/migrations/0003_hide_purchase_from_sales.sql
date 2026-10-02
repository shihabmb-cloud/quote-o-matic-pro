create or replace function public.can_access_purchase()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('purchase','manager','super_admin'))
$$;

do $$
declare t text;
begin
  foreach t in array array['suppliers','supplier_quotes'] loop
    execute format('drop policy if exists "company read %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company insert %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company update %1$s" on public.%1$I', t);
    execute format('drop policy if exists "company delete %1$s" on public.%1$I', t);
    execute format('create policy "purchase read %1$s" on public.%1$I for select to authenticated using (company_id = public.current_company() and public.can_access_purchase())', t);
    execute format('create policy "purchase insert %1$s" on public.%1$I for insert to authenticated with check (company_id = public.current_company() and public.can_access_purchase())', t);
    execute format('create policy "purchase update %1$s" on public.%1$I for update to authenticated using (company_id = public.current_company() and public.can_access_purchase())', t);
    execute format('create policy "purchase delete %1$s" on public.%1$I for delete to authenticated using (company_id = public.current_company() and public.can_access_purchase())', t);
  end loop;
end $$;

revoke select on public.quotation_items from authenticated;
grant select (id, company_id, quotation_id, description, part_number, quantity, unit_price, created_at) on public.quotation_items to authenticated;

create or replace function public.quotation_item_costs()
returns table (id uuid, unit_cost numeric) language sql stable security definer set search_path = public as $$
  select qi.id, qi.unit_cost from public.quotation_items qi
  where qi.company_id = public.current_company() and public.can_access_purchase()
$$;
grant execute on function public.quotation_item_costs() to authenticated;

alter table public.quotations add column if not exists gp_percent numeric;
update public.quotations q set gp_percent = s.gp from (
  select quotation_id, case when sum(unit_price*quantity) > 0
    then round(100 * (sum(unit_price*quantity) - sum(unit_cost*quantity)) / sum(unit_price*quantity), 2) else 0 end as gp
  from public.quotation_items group by quotation_id
) s where s.quotation_id = q.id;