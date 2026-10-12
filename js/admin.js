/*
  Panel de Santi: buscar un cliente por su ID y sumarle o restarle estrellas.
*/
(function () {
  "use strict";

  var datos = window.SMBRUT_DATOS;
  var moneda = new Intl.NumberFormat("es-AR");
  var fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  var $vistas = document.querySelectorAll("[data-vista]");
  var $salir = document.querySelector("[data-salir]");
  var $formIngreso = document.querySelector("[data-form-ingreso]");
  var $errorIngreso = document.querySelector("[data-error-ingreso]");
  var $formBuscar = document.querySelector("[data-form-buscar]");
  var $ayuda = document.querySelector("[data-ayuda]");
  var $resultados = document.querySelector("[data-resultados]");
  var $cliente = document.querySelector("[data-cliente]");
  var $formSumar = document.querySelector("[data-form-sumar]");
  var $errorSumar = document.querySelector("[data-error-sumar]");
  var $ok = document.querySelector("[data-ok]");
  var $confirmar = document.querySelector("[data-confirmar]");
  var $recientes = document.querySelector("[data-recientes]");

  var actual = null; // cliente elegido
  var ayudaOriginal = $ayuda.textContent;

  /* ---------- Utilidades ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function estrellas(n) {
    return n + (Math.abs(n) === 1 ? " estrella" : " estrellas");
  }

  function cuando(iso) {
    try { return fecha.format(new Date(iso)); } catch (e) { return ""; }
  }

  function ocupado(form, si) {
    Array.prototype.forEach.call(form.querySelectorAll("button, input"), function (n) { n.disabled = si; });
  }

  var $irClave = document.querySelector("[data-ir-clave]");
  var $formClave = document.querySelector("[data-form-clave]");
  var $errorClave = document.querySelector("[data-error-clave]");

  function vista(nombre) {
    $vistas.forEach(function (v) { v.hidden = v.getAttribute("data-vista") !== nombre; });
    $salir.hidden = nombre === "ingreso";
    $irClave.hidden = nombre !== "app";
  }

  /* ---------- Sesión ---------- */

  function revisarSesion() {
    var p = datos.perfil();
    if (p && p.es_admin) {
      vista("app");
      cargarRecientes();
      if (!actual) document.getElementById("buscar").focus();
    } else {
      vista("ingreso");
    }
  }

  $formIngreso.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $formIngreso.email.value.trim();
    var clave = $formIngreso.clave.value;
    $errorIngreso.textContent = "";
    if (!email || !clave) { $errorIngreso.textContent = "Completá el mail y la contraseña."; return; }
    ocupado($formIngreso, true);
    datos.ingresar(email, clave)
      .then(function (p) {
        if (!p || !p.es_admin) {
          $errorIngreso.textContent = "Esta cuenta no es de administrador.";
          return datos.salir();
        }
        $formIngreso.clave.value = "";
        revisarSesion();
      })
      .catch(function (err) { $errorIngreso.textContent = err.message; })
      .then(function () { ocupado($formIngreso, false); });
  });

  $salir.addEventListener("click", function () {
    actual = null;
    $cliente.hidden = true;
    $resultados.hidden = true;
    datos.salir().then(revisarSesion);
  });

  /* ---------- Cambiar contraseña ---------- */

  $irClave.addEventListener("click", function () {
    $formClave.reset();
    $errorClave.textContent = "";
    $errorClave.classList.remove("is-ok");
    vista("clave");
    $formClave.actual.focus();
  });

  $formClave.querySelector("[data-volver-panel]").addEventListener("click", function () { vista("app"); });

  $formClave.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = $formClave;
    $errorClave.textContent = "";
    $errorClave.classList.remove("is-ok");
    var falta = null;
    if (!f.actual.value) falta = [f.actual, "Escribí tu contraseña actual."];
    else if (f.nueva.value.length < 6) falta = [f.nueva, "La contraseña nueva tiene que tener al menos 6 caracteres."];
    else if (f.nueva.value !== f.repetir.value) falta = [f.repetir, "Las dos contraseñas nuevas no coinciden."];
    if (falta) {
      $errorClave.textContent = falta[1];
      falta[0].focus();
      return;
    }
    ocupado(f, true);
    datos.cambiarClave(f.actual.value, f.nueva.value)
      .then(function () {
        f.reset();
        $errorClave.textContent = "Listo, cambiaste tu contraseña.";
        $errorClave.classList.add("is-ok");
      })
      .catch(function (err) { $errorClave.textContent = err.message; })
      .then(function () { ocupado(f, false); });
  });

  /* ---------- Buscar ---------- */

  function buscar(q) {
    $ayuda.textContent = "Buscando…";
    $ayuda.classList.remove("is-error");
    return datos.buscarClientes(q).then(function (lista) {
      $resultados.textContent = "";
      $resultados.hidden = true;
      if (!lista.length) {
        $ayuda.textContent = "No encontramos a nadie con \"" + q + "\". Revisá el ID.";
        $ayuda.classList.add("is-error");
        $cliente.hidden = true;
        actual = null;
        return;
      }
      $ayuda.textContent = ayudaOriginal;
      if (lista.length === 1) { elegir(lista[0]); return; }
      $cliente.hidden = true;
      lista.forEach(function (c) {
        var li = el("li");
        var b = el("button", "resultado");
        b.type = "button";
        b.appendChild(el("span", "resultado__nombre", c.nombre));
        b.appendChild(el("span", "resultado__codigo", c.codigo + (c.telefono ? " · " + c.telefono : "")));
        b.appendChild(el("span", "resultado__estrellas", estrellas(c.estrellas)));
        b.addEventListener("click", function () { elegir(c); });
        li.appendChild(b);
        $resultados.appendChild(li);
      });
      $resultados.hidden = false;
    }).catch(function (err) {
      $ayuda.textContent = err.message;
      $ayuda.classList.add("is-error");
    });
  }

  $formBuscar.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = $formBuscar.q.value.trim();
    if (!q) { $formBuscar.q.focus(); return; }
    buscar(q);
  });

  /* ---------- Cliente ---------- */

  function pintarCliente() {
    $cliente.querySelector("[data-c-codigo]").textContent = actual.codigo;
    $cliente.querySelector("[data-c-nombre]").textContent = actual.nombre;
    $cliente.querySelector("[data-c-tel]").textContent = actual.telefono || "";
    $cliente.querySelector("[data-c-estrellas]").textContent = actual.estrellas;
    $cliente.querySelector("[data-c-estrellas-texto]").textContent = actual.estrellas === 1 ? "estrella" : "estrellas";
  }

  function elegir(c) {
    actual = c;
    $resultados.hidden = true;
    $cliente.hidden = false;
    $errorSumar.textContent = "";
    $ok.textContent = "";
    $formSumar.querySelector('input[name=modo][value="compra"]').checked = true;
    pintarCliente();
    reiniciarFormulario();
    cargarHistorial();
    $cliente.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cargarHistorial() {
    var $movs = $cliente.querySelector("[data-c-movs]");
    var $peds = $cliente.querySelector("[data-c-pedidos]");
    var id = actual.id;
    datos.movimientos(id).then(function (lista) {
      if (!actual || actual.id !== id) return;
      pintarMovs($movs, lista, false);
    });
    datos.pedidos(id).then(function (lista) {
      if (!actual || actual.id !== id) return;
      $peds.textContent = "";
      if (!lista.length) { $peds.appendChild(el("li", "vacio", "Todavía no pidió por la web.")); return; }
      lista.forEach(function (p) {
        var li = el("li", "ped");
        var detalle = (p.items || []).map(function (i) {
          return i.cant + "x " + i.nombre + (i.variante ? " " + i.variante.toLowerCase() : "");
        }).join(", ");
        li.appendChild(el("p", "ped__items", detalle));
        li.appendChild(el("p", "ped__meta", cuando(p.creado) + " · $" + moneda.format(p.total) + " · " + p.pago));
        $peds.appendChild(li);
      });
    });
  }

  function pintarMovs($lista, lista, global) {
    $lista.textContent = "";
    if (!lista.length) {
      $lista.appendChild(el("li", "vacio", global ? "Acá vas a ver las estrellas que vayas sumando." : "Todavía no tiene movimientos."));
      return;
    }
    lista.forEach(function (m) {
      var li = el("li", "mov");
      var signo = el("span", "mov__cant" + (m.cantidad < 0 ? " is-resta" : ""), (m.cantidad > 0 ? "+" : "") + m.cantidad);
      li.appendChild(signo);
      var texto = el("div", "mov__texto");
      if (global) {
        var b = el("button", "mov__quien", m.nombre || m.codigo);
        b.type = "button";
        b.addEventListener("click", function () {
          $formBuscar.q.value = m.codigo;
          buscar(m.codigo);
        });
        texto.appendChild(b);
      }
      var detalle = [m.monto ? "Compra de $" + moneda.format(m.monto) : "", m.motivo].filter(Boolean).join(" · ");
      texto.appendChild(el("p", "mov__motivo", detalle || (m.cantidad > 0 ? "Ajuste" : "Corrección")));
      li.appendChild(texto);
      li.appendChild(el("time", "mov__fecha", cuando(m.creado)));
      $lista.appendChild(li);
    });
  }

  function cargarRecientes() {
    datos.movimientos(null)
      .then(function (lista) { pintarMovs($recientes, lista, true); })
      .catch(function (err) { console.warn("No se pudieron leer los movimientos.", err); });
  }

  /* ---------- Sumar / restar ---------- */

  var programa = (window.SMBRUT_CONFIG || {}).estrellas || {};
  var pesosPorEstrella = Number(programa.pesosPorEstrella) || 1000;
  var $monto = $formSumar.monto;
  var $calculo = $formSumar.querySelector("[data-calculo]");

  function modo() {
    return $formSumar.querySelector("input[name=modo]:checked").value;
  }

  function monto() {
    return Number(String($monto.value).replace(/\D/g, "")) || 0;
  }

  function ajuste() {
    var n = parseInt(String($formSumar.cantidad.value).replace(/[^\d-]/g, ""), 10);
    return isFinite(n) ? Math.max(-999, Math.min(999, n)) : 0;
  }

  // Lo que se va a cargar según la pestaña: { cantidad, monto, motivo, texto }
  function operacion() {
    var m = modo();
    if (m === "compra") {
      var plata = monto();
      var n = Math.floor(plata / pesosPorEstrella);
      return { cantidad: n, monto: plata, motivo: "", texto: n ? "Sumar " + estrellas(n) : (plata ? "No llega a una estrella" : "Escribí el monto") };
    }
    var a = ajuste();
    return { cantidad: a, motivo: "", texto: !a ? "Elegí una cantidad" : (a > 0 ? "Sumar " : "Restar ") + estrellas(Math.abs(a)) };
  }

  function pintarFormulario() {
    var m = modo();
    $formSumar.querySelectorAll("[data-seccion]").forEach(function (s) {
      s.hidden = s.getAttribute("data-seccion") !== m;
    });
    if (m === "compra") {
      var plata = monto();
      $calculo.textContent = plata
        ? "$" + moneda.format(plata) + " = " + estrellas(Math.floor(plata / pesosPorEstrella))
        : "1 estrella cada $" + moneda.format(pesosPorEstrella) + ".";
    }
    var op = operacion();
    $formSumar.classList.toggle("is-resta", op.cantidad < 0);
    $confirmar.textContent = op.texto;
    $confirmar.disabled = !op.cantidad;
  }

  function reiniciarFormulario() {
    $monto.value = "";
    $formSumar.motivo.value = "";
    $formSumar.cantidad.value = "+1";
    pintarFormulario();
  }

  // El monto se muestra con puntos de miles mientras se escribe
  $monto.addEventListener("input", function () {
    var plata = monto();
    $monto.value = plata ? moneda.format(plata) : "";
  });

  $formSumar.addEventListener("input", function () { $ok.textContent = ""; pintarFormulario(); });
  $formSumar.addEventListener("change", function (e) {
    if (e.target.name === "modo") {
      $errorSumar.textContent = "";
      var foco = { compra: $monto, ajuste: $formSumar.cantidad }[modo()];
      pintarFormulario();
      if (foco) foco.focus();
      return;
    }
    if (e.target.name === "cantidad") {
      var a = ajuste();
      $formSumar.cantidad.value = (a > 0 ? "+" : "") + a;
    }
    pintarFormulario();
  });

  $formSumar.addEventListener("click", function (e) {
    var paso = e.target.closest("[data-paso]");
    if (!paso) return;
    var a = ajuste() + Number(paso.dataset.paso);
    $formSumar.cantidad.value = (a > 0 ? "+" : "") + a;
    $ok.textContent = "";
    pintarFormulario();
  });

  $formSumar.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!actual) return;
    var op = operacion();
    if (!op.cantidad) return;
    var nota = $formSumar.motivo.value.trim();
    var motivo = [op.motivo, nota].filter(Boolean).join(" · ");
    $errorSumar.textContent = "";
    $ok.textContent = "";
    ocupado($formSumar, true);
    datos.sumarEstrellas(actual.codigo, op.cantidad, motivo, op.monto)
      .then(function (c) {
        var nombre = c.nombre.split(" ")[0];
        actual = c;
        pintarCliente();
        rebote($cliente.querySelector(".cliente__estrellas"));
        var hecho = "Listo, " + (op.cantidad > 0 ? "+" : "") + op.cantidad + ". ";
        $ok.textContent = hecho +
          nombre + " ahora tiene " + estrellas(c.estrellas) + ".";
        reiniciarFormulario();
        cargarHistorial();
        cargarRecientes();
      })
      .catch(function (err) { $errorSumar.textContent = err.message; })
      .then(function () {
        ocupado($formSumar, false);
        pintarFormulario();
      });
  });

  function rebote(n) {
    if (!n.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    n.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }

  /* ---------- Inicio ---------- */

  if (datos.modo === "demo") document.querySelector("[data-demo]").hidden = false;
  datos.listo.then(revisarSesion, function () {
    vista("ingreso");
    $errorIngreso.textContent = "No pudimos conectar con la base de datos. Revisá internet y recargá.";
  });
})();
