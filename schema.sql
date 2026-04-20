-- =============================================
-- MantPRO CMMS - Schema completo para Supabase
-- Ejecutar en SQL Editor de Supabase
-- =============================================

-- USUARIOS (tabla personalizada, además de auth)
create table if not exists users (
  id serial primary key,
  name text not null,
  email text unique not null,
  password text not null,
  role text default 'tecnico', -- 'admin' | 'tecnico'
  discipline text -- 'Mecánico' | 'Eléctrico' | 'Instrumentación'
);

-- UBICACIONES
create table if not exists locations (
  id serial primary key,
  name text not null,
  area text,
  level text,
  created_at timestamp default now()
);

-- EQUIPOS
create table if not exists equipment (
  id serial primary key,
  code text not null,
  name text not null,
  type text,
  location_id integer references locations(id),
  discipline text,
  status text default 'Operativo',
  created_at timestamp default now()
);

-- JOB INSTRUCTIONS
create table if not exists job_instructions (
  id serial primary key,
  code text,
  title text not null,
  discipline text,
  risk text default 'Medio',
  steps jsonb default '[]',
  created_at timestamp default now()
);

-- ÓRDENES DE TRABAJO
create table if not exists work_orders (
  id text primary key,
  title text not null,
  equipment_id integer references equipment(id),
  location_id integer references locations(id),
  discipline text,
  priority text default 'Media',
  status text default 'Abierta',
  assigned_to integer references users(id),
  job_instruction_id integer references job_instructions(id),
  created_at date default now(),
  due_date date,
  description text
);

-- PARÁMETROS DE OT
create table if not exists parameters (
  id serial primary key,
  ot_id text references work_orders(id) on delete cascade,
  name text not null,
  unit text,
  expected text,
  sort_order integer default 0
);

-- LECTURAS DE PARÁMETROS
create table if not exists readings (
  id serial primary key,
  parameter_id integer references parameters(id) on delete cascade,
  ot_id text references work_orders(id) on delete cascade,
  value text not null,
  recorded_by integer references users(id),
  created_at timestamp default now()
);

-- COMENTARIOS
create table if not exists comments (
  id serial primary key,
  ot_id text references work_orders(id) on delete cascade,
  user_id integer references users(id),
  text text not null,
  created_at timestamp default now()
);

-- =============================================
-- HABILITAR ACCESO PÚBLICO (RLS)
-- =============================================
alter table users enable row level security;
alter table locations enable row level security;
alter table equipment enable row level security;
alter table job_instructions enable row level security;
alter table work_orders enable row level security;
alter table parameters enable row level security;
alter table readings enable row level security;
alter table comments enable row level security;

create policy "public" on users for all using (true) with check (true);
create policy "public" on locations for all using (true) with check (true);
create policy "public" on equipment for all using (true) with check (true);
create policy "public" on job_instructions for all using (true) with check (true);
create policy "public" on work_orders for all using (true) with check (true);
create policy "public" on parameters for all using (true) with check (true);
create policy "public" on readings for all using (true) with check (true);
create policy "public" on comments for all using (true) with check (true);

-- =============================================
-- DATOS INICIALES
-- =============================================
insert into users (name, email, password, role, discipline) values
  ('Admin Principal', 'admin@planta.com', 'admin123', 'admin', null),
  ('Carlos Méndez', 'carlos@planta.com', 'tech123', 'tecnico', 'Mecánico'),
  ('Ana Torres', 'ana@planta.com', 'tech123', 'tecnico', 'Eléctrico'),
  ('Miguel Ortiz', 'miguel@planta.com', 'tech123', 'tecnico', 'Instrumentación')
on conflict (email) do nothing;

insert into locations (name, area, level) values
  ('Planta A', 'Producción', 'Nivel 1'),
  ('Subestación B', 'Eléctrica', 'Planta'),
  ('Sala de Control', 'Instrumentación', 'Nivel 2')
on conflict do nothing;
