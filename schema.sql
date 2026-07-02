-- ============================================================
-- Lafayette · Repairs & Orders — Supabase schema
-- Run this once in the Supabase SQL editor for the NEW project
-- (separate from the inventory-management-lafa database).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists repair_tickets (
  id                  uuid primary key default gen_random_uuid(),
  ticket_number       text not null unique,
  branch              text not null check (branch in ('טירה','טמרה')),

  -- Stage 1
  service_type        text,
  item_type           text,
  warranty            text,
  quantity            int,
  item_description    text,
  fault_description   text,
  customer_name       text,
  seller_name         text,
  open_date           date,
  open_date_confirmed boolean not null default false,
  phone_primary       text,
  phone_secondary     text,

  -- Stage 2
  repair_cost         numeric,
  paid_amount         numeric,
  payment_method      text,
  notes2              text,

  -- Stage 3
  status              text,
  left_date           date,
  left_date_confirmed boolean not null default false,

  -- Stage 4 (jsonb keeps each contact attempt as one unit — matches the UI exactly)
  contact1            jsonb not null default '{"made":false,"employee":"","date":null,"dateConfirmed":false,"result":"","notes":""}'::jsonb,
  contact2            jsonb not null default '{"made":false,"employee":"","date":null,"dateConfirmed":false,"result":"","notes":""}'::jsonb,

  -- Stage 5
  picked_up_date           date,
  picked_up_date_confirmed boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_repair_tickets_branch on repair_tickets(branch);
create index if not exists idx_repair_tickets_status on repair_tickets(status);
create index if not exists idx_repair_tickets_open_date on repair_tickets(open_date);

create table if not exists repair_employees (
  id      uuid primary key default gen_random_uuid(),
  branch  text not null check (branch in ('טירה','טמרה')),
  name    text not null,
  unique(branch, name)
);

-- Single-row counter table used for atomic, collision-free ticket numbering
-- across both branches (this is what prevents two devices creating a ticket
-- at the exact same moment from ever getting the same number).
create table if not exists repair_counters (
  id           text primary key default 'global',
  next_number  int not null default 1000
);
insert into repair_counters (id, next_number)
  values ('global', 1000) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RPC: atomic "get me the next ticket number and reserve it"
-- ------------------------------------------------------------
create or replace function get_next_ticket_number()
returns text
language plpgsql
security definer
as $$
declare
  v_next int;
begin
  update repair_counters
    set next_number = next_number + 1
    where id = 'global'
    returning next_number - 1 into v_next;
  return lpad(v_next::text, 4, '0');
end;
$$;

-- ------------------------------------------------------------
-- RPC: create a new ticket (called once, right when "קריאה חדשה" is clicked)
-- ------------------------------------------------------------
create or replace function create_repair_ticket(p_branch text)
returns repair_tickets
language plpgsql
security definer
as $$
declare
  v_number text;
  v_row repair_tickets;
begin
  v_number := get_next_ticket_number();
  insert into repair_tickets (ticket_number, branch)
    values (v_number, p_branch)
    returning * into v_row;
  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- RPC: admin override of the ticket number (for migrating old paper tickets)
-- ------------------------------------------------------------
create or replace function set_ticket_number_admin(p_id uuid, p_ticket_number text)
returns void
language plpgsql
security definer
as $$
begin
  update repair_tickets set ticket_number = p_ticket_number, updated_at = now()
  where id = p_id;
exception when unique_violation then
  raise exception 'מספר קריאה % כבר קיים במערכת', p_ticket_number;
end;
$$;

-- ------------------------------------------------------------
-- RPC: save Stage 1 + Stage 2 (only these columns — never touches
-- status/contact/pickup columns, so it can never clobber someone
-- else's concurrent edit to a different tab of the same ticket)
-- ------------------------------------------------------------
create or replace function save_ticket_info(
  p_id uuid,
  p_service_type text, p_item_type text, p_warranty text, p_quantity int,
  p_item_description text, p_fault_description text, p_customer_name text,
  p_seller_name text, p_open_date date, p_open_date_confirmed boolean,
  p_phone_primary text, p_phone_secondary text,
  p_repair_cost numeric, p_paid_amount numeric, p_payment_method text, p_notes2 text
) returns void
language plpgsql
security definer
as $$
begin
  update repair_tickets set
    service_type = p_service_type, item_type = p_item_type, warranty = p_warranty,
    quantity = p_quantity, item_description = p_item_description,
    fault_description = p_fault_description, customer_name = p_customer_name,
    seller_name = p_seller_name, open_date = p_open_date,
    open_date_confirmed = p_open_date_confirmed, phone_primary = p_phone_primary,
    phone_secondary = p_phone_secondary, repair_cost = p_repair_cost,
    paid_amount = p_paid_amount, payment_method = p_payment_method, notes2 = p_notes2,
    status = coalesce(status, 'נמצא בחנות - עדיין לא תוקן'),
    updated_at = now()
  where id = p_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: save Stage 3 only
-- ------------------------------------------------------------
create or replace function save_ticket_status(
  p_id uuid, p_status text, p_left_date date, p_left_date_confirmed boolean
) returns void
language plpgsql
security definer
as $$
begin
  update repair_tickets set
    status = p_status, left_date = p_left_date,
    left_date_confirmed = p_left_date_confirmed, updated_at = now()
  where id = p_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: save Stage 4 only
-- ------------------------------------------------------------
create or replace function save_ticket_followup(
  p_id uuid, p_contact1 jsonb, p_contact2 jsonb
) returns void
language plpgsql
security definer
as $$
begin
  update repair_tickets set
    contact1 = p_contact1, contact2 = p_contact2, updated_at = now()
  where id = p_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: save Stage 5 only
-- ------------------------------------------------------------
create or replace function save_ticket_pickup(
  p_id uuid, p_picked_up_date date, p_picked_up_date_confirmed boolean
) returns void
language plpgsql
security definer
as $$
begin
  update repair_tickets set
    picked_up_date = p_picked_up_date,
    picked_up_date_confirmed = p_picked_up_date_confirmed, updated_at = now()
  where id = p_id;
end;
$$;

create or replace function delete_repair_ticket(p_id uuid)
returns void
language sql
security definer
as $$
  delete from repair_tickets where id = p_id;
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- Same trust model as inventory-management-lafa: the app itself gates
-- access with the store password/admin-mode screens, so the anon key
-- is allowed full access here. Anyone with the anon key could bypass
-- the app's UI and hit the DB directly — that's an accepted tradeoff
-- for now, same as the existing inventory system. If you ever want
-- stronger protection, this is the place to switch to real Supabase
-- Auth + per-branch policies.
-- ------------------------------------------------------------

alter table repair_tickets enable row level security;
alter table repair_employees enable row level security;
alter table repair_counters enable row level security;

create policy "allow all - tickets" on repair_tickets for all using (true) with check (true);
create policy "allow all - employees" on repair_employees for all using (true) with check (true);
create policy "allow all - counters" on repair_counters for all using (true) with check (true);

grant execute on function get_next_ticket_number() to anon, authenticated;
grant execute on function create_repair_ticket(text) to anon, authenticated;
grant execute on function set_ticket_number_admin(uuid, text) to anon, authenticated;
grant execute on function save_ticket_info(uuid, text, text, text, int, text, text, text, text, date, boolean, text, text, numeric, numeric, text, text) to anon, authenticated;
grant execute on function save_ticket_status(uuid, text, date, boolean) to anon, authenticated;
grant execute on function save_ticket_followup(uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function save_ticket_pickup(uuid, date, boolean) to anon, authenticated;
grant execute on function delete_repair_ticket(uuid) to anon, authenticated;
