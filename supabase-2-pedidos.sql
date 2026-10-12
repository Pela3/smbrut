-- SMBRUT, paso 2: carta en la base de datos y pedidos con estados.
-- Se corre DESPUÉS de supabase.sql: Supabase → SQL Editor → New query → pegar todo → Run.
-- Ver COMO-ACTIVAR-CUENTAS.md

-- ---------- Carta ----------

-- La carta sale de acá. Santi edita precios y disponibilidad en Table Editor → productos
create table public.productos (
  id bigint generated always as identity primary key,
  categoria text not null,
  nombre text not null,
  descripcion text,
  precio integer check (precio > 0),          -- vacío = "Consultar" (no se puede pedir)
  precio_doble integer check (precio_doble > 0),
  disponible boolean not null default true,   -- false = no aparece en la carta
  nuevo boolean not null default false,
  foto text,
  orden integer not null default 0
);

insert into public.productos (categoria, nombre, descripcion, precio, precio_doble, disponible, nuevo, foto, orden) values
  ('Hamburguesas', 'Cheese', 'Medallón de carne, cheddar x2', 12000, 14000, true, false, null, 10),
  ('Hamburguesas', 'Bacon Cheese', 'Medallón de carne, bacon, cheddar x2', 13000, 15000, true, false, null, 20),
  ('Hamburguesas', 'Easy', 'Medallón de carne, cheddar, bacon, lechuga, tomate, cebolla, salsa alioli', 13500, 15500, true, false, null, 30),
  ('Hamburguesas', 'Sweet Onion', 'Medallón de carne, cheddar, cebolla caramelizada, bacon, salsa brut', 13000, 15000, true, false, null, 40),
  ('Hamburguesas', 'Panal', 'Medallón de carne, cheddar, bacon con miel, salsa dulce', 13000, 15000, true, false, null, 50),
  ('Hamburguesas', 'Brutcrispy', 'Medallón de carne, bacon, cheddar, cebolla crispy, salsa brut', 13500, 15500, true, false, null, 60),
  ('Hamburguesas', 'Cuarto de Libra', 'Medallón de carne, mostaza, ketchup, cebolla cruda, cheddar', 13000, 15000, true, false, null, 70),
  ('Hamburguesas', 'Brut', 'Medallón de carne, mermelada de bacon, cheddar, pepinillos, salsa brut', 13500, 15500, true, false, 'brut.jpg', 80),
  ('Special', 'Takis', 'Medallón de carne, cheddar, bacon, salsa picante, takis', 14000, 16000, true, false, null, 90),
  ('Special', 'ABZ', 'Medallón de carne, queso dambo, bacon, cebolla caramelizada, salsa brut', 13000, 15000, true, false, null, 100),
  ('Special', 'Patty Melt', 'Pan de molde, cheddar, cebolla caramelizada, medallón de carne x2', null, 17000, true, false, null, 110),
  ('Special', 'Moon', 'Medialuna de manteca, medallón de carne, cheddar, bacon, salsa brut', 15000, 17000, true, false, null, 120),
  ('Guarniciones', 'Papas', null, 8000, null, true, false, null, 130),
  ('Guarniciones', 'Papas con cheddar', null, 13000, null, true, false, null, 140),
  ('Guarniciones', 'Papas cheddar, bacon y verdeo', null, 14000, null, true, false, null, 150),
  ('Guarniciones', 'Nuggets de pollo', null, 12000, null, true, false, null, 160),
  ('Guarniciones', 'Aros de cebolla', null, 12000, null, true, false, null, 170),
  ('Guarniciones', 'Bastones de mozzarella', null, null, null, true, false, null, 180),
  ('Sandwiches', 'Bondiola completa', null, 14000, null, true, false, null, 190),
  ('Sandwiches', 'Pollo al verdeo', null, 14000, null, true, false, null, 200),
  ('Sandwiches', 'Mila completa', 'Pollo o carne', 12000, null, true, false, null, 210),
  ('Pizzas', 'Muzza', null, 10000, null, true, false, null, 220),
  ('Pizzas', 'Napolitana', null, 12000, null, true, false, null, 230),
  ('Pizzas', 'Jamón y morrón', null, 14000, null, true, false, null, 240),
  ('Pizzas', 'Rúcula y panceta', null, 14000, null, true, false, null, 250),
  ('Pizzas', 'Cebolla y queso', null, 12000, null, true, false, null, 260),
  ('Empanadas', 'Jamón y queso', null, null, null, true, false, null, 270),
  ('Empanadas', 'Pollo', null, null, null, true, false, null, 280),
  ('Empanadas', 'Verdura', null, null, null, true, false, null, 290),
  ('Empanadas', 'Carne', null, null, null, true, false, null, 300),
  ('Empanadas', 'Caprese', null, null, null, true, false, null, 310),
  ('Extras', 'Medallón de carne', 'Sumalo a cualquier hamburguesa', 2500, null, true, false, null, 320);

-- Ajustes generales (una sola fila)
create table public.ajustes (
  id integer primary key default 1 check (id = 1),
  pesos_por_estrella integer not null default 1000 check (pesos_por_estrella > 0)
);
insert into public.ajustes (id) values (1);

alter table public.productos enable row level security;
alter table public.ajustes enable row level security;
create policy "ver productos" on public.productos for select using (true);
create policy "ver ajustes" on public.ajustes for select using (true);
-- Santi puede editar la carta desde el panel (más adelante); los clientes no
revoke insert, update, delete on public.productos, public.ajustes from anon, authenticated;
grant update on public.productos to authenticated;
create policy "admin edita productos" on public.productos
  for update using (public.es_admin()) with check (public.es_admin());

-- ---------- Pedidos con estado ----------

alter table public.pedidos
  add column estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'entregado', 'cancelado', 'finalizado')),
  add column canje_estrellas integer not null default 0,
  add column estrellas_sumadas integer not null default 0,
  add column actualizado timestamptz;

create index on public.pedidos (estado, creado desc);

-- Los pedidos ya no se insertan directo: solo con crear_pedido(), que calcula los precios
drop policy if exists "crear mi pedido" on public.pedidos;
revoke insert on public.pedidos from anon, authenticated;
-- El canje ahora va dentro del pedido
drop function if exists public.canjear(bigint[]);

-- El cliente arma el pedido; los precios y el total salen de la tabla productos, nunca del celular.
-- p_items: [{ "producto": id, "variante": "Simple"|"Doble"|"", "cant": n, "sin": ["cebolla"], "extras": [{ "producto": id, "cant": n }] },
--           { "premio": id, "cant": n }]
create function public.crear_pedido(p_items jsonb, p_domicilio text, p_aclaraciones text, p_pago text)
returns public.pedidos
language plpgsql security definer set search_path = public as $$
declare
  yo public.perfiles;
  linea jsonb;
  extra jsonb;
  prod public.productos;
  ext public.productos;
  prem public.premios;
  v_cant integer;
  v_ecant integer;
  v_unit integer;
  v_variante text;
  v_total integer := 0;
  v_costo integer := 0;
  v_cambios jsonb;
  v_sin jsonb;
  v_items jsonb := '[]'::jsonb;
  ped public.pedidos;
begin
  select * into yo from public.perfiles where id = auth.uid() for update;
  if yo.id is null then
    raise exception 'Tenés que ingresar para pedir.';
  end if;
  if yo.es_admin then
    raise exception 'La cuenta de admin no puede hacer pedidos.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío.';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'El pedido tiene demasiados productos.';
  end if;
  if coalesce(trim(p_domicilio), '') = '' then
    raise exception 'Falta el domicilio de entrega.';
  end if;
  if p_pago is null or p_pago not in ('Efectivo', 'Transferencia') then
    raise exception 'Elegí cómo vas a pagar.';
  end if;

  for linea in select * from jsonb_array_elements(p_items) loop
    v_cant := coalesce((linea->>'cant')::integer, 0);
    if v_cant < 1 or v_cant > 20 then
      raise exception 'Hay una cantidad que no es válida.';
    end if;

    -- Premio canjeado con estrellas
    if linea ? 'premio' then
      select * into prem from public.premios where id = (linea->>'premio')::bigint and activo;
      if prem.id is null then
        raise exception 'Uno de los premios ya no está disponible.';
      end if;
      v_costo := v_costo + prem.estrellas * v_cant;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'nombre', prem.nombre, 'variante', '', 'precio', 0, 'cant', v_cant,
        'cambios', '[]'::jsonb, 'canje', prem.estrellas));
      continue;
    end if;

    -- Producto de la carta
    select * into prod from public.productos where id = (linea->>'producto')::bigint and disponible;
    if prod.id is null then
      raise exception 'Uno de los productos ya no está disponible. Actualizá la página.';
    end if;
    v_variante := coalesce(linea->>'variante', '');
    if v_variante not in ('', 'Simple', 'Doble') then
      raise exception 'Tamaño no válido.';
    end if;
    v_unit := case when v_variante = 'Doble' then prod.precio_doble else prod.precio end;
    if v_unit is null then
      raise exception '% no tiene precio en la web. Consultalo por WhatsApp.', prod.nombre;
    end if;

    v_cambios := '[]'::jsonb;
    if jsonb_typeof(linea->'sin') = 'array' then
      select coalesce(jsonb_agg('sin ' || left(x, 40)), '[]'::jsonb) into v_sin
      from (select x from jsonb_array_elements_text(linea->'sin') as t(x) limit 10) s;
      v_cambios := v_cambios || v_sin;
    end if;
    if jsonb_typeof(linea->'extras') = 'array' then
      for extra in select * from jsonb_array_elements(linea->'extras') loop
        v_ecant := coalesce((extra->>'cant')::integer, 0);
        if v_ecant < 1 or v_ecant > 3 then
          raise exception 'Hay un extra con una cantidad que no es válida.';
        end if;
        select * into ext from public.productos
        where id = (extra->>'producto')::bigint and disponible and categoria = 'Extras';
        if ext.id is null or ext.precio is null then
          raise exception 'Uno de los extras ya no está disponible. Actualizá la página.';
        end if;
        v_unit := v_unit + ext.precio * v_ecant;
        v_cambios := v_cambios || to_jsonb('+' || v_ecant || ' ' || lower(ext.nombre));
      end loop;
    end if;

    v_total := v_total + v_unit * v_cant;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'nombre', prod.nombre, 'variante', v_variante, 'precio', v_unit, 'cant', v_cant,
      'cambios', v_cambios, 'canje', 0));
  end loop;

  if v_costo > 0 then
    if yo.estrellas < v_costo then
      raise exception 'Tenés % estrellas y los canjes suman %.', yo.estrellas, v_costo;
    end if;
    update public.perfiles set estrellas = estrellas - v_costo where id = yo.id;
  end if;

  insert into public.pedidos (usuario, items, total, domicilio, aclaraciones, pago, canje_estrellas)
  values (yo.id, v_items, v_total, left(trim(p_domicilio), 200),
          nullif(left(trim(coalesce(p_aclaraciones, '')), 300), ''), p_pago, v_costo)
  returning * into ped;

  if v_costo > 0 then
    insert into public.movimientos (usuario, cantidad, motivo)
    values (yo.id, -v_costo, 'Canje en el pedido #' || ped.id);
  end if;
  update public.perfiles set domicilio = ped.domicilio where id = yo.id;
  return ped;
end $$;

-- Santi cambia el estado. Cancelar devuelve las estrellas canjeadas.
create function public.estado_pedido(p_id bigint, p_estado text) returns public.pedidos
language plpgsql security definer set search_path = public as $$
declare
  ped public.pedidos;
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  if p_estado not in ('pendiente', 'pagado', 'entregado', 'cancelado') then
    raise exception 'Estado no válido.';
  end if;
  select * into ped from public.pedidos where id = p_id for update;
  if ped.id is null then
    raise exception 'No existe el pedido #%.', p_id;
  end if;
  if ped.estado = 'finalizado' then
    raise exception 'El pedido #% ya está finalizado.', p_id;
  end if;
  if ped.estado = 'cancelado' then
    raise exception 'El pedido #% está cancelado.', p_id;
  end if;

  if p_estado = 'cancelado' and ped.canje_estrellas > 0 then
    update public.perfiles set estrellas = estrellas + ped.canje_estrellas where id = ped.usuario;
    insert into public.movimientos (usuario, cantidad, motivo, admin)
    values (ped.usuario, ped.canje_estrellas, 'Devolución del canje, pedido #' || ped.id || ' cancelado', auth.uid());
  end if;

  update public.pedidos set estado = p_estado, actualizado = now() where id = p_id returning * into ped;
  return ped;
end $$;

-- Santi finaliza el pedido: se le suman las estrellas al cliente según el total
create function public.finalizar_pedido(p_id bigint) returns public.pedidos
language plpgsql security definer set search_path = public as $$
declare
  ped public.pedidos;
  v_n integer;
begin
  if not public.es_admin() then
    raise exception 'Solo para administradores.';
  end if;
  select * into ped from public.pedidos where id = p_id for update;
  if ped.id is null then
    raise exception 'No existe el pedido #%.', p_id;
  end if;
  if ped.estado = 'finalizado' then
    raise exception 'El pedido #% ya estaba finalizado.', p_id;
  end if;
  if ped.estado = 'cancelado' then
    raise exception 'El pedido #% está cancelado.', p_id;
  end if;

  v_n := floor(ped.total::numeric / (select pesos_por_estrella from public.ajustes where id = 1));
  if v_n > 0 then
    update public.perfiles set estrellas = estrellas + v_n where id = ped.usuario;
    insert into public.movimientos (usuario, cantidad, monto, motivo, admin)
    values (ped.usuario, v_n, ped.total, 'Pedido #' || ped.id, auth.uid());
  end if;

  update public.pedidos
  set estado = 'finalizado', estrellas_sumadas = v_n, actualizado = now()
  where id = p_id returning * into ped;
  return ped;
end $$;

revoke execute on function public.crear_pedido(jsonb, text, text, text) from public, anon;
revoke execute on function public.estado_pedido(bigint, text) from public, anon;
revoke execute on function public.finalizar_pedido(bigint) from public, anon;
grant execute on function public.crear_pedido(jsonb, text, text, text) to authenticated;
grant execute on function public.estado_pedido(bigint, text) to authenticated;
grant execute on function public.finalizar_pedido(bigint) to authenticated;

-- Los pedidos le llegan al panel de Santi en vivo
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.pedidos;
  end if;
end $$;
