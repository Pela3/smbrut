/*
  CONFIGURACIÓN DE SMBRUT
  Lo único que hace falta tocar acá. Si un dato queda vacío (""), la web no lo muestra.
*/
window.SMBRUT_CONFIG = {
  // Link de la planilla de Google Sheets publicada como CSV.
  // Ver COMO-EDITAR-EL-MENU.md. Mientras esté vacío, se usa el menú de js/menu-data.js
  planillaCSV: "",

  instagram: "smbrut_",

  // Número con código de país, sin + ni espacios. Ej: "5491122334455"
  whatsapp: "",

  direccion: "Calle 17 y 123, Santa Teresita",
  // Cómo buscar el local en Google Maps (para el botón "Cómo llegar")
  mapa: "Calle 17 y 123, Santa Teresita, Buenos Aires, Argentina",
  horarios: "",

  // Texto que aparece debajo del título de cada categoría (la clave es el nombre de la categoría)
  notas: {
    "Hamburguesas": "Todas incluyen papas.",
    "Special": "Todas incluyen papas."
  },

  // Categorías que se muestran resaltadas en verde
  destacadas: ["Special"]
};
