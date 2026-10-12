(function () {
  "use strict";

  var config = window.SMBRUT_CONFIG || {};
  var fallback = window.SMBRUT_MENU || [];
  var moneda = new Intl.NumberFormat("es-AR");

  var $menu = document.querySelector("[data-menu]");
  var $status = document.querySelector("[data-status]");
  var $tabs = document.querySelector("[data-tabs]");
  var $pill = document.querySelector("[data-pill]");

  /* ---------- Datos de contacto ---------- */

  function setupContacto() {
    if (config.instagram) {
      var handle = String(config.instagram).replace(/^@/, "");
      var url = "https://instagram.com/" + encodeURIComponent(handle);
      var btn = document.querySelector("[data-instagram]");
      btn.href = url;
      btn.hidden = false;
      document.querySelector("[data-instagram-handle]").textContent = "@" + handle;
      var row = document.querySelector("[data-instagram-row]");
      var a = row.querySelector("a");
      a.href = url;
      a.textContent = "@" + handle;
      row.hidden = false;
    }
    if (config.direccion) {
      var mapa = "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(config.mapa || config.direccion);
      var dir = document.querySelector("[data-direccion]");
      dir.querySelector("[data-direccion-texto]").textContent = config.direccion;
      dir.querySelector("[data-mapa]").href = mapa;
      dir.hidden = false;
      var heroDir = document.querySelector("[data-hero-dir]");
      heroDir.href = mapa;
      heroDir.querySelector("span").textContent = config.direccion;
      heroDir.hidden = false;
    }
    [["horarios", config.horarios]].forEach(function (pair) {
      if (!pair[1]) return;
      var el = document.querySelector("[data-" + pair[0] + "]");
      el.querySelector("dd").textContent = pair[1];
      el.hidden = false;
    });
  }

  /* ---------- Planilla ---------- */

  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var rows = [], row = [], field = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }

    var header = (rows.shift() || []).map(function (h) {
      return normalizar(h).replace(/\s+/g, "_");
    });
    return rows.map(function (r) {
      var obj = {};
      header.forEach(function (h, idx) { obj[h] = (r[idx] || "").trim(); });
      return obj;
    });
  }

  function normalizar(s) {
    return String(s || "").trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function cargarPlanilla(url) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    var sep = url.indexOf("?") === -1 ? "?" : "&";
    return fetch(url + sep + "t=" + Date.now(), { signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        clearTimeout(timer);
        var items = parseCSV(text);
        if (!items.length || !("nombre" in items[0])) throw new Error("La planilla no tiene la columna 'nombre'");
        return items;
      });
  }

  /* ---------- Render ---------- */

  function disponible(item) {
    var d = normalizar(item.disponible);
    return item.nombre && d !== "no" && d !== "0" && d !== "false";
  }

  function esNuevo(item) {
    var n = normalizar(item.nuevo);
    return n === "si" || n === "x" || n === "1" || n === "true";
  }

  function monto(valor) {
    var digits = String(valor || "").replace(/[^\d]/g, "");
    return digits ? Number(digits) : null;
  }

  function precio(valor) {
    var n = monto(valor);
    return n ? "$" + moneda.format(n) : null;
  }

  // Acepta un link de Google Drive, un link directo a una imagen o un archivo de img/fotos/
  function fotoUrl(valor) {
    var v = String(valor || "").trim();
    if (!v) return null;
    if (/drive\.google\.com|docs\.google\.com/.test(v)) {
      var m = v.match(/\/d\/([\w-]{10,})/) || v.match(/[?&]id=([\w-]{10,})/);
      return m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1000" : null;
    }
    if (/^https?:\/\//.test(v)) return v;
    return "img/fotos/" + v.replace(/^\/+/, "");
  }

  function slug(s) {
    return "cat-" + normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function agrupar(items) {
    var orden = [], grupos = {};
    items.filter(disponible).forEach(function (item) {
      var cat = item.categoria || "Otros";
      if (!grupos[cat]) { grupos[cat] = []; orden.push(cat); }
      grupos[cat].push(item);
    });
    return orden.map(function (cat) { return { nombre: cat, items: grupos[cat] }; });
  }

  // Con precio, la celda es un botón que suma el plato al pedido (ver js/carrito.js).
  // tipo: "personalizable" (hamburguesas: se le sacan ingredientes o suman extras) o "extra"
  function botonPrecio(item, variante, valor, tipo) {
    var p = precio(valor);
    var btn = el("button", "plato__precio plato__add");
    btn.type = "button";
    btn.setAttribute("data-add", "");
    btn.dataset.nombre = item.nombre;
    btn.dataset.variante = variante;
    btn.dataset.precio = monto(valor);
    btn.dataset.id = item.id;
    if (item.descripcion) btn.dataset.desc = item.descripcion;
    if (tipo) btn.dataset.tipo = tipo;
    btn.setAttribute("aria-label", "Sumar " + item.nombre + (variante ? " " + variante.toLowerCase() : "") + " al pedido, " + p);
    var mas = el("i", "ph-bold ph-plus plato__mas");
    mas.setAttribute("aria-hidden", "true");
    btn.appendChild(mas);
    btn.appendChild(document.createTextNode(p));
    return btn;
  }

  function celdaPrecio(item, valor, etiqueta, tipo) {
    if (precio(valor)) return botonPrecio(item, etiqueta, valor, tipo);
    var cell = el("span", "plato__precio is-vacio", "—");
    cell.setAttribute("aria-label", etiqueta + ": no disponible");
    return cell;
  }

  function botonFoto(li, src, nombre) {
    li.classList.add("plato--foto");
    var btn = el("button", "plato__foto");
    btn.type = "button";
    btn.setAttribute("aria-label", "Ver foto de " + nombre);
    var img = el("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () {
      li.classList.remove("plato--foto");
      btn.remove();
    });
    img.addEventListener("load", function () { btn.classList.add("is-lista"); });
    btn.addEventListener("click", function () { abrirVisor(src, nombre); });
    btn.appendChild(img);
    return btn;
  }

  /* ---------- Visor de fotos ---------- */

  var $visor = document.querySelector("[data-visor]");

  function abrirVisor(src, nombre) {
    if (!$visor || typeof $visor.showModal !== "function") {
      window.open(src, "_blank", "noopener");
      return;
    }
    var img = $visor.querySelector("[data-visor-img]");
    img.src = src;
    img.alt = nombre;
    $visor.querySelector("[data-visor-nombre]").textContent = nombre;
    $visor.showModal();
  }

  if ($visor) {
    // Tocar afuera de la foto la cierra
    $visor.addEventListener("click", function (e) {
      if (e.target === $visor) $visor.close();
    });
  }

  function renderCategoria(cat) {
    var dosPrecios = cat.items.some(function (i) { return precio(i.precio_doble); });
    var destacada = (config.destacadas || []).indexOf(cat.nombre) !== -1;
    // Las hamburguesas (las que tienen simple y doble) se pueden personalizar
    var tipo = dosPrecios ? "personalizable" : cat.nombre === (config.categoriaExtras || "Extras") ? "extra" : "";

    var section = el("section", "cat" + (destacada ? " cat--lima" : ""));
    section.id = slug(cat.nombre);
    section.setAttribute("aria-labelledby", section.id + "-t");

    var head = el("div", "cat__head");
    var h2 = el("h2", "cat__titulo", cat.nombre);
    h2.id = section.id + "-t";
    head.appendChild(h2);
    var nota = (config.notas || {})[cat.nombre];
    if (nota) head.appendChild(el("p", "cat__nota", nota));
    if (dosPrecios) {
      var cols = el("div", "cat__cols");
      cols.setAttribute("aria-hidden", "true");
      cols.appendChild(el("span", null, "Simple"));
      cols.appendChild(el("span", null, "Doble"));
      head.appendChild(cols);
    }
    section.appendChild(head);

    var list = el("ul", "platos" + (dosPrecios ? " platos--dos" : ""));
    cat.items.forEach(function (item) {
      var li = el("li", "plato");
      li.id = "plato-" + slug(item.nombre).slice(4);
      var src = fotoUrl(item.foto);
      if (src) li.appendChild(botonFoto(li, src, item.nombre));
      var info = el("div", "plato__info");
      var nombre = el("h3", "plato__nombre", item.nombre);
      if (esNuevo(item)) nombre.appendChild(el("span", "plato__nuevo", "Nuevo"));
      info.appendChild(nombre);
      if (item.descripcion) info.appendChild(el("p", "plato__desc", item.descripcion));
      li.appendChild(info);

      var precios = el("div", "plato__precios");
      if (dosPrecios) {
        precios.appendChild(celdaPrecio(item, item.precio, "Simple", tipo));
        precios.appendChild(celdaPrecio(item, item.precio_doble, "Doble", tipo));
      } else if (precio(item.precio)) {
        precios.appendChild(botonPrecio(item, "", item.precio, tipo));
      } else {
        precios.appendChild(el("span", "plato__precio is-consultar", "Consultar"));
      }
      li.appendChild(precios);
      list.appendChild(li);
    });
    section.appendChild(list);
    return section;
  }

  function render(items) {
    var cats = agrupar(items);
    $menu.textContent = "";
    Array.prototype.slice.call($tabs.querySelectorAll("a")).forEach(function (a) { a.remove(); });

    if (!cats.length) {
      $status.textContent = "La carta está vacía por ahora. Pasá por nuestro Instagram.";
      $status.hidden = false;
      return;
    }
    $status.hidden = true;

    var frag = document.createDocumentFragment();
    cats.forEach(function (cat) {
      frag.appendChild(renderCategoria(cat));
      var tab = el("a", "tabs__item", cat.nombre);
      tab.href = "#" + slug(cat.nombre);
      $tabs.appendChild(tab);
    });
    $menu.appendChild(frag);
    observarSecciones();
    renderVitrina(items.filter(disponible));
    renderCasa(items.filter(disponible));
    window.dispatchEvent(new CustomEvent("smbrut:menu"));
  }

  /* ---------- Carrusel de hamburguesas ---------- */

  var $vitrina = document.querySelector("[data-vitrina]");
  var $pista = $vitrina.querySelector("[data-vitrina-pista]");

  function renderVitrina(items) {
    var porNombre = {};
    items.forEach(function (i) { porNombre[normalizar(i.nombre)] = i; });
    $pista.textContent = "";
    var fotos = (config.vitrina || []).filter(function (v) { return porNombre[normalizar(v.nombre)]; });
    $vitrina.hidden = !fotos.length;

    fotos.forEach(function (v, n) {
      var item = porNombre[normalizar(v.nombre)];
      var slide = el("article", "vitrina__slide");
      slide.setAttribute("aria-roledescription", "foto");
      slide.setAttribute("aria-label", (n + 1) + " de " + fotos.length + ": " + item.nombre);

      var img = el("img", "vitrina__foto");
      img.src = v.foto;
      img.alt = item.nombre;
      img.loading = n < 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("error", function () { slide.remove(); });
      slide.appendChild(img);

      var texto = el("div", "vitrina__texto");
      texto.appendChild(el("h2", "vitrina__nombre", item.nombre));
      if (item.descripcion) texto.appendChild(el("p", "vitrina__desc", item.descripcion));
      var desde = precio(item.precio) || precio(item.precio_doble);
      var ir = el("a", "btn btn--lima vitrina__pedir");
      ir.href = "#plato-" + slug(item.nombre).slice(4);
      ir.setAttribute("data-ir-plato", "");
      ir.appendChild(document.createTextNode("Pedila" + (desde ? " · " + desde : "")));
      texto.appendChild(ir);
      slide.appendChild(texto);
      $pista.appendChild(slide);
    });
  }

  $vitrina.addEventListener("click", function (e) {
    var flecha = e.target.closest("[data-vitrina-mover]");
    if (!flecha) return;
    var paso = $pista.clientWidth * 0.85 * Number(flecha.dataset.vitrinaMover);
    $pista.scrollBy({ left: paso, behavior: "smooth" });
  });

  // "Pedila" (carrusel y hamburguesa de la casa) lleva al plato en la carta y lo resalta un momento
  document.addEventListener("click", function (e) {
    var ir = e.target.closest("[data-ir-plato]");
    if (!ir) return;
    e.preventDefault();
    var plato = document.querySelector(ir.getAttribute("href"));
    if (!plato) return;
    plato.scrollIntoView({ behavior: "smooth", block: "center" });
    plato.classList.remove("is-resaltado");
    void plato.offsetWidth;
    plato.classList.add("is-resaltado");
    window.dispatchEvent(new CustomEvent("smbrut:pedir"));
  });

  /* ---------- Hamburguesa de la casa ---------- */

  var $casa = document.querySelector("[data-casa]");

  function renderCasa(items) {
    var brut = items.filter(function (i) { return normalizar(i.nombre) === "brut"; })[0];
    var desde = brut && (precio(brut.precio) || precio(brut.precio_doble));
    document.querySelector("[data-casa-pedir]").textContent = "Pedila" + (desde ? " · " + desde : "");
  }

  // Une cada ingrediente con su punto en la foto. Se recalcula si cambia el tamaño
  var FOTO_ANCHO = 0.7; // la foto ocupa el 70% de la figura

  function dibujarCasa() {
    if (!$casa) return;
    var svg = $casa.querySelector(".casa__lineas");
    var w = $casa.clientWidth, h = $casa.clientHeight;
    if (!w || !h) return;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.textContent = "";
    $casa.querySelectorAll(".casa__punto").forEach(function (p) { p.remove(); });

    $casa.querySelectorAll(".casa__ingredientes li").forEach(function (li) {
      var ax = Number(li.dataset.x) / 100 * w * FOTO_ANCHO;
      var ay = Number(li.dataset.y) / 100 * h;
      var lx = li.offsetLeft + li.parentNode.offsetLeft - 10;
      var ly = li.offsetTop + li.parentNode.offsetTop + li.offsetHeight / 2;
      var curva = Math.max(30, (lx - ax) * 0.45);
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M" + ax + " " + ay + " C " + (ax + curva) + " " + ay + ", " + (lx - curva) + " " + ly + ", " + lx + " " + ly);
      path.setAttribute("pathLength", "1");
      svg.appendChild(path);

      var punto = el("span", "casa__punto");
      punto.setAttribute("aria-hidden", "true");
      punto.style.setProperty("--x", ax + "px");
      punto.style.setProperty("--y", ay + "px");
      $casa.appendChild(punto);
    });
  }

  if ($casa) {
    dibujarCasa();
    if ("ResizeObserver" in window) new ResizeObserver(dibujarCasa).observe($casa);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(dibujarCasa);
  }

  // Las líneas del diagrama se dibujan una vez, cuando la foto entra en pantalla
  if ($casa && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $casa.classList.add("is-esperando");
    var obsCasa = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      $casa.classList.remove("is-esperando");
      $casa.classList.add("is-dibujando");
      obsCasa.disconnect();
    }, { threshold: 0.35 });
    obsCasa.observe($casa);
  }

  // Las flechas se apagan en los extremos
  function pintarFlechas() {
    var max = $pista.scrollWidth - $pista.clientWidth - 2;
    $vitrina.querySelector('[data-vitrina-mover="-1"]').disabled = $pista.scrollLeft <= 2;
    $vitrina.querySelector('[data-vitrina-mover="1"]').disabled = $pista.scrollLeft >= max;
  }
  $pista.addEventListener("scroll", pintarFlechas, { passive: true });
  window.addEventListener("resize", pintarFlechas);
  window.addEventListener("smbrut:menu", pintarFlechas);

  /* ---------- Pestañas ---------- */

  var observer = null;
  var activa = null;

  function moverPill(tab, instant) {
    if (!tab) return;
    if (instant) $pill.style.transition = "none";
    $pill.style.width = tab.offsetWidth + "px";
    $pill.style.transform = "translateX(" + tab.offsetLeft + "px)";
    $pill.style.opacity = "1";
    if (instant) { $pill.offsetWidth; $pill.style.transition = ""; }
  }

  function activar(id, instant) {
    if (id === activa) return;
    activa = id;
    var tab = null;
    $tabs.querySelectorAll("a").forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-on", on);
      if (on) { a.setAttribute("aria-current", "true"); tab = a; }
      else a.removeAttribute("aria-current");
    });
    moverPill(tab, instant);
    if (tab) {
      var track = $tabs.parentElement;
      var left = tab.offsetLeft - (track.clientWidth - tab.offsetWidth) / 2;
      track.scrollTo({ left: left, behavior: instant ? "auto" : "smooth" });
    }
  }

  function observarSecciones() {
    if (observer) observer.disconnect();
    var secciones = $menu.querySelectorAll(".cat");
    if (!("IntersectionObserver" in window) || !secciones.length) return;
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activar(e.target.id); });
    }, { rootMargin: "-30% 0px -65% 0px" });
    secciones.forEach(function (s) { observer.observe(s); });
    activa = null;
    activar(secciones[0].id, true);
  }

  function reubicarPill() {
    moverPill($tabs.querySelector("a.is-on"), true);
  }
  window.addEventListener("resize", reubicarPill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reubicarPill);

  /* ---------- Inicio ---------- */

  setupContacto();

  // Cada plato lleva un id para armar el pedido. Sin base de datos, el id es su posición
  function conIds(items) {
    return items.map(function (item, i) {
      return item.id ? item : Object.assign({ id: i + 1 }, item);
    });
  }

  var datos = window.SMBRUT_DATOS;
  if (datos && datos.modo === "supabase") {
    // Con base de datos, la carta y los precios salen de la tabla productos
    datos.productos()
      .then(function (items) {
        if (!items.length) throw new Error("La tabla productos está vacía");
        render(items);
      })
      .catch(function (err) {
        console.warn("No se pudo leer la carta de la base, muestro la de respaldo.", err);
        render(conIds(fallback));
      });
  } else if (config.planillaCSV) {
    cargarPlanilla(config.planillaCSV)
      .then(function (items) { render(conIds(items)); })
      .catch(function (err) {
        console.warn("No se pudo leer la planilla, uso el menú de respaldo.", err);
        render(conIds(fallback));
      });
  } else {
    render(conIds(fallback));
  }
})();
