-- TABLE: workshop jobs (one row per car visit)
create table if not exists public.workshop_jobs (
    id bigint generated always as identity primary key,
    plate_number text not null,
    car_model text not null,
    customer_name text not null,
    phone_number text not null,
    service_type text not null,
    status text not null default 'Received',
    notes text not null default '',
    staff_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Rule: only the 6 statuses
    check (status in ('Received', 'Checking', 'Waiting for parts', 'Repairing', 'Ready for pickup', 'Collected'))
);
-- SECURITY: lock the jobs table from the outside (only the backend can reach it)
alter table public.workshop_jobs enable row level security;

--ADD COLUMNS: quotation (quote, extra quote, reason, customer decision)
alter table public.workshop_jobs
    add column if not exists quote numeric(10, 2) not null default 0,
    add column if not exists extra_quote numeric (10, 2) not null default 0,
    add column if not exists extra_reason text not null default '',
    add column if not exists extra_decision text not null default 'None';

-- RULE: the 4 allowed customer decisions
alter table public.workshop_jobs
    add check (extra_decision in ('None', 'Pending', 'Approved', 'Declined'));

-- ADD COLUMN: pickup time (when the customer can collect the car?)
alter table public.workshop_jobs
    add column if not exists ready_at timestamptz;

-- TABLE: staff roles (Admin, Foreman)
create table if not exists public.staff (
    user_id uuid primary key,
    role text not null,
    -- RULE: only 2 roles
    check ( role in ('Admin', 'Foreman'))
);

-- SECURITY: lock the staff table from the outside
alter table public.staff enable row level security;

-- GIVE A ROLE: run this once per staff with their UID from SUPABASE Authenthication
-- insert into public.staff(user_id, role) values('UID', 'Admin')
