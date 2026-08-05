-- =============================================================================
-- PG Management System — Supabase schema
-- =============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- =============================================================================

-- Workers (admin + staff) --------------------------------------------
create table if not exists public.workers (
    id          bigserial primary key,
    username    text not null unique,
    password    text not null,
    full_name   text not null,
    email       text not null unique,
    phone       text,
    role        text not null default 'worker' check (role in ('admin','worker')),
    created_at  timestamptz not null default now()
);

-- Rooms ----------------------------------------------------------------
create table if not exists public.rooms (
    id           bigserial primary key,
    room_number  text not null unique,
    capacity     int  not null check (capacity > 0),
    occupied     int  not null default 0 check (occupied >= 0),
    rent_amount  numeric(10,2) not null check (rent_amount >= 0),
    status       text not null default 'available' check (status in ('available','full','maintenance')),
    created_at   timestamptz not null default now()
);

-- Students -------------------------------------------------------------
create table if not exists public.students (
    id             bigserial primary key,
    full_name      text not null,
    email          text not null unique,
    phone          text not null,
    father_name    text,
    father_phone   text,
    aadhaar_no     text,
    room_id        bigint references public.rooms(id) on delete set null,
    joining_date   date not null default current_date,
    status         text not null default 'active' check (status in ('active','inactive','left')),
    created_at     timestamptz not null default now()
);

-- Payments -------------------------------------------------------------
create table if not exists public.payments (
    id              bigserial primary key,
    student_id      bigint not null references public.students(id) on delete cascade,
    amount          numeric(10,2) not null check (amount > 0),
    payment_date    date not null default current_date,
    payment_method  text not null default 'UPI',
    status          text not null default 'completed' check (status in ('completed','pending','failed')),
    created_at      timestamptz not null default now()
);

-- Reports --------------------------------------------------------------
create table if not exists public.reports (
    id           bigserial primary key,
    title        text not null,
    description  text not null,
    worker_id    bigint references public.workers(id) on delete set null,
    status       text not null default 'pending' check (status in ('pending','in_progress','resolved','rejected')),
    created_at   timestamptz not null default now()
);

-- Optional indexes -----------------------------------------------------
create index if not exists idx_students_room_id on public.students(room_id);
create index if not exists idx_payments_student_id on public.payments(student_id);
create index if not exists idx_reports_worker_id on public.reports(worker_id);
create index if not exists idx_reports_status on public.reports(status);

-- Row Level Security (recommended) ----------------------------------
-- For a backend that uses the service role key with full access, you can
-- either disable RLS or define policies that allow the service role. The
-- simplest path is:
alter table public.workers   disable row level security;
alter table public.rooms     disable row level security;
alter table public.students  disable row level security;
alter table public.payments  disable row level security;
alter table public.reports   disable row level security;
