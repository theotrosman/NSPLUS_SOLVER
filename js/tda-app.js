/*!
 * Laboratorio de TDA — Pila, Cola y Lista Ordenada con los métodos de la materia
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cLaboratorio de TDA%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var IFACES = {
    base: "public interface Tda {\n    boolean isEmpty();\n    boolean isFull();\n}\n\npublic interface Sizeable {\n    int size();\n}\n\n",
    pila: "public interface Pila<T> extends Tda, Sizeable {\n    void push(T elemento);   // agrega arriba\n    T peek();                // mira el de arriba (no lo saca)\n    T pop();                 // saca el de arriba\n}",
    cola: "public interface Cola<T> extends Tda, Sizeable {\n    void add(T elemento);    // agrega al fondo\n    T get();                 // mira el del frente (no lo saca)\n    T remove();              // saca el del frente\n}",
    lista: "public interface ListaOrdenada<K, T> extends Tda, Sizeable {\n    void add(T elemento);        // lo ubica en su lugar según la clave\n    T get(int posicion);         // el de esa posición\n    boolean remove(T elemento);  // saca ese elemento\n    T removeAt(int posicion);    // saca el de esa posición\n    T removeByKey(K clave);      // saca el que tiene esa clave\n    boolean exists(K clave);     // ¿hay alguno con esa clave?\n    T search(K clave);           // devuelve el que tiene esa clave\n}"
  };
  var DESC = {
    pila: "Pila (LIFO: el último que entra es el primero que sale). Como una pila de remeras: solo podés tocar la de arriba.",
    cola: "Cola (FIFO: el primero que entra es el primero que sale). Como la fila del kiosco: se agrega al fondo y se atiende al del frente.",
    lista: "Lista Ordenada: cada elemento se guarda en su lugar según su clave (acá, el propio valor), y se puede acceder por posición o por clave."
  };
  var VAR = { pila: "pila", cola: "cola", lista: "lista" };

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  var kind = "pila", items = [], highlight = null, leaving = null;

  function cap() { return Math.max(1, Math.min(12, Math.round(+$("cap").value) || 6)); }
  function val() { return $("value").value.trim(); }
  function show(v) { return /^-?\d+(\.\d+)?$/.test(v) ? v : "\"" + v + "\""; }
  function cmp(a, b) {
    var na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b);
    if (na && nb) return +a - +b;
    return String(a).localeCompare(String(b), "es");
  }
  function state() {
    if (!items.length) return "vacía";
    return "[" + items.map(show).join(", ") + "]";
  }

  var history = [];
  function log(code, result, kindOf) {
    history.push([VAR[kind] + "." + code + ";", result]);
    var li = el("li", kindOf || "");
    li.appendChild(el("code", null, VAR[kind] + "." + code + ";"));
    li.appendChild(el("span", null, result));
    var ol = $("log");
    ol.insertBefore(li, ol.firstChild);
    while (ol.children.length > 14) ol.removeChild(ol.lastChild);
  }

  /* ---------- Operaciones ---------- */
  function needValue() {
    var v = val();
    if (!v) { $("value").focus(); $("value").classList.add("shake"); setTimeout(function () { $("value").classList.remove("shake"); }, 400); return null; }
    return v;
  }
  function full(method) {
    if (items.length >= cap()) { log(method, "✗ No entra: está llena (isFull() es true, capacidad " + cap() + ").", "bad"); return true; }
    return false;
  }
  function emptyErr(method) {
    if (!items.length) { log(method, "✗ No se puede: está vacía (isEmpty() es true).", "bad"); return true; }
    return false;
  }
  function nextRandom() { $("value").value = String(Math.floor(Math.random() * 90) + 10); }

  var OPS = {
    pila: [
      ["push(valor)", "Apila", function () { var v = needValue(); if (v == null || full("push(" + show(v) + ")")) return; items.push(v); highlight = items.length - 1; log("push(" + show(v) + ")", "Queda " + state() + " · tope: " + show(v)); nextRandom(); }],
      ["peek()", "Mira el tope", function () { if (emptyErr("peek()")) return; highlight = items.length - 1; log("peek()", "Devuelve " + show(items[items.length - 1]) + " (no lo saca)"); }],
      ["pop()", "Desapila", function () { if (emptyErr("pop()")) return; var v = items.pop(); leaving = v; log("pop()", "Devuelve " + show(v) + " · queda " + state()); }]
    ],
    cola: [
      ["add(valor)", "Encola", function () { var v = needValue(); if (v == null || full("add(" + show(v) + ")")) return; items.push(v); highlight = items.length - 1; log("add(" + show(v) + ")", "Queda " + state() + " · frente: " + show(items[0])); nextRandom(); }],
      ["get()", "Mira el frente", function () { if (emptyErr("get()")) return; highlight = 0; log("get()", "Devuelve " + show(items[0]) + " (no lo saca)"); }],
      ["remove()", "Desencola", function () { if (emptyErr("remove()")) return; var v = items.shift(); leaving = v; log("remove()", "Devuelve " + show(v) + " · queda " + state()); }]
    ],
    lista: [
      ["add(valor)", "Agrega en orden", function () {
        var v = needValue(); if (v == null || full("add(" + show(v) + ")")) return;
        var i = 0; while (i < items.length && cmp(items[i], v) <= 0) i++;
        items.splice(i, 0, v); highlight = i;
        log("add(" + show(v) + ")", "Va a la posición " + i + " · queda " + state()); nextRandom();
      }],
      ["get(posición)", "Por posición", function () {
        var v = needValue(); if (v == null) return; var p = Math.floor(+v);
        if (!(p >= 0 && p < items.length)) { log("get(" + v + ")", "✗ No existe la posición " + v + " (van de 0 a " + (items.length - 1) + ").", "bad"); return; }
        highlight = p; log("get(" + p + ")", "Devuelve " + show(items[p]));
      }],
      ["exists(clave)", "¿Existe?", function () {
        var v = needValue(); if (v == null) return; var i = items.findIndex(function (x) { return cmp(x, v) === 0; });
        highlight = i >= 0 ? i : null; log("exists(" + show(v) + ")", i >= 0 ? "Devuelve true" : "Devuelve false");
      }],
      ["search(clave)", "Buscar", function () {
        var v = needValue(); if (v == null) return; var i = items.findIndex(function (x) { return cmp(x, v) === 0; });
        highlight = i >= 0 ? i : null; log("search(" + show(v) + ")", i >= 0 ? "Devuelve " + show(items[i]) + " (está en la posición " + i + ")" : "Devuelve null (no está)");
      }],
      ["remove(valor)", "Sacar ese", function () {
        var v = needValue(); if (v == null) return; var i = items.findIndex(function (x) { return cmp(x, v) === 0; });
        if (i < 0) { log("remove(" + show(v) + ")", "Devuelve false (no estaba)"); return; }
        leaving = items.splice(i, 1)[0]; log("remove(" + show(v) + ")", "Devuelve true · queda " + state());
      }],
      ["removeAt(posición)", "Sacar posición", function () {
        var v = needValue(); if (v == null) return; var p = Math.floor(+v);
        if (!(p >= 0 && p < items.length)) { log("removeAt(" + v + ")", "✗ No existe la posición " + v + ".", "bad"); return; }
        leaving = items.splice(p, 1)[0]; log("removeAt(" + p + ")", "Devuelve " + show(leaving) + " · queda " + state());
      }]
    ]
  };
  var COMMON = [
    ["size()", "Tamaño", function () { log("size()", "Devuelve " + items.length); }],
    ["isEmpty()", "¿Vacía?", function () { log("isEmpty()", "Devuelve " + (items.length === 0)); }],
    ["isFull()", "¿Llena?", function () { log("isFull()", "Devuelve " + (items.length >= cap()) + " (capacidad " + cap() + ")"); }]
  ];

  function renderOps() {
    var box = $("ops");
    box.innerHTML = "";
    OPS[kind].concat(COMMON).forEach(function (o, i) {
      var b = el("button", "tda-op" + (i >= OPS[kind].length ? " is-common" : ""));
      b.type = "button";
      b.appendChild(el("code", null, o[0]));
      b.appendChild(el("span", null, o[1]));
      b.addEventListener("click", function () { highlight = null; leaving = null; o[2](); render(); });
      box.appendChild(b);
    });
  }

  function render() {
    var viz = $("viz");
    viz.innerHTML = "";
    viz.className = "tda-viz is-" + kind;
    var c = cap();
    var cont = el("div", "tda-container");
    if (kind === "pila") {
      for (var s = c - 1; s >= 0; s--) {
        var slot = el("div", "tda-slot" + (s < items.length ? " has" : ""));
        if (s < items.length) {
          var box = el("div", "tda-item" + (s === highlight ? " is-hl" : "") + (s === items.length - 1 ? " is-top" : ""), items[s]);
          slot.appendChild(box);
          if (s === items.length - 1) slot.appendChild(el("span", "tda-tag", "← tope"));
        }
        cont.appendChild(slot);
      }
    } else {
      for (var i = 0; i < c; i++) {
        var sl = el("div", "tda-slot" + (i < items.length ? " has" : ""));
        if (i < items.length) {
          sl.appendChild(el("div", "tda-item" + (i === highlight ? " is-hl" : ""), items[i]));
          if (kind === "cola" && i === 0) sl.appendChild(el("span", "tda-tag", "frente"));
          if (kind === "cola" && i === items.length - 1) sl.appendChild(el("span", "tda-tag tag-end", "fondo"));
          if (kind === "lista") sl.appendChild(el("span", "tda-tag", "[" + i + "]"));
        }
        cont.appendChild(sl);
      }
    }
    viz.appendChild(cont);
    if (leaving != null) viz.appendChild(el("div", "tda-leaving", "salió: " + leaving));
    var stats = el("p", "muted tda-stats", "size() = " + items.length + " · isEmpty() = " + (items.length === 0) + " · isFull() = " + (items.length >= c));
    viz.appendChild(stats);
  }

  function selectKind(k) {
    kind = k; items = []; highlight = null; leaving = null; history = [];
    $("log").innerHTML = "";
    $("tda-desc").textContent = DESC[k];
    $("iface").textContent = IFACES.base + IFACES[k];
    renderOps();
    render();
  }

  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) { o.classList.toggle("is-active", o === t); o.setAttribute("aria-selected", o === t ? "true" : "false"); });
      selectKind(t.getAttribute("data-tab"));
    });
  });
  $("random").addEventListener("click", nextRandom);
  $("reset").addEventListener("click", function () { items = []; highlight = null; leaving = null; $("log").innerHTML = ""; render(); });
  $("cap").addEventListener("input", render);
  $("value").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("ops").firstChild.click(); } });

  /* ---------- Operaciones desde la consigna ---------- */
  function findOp(method) {
    var m = String(method).replace(/\(.*$/, "").trim().toLowerCase();
    return OPS[kind].concat(COMMON).find(function (o) { return o[0].replace(/\(.*$/, "").toLowerCase() === m; });
  }
  function runOps(k, ops, done) {
    document.querySelector('.tab[data-tab="' + k + '"]').click();
    var i = 0;
    (function next() {
      if (i >= ops.length) { if (done) done(); return; }
      var o = ops[i++], op = findOp(o.method);
      if (op) {
        if (o.arg != null) $("value").value = String(o.arg);
        highlight = null; leaving = null;
        op[2]();
        render();
      } else log(o.method + "()", "✗ Ese método no existe en " + k + ".", "bad");
      setTimeout(next, 450);
    })();
  }
  function pdfSections(title) {
    return [
      { title: title || "Operaciones", table: { head: ["#", "Llamada en Java", "Qué pasa / qué devuelve"], rows: history.map(function (h, i) { return [i + 1, h[0], h[1]]; }) } },
      { title: "Estado final", text: (kind === "pila" ? "Pila" : kind === "cola" ? "Cola" : "Lista ordenada") + ": " + state() + " · size() = " + items.length },
      { title: "Interfaz en Java", pre: IFACES.base + IFACES[kind] }
    ];
  }
  var pdfBtn = el("button", "btn btn-primary", "Descargar registro (PDF)");
  pdfBtn.type = "button";
  pdfBtn.addEventListener("click", function () {
    if (!history.length) { alert("Primero hacé alguna operación."); return; }
    ORTDoc.pdf({ tool: "Laboratorio de TDA", title: "Seguimiento de " + (kind === "pila" ? "Pila<T>" : kind === "cola" ? "Cola<T>" : "ListaOrdenada<K,T>"), subtitle: DESC[kind], filename: "tda-" + kind, sections: pdfSections() });
  });
  var bar = el("div", "result-actions");
  bar.appendChild(pdfBtn);
  document.querySelector(".tda-stage").after(bar);

  window.ORTConsigna = window.ORTConsigna || {};
  window.ORTConsigna.onItem = function (it) {
    var k = it.kind === "cola" ? "cola" : it.kind === "lista" ? "lista" : "pila";
    document.querySelector(".tda-stage").scrollIntoView({ behavior: "smooth", block: "start" });
    runOps(k, it.ops || [], function () { if (window.ORT) window.ORT.done(); });
  };
  window.ORTConsigna.all = function (items, consignaText) {
    var sections = [{ title: "Consigna", pre: consignaText.slice(0, 4000) }];
    var i = 0;
    (function next() {
      if (i >= items.length) {
        ORTDoc.pdf({ tool: "Laboratorio de TDA", title: "Ejercicios de TDA", subtitle: items.length + " ejercicios con su seguimiento.", filename: "tda", sections: sections });
        return;
      }
      var it = items[i++], k = it.kind === "cola" ? "cola" : it.kind === "lista" ? "lista" : "pila";
      selectKind(k);
      document.querySelectorAll(".tab").forEach(function (o) { o.classList.toggle("is-active", o.getAttribute("data-tab") === k); });
      (it.ops || []).forEach(function (o) {
        var op = findOp(o.method);
        if (!op) { log(o.method + "()", "✗ Ese método no existe en " + k + ".", "bad"); return; }
        if (o.arg != null) $("value").value = String(o.arg);
        op[2]();
      });
      render();
      sections = sections.concat(pdfSections(it.label + " (" + k + ")"));
      next();
    })();
  };

  nextRandom();
  selectKind("pila");
})();
