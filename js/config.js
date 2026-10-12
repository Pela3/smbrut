/*
  CONFIGURACIÓN DE SMBRUT
  Lo único que hace falta tocar acá. Si un dato queda vacío (""), la web no lo muestra.
*/
window.SMBRUT_CONFIG = {
  // Link de la planilla de Google Sheets publicada como CSV.
  // Solo se usa si no hay Supabase: con Supabase la carta sale de la tabla productos.
  // Mientras esté vacío, se usa el menú de js/menu-data.js
  planillaCSV: "",

  instagram: "smbrut_",

  // Número con código de país, sin + ni espacios. Ej: "5491122334455"
  // A este número llegan los pedidos de delivery.
  whatsapp: "5492246407093",

  // Base de datos de clientes y estrellas. Ver COMO-ACTIVAR-CUENTAS.md
  // Mientras esté vacío, la web funciona en modo demo: todo queda guardado en cada navegador.
  supabase: {
    url: "https://ixacazuyacdsfopgiovn.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4YWNhenV5YWNkc2ZvcGdpb3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzkzOTMsImV4cCI6MjEwNzQxNTM5M30.1A3qgcYLazEldYQajVlNVPLcAKEurToDOzE1IJmvUWs"
  },

  // Programa de estrellas. Cuando suban los precios, subí pesosPorEstrella en la misma proporción.
  estrellas: {
    pesosPorEstrella: 1000,
    // Premios del modo demo. Con Supabase, los premios se editan en la tabla "premios".
    canjes: [
      { nombre: "Medallón extra", estrellas: 30 },
      { nombre: "Papas", estrellas: 100 },
      { nombre: "Cheese simple", estrellas: 150 },
      { nombre: "Hamburguesa simple a elección", estrellas: 190 },
      { nombre: "Hamburguesa doble a elección", estrellas: 230 }
    ]
  },

  // Botón "Me olvidé la contraseña". Necesita que Supabase pueda mandar mails (ver la guía).
  recuperarClave: false,

  direccion: "Calle 17 y 123, Santa Teresita",
  // Cómo buscar el local en Google Maps (para el botón "Cómo llegar")
  mapa: "Calle 17 y 123, Santa Teresita, Buenos Aires, Argentina",
  horarios: "",

  // Texto que aparece debajo del título de cada categoría (la clave es el nombre de la categoría)
  notas: {
    "Hamburguesas": "Todas incluyen papas.",
    "Special": "Todas incluyen papas."
  },

  // Fotos del carrusel de arriba. El nombre tiene que ser igual al de la carta.
  // La Brut no va acá porque tiene su propia sección ("la hamburguesa de la casa").
  vitrina: [
    { nombre: "Sweet Onion", foto: "img/carrusel/sweet-onion.jpg" },
    { nombre: "Bacon Cheese", foto: "img/carrusel/bacon-cheese.jpg" },
    { nombre: "Cuarto de Libra", foto: "img/carrusel/cuarto-de-libra.jpg" }
  ],

  // Lo que está en esta categoría se ofrece como extra al armar una hamburguesa
  categoriaExtras: "Extras",

  // Categorías que se muestran resaltadas en verde
  destacadas: ["Special"]
};
