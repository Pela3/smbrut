/*
  Panel de Santi: buscar un cliente por su ID y sumarle o restarle estrellas.
*/
(function () {
  "use strict";

  var datos = window.SMBRUT_DATOS;
  var moneda = new Intl.NumberFormat("es-AR");
  var fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

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
      iniciarPedidos();
      datos.ajustes().then(function (a) {
        pesosPorEstrella = a.pesos_por_estrella || pesosPorEstrella;
        pintarFormulario();
      }).catch(function () {});
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

  /* ---------- Pestañas ---------- */

  function irA(tab) {
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle("is-on", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-seccion-app]").forEach(function (s) {
      s.hidden = s.getAttribute("data-seccion-app") !== tab;
    });
    if (tab === "clientes" && !actual) document.getElementById("buscar").focus();
    if (tab === "precios") cargarCarta();
  }

  document.querySelectorAll("[data-tab]").forEach(function (b) {
    b.addEventListener("click", function () { irA(b.dataset.tab); });
  });

  /* ---------- Pedidos ---------- */

  var $pedidos = document.querySelector("[data-pedidos]");
  var $pedidosVacio = document.querySelector("[data-pedidos-vacio]");
  var $badge = document.querySelector("[data-badge-pedidos]");
  var pedidos = [];
  var filtro = "activos";
  var vistos = null;       // ids ya mostrados, para resaltar los que llegan
  var confirmando = {};    // pedido id -> acción que espera confirmación
  var escuchando = false;
  var tituloBase = document.title;

  var ESTADOS = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    entregado: "Entregado",
    cancelado: "Cancelado",
    finalizado: "Finalizado"
  };

  var GRUPOS = {
    activos: function (p) { return p.estado !== "finalizado" && p.estado !== "cancelado"; },
    finalizados: function (p) { return p.estado === "finalizado"; },
    cancelados: function (p) { return p.estado === "cancelado"; }
  };

  var VACIOS = {
    activos: "No hay pedidos por atender. Cuando un cliente pida por la web, aparece acá.",
    finalizados: "Todavía no finalizaste ningún pedido.",
    cancelados: "No hay pedidos cancelados."
  };

  function numero(id) {
    return "#" + String(id).padStart(4, "0");
  }

  function hace(iso) {
    var min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "recién";
    if (min < 60) return "hace " + min + " min";
    return cuando(iso);
  }

  function linkWhatsapp(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.indexOf("54") !== 0) d = "549" + d.replace(/^0/, "");
    return "https://wa.me/" + d;
  }

  function estrellasPorTotal(total) {
    return Math.floor(total / pesosPorEstrella);
  }

  function cargarPedidos() {
    return datos.listaPedidos()
      .then(function (lista) {
        var nuevos = vistos ? lista.filter(function (p) { return !vistos[p.id]; }) : [];
        vistos = {};
        lista.forEach(function (p) { vistos[p.id] = true; });
        pedidos = lista;
        pintarPedidos(nuevos.map(function (p) { return p.id; }));
      })
      .catch(function (err) {
        $pedidosVacio.textContent = "No pudimos cargar los pedidos: " + err.message;
        $pedidosVacio.hidden = false;
      });
  }

  function iniciarPedidos() {
    cargarPedidos();
    if (escuchando) return;
    escuchando = true;
    datos.escucharPedidos(cargarPedidos);
    // Por si se corta la conexión en vivo, se revisa igual cada 30 segundos
    setInterval(function () {
      if (!document.hidden && datos.perfil() && datos.perfil().es_admin) cargarPedidos();
    }, 30000);
  }

  function boton(texto, cls, accion, id, extra) {
    var b = el("button", "btn " + cls, texto);
    b.type = "button";
    b.dataset.accion = accion;
    b.dataset.id = id;
    if (extra) b.dataset.valor = extra;
    return b;
  }

  function accionesPedido(p) {
    var cont = el("div", "pedido__acciones");
    var pide = confirmando[p.id];
    var n = estrellasPorTotal(p.total);

    if (p.estado === "finalizado") {
      cont.appendChild(el("p", "pedido__cierre", "Finalizado · se sumaron " + estrellas(p.estrellas_sumadas || 0) + " a " + (p.nombre || "el cliente")));
      return cont;
    }
    if (p.estado === "cancelado") {
      cont.appendChild(el("p", "pedido__cierre is-cancelado", p.canje_estrellas
        ? "Cancelado · se le devolvieron " + estrellas(p.canje_estrellas) : "Cancelado"));
      return cont;
    }

    if (pide) {
      var pregunta = pide === "finalizar"
        ? "¿Finalizar el pedido " + numero(p.id) + "? Se le suman " + estrellas(n) + " a " + (p.nombre || "el cliente") + "."
        : "¿Cancelar el pedido " + numero(p.id) + "?" + (p.canje_estrellas ? " Se le devuelven " + estrellas(p.canje_estrellas) + "." : "");
      cont.appendChild(el("p", "pedido__pregunta", pregunta));
      var fila = el("div", "pedido__fila");
      fila.appendChild(boton(pide === "finalizar" ? "Sí, finalizar" : "Sí, cancelar",
        pide === "finalizar" ? "btn--lima" : "btn--peligro", "confirmar", p.id, pide));
      fila.appendChild(boton("No", "btn--ghost", "no", p.id));
      cont.appendChild(fila);
      return cont;
    }

    var estados = el("div", "pedido__estados");
    estados.setAttribute("role", "group");
    estados.setAttribute("aria-label", "Estado del pedido " + numero(p.id));
    ["pendiente", "pagado", "entregado"].forEach(function (e) {
      var b = boton(ESTADOS[e], "pedido__estado", "estado", p.id, e);
      b.setAttribute("aria-pressed", String(p.estado === e));
      if (p.estado === e) b.classList.add("is-on");
      estados.appendChild(b);
    });
    cont.appendChild(estados);

    var fila2 = el("div", "pedido__fila");
    var fin = boton("", "btn--lima pedido__finalizar", "finalizar", p.id);
    fin.innerHTML = '<i class="ph-bold ph-check-circle" aria-hidden="true"></i> ';
    fin.appendChild(document.createTextNode("Finalizar y sumar " + n + " ★"));
    fila2.appendChild(fin);
    fila2.appendChild(boton("Cancelar pedido", "btn--ghost pedido__cancelar", "cancelar", p.id));
    cont.appendChild(fila2);
    return cont;
  }

  function tarjetaPedido(p, esNuevo) {
    var li = el("li", "pedido estado-" + p.estado + (esNuevo ? " is-nuevo" : ""));
    li.dataset.id = p.id;

    var cabeza = el("header", "pedido__cabeza");
    cabeza.appendChild(el("span", "pedido__num", numero(p.id)));
    var t = el("time", "pedido__hora", hace(p.creado));
    t.dateTime = p.creado;
    cabeza.appendChild(t);
    cabeza.appendChild(el("span", "pedido__pill", ESTADOS[p.estado] || p.estado));
    var imprimir = el("button", "pedido__imprimir");
    imprimir.type = "button";
    imprimir.dataset.accion = "imprimir";
    imprimir.dataset.id = p.id;
    imprimir.setAttribute("aria-label", "Imprimir ticket del pedido " + numero(p.id));
    imprimir.innerHTML = '<i class="ph-bold ph-printer" aria-hidden="true"></i> <span>Imprimir</span>';
    cabeza.appendChild(imprimir);
    li.appendChild(cabeza);

    var quien = el("div", "pedido__cliente");
    var nombre = el("button", "pedido__nombre", p.nombre || "Cliente");
    nombre.type = "button";
    nombre.dataset.accion = "cliente";
    nombre.dataset.valor = p.codigo || "";
    nombre.title = "Ver sus estrellas";
    quien.appendChild(nombre);
    quien.appendChild(el("span", "pedido__codigo", p.codigo || ""));
    var wa = linkWhatsapp(p.telefono);
    if (wa) {
      var a = el("a", "pedido__tel");
      a.href = wa;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<i class="ph-bold ph-whatsapp-logo" aria-hidden="true"></i> ';
      a.appendChild(document.createTextNode(p.telefono));
      quien.appendChild(a);
    }
    li.appendChild(quien);

    var lista = el("ul", "pedido__items");
    (p.items || []).forEach(function (i) {
      var fila = el("li", "pedido__item" + (i.canje ? " is-canje" : ""));
      fila.appendChild(el("span", "pedido__cant", i.cant + "x"));
      var desc = el("span", "pedido__desc");
      desc.appendChild(el("strong", null, i.nombre + (i.variante ? " " + i.variante.toLowerCase() : "")));
      var mods = i.canje ? ["canje · " + i.canje * i.cant + " ★"] : (i.cambios || []);
      if (mods.length) desc.appendChild(el("span", "pedido__mods", mods.join(" · ")));
      fila.appendChild(desc);
      fila.appendChild(el("span", "pedido__precio", i.canje ? "Gratis" : "$" + moneda.format(i.precio * i.cant)));
      lista.appendChild(fila);
    });
    li.appendChild(lista);

    var datosEntrega = el("dl", "pedido__datos");
    [["Domicilio", p.domicilio], ["Aclaraciones", p.aclaraciones], ["Pago", p.pago],
      ["Canjea", p.canje_estrellas ? estrellas(p.canje_estrellas) : ""]].forEach(function (d) {
      if (!d[1]) return;
      var div = el("div");
      div.appendChild(el("dt", null, d[0]));
      div.appendChild(el("dd", null, d[1]));
      datosEntrega.appendChild(div);
    });
    li.appendChild(datosEntrega);

    var tot = el("p", "pedido__total");
    tot.appendChild(el("span", null, "Total"));
    tot.appendChild(el("strong", null, "$" + moneda.format(p.total)));
    li.appendChild(tot);

    li.appendChild(el("p", "hoja__error pedido__error"));
    li.appendChild(accionesPedido(p));
    return li;
  }

  function pintarPedidos(nuevos) {
    nuevos = nuevos || [];
    var cuentas = {};
    Object.keys(GRUPOS).forEach(function (g) {
      cuentas[g] = pedidos.filter(GRUPOS[g]).length;
      var n = document.querySelector('[data-cuenta-filtro="' + g + '"]');
      n.textContent = cuentas[g] ? cuentas[g] : "";
    });
    var pendientes = pedidos.filter(function (p) { return p.estado === "pendiente"; }).length;
    $badge.textContent = pendientes;
    $badge.hidden = !pendientes;
    document.title = (pendientes ? "(" + pendientes + ") " : "") + tituloBase;

    var visibles = pedidos.filter(GRUPOS[filtro]);
    // En "activos" el más viejo arriba: es el primero que hay que atender
    if (filtro === "activos") visibles = visibles.slice().reverse();
    $pedidos.textContent = "";
    visibles.forEach(function (p) {
      $pedidos.appendChild(tarjetaPedido(p, nuevos.indexOf(p.id) !== -1));
    });
    $pedidosVacio.textContent = VACIOS[filtro];
    $pedidosVacio.hidden = visibles.length > 0;
  }

  document.querySelectorAll("[data-filtro]").forEach(function (b) {
    b.addEventListener("click", function () {
      filtro = b.dataset.filtro;
      document.querySelectorAll("[data-filtro]").forEach(function (x) {
        x.classList.toggle("is-on", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      pintarPedidos();
    });
  });

  function reemplazar(ped) {
    pedidos = pedidos.map(function (p) {
      return p.id === ped.id ? Object.assign({}, p, ped) : p;
    });
  }

  $pedidos.addEventListener("click", function (e) {
    var b = e.target.closest("[data-accion]");
    if (!b) return;
    var accion = b.dataset.accion;

    if (accion === "cliente") {
      if (!b.dataset.valor) return;
      irA("clientes");
      $formBuscar.q.value = b.dataset.valor;
      buscar(b.dataset.valor);
      return;
    }

    var id = Number(b.dataset.id);
    var tarjeta = b.closest(".pedido");
    if (accion === "imprimir") {
      imprimirTicket(pedidos.filter(function (p) { return p.id === id; })[0]);
      return;
    }
    if (accion === "finalizar" || accion === "cancelar") {
      confirmando[id] = accion;
      pintarPedidos();
      return;
    }
    if (accion === "no") {
      delete confirmando[id];
      pintarPedidos();
      return;
    }

    var pedido;
    if (accion === "estado") pedido = datos.estadoPedido(id, b.dataset.valor);
    else if (accion === "confirmar" && b.dataset.valor === "finalizar") pedido = datos.finalizarPedido(id);
    else if (accion === "confirmar" && b.dataset.valor === "cancelar") pedido = datos.estadoPedido(id, "cancelado");
    else return;

    tarjeta.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
    pedido
      .then(function (ped) {
        delete confirmando[id];
        reemplazar(ped);
        pintarPedidos();
        cargarRecientes();
      })
      .catch(function (err) {
        delete confirmando[id];
        pintarPedidos();
        var t = $pedidos.querySelector('.pedido[data-id="' + id + '"] .pedido__error');
        if (t) t.textContent = err.message;
      });
  });

  /* ---------- Ticket ---------- */

  var config = window.SMBRUT_CONFIG || {};
  var $ticket = document.querySelector("[data-ticket]");
  var fechaTicket = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

  function renglon(izq, der, cls) {
    var p = el("p", "ticket__renglon" + (cls ? " " + cls : ""));
    p.appendChild(el("span", null, izq));
    if (der != null) p.appendChild(el("span", null, der));
    return p;
  }

  // Arma el ticket con el pedido y abre la ventana de impresión (en papel de 80 mm)
  function imprimirTicket(p) {
    if (!p) return;
    $ticket.textContent = "";
    $ticket.appendChild(el("p", "ticket__marca", "SMBRUT"));
    if (config.direccion) $ticket.appendChild(el("p", "ticket__centro", config.direccion));
    if (config.instagram) $ticket.appendChild(el("p", "ticket__centro", "@" + String(config.instagram).replace(/^@/, "")));
    $ticket.appendChild(el("hr"));

    $ticket.appendChild(el("p", "ticket__numero", "Pedido " + numero(p.id)));
    var cuando2 = "";
    try { cuando2 = fechaTicket.format(new Date(p.creado)); } catch (e) { /* sin fecha */ }
    $ticket.appendChild(el("p", "ticket__centro", cuando2));
    $ticket.appendChild(el("hr"));

    if (p.nombre) $ticket.appendChild(renglon("Cliente", p.nombre));
    if (p.codigo) $ticket.appendChild(renglon("ID", p.codigo));
    if (p.telefono) $ticket.appendChild(renglon("Tel", p.telefono));
    $ticket.appendChild(el("hr"));

    (p.items || []).forEach(function (i) {
      var nombre = i.cant + "x " + i.nombre + (i.variante ? " " + i.variante.toLowerCase() : "");
      $ticket.appendChild(renglon(nombre, i.canje ? "Gratis" : "$" + moneda.format(i.precio * i.cant), "ticket__item"));
      var mods = i.canje ? ["canje " + i.canje * i.cant + " estrellas"] : (i.cambios || []);
      mods.forEach(function (m) { $ticket.appendChild(el("p", "ticket__mod", m)); });
    });
    $ticket.appendChild(el("hr"));

    $ticket.appendChild(renglon("TOTAL", "$" + moneda.format(p.total), "ticket__total"));
    if (p.pago) $ticket.appendChild(renglon("Pago", p.pago));
    if (p.canje_estrellas) $ticket.appendChild(renglon("Canjea", estrellas(p.canje_estrellas)));
    $ticket.appendChild(el("hr"));

    if (p.domicilio) {
      $ticket.appendChild(el("p", "ticket__titulo", "Entrega"));
      $ticket.appendChild(el("p", null, p.domicilio));
    }
    if (p.aclaraciones) $ticket.appendChild(el("p", null, p.aclaraciones));
    if (p.domicilio || p.aclaraciones) $ticket.appendChild(el("hr"));

    var suma = p.estado === "finalizado" ? p.estrellas_sumadas : estrellasPorTotal(p.total);
    if (suma) $ticket.appendChild(el("p", "ticket__centro", "Con este pedido sumás " + estrellas(suma)));
    $ticket.appendChild(el("p", "ticket__centro ticket__gracias", "¡Gracias por elegir SMBRUT!"));

    window.print();
  }

  /* ---------- Precios ---------- */

  var $precios = document.querySelector("[data-precios]");
  var $preciosEstado = document.querySelector("[data-precios-estado]");
  var $preciosFiltro = document.querySelector("[data-precios-filtro]");
  var carta = [];

  function plata(n) {
    return n ? moneda.format(n) : "";
  }

  function leerPrecio(input) {
    return Number(String(input.value).replace(/\D/g, "")) || null;
  }

  function cargarCarta() {
    if (carta.length) { pintarCarta(); return; }
    $preciosEstado.textContent = "Cargando la carta…";
    $preciosEstado.hidden = false;
    datos.cartaAdmin()
      .then(function (filas) {
        carta = filas;
        pintarCarta();
      })
      .catch(function (err) {
        $preciosEstado.textContent = "No pudimos cargar la carta: " + err.message;
      });
  }

  function campoPrecio(etiqueta, nombre, valor, ariaNombre) {
    var label = el("label", "precio__campo");
    label.appendChild(el("span", "precio__etiqueta", etiqueta));
    var fila = el("span", "precio__fila");
    fila.appendChild(el("span", "precio__signo", "$"));
    var input = el("input", "precio__input");
    input.name = nombre;
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.placeholder = "Consultar";
    input.value = plata(valor);
    input.setAttribute("aria-label", "Precio " + etiqueta.toLowerCase() + " de " + ariaNombre);
    fila.appendChild(input);
    label.appendChild(fila);
    return label;
  }

  function formPrecio(p, dosPrecios) {
    var form = el("form", "precio" + (p.disponible ? "" : " is-oculto"));
    form.noValidate = true;
    form.dataset.id = p.id;
    form.dataset.busqueda = (p.nombre + " " + p.categoria).toLowerCase();

    var nombre = el("div", "precio__nombre");
    nombre.appendChild(el("strong", null, p.nombre));
    if (p.descripcion) nombre.appendChild(el("span", null, p.descripcion));
    form.appendChild(nombre);

    var campos = el("div", "precio__campos");
    campos.appendChild(campoPrecio(dosPrecios ? "Simple" : "Precio", "precio", p.precio, p.nombre));
    if (dosPrecios) campos.appendChild(campoPrecio("Doble", "precio_doble", p.precio_doble, p.nombre));
    form.appendChild(campos);

    var pie = el("div", "precio__pie");
    var toggle = el("label", "precio__toggle");
    var check = el("input");
    check.type = "checkbox";
    check.name = "disponible";
    check.checked = p.disponible;
    toggle.appendChild(check);
    toggle.appendChild(el("span", null, "En la carta"));
    pie.appendChild(toggle);
    pie.appendChild(el("span", "precio__aviso", ""));
    var guardar = el("button", "btn btn--lima precio__guardar", "Guardar");
    guardar.type = "submit";
    guardar.disabled = true;
    pie.appendChild(guardar);
    form.appendChild(pie);
    return form;
  }

  function pintarCarta() {
    $precios.textContent = "";
    var orden = [], grupos = {};
    carta.forEach(function (p) {
      if (!grupos[p.categoria]) { grupos[p.categoria] = []; orden.push(p.categoria); }
      grupos[p.categoria].push(p);
    });
    orden.forEach(function (cat) {
      var dosPrecios = grupos[cat].some(function (p) { return p.precio_doble; });
      var sec = el("section", "precios__cat");
      sec.appendChild(el("h2", "panel__sub", cat));
      var lista = el("div", "precios__lista");
      grupos[cat].forEach(function (p) { lista.appendChild(formPrecio(p, dosPrecios)); });
      sec.appendChild(lista);
      $precios.appendChild(sec);
    });
    $preciosEstado.hidden = carta.length > 0;
    $preciosEstado.textContent = "La carta está vacía.";
    filtrarCarta();
  }

  function filtrarCarta() {
    var q = $preciosFiltro.value.trim().toLowerCase();
    $precios.querySelectorAll(".precios__cat").forEach(function (sec) {
      var alguno = false;
      sec.querySelectorAll(".precio").forEach(function (f) {
        var ve = !q || f.dataset.busqueda.indexOf(q) !== -1;
        f.hidden = !ve;
        if (ve) alguno = true;
      });
      sec.hidden = !alguno;
    });
  }

  $preciosFiltro.addEventListener("input", filtrarCarta);

  function producto(id) {
    return carta.filter(function (p) { return p.id === id; })[0];
  }

  // Qué cambió en el formulario respecto de lo guardado
  function cambiosDe(form) {
    var p = producto(Number(form.dataset.id));
    var c = {};
    var precio = leerPrecio(form.precio);
    if (precio !== (p.precio || null)) c.precio = precio;
    if (form.precio_doble) {
      var doble = leerPrecio(form.precio_doble);
      if (doble !== (p.precio_doble || null)) c.precio_doble = doble;
    }
    if (form.disponible.checked !== p.disponible) c.disponible = form.disponible.checked;
    return c;
  }

  $precios.addEventListener("input", function (e) {
    var form = e.target.closest(".precio");
    if (!form) return;
    // Puntos de miles mientras se escribe
    if (e.target.classList.contains("precio__input")) {
      var n = leerPrecio(e.target);
      e.target.value = plata(n);
    }
    var hay = Object.keys(cambiosDe(form)).length > 0;
    form.querySelector(".precio__guardar").disabled = !hay;
    form.classList.toggle("is-cambiado", hay);
    form.querySelector(".precio__aviso").textContent = "";
    form.classList.remove("is-error");
  });

  $precios.addEventListener("change", function (e) {
    if (e.target.name === "disponible") e.target.dispatchEvent(new Event("input", { bubbles: true }));
  });

  $precios.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var id = Number(form.dataset.id);
    var c = cambiosDe(form);
    if (!Object.keys(c).length) return;
    var aviso = form.querySelector(".precio__aviso");
    var boton = form.querySelector(".precio__guardar");
    boton.disabled = true;
    boton.textContent = "Guardando…";
    datos.editarProducto(id, c)
      .then(function (fila) {
        carta = carta.map(function (p) {
          return p.id === id ? Object.assign({}, p, {
            precio: fila.precio, precio_doble: fila.precio_doble, disponible: fila.disponible
          }) : p;
        });
        form.classList.remove("is-cambiado");
        form.classList.toggle("is-oculto", !fila.disponible);
        aviso.textContent = "Guardado ✓";
      })
      .catch(function (err) {
        form.classList.add("is-error");
        aviso.textContent = err.message;
        boton.disabled = false;
      })
      .then(function () { boton.textContent = "Guardar"; });
  });

  // "hace 5 min" se mantiene al día
  setInterval(function () {
    $pedidos.querySelectorAll(".pedido__hora").forEach(function (t) { t.textContent = hace(t.dateTime); });
  }, 60000);

  /* ---------- Inicio ---------- */

  if (datos.modo === "demo") document.querySelector("[data-demo]").hidden = false;
  datos.listo.then(revisarSesion, function () {
    vista("ingreso");
    $errorIngreso.textContent = "No pudimos conectar con la base de datos. Revisá internet y recargá.";
  });
})();
