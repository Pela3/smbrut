# Cómo activar las cuentas y las estrellas

La web tiene:

- **Cuentas de clientes** con mail y contraseña. Para pedir delivery hay que tener cuenta. Cada cliente tiene un ID de socio (por ejemplo `SMB-7K2Q9`) y sus estrellas.
- **El panel de Santi** en `admin.html` (no tiene link desde la web, se entra escribiendo la dirección: `.../admin.html`). Ahí Santi busca al cliente por su ID, teléfono o nombre, carga cuánto gastó (1 estrella cada $1.000) o corrige a mano. Cada movimiento queda anotado.
- **Canjes:** los hace el cliente desde su cuenta. El premio entra gratis a su pedido y las estrellas se descuentan al finalizarlo. En el WhatsApp del pedido llega cuántas estrellas canjeó.

Mientras no se configure Supabase, todo funciona en **modo demo**: los datos quedan guardados en cada navegador y hay una cuenta de admin de prueba (`santi@smbrut.com` / `smbrut`). Sirve para mostrarlo, no para usarlo con clientes de verdad.

## Pasos para activar Supabase (una sola vez, unos 15 minutos)

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta con un mail de SMBRUT. Tocá **New project**. Nombre: `smbrut`. Región: **South America (São Paulo)**. Inventá una contraseña de base de datos y guardala en un lugar seguro.
2. Cuando termine de crearse, andá a **SQL Editor → New query**. Pegá todo el contenido del archivo `supabase.sql` y tocá **Run**. Tiene que decir "Success".
3. Andá a **Authentication → Sign In / Providers** (o **Providers**):
   - Dejá activado **Email**.
   - **Desactivá "Confirm email"**. Si queda activado, el cliente tiene que confirmar su mail antes de pedir, y Supabase gratis manda muy pocos mails por hora.
   - Google y el resto, apagados.
4. Andá a **Project Settings → API** (o **Data API**). Copiá la **Project URL** y la clave **anon public** en `js/config.js`:

   ```js
   supabase: {
     url: "https://xxxxxxxx.supabase.co",
     anonKey: "eyJhbGciOi..."
   },
   ```

   Estos dos datos no son secretos: es normal que estén en la web. **La clave `service_role` sí es secreta: esa no se pega nunca en la web.**

5. **Hacer admin a Santi:** Santi entra a la web y se crea una cuenta normal, con su mail. Después, en Supabase, andá a **Table Editor → perfiles**, buscá su fila, cambiá `es_admin` a `true` y guardá. Listo, ya puede entrar a `admin.html` con su mail y contraseña.

   Su cuenta de admin sirve solo para el panel. Si quiere pedir delivery, tiene que usar otra cuenta.

## Día a día

| Quiero… | Hago esto |
|---|---|
| Cargar una compra | Entro a `admin.html`, busco su ID (le llega en cada pedido por WhatsApp), en **Compra** escribo cuánto gastó y toco **Sumar**. Las estrellas se calculan solas. |
| Ver qué canjeó un cliente | En el WhatsApp del pedido dice "Canjea: X estrellas". En el panel, en su historial, aparece "Canje: Papas (pedido web)". |
| Corregir un error o regalar estrellas | Pestaña **Ajuste**, con + o −. |
| Cambiar cuánto vale una estrella | En `js/config.js`, en `estrellas.pesosPorEstrella`. Cuando suban los precios, subilo en la misma proporción. |
| Cambiar los premios | Supabase → **Table Editor → premios**. Se puede cambiar el nombre, las estrellas, o poner `activo` en `false` para sacar uno. |
| Ver los pedidos de un cliente | Al abrir su ficha en el panel aparecen sus últimos pedidos por la web. |
| Ver todos los clientes | Supabase → **Table Editor → perfiles**. |

## Lo que queda para más adelante

- **"Me olvidé la contraseña":** el botón está apagado porque Supabase gratis casi no manda mails. Para activarlo hay que conectar un servicio de mails (por ejemplo [Resend](https://resend.com), gratis hasta 3.000 por mes) en **Authentication → Emails → SMTP Settings**, y después poner `recuperarClave: true` en `js/config.js`.
- **Pausa por inactividad:** en el plan gratis, si nadie usa la web durante una semana, Supabase pausa el proyecto. No se pierde nada; se reactiva desde el panel de Supabase con un clic.

## WhatsApp de los pedidos

Los pedidos llegan al número que esté en `whatsapp` dentro de `js/config.js` (con código de país, sin `+` ni espacios, por ejemplo `5492246123456`). Si está vacío, la web no deja finalizar el pedido.
