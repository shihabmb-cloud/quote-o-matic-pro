-- ============ ENUM ============
create type public.app_role as enum ('super_admin','manager','crm','purchase');

-- ============ COMPANIES ============
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
grant select on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

insert into public.companies (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Nexline Systems Integration');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key,
  company_id uuid not null references public.companies(id) on delete cascade default '11111111-1111-1111-1111-111111111111',
  full_name text not null default '',
  email text not null default '',
  job_title text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_company()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create policy "own company readable" on public.companies for select to authenticated
  using (id = public.current_company());

create policy "profiles in company readable" on public.profiles for select to authenticated
  using (company_id = public.current_company());
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid());

create policy "roles readable in company" on public.user_roles for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = user_roles.user_id and p.company_id = public.current_company()));

-- signup trigger: profile + default crm role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'crm'::public.app_role))
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ CUSTOMERS ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  name text not null,
  contact_person text not null default '',
  designation text not null default '',
  mobile text not null default '',
  email text not null default '',
  website text not null default '',
  address text not null default '',
  city text not null default '',
  country text not null default 'UAE',
  trn text not null default '',
  industry text not null default '',
  salesperson text not null default '',
  customer_type text not null default 'Prospect',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ============ SUPPLIERS ============
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  name text not null,
  contact_person text not null default '',
  mobile text not null default '',
  email text not null default '',
  country text not null default 'UAE',
  city text not null default '',
  brands text not null default '',
  payment_terms text not null default 'Net 30',
  delivery_terms text not null default '',
  currency text not null default 'AED',
  reliability_notes text not null default '',
  created_at timestamptz not null default now()
);

-- ============ LEADS ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_no text not null,
  lead_date date not null default current_date,
  company_name text not null,
  contact_person text not null default '',
  mobile text not null default '',
  email text not null default '',
  source text not null default 'Website',
  salesperson text not null default '',
  requirement text not null default '',
  expected_value numeric not null default 0,
  probability int not null default 50,
  next_followup date,
  status text not null default 'New',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ============ RFQ ============
create table public.rfqs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  rfq_no text not null,
  customer_id uuid references public.customers(id) on delete set null,
  salesperson text not null default '',
  rfq_date date not null default current_date,
  required_date date,
  customer_reference text not null default '',
  project_name text not null default '',
  priority text not null default 'Normal',
  status text not null default 'DRAFT',
  notes text not null default '',
  shipping_cost numeric not null default 0,
  other_cost numeric not null default 0,
  target_gp_percent numeric not null default 20,
  submitted_at timestamptz,
  submitted_by text,
  ready_at timestamptz,
  ready_by text,
  created_at timestamptz not null default now()
);

create table public.rfq_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  category text not null default '',
  brand text not null default '',
  model text not null default '',
  part_number text not null default '',
  description text not null default '',
  quantity numeric not null default 1,
  target_price numeric not null default 0,
  selling_price numeric not null default 0,
  selected_quote_id uuid,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  rfq_item_id uuid not null references public.rfq_items(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  unit_cost numeric not null default 0,
  availability text not null default 'In stock',
  delivery_days int not null default 7,
  warranty text not null default '1 yr',
  payment_terms text not null default 'Net 30',
  quote_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.rfq_items
  add constraint rfq_items_selected_quote_fk
  foreign key (selected_quote_id) references public.supplier_quotes(id) on delete set null;

-- ============ QUOTATIONS ============
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  quotation_no text not null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  salesperson text not null default '',
  quote_date date not null default current_date,
  valid_until date,
  status text not null default 'Draft',
  payment_terms text not null default '30 days from invoice',
  delivery_terms text not null default 'Within 7 days',
  vat_percent numeric not null default 5,
  notes text not null default '',
  approval_status text not null default 'Not required',
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  description text not null default '',
  part_number text not null default '',
  quantity numeric not null default 1,
  unit_cost numeric not null default 0,
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============ FOLLOW UPS ============
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  due_date date not null default current_date,
  due_time text not null default '10:00',
  type text not null default 'Call',
  owner text not null default '',
  notes text not null default '',
  next_action text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  title text not null,
  message text not null default '',
  target_role public.app_role,
  rfq_id uuid references public.rfqs(id) on delete cascade,
  quotation_id uuid references public.quotations(id) on delete cascade,
  sender text not null default 'System',
  kind text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ ACTIVITY LOG ============
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default '11111111-1111-1111-1111-111111111111' references public.companies(id) on delete cascade,
  actor text not null default '',
  action text not null,
  entity text not null default '',
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ============ GRANTS + RLS (company scoped) ============
do $$
declare t text;
begin
  foreach t in array array['customers','suppliers','leads','rfqs','rfq_items','supplier_quotes','quotations','quotation_items','follow_ups','notifications','activity_logs']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "company read %1$s" on public.%1$I for select to authenticated using (company_id = public.current_company())', t);
    execute format('create policy "company insert %1$s" on public.%1$I for insert to authenticated with check (company_id = public.current_company())', t);
    execute format('create policy "company update %1$s" on public.%1$I for update to authenticated using (company_id = public.current_company())', t);
    execute format('create policy "company delete %1$s" on public.%1$I for delete to authenticated using (company_id = public.current_company())', t);
  end loop;
end $$;

create index on public.rfq_items (rfq_id);
create index on public.supplier_quotes (rfq_item_id);
create index on public.quotation_items (quotation_id);
create index on public.notifications (company_id, created_at desc);
create index on public.activity_logs (company_id, created_at desc);
