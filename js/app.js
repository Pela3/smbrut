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
    if (config.whatsapp) {
      var wa = document.querySelector("[data-whatsapp]");
      wa.href = "https://wa.me/" + String(config.whatsapp).replace(/\D/g, "");
      wa.hidden = false;
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

  function precio(valor) {
    var digits = String(valor || "").replace(/[^\d]/g, "");
    if (!digits) return null;
    return "$" + moneda.format(Number(digits));
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

  function celdaPrecio(valor, etiqueta) {
    var p = precio(valor);
    var cell = el("span", "plato__precio" + (p ? "" : " is-vacio"), p || "—");
    if (etiqueta) cell.setAttribute("aria-label", etiqueta + ": " + (p || "no disponible"));
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
        precios.appendChild(celdaPrecio(item.precio, "Simple"));
        precios.appendChild(celdaPrecio(item.precio_doble, "Doble"));
      } else {
        var p = precio(item.precio);
        precios.appendChild(el("span", "plato__precio" + (p ? "" : " is-consultar"), p || "Consultar"));
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
  }

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

  if (config.planillaCSV) {
    cargarPlanilla(config.planillaCSV)
      .then(render)
      .catch(function (err) {
        console.warn("No se pudo leer la planilla, uso el menú de respaldo.", err);
        render(fallback);
      });
  } else {
    render(fallback);
  }
})();
