/*
  Datos de clientes, pedidos y estrellas.
  Con Supabase configurado en js/config.js usa la base de datos real.
  Sin Supabase funciona en modo demo: todo queda guardado en este navegador,
  con una cuenta de admin y dos clientes de ejemplo para probar.
*/
window.SMBRUT_DATOS = (function () {
  "use strict";

  var config = window.SMBRUT_CONFIG || {};
  var sb = config.supabase || {};
  var usaSupabase = !!(sb.url && sb.anonKey);
  // El panel de admin guarda su sesión aparte, así Santi puede estar en los dos a la vez
  var app = window.SMBRUT_APP === "admin" ? "admin" : "cliente";
  var SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

  var perfil = null;
  var oyentes = [];

  function avisar() {
    oyentes.forEach(function (fn) { fn(perfil); });
  }

  function normalizarCodigo(c) {
    var s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.indexOf("SMB") === 0) s = s.slice(3);
    return s ? "SMB-" + s : "";
  }

  /* ---------- Supabase ---------- */

  var MENSAJES = [
    [/invalid login credentials/i, "Mail o contraseña incorrectos."],
    [/already registered|already been registered/i, "Ya hay una cuenta con ese mail. Probá ingresar."],
    [/password should be at least/i, "La contraseña tiene que tener al menos 6 caracteres."],
    [/email not confirmed/i, "Todavía no confirmaste tu mail. Revisá tu casilla."],
    [/invalid format|validate email/i, "Ese mail no parece válido."],
    [/rate limit|too many/i, "Demasiados intentos. Probá de nuevo en un rato."],
    [/different from the old password/i, "La contraseña nueva tiene que ser distinta de la actual."],
    [/failed to fetch|network/i, "No hay conexión. Revisá internet y probá de nuevo."]
  ];

  function errorSupabase(err) {
    var msg = (err && err.message) || "";
    for (var i = 0; i < MENSAJES.length; i++) {
      if (MENSAJES[i][0].test(msg)) return new Error(MENSAJES[i][1]);
    }
    // Los errores de las funciones de la base ya vienen escritos en castellano
    return new Error(msg || "Algo salió mal. Probá de nuevo.");
  }

  function supabase() {
    var cliente = null;

    function resultado(r) {
      if (r.error) throw errorSupabase(r.error);
      return r.data;
    }

    function cargarPerfil(uid) {
      if (!uid) { perfil = null; avisar(); return Promise.resolve(null); }
      return cliente.from("perfiles").select("*").eq("id", uid).single()
        .then(resultado)
        .then(function (p) { perfil = p; avisar(); return p; })
        .catch(function (err) {
          console.warn("No se pudo leer el perfil.", err);
          perfil = null;
          avisar();
          return null;
        });
    }

    var listo = new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = SDK;
      s.onload = ok;
      s.onerror = mal;
      document.head.appendChild(s);
    }).then(function () {
      cliente = window.supabase.createClient(sb.url, sb.anonKey, {
        auth: { storageKey: "smbrut-" + app }
      });
      cliente.auth.onAuthStateChange(function (evento, sesion) {
        if (evento === "TOKEN_REFRESHED") return;
        // Supabase pide no esperar otras consultas adentro de este aviso
        setTimeout(function () { cargarPerfil(sesion && sesion.user.id); }, 0);
      });
      return cliente.auth.getSession().then(function (r) {
        var sesion = r.data && r.data.session;
        return cargarPerfil(sesion && sesion.user.id);
      });
    });

    function conCliente(fn) {
      return listo.then(fn);
    }

    return {
      listo: listo,
      ingresar: function (email, clave) {
        return conCliente(function () {
          return cliente.auth.signInWithPassword({ email: email, password: clave }).then(resultado)
            .then(function (d) { return cargarPerfil(d.user.id); });
        });
      },
      registrar: function (d) {
        return conCliente(function () {
          return cliente.auth.signUp({
            email: d.email,
            password: d.clave,
            options: { data: { nombre: d.nombre, telefono: d.telefono } }
          }).then(resultado).then(function (r) {
            if (!r.session) return { confirmar: true };
            return cargarPerfil(r.user.id).then(function () { return { confirmar: false }; });
          });
        });
      },
      recuperar: function (email) {
        return conCliente(function () {
          return cliente.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] }).then(resultado);
        });
      },
      salir: function () {
        return conCliente(function () { return cliente.auth.signOut(); })
          .then(function () { perfil = null; avisar(); });
      },
      refrescar: function () {
        return conCliente(function () { return cargarPerfil(perfil && perfil.id); });
      },
      // Pide la contraseña actual antes de cambiarla, por si alguien agarra el celular con la sesión abierta
      cambiarClave: function (actual, nueva) {
        return conCliente(function () {
          return cliente.auth.signInWithPassword({ email: perfil.email, password: actual })
            .then(function (r) { if (r.error) throw new Error("La contraseña actual no es correcta."); })
            .then(function () { return cliente.auth.updateUser({ password: nueva }); })
            .then(resultado);
        });
      },
      actualizarPerfil: function (campos) {
        return conCliente(function () {
          return cliente.from("perfiles").update(campos).eq("id", perfil.id).select().single()
            .then(resultado).then(function (p) { perfil = p; avisar(); return p; });
        });
      },
      registrarPedido: function (pedido) {
        return conCliente(function () {
          pedido.usuario = perfil.id;
          return cliente.from("pedidos").insert(pedido).then(resultado);
        });
      },
      premios: function () {
        return conCliente(function () {
          return cliente.from("premios").select("id, nombre, estrellas").eq("activo", true)
            .order("estrellas").then(resultado);
        });
      },
      // El cliente canjea premios: se descuentan sus estrellas
      canjear: function (ids) {
        return conCliente(function () {
          return cliente.rpc("canjear", { p_premios: ids }).then(resultado)
            .then(function (p) { perfil = p; avisar(); return p; });
        });
      },

      // Admin
      buscarClientes: function (q) {
        return conCliente(function () {
          return cliente.rpc("buscar_clientes", { q: q }).then(resultado);
        });
      },
      sumarEstrellas: function (codigo, cantidad, motivo, monto) {
        return conCliente(function () {
          return cliente.rpc("sumar_estrellas", { p_codigo: codigo, p_cantidad: cantidad, p_motivo: motivo || null, p_monto: monto || null })
            .then(resultado);
        });
      },
      movimientos: function (usuarioId) {
        return conCliente(function () {
          var q = cliente.from("movimientos").select("*, perfiles!movimientos_usuario_fkey(nombre, codigo)")
            .order("creado", { ascending: false }).limit(usuarioId ? 10 : 15);
          if (usuarioId) q = q.eq("usuario", usuarioId);
          return q.then(resultado).then(function (filas) {
            return filas.map(function (m) {
              m.nombre = m.perfiles && m.perfiles.nombre;
              m.codigo = m.perfiles && m.perfiles.codigo;
              return m;
            });
          });
        });
      },
      pedidos: function (usuarioId) {
        return conCliente(function () {
          return cliente.from("pedidos").select("*").eq("usuario", usuarioId)
            .order("creado", { ascending: false }).limit(5).then(resultado);
        });
      }
    };
  }

  /* ---------- Modo demo (sin base de datos) ---------- */

  function local() {
    var CLAVE = "smbrut:demo-db-v2";

    function ahora(diasAtras) {
      return new Date(Date.now() - (diasAtras || 0) * 864e5).toISOString();
    }

    // En el modo demo los premios salen de js/config.js; con Supabase, de la tabla premios
    function premiosDemo() {
      return ((config.estrellas || {}).canjes || []).map(function (c, i) {
        return { id: i + 1, nombre: c.nombre, estrellas: c.estrellas };
      });
    }

    function semilla() {
      return {
        sesiones: {},
        usuarios: [
          { id: "admin", email: "santi@smbrut.com", clave: "smbrut", codigo: "SMB-ADMIN", nombre: "Santi", telefono: "", domicilio: "", estrellas: 0, es_admin: true, creado: ahora(30) },
          { id: "ej1", email: "martina@ejemplo.com", clave: "123456", codigo: "SMB-4K7QX", nombre: "Martina (ejemplo)", telefono: "2246 401122", domicilio: "Calle 38 nro 450", estrellas: 59, es_admin: false, creado: ahora(20) },
          { id: "ej2", email: "tomas@ejemplo.com", clave: "123456", codigo: "SMB-9PZ2M", nombre: "Tomás (ejemplo)", telefono: "2246 508833", domicilio: "Av. 32 y 5", estrellas: 142, es_admin: false, creado: ahora(12) }
        ],
        pedidos: [
          { id: 1, usuario: "ej1", items: [{ nombre: "Brut", variante: "Doble", precio: 15500, cant: 2 }], total: 31000, domicilio: "Calle 38 nro 450", pago: "Efectivo", creado: ahora(3) }
        ],
        movimientos: [
          { id: 1, usuario: "ej1", cantidad: 28, monto: 28000, motivo: "", admin: "admin", creado: ahora(18) },
          { id: 2, usuario: "ej1", cantidad: 31, monto: 31000, motivo: "", admin: "admin", creado: ahora(3) },
          { id: 3, usuario: "ej2", cantidad: 172, monto: 172000, motivo: "Compras de septiembre", admin: "admin", creado: ahora(9) },
          { id: 4, usuario: "ej2", cantidad: -30, monto: null, motivo: "Canje: Medallón extra", admin: "admin", creado: ahora(5) }
        ]
      };
    }

    function leer() {
      try {
        var db = JSON.parse(localStorage.getItem(CLAVE));
        if (db && db.usuarios) { db.sesiones = db.sesiones || {}; return db; }
      } catch (e) { /* sigue con la semilla */ }
      return semilla();
    }

    var memoria = leer();

    function db() {
      try {
        var guardado = JSON.parse(localStorage.getItem(CLAVE));
        if (guardado && guardado.usuarios) memoria = guardado;
      } catch (e) { /* usa lo que hay en memoria */ }
      return memoria;
    }

    function guardar(d) {
      memoria = d;
      try { localStorage.setItem(CLAVE, JSON.stringify(d)); }
      catch (e) { /* sin almacenamiento, dura lo que dura la visita */ }
    }

    function publico(u) {
      if (!u) return null;
      var p = Object.assign({}, u);
      delete p.clave;
      return p;
    }

    function cargar() {
      var d = db();
      var id = (d.sesiones || {})[app];
      perfil = publico(d.usuarios.filter(function (u) { return u.id === id; })[0]);
      avisar();
      return perfil;
    }

    function exigirAdmin() {
      if (!perfil || !perfil.es_admin) throw new Error("Solo para administradores.");
    }

    function demora(fn) {
      return new Promise(function (ok, mal) {
        setTimeout(function () {
          try { ok(fn()); } catch (e) { mal(e); }
        }, 250);
      });
    }

    function codigoNuevo(d) {
      var abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", c;
      do {
        c = "SMB-";
        for (var i = 0; i < 5; i++) c += abc[Math.floor(Math.random() * abc.length)];
      } while (d.usuarios.some(function (u) { return u.codigo === c; }));
      return c;
    }

    // Si el panel de admin cambia algo en otra pestaña, se actualiza acá
    window.addEventListener("storage", function (e) {
      if (e.key === CLAVE) cargar();
    });

    return {
      listo: Promise.resolve().then(cargar),
      ingresar: function (email, clave) {
        return demora(function () {
          var d = db();
          var u = d.usuarios.filter(function (x) { return x.email === email.toLowerCase(); })[0];
          if (!u || u.clave !== clave) throw new Error("Mail o contraseña incorrectos.");
          d.sesiones[app] = u.id;
          guardar(d);
          return cargar();
        });
      },
      registrar: function (datos) {
        return demora(function () {
          var d = db();
          var email = datos.email.toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Ese mail no parece válido.");
          if (datos.clave.length < 6) throw new Error("La contraseña tiene que tener al menos 6 caracteres.");
          if (d.usuarios.some(function (u) { return u.email === email; })) {
            throw new Error("Ya hay una cuenta con ese mail. Probá ingresar.");
          }
          var u = {
            id: "u" + Date.now(), email: email, clave: datos.clave, codigo: codigoNuevo(d),
            nombre: datos.nombre, telefono: datos.telefono, domicilio: "", estrellas: 0, es_admin: false, creado: ahora()
          };
          d.usuarios.push(u);
          d.sesiones[app] = u.id;
          guardar(d);
          cargar();
          return { confirmar: false };
        });
      },
      recuperar: function () {
        return Promise.reject(new Error("En la versión de prueba no se mandan mails."));
      },
      salir: function () {
        var d = db();
        delete d.sesiones[app];
        guardar(d);
        cargar();
        return Promise.resolve();
      },
      refrescar: function () {
        return Promise.resolve(cargar());
      },
      cambiarClave: function (actual, nueva) {
        return demora(function () {
          var d = db();
          var u = d.usuarios.filter(function (x) { return x.id === perfil.id; })[0];
          if (!u || u.clave !== actual) throw new Error("La contraseña actual no es correcta.");
          if (actual === nueva) throw new Error("La contraseña nueva tiene que ser distinta de la actual.");
          u.clave = nueva;
          guardar(d);
        });
      },
      actualizarPerfil: function (campos) {
        return demora(function () {
          var d = db();
          d.usuarios.forEach(function (u) {
            if (u.id === perfil.id) Object.assign(u, campos);
          });
          guardar(d);
          return cargar();
        });
      },
      premios: function () {
        return Promise.resolve(premiosDemo());
      },
      canjear: function (ids) {
        return demora(function () {
          var d = db();
          var u = d.usuarios.filter(function (x) { return x.id === perfil.id; })[0];
          var lista = premiosDemo();
          var elegidos = ids.map(function (id) {
            var pr = lista.filter(function (x) { return x.id === id; })[0];
            if (!pr) throw new Error("Ese premio ya no existe.");
            return pr;
          });
          var costo = elegidos.reduce(function (n, pr) { return n + pr.estrellas; }, 0);
          if (costo > u.estrellas) throw new Error("No te alcanzan las estrellas.");
          u.estrellas -= costo;
          elegidos.forEach(function (pr, n) {
            d.movimientos.push({ id: Date.now() + n, usuario: u.id, cantidad: -pr.estrellas, monto: null, motivo: "Canje: " + pr.nombre + " (pedido web)", admin: null, creado: ahora() });
          });
          guardar(d);
          return cargar();
        });
      },
      registrarPedido: function (pedido) {
        var d = db();
        pedido.id = Date.now();
        pedido.usuario = perfil.id;
        pedido.creado = ahora();
        d.pedidos.push(pedido);
        guardar(d);
        return Promise.resolve();
      },

      // Admin
      buscarClientes: function (q) {
        return demora(function () {
          exigirAdmin();
          var texto = String(q || "").trim().toLowerCase();
          var codigo = normalizarCodigo(q);
          var digitos = texto.replace(/\D/g, "");
          return db().usuarios.filter(function (u) {
            if (u.es_admin) return false;
            return u.codigo === codigo
              || (digitos.length >= 4 && u.telefono.replace(/\D/g, "").indexOf(digitos) !== -1)
              || (texto.length >= 2 && u.nombre.toLowerCase().indexOf(texto) !== -1);
          }).map(publico);
        });
      },
      sumarEstrellas: function (codigo, cantidad, motivo, monto) {
        return demora(function () {
          exigirAdmin();
          if (!cantidad) throw new Error("La cantidad no puede ser cero.");
          var d = db();
          var u = d.usuarios.filter(function (x) { return x.codigo === normalizarCodigo(codigo); })[0];
          if (!u) throw new Error("No existe un cliente con ese ID.");
          if (u.estrellas + cantidad < 0) {
            throw new Error("Tiene " + u.estrellas + " estrellas, no se le pueden sacar " + (-cantidad) + ".");
          }
          u.estrellas += cantidad;
          d.movimientos.push({ id: Date.now(), usuario: u.id, cantidad: cantidad, monto: monto || null, motivo: motivo || "", admin: perfil.id, creado: ahora() });
          guardar(d);
          return publico(u);
        });
      },
      movimientos: function (usuarioId) {
        return demora(function () {
          exigirAdmin();
          var d = db();
          var nombres = {};
          d.usuarios.forEach(function (u) { nombres[u.id] = u; });
          return d.movimientos
            .filter(function (m) { return !usuarioId || m.usuario === usuarioId; })
            .sort(function (a, b) { return b.creado < a.creado ? -1 : 1; })
            .slice(0, usuarioId ? 10 : 15)
            .map(function (m) {
              var u = nombres[m.usuario] || {};
              return Object.assign({}, m, { nombre: u.nombre, codigo: u.codigo });
            });
        });
      },
      pedidos: function (usuarioId) {
        return demora(function () {
          exigirAdmin();
          return db().pedidos
            .filter(function (p) { return p.usuario === usuarioId; })
            .sort(function (a, b) { return b.creado < a.creado ? -1 : 1; })
            .slice(0, 5);
        });
      }
    };
  }

  var api = usaSupabase ? supabase() : local();
  api.modo = usaSupabase ? "supabase" : "demo";
  api.perfil = function () { return perfil; };
  api.onCambio = function (fn) { oyentes.push(fn); };
  api.normalizarCodigo = normalizarCodigo;
  api.listo.catch(function (err) { console.warn("No se pudo conectar con la base de datos.", err); });
  return api;
})();
