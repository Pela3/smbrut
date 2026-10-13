# Cómo editar el menú de SMBRUT

La carta de la web sale de la base de datos (Supabase), de la tabla **productos**. Lo que cambies ahí aparece en la web apenas se recarga la página.

Los precios de la tabla son los que valen: cuando un cliente hace un pedido, el total se calcula con estos precios, no con lo que muestra su celular.

## Lo más fácil: desde el panel

**Precios y "no hay por hoy"** se cambian desde el panel (`admin.html`), en la pestaña **Precios**: cambiás el número, tocás **Guardar** y listo. El interruptor **En la carta** saca un plato de la web sin borrarlo.

Para todo lo demás (agregar platos, cambiar nombres, descripciones, fotos u orden) se usa la tabla, como se explica abajo.

## Dónde se edita (la tabla)

1. Entrá a [supabase.com](https://supabase.com) → tu proyecto → **Table Editor** → **productos**.
2. Hacé doble clic en la celda que quieras cambiar, escribí el valor nuevo y apretá Enter.

También funciona desde el celular, en el navegador.

## Día a día

| Quiero… | Hago esto en la tabla productos |
|---|---|
| Sacar algo que no hay **por hoy** | Pongo `disponible` en `false`. Cuando vuelva, lo pongo en `true`. |
| Sacar algo **para siempre** | Pongo `disponible` en `false` (mejor que borrarlo: los pedidos viejos lo siguen nombrando). |
| Agregar algo nuevo | **Insert → Insert row**. Completo categoría, nombre y precio. |
| Marcarlo como novedad | Pongo `nuevo` en `true`. Aparece la etiqueta "Nuevo". |
| Cambiar un precio | Lo cambio. Solo números, sin `$` ni puntos: `13500`. |
| Crear una categoría nueva | Escribo un nombre nuevo en `categoria`. Se crea sola. |
| Cambiar el orden | Cambio el número de `orden`. Los más chicos van primero. |
| Ponerle foto a un plato | Escribo en `foto` el link de la foto (ver abajo). |

## Las columnas

- **categoria**: Hamburguesas, Special, Guarniciones, etc. Tiene que estar escrita igual en todas sus filas.
- **nombre**: el nombre del producto.
- **descripcion**: los ingredientes, separados por comas. En las hamburguesas, el cliente puede sacar cualquiera de estos ingredientes al pedir.
- **precio**: el precio (en las hamburguesas, el de la **simple**). Si queda vacío, la web muestra "Consultar" y no se puede pedir.
- **precio_doble**: solo para las hamburguesas. Si una categoría tiene algún precio doble, la web muestra Simple y Doble, y esas hamburguesas se pueden personalizar.
- **disponible**: `true` aparece, `false` no.
- **nuevo**: `true` muestra la etiqueta "Nuevo".
- **foto**: el link de la foto, o el nombre de un archivo de la carpeta `img/fotos/` (por ejemplo `brut.jpg`). Puede quedar vacía.
- **orden**: en qué orden aparece. Conviene dejar saltos de 10 (10, 20, 30…) para poder meter cosas en el medio.

**La categoría Extras es especial:** lo que esté ahí se ofrece como extra al armar una hamburguesa ("Sumale extras"). Si agregan "Cheddar extra" o "Bacon extra" con su precio, aparecen solos.

## Cómo poner una foto

1. Abrí **Google Drive** y subí la foto.
2. Tres puntitos de la foto → **Compartir** → **Acceso general** → **"Cualquier persona con el enlace"** (como Lector).
3. **Copiar enlace** y pegalo en la columna `foto`.

**Consejos:** la foto se recorta (cuadrada en la compu, apaisada en el celular), así que dejá la hamburguesa centrada y con aire alrededor. Mejor pocas fotos buenas que muchas regulares.

## Las estrellas

En la tabla **ajustes**, `pesos_por_estrella` dice cuánta plata hay que gastar para sumar una estrella (hoy, 1000). Cuando suban los precios, subilo en la misma proporción.

Los premios que se canjean están en la tabla **premios**.
