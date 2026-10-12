/*
  Cuenta del cliente: ingreso con mail y contraseña, sus datos, su ID de socio (SMB-XXXXX)
  y sus estrellas. Los datos se guardan a través de js/datos.js.
*/
window.SMBRUT_CUENTA = (function () {
  "use strict";

  var config = window.SMBRUT_CONFIG || {};
  var hoja = window.SMBRUT_HOJA;
  var datos = window.SMBRUT_DATOS;

  var $hoja = document.querySelector("[data-cuenta]");
  var $titulo = $hoja.querySelector("[data-cuenta-titulo]");
  var $paneles = $hoja.querySelectorAll("[data-panel]");
  var $formAcceso = $hoja.querySelector("[data-form-acceso]");
  var $formDatos = $hoja.querySelector("[data-form-datos]");
  var $errorAcceso = $hoja.querySelector("[data-error-acceso]");
  var $errorDatos = $hoja.querySelector("[data-error-datos]");
  var $cambiarModo = $hoja.querySelector("[data-cambiar-modo]");
  var $olvide = $hoja.querySelector("[data-olvide]");
  var $soloCrear = $hoja.querySelectorAll("[data-solo-crear]");
  var $formClave = $hoja.querySelector("[data-form-clave]");
  var $errorClave = $hoja.querySelector("[data-error-clave]");

  var pendiente = null; // pedido de ingreso en curso (desde el carrito)
  var modoAcceso = "ingresar";
  var oyentes = [];

  var TITULOS = { acceso: "Ingresá", crear: "Creá tu cuenta", datos: "Tus datos", clave: "Tu contraseña", perfil: "Tu cuenta" };

  function perfil() {
    var p = datos.perfil();
    return p && !p.es_admin ? p : null;
  }

  function avisar() {
    pintarBotones();
    oyentes.forEach(function (fn) { fn(perfil()); });
  }

  function ocupado(form, si) {
    Array.prototype.forEach.call(form.querySelectorAll("button, input"), function (n) {
      n.disabled = si;
    });
  }

  function validarTelefono(t) {
    return t.replace(/\D/g, "").length >= 8;
  }

  /* ---------- Paneles ---------- */

  function mostrar(nombre) {
    $paneles.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== nombre; });
    $titulo.textContent = nombre === "acceso" && modoAcceso === "crear" ? TITULOS.crear : TITULOS[nombre];
    if (nombre === "datos") {
      var p = perfil();
      $formDatos.nombre.value = (p && p.nombre) || "";
      $formDatos.telefono.value = (p && p.telefono) || "";
      $errorDatos.textContent = "";
    }
    if (nombre === "clave") {
      $formClave.reset();
      $errorClave.textContent = "";
    }
    if (nombre === "perfil") pintarPerfil();
    else $hoja.querySelector("[data-perfil-ok]").textContent = "";
  }

  function siguientePaso() {
    if (perfil()) {
      if (pendiente) {
        var p = pendiente;
        pendiente = null;
        p.ok(perfil());
        hoja.cerrar($hoja);
      } else {
        mostrar("perfil");
      }
    } else {
      mostrar("acceso");
    }
  }

  function pintarModoAcceso() {
    var crear = modoAcceso === "crear";
    $soloCrear.forEach(function (n) { n.hidden = !crear; });
    $formAcceso.querySelector("[type=submit]").textContent = crear ? "Crear cuenta" : "Ingresar";
    $formAcceso.clave.autocomplete = crear ? "new-password" : "current-password";
    $cambiarModo.textContent = crear ? "Ya tengo cuenta" : "¿No tenés cuenta? Creá una";
    $olvide.hidden = crear || !config.recuperarClave;
    $errorAcceso.textContent = "";
    if (!$paneles[0].hidden) $titulo.textContent = crear ? TITULOS.crear : TITULOS.acceso;
  }

  function pintarPerfil() {
    var p = perfil();
    if (!p) return;
    $hoja.querySelector("[data-socio-nombre]").textContent = p.nombre;
    $hoja.querySelector("[data-socio-codigo]").textContent = p.codigo;
    var n = p.estrellas || 0;
    $hoja.querySelector("[data-socio-estrellas]").textContent = n;
    $hoja.querySelector("[data-socio-estrellas-texto]").textContent = n === 1 ? "estrella" : "estrellas";
    pintarPremios(n);
    var filas = [["telefono", p.telefono], ["email", p.email], ["domicilio", p.domicilio]];
    filas.forEach(function (f) {
      var fila = $hoja.querySelector("[data-perfil-" + f[0] + "]");
      fila.hidden = !f[1];
      fila.querySelector("dd").textContent = f[1] || "";
    });
  }

  var premios = [];

  var pesosPorEstrella = Number((config.estrellas || {}).pesosPorEstrella) || 1000;

  function cargarPremios() {
    datos.ajustes().then(function (a) { pesosPorEstrella = a.pesos_por_estrella || pesosPorEstrella; }).catch(function () {});
    return datos.premios()
      .then(function (lista) { premios = lista || []; if (perfil()) pintarPremios(perfil().estrellas || 0); })
      .catch(function (err) { console.warn("No se pudieron leer los premios.", err); });
  }

  function pintarPremios(n) {
    var moneda = new Intl.NumberFormat("es-AR");
    var carrito = window.SMBRUT_CARRITO;
    var reservadas = carrito ? carrito.estrellasReservadas() : 0;
    var libres = n - reservadas;
    var proximo = premios.filter(function (c) { return c.estrellas > n; })[0];
    $hoja.querySelector("[data-socio-proximo]").textContent = proximo
      ? "Te faltan " + (proximo.estrellas - n) + " para " + proximo.nombre.toLowerCase() + "."
      : premios.length ? "Ya podés canjear cualquier premio." : "";
    $hoja.querySelector("[data-premios-regla]").textContent =
      "Sumás 1 estrella cada $" + moneda.format(pesosPorEstrella) + " que gastás." +
      (reservadas ? " Ya tenés " + reservadas + " reservadas en tu pedido." : "");

    var $lista = $hoja.querySelector("[data-premios]");
    $lista.textContent = "";
    premios.forEach(function (c) {
      var alcanza = libres >= c.estrellas;
      var li = document.createElement("li");
      li.className = "premio" + (alcanza ? " is-listo" : "");
      var nombre = document.createElement("span");
      nombre.className = "premio__nombre";
      nombre.textContent = c.nombre;
      li.appendChild(nombre);
      if (alcanza) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "premio__canjear";
        btn.textContent = "Canjear · " + c.estrellas + " ★";
        btn.setAttribute("aria-label", "Canjear " + c.nombre + " por " + c.estrellas + " estrellas");
        btn.addEventListener("click", function () { canjearPremio(c); });
        li.appendChild(btn);
      } else {
        var costo = document.createElement("span");
        costo.className = "premio__costo";
        costo.textContent = c.estrellas + " ★";
        li.appendChild(costo);
      }
      var barra = document.createElement("span");
      barra.className = "premio__barra";
      barra.setAttribute("aria-hidden", "true");
      barra.style.setProperty("--avance", Math.max(0, Math.min(1, libres / c.estrellas)));
      li.appendChild(barra);
      $lista.appendChild(li);
    });
  }

  // El premio entra gratis al pedido; las estrellas se descuentan al finalizarlo
  function canjearPremio(premio) {
    var carrito = window.SMBRUT_CARRITO;
    if (!carrito || !carrito.agregarCanje(premio)) return;
    hoja.cerrar($hoja);
    setTimeout(carrito.abrir, 220);
  }

  function pintarBotones() {
    var p = perfil();
    var nombre = p ? p.nombre.split(" ")[0] : "";
    document.querySelectorAll("[data-abrir-cuenta]").forEach(function (b) {
      b.querySelector("span").textContent = nombre || "Ingresar";
      b.classList.toggle("is-socio", !!nombre);
    });
  }

  /* ---------- Acciones ---------- */

  function abrir() {
    if (!perfil()) {
      modoAcceso = "ingresar";
      pintarModoAcceso();
    } else {
      // Puede que Santi le haya sumado estrellas desde la última vez
      datos.refrescar();
      cargarPremios();
    }
    siguientePaso();
    hoja.abrir($hoja);
  }

  // Abre el ingreso y resuelve cuando la persona entró a su cuenta
  function pedirIngreso() {
    if (perfil()) return Promise.resolve(perfil());
    return new Promise(function (ok, mal) {
      pendiente = { ok: ok, mal: mal };
      abrir();
    });
  }

  $hoja.addEventListener("close", function () {
    if (pendiente) {
      var p = pendiente;
      pendiente = null;
      p.mal(new Error("Ingreso cancelado"));
    }
  });

  $formAcceso.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = $formAcceso;
    var email = f.email.value.trim();
    var clave = f.clave.value;
    var crear = modoAcceso === "crear";
    $errorAcceso.textContent = "";

    var falta = null;
    if (crear && !f.nombre.value.trim()) falta = [f.nombre, "Falta tu nombre."];
    else if (crear && !validarTelefono(f.telefono.value)) falta = [f.telefono, "Revisá el teléfono, con código de área."];
    else if (!email) falta = [f.email, "Falta tu mail."];
    else if (!clave) falta = [f.clave, "Falta la contraseña."];
    else if (crear && clave.length < 6) falta = [f.clave, "La contraseña tiene que tener al menos 6 caracteres."];
    if (falta) {
      $errorAcceso.textContent = falta[1];
      falta[0].focus();
      return;
    }

    ocupado(f, true);
    var envio = crear
      ? datos.registrar({ email: email, clave: clave, nombre: f.nombre.value.trim().replace(/\s+/g, " "), telefono: f.telefono.value.trim() })
      : datos.ingresar(email, clave);
    envio
      .then(function (r) {
        if (r && r.confirmar) {
          $errorAcceso.textContent = "Te mandamos un mail a " + email + ". Confirmalo y después ingresá.";
          modoAcceso = "ingresar";
          pintarModoAcceso();
          return;
        }
        if (datos.perfil() && datos.perfil().es_admin) {
          $errorAcceso.textContent = "Esa es la cuenta de admin. Para pedir, usá una cuenta de cliente.";
          datos.salir();
          return;
        }
        f.clave.value = "";
        siguientePaso();
      })
      .catch(function (err) { $errorAcceso.textContent = err.message; })
      .then(function () { ocupado(f, false); });
  });

  $cambiarModo.addEventListener("click", function () {
    modoAcceso = modoAcceso === "crear" ? "ingresar" : "crear";
    pintarModoAcceso();
    (modoAcceso === "crear" ? $formAcceso.nombre : $formAcceso.email).focus();
  });

  $olvide.addEventListener("click", function () {
    var email = $formAcceso.email.value.trim();
    if (!email) {
      $errorAcceso.textContent = "Escribí tu mail arriba y tocá de nuevo acá.";
      $formAcceso.email.focus();
      return;
    }
    datos.recuperar(email)
      .then(function () { $errorAcceso.textContent = "Te mandamos un mail para cambiar la contraseña."; })
      .catch(function (err) { $errorAcceso.textContent = err.message; });
  });

  $formDatos.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $formDatos.nombre.value.trim().replace(/\s+/g, " ");
    var telefono = $formDatos.telefono.value.trim();
    $errorDatos.textContent = "";
    if (!nombre) { $errorDatos.textContent = "Falta tu nombre."; $formDatos.nombre.focus(); return; }
    if (!validarTelefono(telefono)) {
      $errorDatos.textContent = "Revisá el teléfono, con código de área.";
      $formDatos.telefono.focus();
      return;
    }
    ocupado($formDatos, true);
    datos.actualizarPerfil({ nombre: nombre, telefono: telefono })
      .then(function () { mostrar("perfil"); })
      .catch(function (err) { $errorDatos.textContent = err.message; })
      .then(function () { ocupado($formDatos, false); });
  });

  $hoja.querySelector("[data-editar]").addEventListener("click", function () { mostrar("datos"); });
  $hoja.querySelector("[data-cambiar-clave]").addEventListener("click", function () {
    mostrar("clave");
    $formClave.actual.focus();
  });
  $hoja.querySelector("[data-volver-perfil]").addEventListener("click", function () { mostrar("perfil"); });

  $formClave.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = $formClave;
    $errorClave.textContent = "";
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
        mostrar("perfil");
        $hoja.querySelector("[data-perfil-ok]").textContent = "Listo, cambiaste tu contraseña.";
      })
      .catch(function (err) { $errorClave.textContent = err.message; })
      .then(function () { ocupado(f, false); });
  });

  $hoja.querySelector("[data-salir]").addEventListener("click", function () {
    datos.salir();
    hoja.cerrar($hoja);
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-abrir-cuenta]")) abrir();
  });

  datos.onCambio(function () {
    avisar();
    if ($hoja.open && !$hoja.querySelector('[data-panel="perfil"]').hidden) pintarPerfil();
  });

  /* ---------- Inicio ---------- */

  hoja.preparar($hoja);
  cargarPremios();
  pintarModoAcceso();
  pintarBotones();

  return {
    perfil: perfil,
    pedirIngreso: pedirIngreso,
    abrir: abrir,
    onCambio: function (fn) { oyentes.push(fn); }
  };
})();
