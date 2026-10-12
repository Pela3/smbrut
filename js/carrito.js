/*
  Carrito de delivery. Se suma tocando el precio de cada plato.
  Las hamburguesas abren un panel para sacarles ingredientes o sumarles extras.
  Los premios canjeados con estrellas entran al pedido sin cargo.
  Al finalizar arma el mensaje y abre el WhatsApp del local con el pedido.
*/
window.SMBRUT_CARRITO = (function () {
  "use strict";

  var config = window.SMBRUT_CONFIG || {};
  var hoja = window.SMBRUT_HOJA;
  var cuenta = window.SMBRUT_CUENTA;
  var datos = window.SMBRUT_DATOS;
  var moneda = new Intl.NumberFormat("es-AR");
  var GUARDADO = "smbrut:carrito";
  var MAX_EXTRA = 3;

  var $menu = document.querySelector("[data-menu]");
  var $barra = document.querySelector("[data-barra]");
  var $barraCant = $barra.querySelector("[data-barra-cant]");
  var $barraTotal = $barra.querySelector("[data-barra-total]");
  var $hoja = document.querySelector("[data-carrito]");
  var $pedido = $hoja.querySelector("[data-panel-pedido]");
  var $listo = $hoja.querySelector("[data-panel-listo]");
  var $lista = $hoja.querySelector("[data-lista]");
  var $vacio = $hoja.querySelector("[data-vacio]");
  var $total = $hoja.querySelector("[data-total]");
  var $domicilio = $hoja.querySelector("[data-domicilio]");
  var $aclaraciones = $hoja.querySelector("[data-aclaraciones]");
  var $cliente = $hoja.querySelector("[data-cliente]");
  var $error = $hoja.querySelector("[data-error]");
  var $finalizar = $hoja.querySelector("[data-finalizar]");
  var $avisoCanje = $hoja.querySelector("[data-aviso-canje]");

  // [{ nombre, variante, precio, cant, sin: [], extras: [{ nombre, precio, cant }], canje: { id, estrellas } | null }]
  var items = leer();
  var modo = false;
  var ultimoLink = "";

  /* ---------- Datos ---------- */

  function leer() {
    try {
      var guardado = JSON.parse(localStorage.getItem(GUARDADO));
      return Array.isArray(guardado) ? guardado.map(completar) : [];
    } catch (e) { return []; }
  }

  function completar(i) {
    i.sin = i.sin || [];
    i.extras = i.extras || [];
    i.canje = i.canje || null;
    return i;
  }

  function guardar() {
    try { localStorage.setItem(GUARDADO, JSON.stringify(items)); }
    catch (e) { /* sin almacenamiento, el carrito dura lo que dura la visita */ }
  }

  // Dos líneas son la misma si son el mismo plato armado igual
  function clave(i) {
    return [
      i.nombre,
      i.variante || "",
      i.sin.slice().sort().join("+"),
      i.extras.map(function (e) { return e.nombre + "x" + e.cant; }).sort().join("+"),
      i.canje ? "canje" : ""
    ].join("|");
  }

  function buscar(k) {
    for (var i = 0; i < items.length; i++) {
      if (clave(items[i]) === k) return items[i];
    }
    return null;
  }

  function unitario(i) {
    return i.precio + i.extras.reduce(function (n, e) { return n + e.precio * e.cant; }, 0);
  }

  function cantidad() {
    return items.reduce(function (n, i) { return n + i.cant; }, 0);
  }

  function total() {
    return items.reduce(function (n, i) { return n + i.cant * unitario(i); }, 0);
  }

  function estrellasReservadas() {
    return items.reduce(function (n, i) { return n + (i.canje ? i.canje.estrellas * i.cant : 0); }, 0);
  }

  function plata(n) {
    return "$" + moneda.format(n);
  }

  function nombreItem(i) {
    return i.nombre + (i.variante ? " " + i.variante.toLowerCase() : "");
  }

  // "sin cebolla, +1 medallón de carne"
  function cambios(i) {
    return i.sin.map(function (s) { return "sin " + s; })
      .concat(i.extras.map(function (e) { return "+" + e.cant + " " + e.nombre.toLowerCase(); }));
  }

  // Cuando la carta se vuelve a cargar, actualiza precios y saca lo que ya no está
  function reconciliar() {
    var precios = {};
    $menu.querySelectorAll("[data-add]").forEach(function (b) {
      precios[b.dataset.nombre + "|" + b.dataset.variante] = Number(b.dataset.precio);
    });
    var extras = {};
    listaExtras().forEach(function (e) { extras[e.nombre] = e.precio; });
    items = items.filter(function (i) {
      if (i.canje) return true;
      var p = precios[i.nombre + "|" + (i.variante || "")];
      if (!p) return false;
      i.precio = p;
      i.extras = i.extras.filter(function (e) {
        if (!extras[e.nombre]) return false;
        e.precio = extras[e.nombre];
        return true;
      });
      return true;
    });
    guardar();
    pintar();
  }

  /* ---------- Pantalla ---------- */

  function pintarBadges() {
    var cuantos = {};
    items.forEach(function (i) {
      if (i.canje) return;
      var k = i.nombre + "|" + (i.variante || "");
      cuantos[k] = (cuantos[k] || 0) + i.cant;
    });
    $menu.querySelectorAll("[data-add]").forEach(function (b) {
      var n = cuantos[b.dataset.nombre + "|" + b.dataset.variante];
      if (n) b.setAttribute("data-cant", n);
      else b.removeAttribute("data-cant");
    });
  }

  function pintarBarra() {
    var n = cantidad();
    var visible = modo || n > 0;
    $barra.classList.toggle("is-visible", visible);
    $barra.classList.toggle("is-vacia", n === 0);
    $barra.inert = !visible;
    document.body.classList.toggle("con-barra", visible);
    document.body.classList.toggle("is-pidiendo", visible);
    $barraCant.textContent = n;
    $barraTotal.textContent = plata(total());
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function boton(cls, icono, etiqueta, k, accion) {
    var b = el("button", cls);
    b.type = "button";
    b.setAttribute("aria-label", etiqueta);
    b.dataset.k = k;
    b.dataset.accion = accion;
    var i = el("i", "ph-bold " + icono);
    i.setAttribute("aria-hidden", "true");
    b.appendChild(i);
    return b;
  }

  function pintarLista() {
    $lista.textContent = "";
    items.forEach(function (i) {
      var k = clave(i);
      var li = el("li", "linea" + (i.canje ? " linea--canje" : ""));

      var info = el("div", "linea__info");
      info.appendChild(el("p", "linea__nombre", i.nombre));
      var detalle = i.canje
        ? "Canje · " + i.canje.estrellas + " ★ c/u"
        : (i.variante ? i.variante + " · " : "") + plata(unitario(i)) + " c/u";
      info.appendChild(el("p", "linea__detalle", detalle));
      var mods = cambios(i);
      if (mods.length) info.appendChild(el("p", "linea__cambios", mods.join(" · ")));
      li.appendChild(info);

      var stepper = el("div", "stepper");
      stepper.appendChild(boton("stepper__btn", i.cant === 1 ? "ph-trash" : "ph-minus",
        i.cant === 1 ? "Sacar " + nombreItem(i) : "Uno menos de " + nombreItem(i), k, "menos"));
      var cant = el("span", "stepper__cant", i.cant);
      cant.setAttribute("aria-label", i.cant + " de " + nombreItem(i));
      stepper.appendChild(cant);
      stepper.appendChild(boton("stepper__btn", "ph-plus", "Uno más de " + nombreItem(i), k, "mas"));
      li.appendChild(stepper);

      li.appendChild(el("p", "linea__total", i.canje ? "Gratis" : plata(i.cant * unitario(i))));
      $lista.appendChild(li);
    });
    $vacio.hidden = items.length > 0;
    $total.textContent = plata(total());
    var reservadas = estrellasReservadas();
    $avisoCanje.hidden = !reservadas;
    $avisoCanje.textContent = "Usás " + reservadas + " de tus estrellas.";
    $finalizar.disabled = items.length === 0;
  }

  function pintarCliente(perfil) {
    $cliente.textContent = "";
    var icono = el("i", "ph-bold " + (perfil ? "ph-user-circle" : "ph-sign-in"));
    icono.setAttribute("aria-hidden", "true");
    $cliente.appendChild(icono);
    var texto = el("p");
    if (perfil) {
      texto.appendChild(document.createTextNode("A nombre de "));
      texto.appendChild(el("strong", null, perfil.nombre));
      texto.appendChild(document.createTextNode(" · " + perfil.codigo));
    } else {
      texto.textContent = "Para finalizar te vamos a pedir que ingreses. Es un toque y queda guardado para la próxima.";
    }
    $cliente.appendChild(texto);
    $cliente.classList.toggle("is-socio", !!perfil);
  }

  function pintar() {
    pintarBadges();
    pintarBarra();
    pintarLista();
  }

  function rebote(n) {
    if (!n.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    n.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 260, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }

  /* ---------- Acciones ---------- */

  function activarModo(scroll) {
    modo = true;
    pintarBarra();
    if (scroll) {
      var carta = document.getElementById("carta");
      carta.scrollIntoView({ behavior: "smooth", block: "start" });
      carta.focus({ preventScroll: true });
    }
  }

  function salirModo() {
    modo = false;
    pintarBarra();
  }

  function agregar(nuevo) {
    completar(nuevo);
    var existente = buscar(clave(nuevo));
    if (existente) existente.cant += nuevo.cant;
    else items.push(nuevo);
    modo = true;
    guardar();
    pintar();
    rebote($barraCant);
  }

  function sumar(b) {
    agregar({ nombre: b.dataset.nombre, variante: b.dataset.variante, precio: Number(b.dataset.precio), cant: 1 });
  }

  function cambiar(k, delta) {
    var item = buscar(k);
    if (!item) return;
    if (delta > 0 && item.canje && !alcanzan(item.canje.estrellas)) {
      abrirCarrito();
      error("No te alcanzan las estrellas para otro " + item.nombre.toLowerCase() + ".");
      return;
    }
    item.cant += delta;
    if (item.cant <= 0) items.splice(items.indexOf(item), 1);
    guardar();
    pintar();
  }

  function alcanzan(estrellas) {
    var perfil = cuenta.perfil();
    return !!perfil && (perfil.estrellas || 0) - estrellasReservadas() >= estrellas;
  }

  function abrirCarrito() {
    $pedido.hidden = false;
    $listo.hidden = true;
    $error.textContent = "";
    var perfil = cuenta.perfil();
    if (!$domicilio.value && perfil && perfil.domicilio) $domicilio.value = perfil.domicilio;
    pintarCliente(perfil);
    pintarLista();
    hoja.abrir($hoja);
  }

  function pagoElegido() {
    var r = $hoja.querySelector("input[name=pago]:checked");
    return r ? r.value : "";
  }

  function numero(id) {
    return "#" + String(id).padStart(4, "0");
  }

  // El mensaje se arma con el pedido que devolvió la base (precios y total calculados ahí)
  function mensaje(perfil, ped) {
    var lineas = [
      "*Pedido " + numero(ped.id) + " · SMBRUT*",
      "",
      "*Cliente:* " + perfil.nombre,
      "*ID:* " + perfil.codigo,
      "*Teléfono:* " + perfil.telefono,
      "",
      "*Pedido:*"
    ];
    ped.items.forEach(function (i) {
      var mods = i.canje ? ["canje, " + i.canje * i.cant + " estrellas"] : (i.cambios || []);
      lineas.push(i.cant + "x " + nombreItem(i) + (mods.length ? " (" + mods.join(", ") + ")" : "") +
        ": " + plata(i.cant * i.precio));
    });
    lineas.push("", "*Total: " + plata(ped.total) + "*");
    if (ped.canje_estrellas) lineas.push("*Canjea:* " + ped.canje_estrellas + " estrellas");
    lineas.push("", "*Domicilio:* " + ped.domicilio);
    if (ped.aclaraciones) lineas.push("*Aclaraciones:* " + ped.aclaraciones);
    lineas.push("*Pago:* " + ped.pago);
    return lineas.join("\n");
  }

  // Lo que se manda a la base: solo qué se pidió, nunca precios
  function lineasParaBase() {
    var ids = {};
    $menu.querySelectorAll("[data-add]").forEach(function (b) { ids[b.dataset.nombre] = Number(b.dataset.id); });
    var extras = {};
    listaExtras().forEach(function (e) { extras[e.nombre] = e.id; });
    return items.map(function (i) {
      if (i.canje) return { premio: i.canje.id, cant: i.cant };
      return {
        producto: ids[i.nombre],
        variante: i.variante || "",
        cant: i.cant,
        sin: i.sin,
        extras: i.extras.map(function (e) { return { producto: extras[e.nombre], cant: e.cant }; })
      };
    });
  }

  function error(texto, foco) {
    $error.textContent = texto;
    if (foco) foco.focus();
  }

  function finalizar() {
    error("");
    if (!items.length) return;
    var domicilio = $domicilio.value.trim().replace(/\s+/g, " ");
    var aclaraciones = $aclaraciones.value.trim().replace(/\s+/g, " ");
    var pago = pagoElegido();
    if (!domicilio) return error("Falta el domicilio de entrega.", $domicilio);
    if (!pago) return error("Elegí cómo vas a pagar.", $hoja.querySelector("input[name=pago]"));

    var perfil = cuenta.perfil();
    if (!perfil) {
      // El navegador solo deja abrir WhatsApp desde un toque, así que después de ingresar se toca de nuevo
      cuenta.pedirIngreso()
        .then(function (p) {
          pintarCliente(p);
          error("¡Listo, " + p.nombre.split(" ")[0] + "! Ahora sí, tocá Finalizar pedido.");
          $finalizar.focus();
        })
        .catch(function () { /* cerró sin ingresar */ });
      return;
    }
    var reservadas = estrellasReservadas();
    if (reservadas > (perfil.estrellas || 0)) {
      return error("Te alcanzan " + (perfil.estrellas || 0) + " estrellas y los canjes suman " + reservadas + ". Sacá alguno.");
    }

    var telefono = String(config.whatsapp || "").replace(/\D/g, "");
    var textoBoton = $finalizar.innerHTML;
    $finalizar.disabled = true;
    $finalizar.textContent = "Enviando pedido…";

    // Primero se guarda en la base: ahí se calculan los precios y el total, y Santi lo ve en su panel
    datos.crearPedido(lineasParaBase(), domicilio, aclaraciones, pago)
      .then(function (ped) {
        var texto = mensaje(perfil, ped);
        $listo.querySelector("[data-listo-numero]").textContent = numero(ped.id);
        $listo.querySelector("[data-listo-total]").textContent = plata(ped.total);

        // En modo demo no hay WhatsApp: se muestra el mensaje que le llegaría al local
        var $demo = $hoja.querySelector("[data-mensaje-demo]");
        $demo.hidden = !config.demo;
        $listo.classList.toggle("is-demo", !!config.demo);
        if (config.demo) $demo.textContent = texto;
        ultimoLink = telefono ? "https://wa.me/" + telefono + "?text=" + encodeURIComponent(texto) : "";
        var $wa = $hoja.querySelector("[data-reabrir]");
        $wa.href = ultimoLink;
        $wa.hidden = !ultimoLink || !!config.demo;

        items = [];
        modo = false;
        guardar();
        pintar();
        $aclaraciones.value = "";
        $hoja.querySelectorAll("input[name=pago]").forEach(function (r) { r.checked = false; });
        $pedido.hidden = true;
        $listo.hidden = false;
        // Las estrellas del canje ya se descontaron en la base
        datos.refrescar();
      })
      .catch(function (err) {
        error(err.message || "No pudimos mandar el pedido. Probá de nuevo.");
      })
      .then(function () {
        $finalizar.disabled = items.length === 0;
        $finalizar.innerHTML = textoBoton;
      });
  }

  /* ---------- Armar hamburguesa ---------- */

  var $plato = document.querySelector("[data-plato]");
  var $formPlato = $plato.querySelector("[data-form-plato]");
  var armado = null; // { nombre, variantes: [{ variante, precio }], sin: {}, extras: {}, cant }

  function listaExtras() {
    var vistos = {};
    return Array.prototype.filter.call($menu.querySelectorAll('[data-add][data-tipo="extra"]'), function (b) {
      if (vistos[b.dataset.nombre]) return false;
      vistos[b.dataset.nombre] = true;
      return true;
    }).map(function (b) { return { id: Number(b.dataset.id), nombre: b.dataset.nombre, precio: Number(b.dataset.precio) }; });
  }

  // De "Medallón de carne, cheddar x2, salsa brut" saca lo que se puede quitar
  function ingredientes(desc) {
    return String(desc || "").split(",").map(function (s) {
      return s.trim().replace(/\s*x\d+$/i, "").toLowerCase();
    }).filter(function (s) {
      return s && !/^(medall[oó]n|pan\b|medialuna)/.test(s);
    });
  }

  function abrirArmado(b) {
    var nombre = b.dataset.nombre;
    var variantes = Array.prototype.filter.call($menu.querySelectorAll("[data-add]"), function (x) {
      return x.dataset.nombre === nombre;
    }).map(function (x) { return { variante: x.dataset.variante, precio: Number(x.dataset.precio) }; });

    armado = { nombre: nombre, variantes: variantes, variante: b.dataset.variante, sin: {}, extras: {}, cant: 1 };

    $plato.querySelector("[data-plato-nombre]").textContent = nombre;
    $plato.querySelector("[data-plato-desc]").textContent = b.dataset.desc || "";

    // Tamaño
    var $tamanos = $plato.querySelector("[data-tamanos]");
    $tamanos.textContent = "";
    variantes.forEach(function (v) {
      var label = el("label", "opcion");
      var r = el("input");
      r.type = "radio";
      r.name = "tamano";
      r.value = v.variante;
      r.checked = v.variante === armado.variante;
      label.appendChild(r);
      label.appendChild(el("span", null, v.variante));
      label.appendChild(el("span", "opcion__precio", plata(v.precio)));
      $tamanos.appendChild(label);
    });
    $plato.querySelector("[data-plato-tamanos]").hidden = variantes.length < 2;

    // Ingredientes para sacar
    var lista = ingredientes(b.dataset.desc);
    var $ing = $plato.querySelector("[data-ingredientes]");
    $ing.textContent = "";
    lista.forEach(function (ing) {
      var label = el("label", "ingrediente");
      var c = el("input");
      c.type = "checkbox";
      c.name = "sin";
      c.value = ing;
      label.appendChild(c);
      label.appendChild(el("span", "ingrediente__nombre", ing));
      $ing.appendChild(label);
    });
    $plato.querySelector("[data-plato-sacar]").hidden = !lista.length;

    // Extras
    var extras = listaExtras();
    var $extras = $plato.querySelector("[data-extras]");
    $extras.textContent = "";
    extras.forEach(function (e) {
      armado.extras[e.nombre] = { nombre: e.nombre, precio: e.precio, cant: 0 };
      var li = el("li", "extra");
      var info = el("div", "extra__info");
      info.appendChild(el("span", "extra__nombre", e.nombre));
      info.appendChild(el("span", "extra__precio", "+" + plata(e.precio)));
      li.appendChild(info);
      var stepper = el("div", "stepper");
      [["-1", "ph-minus", "Uno menos de "], ["1", "ph-plus", "Uno más de "]].forEach(function (p, idx) {
        var btn = el("button", "stepper__btn");
        btn.type = "button";
        btn.dataset.extra = e.nombre;
        btn.dataset.delta = p[0];
        btn.setAttribute("aria-label", p[2] + e.nombre.toLowerCase());
        var i = el("i", "ph-bold " + p[1]);
        i.setAttribute("aria-hidden", "true");
        btn.appendChild(i);
        if (idx === 1) stepper.appendChild(el("span", "stepper__cant", "0"));
        stepper.appendChild(btn);
      });
      li.appendChild(stepper);
      $extras.appendChild(li);
    });
    $plato.querySelector("[data-plato-extras]").hidden = !extras.length;

    pintarArmado();
    hoja.abrir($plato);
  }

  function itemArmado() {
    var v = armado.variantes.filter(function (x) { return x.variante === armado.variante; })[0] || armado.variantes[0];
    return completar({
      nombre: armado.nombre,
      variante: v.variante,
      precio: v.precio,
      cant: armado.cant,
      sin: Object.keys(armado.sin).filter(function (k) { return armado.sin[k]; }),
      extras: Object.keys(armado.extras).map(function (k) { return armado.extras[k]; })
        .filter(function (e) { return e.cant > 0; })
        .map(function (e) { return { nombre: e.nombre, precio: e.precio, cant: e.cant }; })
    });
  }

  function pintarArmado() {
    $plato.querySelectorAll("[data-extra]").forEach(function (b) {
      var e = armado.extras[b.dataset.extra];
      var cant = b.parentNode.querySelector(".stepper__cant");
      cant.textContent = e.cant;
      if (b.dataset.delta === "-1") b.disabled = e.cant === 0;
      else b.disabled = e.cant >= MAX_EXTRA;
    });
    $plato.querySelector("[data-plato-cantidad]").textContent = armado.cant;
    $plato.querySelector('[data-plato-cant="-1"]').disabled = armado.cant <= 1;
    var item = itemArmado();
    $plato.querySelector("[data-plato-sumar]").textContent = "Agregar · " + plata(item.cant * unitario(item));
  }

  $formPlato.addEventListener("change", function (e) {
    if (e.target.name === "tamano") armado.variante = e.target.value;
    if (e.target.name === "sin") armado.sin[e.target.value] = e.target.checked;
    pintarArmado();
  });

  $formPlato.addEventListener("click", function (e) {
    var extra = e.target.closest("[data-extra]");
    var cant = e.target.closest("[data-plato-cant]");
    if (extra) {
      var x = armado.extras[extra.dataset.extra];
      x.cant = Math.max(0, Math.min(MAX_EXTRA, x.cant + Number(extra.dataset.delta)));
    } else if (cant) {
      armado.cant = Math.max(1, Math.min(20, armado.cant + Number(cant.dataset.platoCant)));
    } else {
      return;
    }
    pintarArmado();
  });

  $formPlato.addEventListener("submit", function (e) {
    e.preventDefault();
    agregar(itemArmado());
    hoja.cerrar($plato);
  });

  /* ---------- Canjes (desde la cuenta del cliente) ---------- */

  function agregarCanje(premio) {
    if (!alcanzan(premio.estrellas)) return false;
    agregar({ nombre: premio.nombre, variante: "", precio: 0, cant: 1, canje: { id: premio.id, estrellas: premio.estrellas } });
    return true;
  }

  /* ---------- Eventos ---------- */

  // Para pedir hay que estar ingresado. Si no, primero se ingresa y después sigue solo
  function conIngreso(accion) {
    if (cuenta.perfil()) { accion(); return; }
    cuenta.pedirIngreso().then(accion).catch(function () { /* cerró sin ingresar */ });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-pedir]")) {
      e.preventDefault();
      conIngreso(function () { activarModo(true); });
    }
  });

  window.addEventListener("smbrut:pedir", function () {
    conIngreso(function () { activarModo(false); });
  });

  $menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (!b) return;
    conIngreso(function () {
      if (b.dataset.tipo === "personalizable") abrirArmado(b);
      else sumar(b);
    });
  });

  $barra.querySelector("[data-ver-pedido]").addEventListener("click", abrirCarrito);
  $barra.querySelector("[data-salir-pedido]").addEventListener("click", salirModo);

  $lista.addEventListener("click", function (e) {
    var b = e.target.closest("[data-accion]");
    if (!b) return;
    var k = b.dataset.k;
    var accion = b.dataset.accion;
    cambiar(k, accion === "mas" ? 1 : -1);
    // Mantener el foco en el mismo control después de redibujar
    var mismo = $lista.querySelector('[data-accion="' + accion + '"][data-k="' + CSS.escape(k) + '"]')
      || $lista.querySelector('[data-k="' + CSS.escape(k) + '"]');
    if (mismo) mismo.focus();
    else if (items.length) $domicilio.focus();
    else $hoja.querySelector("[data-seguir]").focus();
  });

  $finalizar.addEventListener("click", finalizar);

  $hoja.addEventListener("change", function (e) {
    if (e.target.name === "pago") error("");
  });

  // "Sumar algo más" vuelve a la carta en modo pedido
  $hoja.querySelector("[data-seguir]").addEventListener("click", function () {
    activarModo(false);
  });

  window.addEventListener("smbrut:menu", reconciliar);
  cuenta.onCambio(function (perfil) {
    pintarCliente(perfil);
    // Al cerrar sesión se vacía el pedido: el próximo que use el celular arranca de cero
    if (!perfil && (items.length || modo)) {
      items = [];
      modo = false;
      guardar();
      pintar();
    }
  });

  hoja.preparar($hoja);
  hoja.preparar($plato);
  pintarBarra();

  return {
    agregarCanje: agregarCanje,
    estrellasReservadas: estrellasReservadas,
    abrir: abrirCarrito
  };
})();
