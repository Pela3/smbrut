# Cómo editar el menú de SMBRUT

El menú de la web sale de una planilla de Google Sheets. Lo que cambies en la planilla aparece en la web solo, en unos 5 minutos. No hace falta tocar nada de la web.

## Primera vez (se hace una sola vez)

1. Entrá a [sheets.google.com](https://sheets.google.com) y creá una planilla en blanco.
2. **Archivo → Importar → Subir** y elegí el archivo `menu-plantilla.csv` que está en esta carpeta. Ponele "Reemplazar hoja de cálculo".
3. **Archivo → Compartir → Publicar en la web**. Elegí la hoja y, en el formato, **Valores separados por comas (.csv)**. Tocá **Publicar**.
4. Copiá el link que te da y pegalo en `js/config.js`, entre las comillas de `planillaCSV`:

   ```js
   planillaCSV: "https://docs.google.com/spreadsheets/d/e/....../pub?output=csv",
   ```

Listo. Desde ahora el menú se edita solo desde la planilla, incluso desde la app de Google Sheets en el celular.

## Día a día

| Quiero… | Hago esto en la planilla |
|---|---|
| Sacar algo que no hay **por hoy** | En la columna `disponible` escribo `no`. Cuando vuelva, pongo `si`. |
| Sacar algo **para siempre** | Borro la fila. |
| Agregar algo nuevo | Agrego una fila con la categoría, el nombre y el precio. |
| Marcarlo como novedad | En la columna `nuevo` escribo `si`. Aparece la etiqueta "Nuevo". |
| Cambiar un precio | Lo cambio. Se puede escribir `13500`, `13.500` o `$13.500`. |
| Crear una categoría nueva | Escribo un nombre nuevo en `categoria`. Se crea sola. |
| Cambiar el orden | Muevo las filas. La web respeta el orden de la planilla. |
| Ponerle foto a un plato | Pego el link de la foto en la columna `foto` (ver abajo). |
| Sacarle la foto | Borro el link de la columna `foto`. |

## Las columnas

- **categoria**: Hamburguesas, Special, Guarniciones, etc. Tiene que estar escrita igual en todas sus filas.
- **nombre**: el nombre del producto.
- **descripcion**: los ingredientes. Puede quedar vacía.
- **precio**: el precio (en las hamburguesas, el de la **simple**). Si queda vacío, la web muestra "Consultar".
- **precio_doble**: solo para las hamburguesas. Si una categoría tiene algún precio doble, la web muestra las columnas Simple y Doble.
- **disponible**: `si` o `no`.
- **nuevo**: `si` o vacío.
- **foto**: el link de la foto. Puede quedar vacía; no hace falta que todos los platos tengan foto.

No cambies los nombres de la primera fila (los encabezados): la web los usa para leer la planilla.

## Cómo poner una foto

1. Abrí **Google Drive** (en el celular, la app) y subí la foto.
2. Tocá los tres puntitos de la foto → **Compartir** → **Acceso general**, y cambialo a **"Cualquier persona con el enlace"** (como Lector).
3. Tocá **Copiar enlace**.
4. Pegá ese link en la columna `foto` del plato, en la planilla.

Si la foto no se comparte como "Cualquier persona con el enlace", la web no la puede mostrar y deja el plato sin foto, sin romperse.

**Consejos para que queden bien:**
- La foto se recorta: cuadrada en la computadora y apaisada en el celular. Dejá la hamburguesa **centrada** y con un poco de aire alrededor.
- Sacala de cerca, con luz de costado (una ventana) y fondo oscuro.
- Mejor pocas fotos buenas que muchas regulares. Arrancá por las más vendidas.

## Otros datos

En `js/config.js` también podés completar el WhatsApp y los horarios (la dirección ya está cargada). Lo que quede vacío no aparece en la web.
