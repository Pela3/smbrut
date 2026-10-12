-- Base de datos de SMBRUT: clientes, pedidos y estrellas.
-- Se pega entera en Supabase → SQL Editor → New query → Run. Ver COMO-ACTIVAR-CUENTAS.md

-- ---------- Tablas ----------

create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  codigo text unique not null,
  nombre text not null default '',
  telefono text not null default '',
  email text,
  domicilio text,
  estrellas integer not null default 0 check (estrellas >= 0),
  es_admin boolean not null default false,
  creado timestamptz not null default now()
);

create table public.pedidos (
  id bigint generated always as identity primary key,
  usuario uuid not null references public.perfiles on delete cascade,
  items jsonb not null,
  total integer not null,
  domicilio text,
  aclaraciones text,
  pago text,
  creado timestamptz not null default now()
);

-- Cada vez que Santi suma o resta estrellas queda anotado acá
create table public.movimientos (
  id bigint generated always as identity primary key,
  usuario uuid not null references public.perfiles on delete cascade,
  cantidad integer not null,
  monto integer,                 -- lo que gastó, cuando las estrellas salen de una compra
  motivo text,
  admin uuid references public.perfiles on delete set null,
  creado timestamptz not null default now()
);

-- Premios que el cliente canjea desde su cuenta. Santi los edita en Table Editor → premios
create table public.premios (
  id bigint generated always as identity primary key,
  nombre text not null,
  estrellas integer not null check (estrellas > 0),
  activo boolean not null default true
);

insert into public.premios (nombre, estrellas) values
  ('Medallón extra', 30),
  ('Papas', 100),
  ('Cheese simple', 150),
  ('Hamburguesa simple a elección', 190),
  ('Hamburguesa doble a elección', 230);

create index on public.pedidos (usuario, creado desc);
create index on public.movimientos (usuario, creado desc);
create index on public.movimientos (creado desc);

-- ---------- ID de socio (SMB-XXXXX) ----------

create function public.nuevo_codigo() returns text
language plpgsql as $$
declare
  abc text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  c text;
begin
  loop
    c := 'SMB-';
    for i in 1..5 loop
      c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1);
    end loop;
    exit when not exists (select 1 from public.perfiles where codigo = c);
  end loop;
  return c;
end $$;

-- Al crear una cuenta se crea su perfil con nombre, teléfono e ID
create function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, codigo, nombre, telefono, email)
  values (
    new.id,
    public.nuevo_codigo(),
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    new.email
  );
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- Permisos ----------

create function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false)
$$;

alter table public.perfiles enable row level security;
alter table public.pedidos enable row level security;
alter table public.movimientos enable row level security;

-- Cada cliente ve lo suyo; Santi ve todo
create policy "ver perfil" on public.perfiles
  for select using (id = auth.uid() or public.es_admin());
create policy "editar mi perfil" on public.perfiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- El cliente solo puede cambiar estos datos. Las estrellas y el admin, nunca.
revoke insert, update, delete on public.perfiles from anon, authenticated;
grant update (nombre, telefono, domicilio) on public.perfiles to authenticated;

create policy "ver pedidos" on public.pedidos
  for select using (usuario = auth.uid() or public.es_admin());
create policy "crear mi pedido" on public.pedidos
  for insert with check (usuario = auth.uid());
revoke update, delete on public.pedidos from anon, authenticated;

alter table public.premios enable row level security;
create policy "ver premios" on public.premios for select using (true);
revoke insert, update, delete on public.premios from anon, authenticated;

create policy "ver movimientos" on public.movimientos
  for select using (usuario = auth.uid() or public.es_admin());
revoke insert, update, delete on public.movimientos from anon, authenticated;

-- ---------- Funciones del panel de Santi ----------

create function public.buscar_clientes(q text) returns setof public.perfiles
language plpgsql stable security definer set search_path = public as $$
declare
  v_texto text := lower(trim(q));
  v_codigo text := upper(regexp_replace(q, '[^A-Za-z0-9]', '', 'g'));
  v_digitos text := regexp_replace(q, '\D', '', 'g');
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  if v_codigo like 'SMB%' then v_codigo := substr(v_codigo, 4); end if;
  return query
    select * from public.perfiles p
    where not p.es_admin and (
      p.codigo = 'SMB-' || v_codigo
      or (length(v_digitos) >= 4 and regexp_replace(p.telefono, '\D', '', 'g') like '%' || v_digitos || '%')
      or (length(v_texto) >= 2 and lower(p.nombre) like '%' || v_texto || '%')
    )
    order by p.nombre
    limit 20;
end $$;

create function public.sumar_estrellas(p_codigo text, p_cantidad integer, p_motivo text default null, p_monto integer default null)
returns public.perfiles
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text := upper(regexp_replace(p_codigo, '[^A-Za-z0-9]', '', 'g'));
  p public.perfiles;
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  if coalesce(p_cantidad, 0) = 0 then
    raise exception 'La cantidad no puede ser cero.';
  end if;
  if v_codigo like 'SMB%' then v_codigo := substr(v_codigo, 4); end if;

  select * into p from public.perfiles where perfiles.codigo = 'SMB-' || v_codigo for update;
  if p.id is null then
    raise exception 'No existe un cliente con ese ID.';
  end if;
  if p.estrellas + p_cantidad < 0 then
    raise exception 'Tiene % estrellas, no se le pueden sacar %.', p.estrellas, -p_cantidad;
  end if;

  update public.perfiles set estrellas = estrellas + p_cantidad where id = p.id returning * into p;
  insert into public.movimientos (usuario, cantidad, monto, motivo, admin)
  values (p.id, p_cantidad, nullif(p_monto, 0), nullif(trim(p_motivo), ''), auth.uid());
  return p;
end $$;

-- El cliente canjea premios de su pedido: se descuentan sus estrellas
create function public.canjear(p_premios bigint[]) returns public.perfiles
language plpgsql security definer set search_path = public as $$
declare
  p public.perfiles;
  costo integer;
  pedidos integer;
begin
  if auth.uid() is null then
    raise exception 'Tenés que ingresar para canjear.';
  end if;
  if coalesce(array_length(p_premios, 1), 0) = 0 then
    raise exception 'No elegiste ningún premio.';
  end if;

  select count(*), coalesce(sum(pr.estrellas), 0) into pedidos, costo
  from unnest(p_premios) as x(id)
  join public.premios pr on pr.id = x.id and pr.activo;
  if pedidos <> array_length(p_premios, 1) then
    raise exception 'Uno de los premios ya no está disponible.';
  end if;

  select * into p from public.perfiles where id = auth.uid() for update;
  if p.estrellas < costo then
    raise exception 'Tenés % estrellas y los canjes suman %.', p.estrellas, costo;
  end if;

  update public.perfiles set estrellas = estrellas - costo where id = p.id returning * into p;
  insert into public.movimientos (usuario, cantidad, motivo)
  select p.id, -pr.estrellas, 'Canje: ' || pr.nombre || ' (pedido web)'
  from unnest(p_premios) as x(id) join public.premios pr on pr.id = x.id;
  return p;
end $$;

-- Solo usuarios con sesión pueden llamarlas (y adentro se revisa que sea admin)
revoke execute on function public.buscar_clientes(text) from public, anon;
revoke execute on function public.sumar_estrellas(text, integer, text, integer) from public, anon;
grant execute on function public.buscar_clientes(text) to authenticated;
grant execute on function public.sumar_estrellas(text, integer, text, integer) to authenticated;
revoke execute on function public.canjear(bigint[]) from public, anon;
grant execute on function public.canjear(bigint[]) to authenticated;
