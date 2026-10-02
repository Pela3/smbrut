# SMBRUT · Hamburguesas brutas

Página web con la carta de **SMBRUT**: hamburguesas, papas, sandwiches, pizzas y empanadas.

📍 Calle 17 y 123, Santa Teresita · 📸 [@smbrut_](https://instagram.com/smbrut_)

**Ver la página:** _(acá va el enlace cuando esté publicada)_

## Qué tiene

- La carta completa, separada por categorías, con precio simple y doble.
- Pestañas arriba para saltar directo a cada sección.
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
img/                logos y la ratita
```

Para verla en la compu, abrí `index.html` en el navegador.

## Cambiar el menú o los precios

- **Precios y platos:** se editan en `js/menu-data.js`. Si el precio queda vacío, en la página aparece "Consultar".
- **Datos del local:** se editan en `js/config.js`. Si un dato queda vacío (`""`), no se muestra.
- **Desde Google Sheets:** el menú también se puede cargar desde una planilla, así no hace falta tocar código. Los pasos están en [COMO-EDITAR-EL-MENU.md](COMO-EDITAR-EL-MENU.md).

---

Si la ves y tenés alguna idea o encontrás algo raro, avisame 🍔
