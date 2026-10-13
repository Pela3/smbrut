# SMBRUT · Hamburguesas brutas

Página web con la carta de **SMBRUT**: hamburguesas, papas, sandwiches, pizzas y empanadas.

📍 Calle 17 y 123, Santa Teresita · 📸 [@smbrut_](https://instagram.com/smbrut_)

**Ver la página:** (https://pela3.github.io/smbrut/)

## Qué tiene

- La carta completa, separada por categorías, con precio simple y doble.
- Pestañas arriba para saltar directo a cada sección.
- **Carrusel** con fotos de las hamburguesas arriba de la carta (las fotos se cambian en `js/config.js`, en `vitrina`).
- **Pedir delivery:** las hamburguesas se pueden armar (sacar ingredientes, sumar extras de la categoría Extras); el resto se toca el precio para sumarlo, se ve el total y al finalizar el pedido llega al WhatsApp del local con el ID del cliente, lo que pidió, el total, el domicilio y cómo paga.
- **Cuenta de cliente:** para pedir hay que tener cuenta (mail y contraseña). Cada cliente tiene su ID de socio (`SMB-XXXXX`) y sus estrellas, y canjea premios desde su cuenta.
- **Pedidos seguros:** cada pedido se guarda en la base con un número y el total lo calcula la base, no el celular del cliente.
- **Panel de Santi** (`admin.html`): ve los pedidos en vivo, les cambia el estado (pagado, entregado, cancelado), imprime el ticket de cada pedido y al finalizarlos le suma las estrellas al cliente. También carga compras del local y cambia los precios de la carta.
- Botones a Instagram, WhatsApp y "Cómo llegar" (Google Maps).
- Se ve bien en el celular, que es donde la va a mirar casi todo el mundo.

## Cómo está hecha

Es una página simple, sin instalar nada: HTML, CSS y JavaScript.

```
index.html          la página
css/styles.css      colores y diseño
js/config.js        datos del local (Instagram, WhatsApp, dirección, horarios)
js/menu-data.js     el menú: platos, descripciones y precios
js/app.js           arma la carta en pantalla
js/carrito.js       el pedido de delivery y el mensaje de WhatsApp
js/cuenta.js        ingreso de clientes, su ID de socio y sus estrellas
js/datos.js         conexión con la base de datos (Supabase) o modo demo
js/admin.js         el panel de Santi (admin.html)
supabase.sql        las tablas y permisos para pegar en Supabase (paso 1)
supabase-2-pedidos.sql   la carta y los pedidos con estado (paso 2)
js/hoja.js          los paneles que suben desde abajo
img/                logos y la ratita
```

Para verla en la compu, abrí `index.html` en el navegador.

## Cambiar el menú o los precios

- **Precios:** desde el panel, pestaña **Precios**.
- **Platos nuevos, nombres, fotos:** se editan en Supabase, en la tabla `productos`. Los pasos están en [COMO-EDITAR-EL-MENU.md](COMO-EDITAR-EL-MENU.md). (`js/menu-data.js` queda solo como respaldo y para el modo demo.)
- **Datos del local:** se editan en `js/config.js`. Si un dato queda vacío (`""`), no se muestra.
- **WhatsApp de los pedidos, cuentas y estrellas:** ver [COMO-ACTIVAR-CUENTAS.md](COMO-ACTIVAR-CUENTAS.md).

---

Si la ves y tenés alguna idea o encontrás algo raro, avisame 🍔
