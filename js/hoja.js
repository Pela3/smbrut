/*
  Hojas: los paneles que suben desde abajo en el celular (carrito y cuenta).
  En la compu se ven como una ventana en el centro.
*/
window.SMBRUT_HOJA = (function () {
  "use strict";

  var SALIDA_MS = 200;
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)");

  function abrir(d) {
    if (d.open) return;
    d.classList.remove("is-saliendo");
    d.style.transform = "";
    d.showModal();
  }

  function cerrar(d) {
    if (!d.open || d.classList.contains("is-saliendo")) return;
    if (reducido.matches) { d.close(); return; }
    d.classList.add("is-saliendo");
    setTimeout(function () {
      d.classList.remove("is-saliendo");
      d.style.transform = "";
      d.close();
    }, SALIDA_MS);
  }

  // Arrastrar la manija hacia abajo cierra la hoja (solo en el celular)
  function arrastre(d) {
    var asa = d.querySelector("[data-asa]");
    if (!asa) return;
    var inicio = 0, t0 = 0, dy = 0, activo = false;

    asa.addEventListener("pointerdown", function (e) {
      if (!e.isPrimary) return;
      activo = true;
      inicio = e.clientY;
      t0 = e.timeStamp;
      dy = 0;
      asa.setPointerCapture(e.pointerId);
      d.style.transition = "none";
    });
    asa.addEventListener("pointermove", function (e) {
      if (!activo) return;
      dy = e.clientY - inicio;
      // Hacia arriba ofrece resistencia; hacia abajo sigue al dedo
      var y = dy < 0 ? -Math.sqrt(-dy) * 2 : dy;
      d.style.transform = "translateY(" + y + "px)";
    });
    function soltar(e) {
      if (!activo) return;
      activo = false;
      d.style.transition = "";
      var velocidad = dy / Math.max(1, e.timeStamp - t0);
      if (dy > d.offsetHeight * 0.3 || velocidad > 0.11) {
        cerrar(d);
      } else {
        d.style.transform = "";
      }
    }
    asa.addEventListener("pointerup", soltar);
    asa.addEventListener("pointercancel", soltar);
  }

  function preparar(d) {
    if (!d) return;
    // Tocar afuera cierra
    d.addEventListener("click", function (e) {
      if (e.target === d) cerrar(d);
    });
    // Escape cierra con la misma animación
    d.addEventListener("cancel", function (e) {
      e.preventDefault();
      cerrar(d);
    });
    d.addEventListener("click", function (e) {
      if (e.target.closest("[data-cerrar]")) cerrar(d);
    });
    arrastre(d);
  }

  return { abrir: abrir, cerrar: cerrar, preparar: preparar };
})();
