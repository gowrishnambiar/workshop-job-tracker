-- The Job Table
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
-- Lock the table from the outside
alter table public.workshop_jobs enable row level security;



-- The Staff Table
create table if not exists public.staff (
    user_id uuid primary key,
    role text not null,
    check ( role in ('Admin', 'Foreman'))
);
alter table public.staff enable row level security;
insert into public.staff (user_id, role)
values ('id1', 'Admin');