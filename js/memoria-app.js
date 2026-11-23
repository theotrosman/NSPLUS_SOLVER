/*!
 * Simulador de memoria — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cSimulador de memoria%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman", "font-weight:700", "font-weight:400");

  var M = window.MemEngine;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));
  var doneTimer = null;
  var armed = false;
  function doneSoon() { if (!armed) return; clearTimeout(doneTimer); doneTimer = setTimeout(function () { if (window.ORT) window.ORT.done(); }, 7000); }

  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) { o.classList.toggle("is-active", o === t); o.setAttribute("aria-selected", o === t ? "true" : "false"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });
  function activeTab() { return document.querySelector(".tab.is-active").getAttribute("data-tab"); }
  function algos() { return Array.prototype.filter.call(document.querySelectorAll('input[name="algo"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }); }

  /* ---------- Reemplazo ---------- */
  function results() {
    var refs = M.parseRefs($("refs").value), frames = $("frames").value;
    return algos().map(function (a) { return M.simulate(refs, frames, a); });
  }
  function renderReplace() {
    var out = $("r-out"), err = $("r-error");
    out.innerHTML = ""; err.hidden = true;
    var rs;
    try { rs = results(); } catch (e) { err.textContent = e.message; err.hidden = false; return; }
    if (!rs.length) { err.textContent = "Elegí al menos un algoritmo."; err.hidden = false; return; }
    var summary = el("div", "base-cards");
    rs.forEach(function (r) {
      var c = el("div", "base-card");
      c.appendChild(el("small", null, r.algo === "OPT" ? "Óptimo" : r.algo));
      c.appendChild(el("strong", null, r.faults + " fallos · " + r.hits + " aciertos"));
      c.appendChild(el("span", "muted", "Tasa de fallos: " + r.faultRate + "%"));
      summary.appendChild(c);
    });
    out.appendChild(summary);
    rs.forEach(function (r) {
      var m = el("div", "method");
      m.appendChild(el("h3", null, M.NAMES[r.algo]));
      var wrap = el("div", "table-wrap"), t = el("table", "steps-table mem-table");
      var head = el("tr");
      head.appendChild(el("th", null, "Referencia"));
      r.steps.forEach(function (s) { head.appendChild(el("th", null, String(s.ref))); });
      t.appendChild(head);
      for (var f = 0; f < r.frames; f++) {
        var row = el("tr");
        row.appendChild(el("th", null, "Marco " + (f + 1)));
        r.steps.forEach(function (s) {
          var v = s.frames[f];
          var td = el("td", (!s.hit && s.slot === f) ? "is-new" : "", v == null ? "" : String(v));
          row.appendChild(td);
        });
        t.appendChild(row);
      }
      var fr = el("tr", "mem-fault-row");
      fr.appendChild(el("th", null, "¿Fallo?"));
      r.steps.forEach(function (s) { fr.appendChild(el("td", s.hit ? "is-hit" : "is-fault", s.hit ? "✓" : "F")); });
      t.appendChild(fr);
      wrap.appendChild(t);
      m.appendChild(wrap);
      m.appendChild(el("p", "muted", "F = fallo de página (la página no estaba en memoria y hubo que cargarla). En verde, la página que se cargó en ese paso. ✓ = acierto."));
      out.appendChild(m);
    });
    doneSoon();
  }
  ["refs", "frames"].forEach(function (id) { $(id).addEventListener("input", renderReplace); });
  document.querySelectorAll('input[name="algo"]').forEach(function (c) { c.addEventListener("change", renderReplace); });

  /* ---------- Traducción ---------- */
  function renderTranslate() {
    var out = $("t-out"), err = $("t-error");
    out.innerHTML = ""; err.hidden = true;
    var r;
    try { r = M.translate($("t-size").value, $("t-addr").value, M.parseTable($("t-table").value)); } catch (e) { err.textContent = e.message; err.hidden = false; return; }
    var m = el("div", "method");
    m.appendChild(el("h3", null, "Paso a paso"));
    var ol = el("ol", "plain-steps");
    ol.appendChild(el("li", null, "Página = dirección ÷ tamaño de página = " + r.address + " ÷ " + r.pageSize + " = " + r.page + " (parte entera)."));
    ol.appendChild(el("li", null, "Desplazamiento = resto = " + r.address + " mod " + r.pageSize + " = " + r.offset + "."));
    if (r.frame == null) ol.appendChild(el("li", null, "La página " + r.page + " no está en la tabla: hay un fallo de página (hay que traerla del disco)."));
    else {
      ol.appendChild(el("li", null, "En la tabla de páginas, la página " + r.page + " está en el marco " + r.frame + "."));
      ol.appendChild(el("li", null, "Dirección física = marco × tamaño + desplazamiento = " + r.frame + " × " + r.pageSize + " + " + r.offset + " = " + r.physical + "."));
    }
    if (r.offsetBits != null) ol.appendChild(el("li", null, "Como el tamaño es 2^" + r.offsetBits + ", los " + r.offsetBits + " bits de abajo son el desplazamiento y el resto es el número de página."));
    m.appendChild(ol);
    m.appendChild(el("p", "answer", r.physical == null ? "Fallo de página (página " + r.page + ")" : "Dirección física: " + r.physical));
    out.appendChild(m);
    doneSoon();
  }
  ["t-size", "t-addr", "t-table"].forEach(function (id) { $(id).addEventListener("input", renderTranslate); });

  /* ---------- Entregables ---------- */
  function replaceSections(refsText, frames, list, label) {
    var refs = M.parseRefs(refsText);
    return list.map(function (a) {
      var r = M.simulate(refs, frames, a);
      var head = ["Ref."].concat(r.steps.map(function (s) { return String(s.ref); }));
      var rows = [];
      for (var f = 0; f < r.frames; f++) rows.push(["Marco " + (f + 1)].concat(r.steps.map(function (s) { return s.frames[f] == null ? "" : String(s.frames[f]); })));
      rows.push(["¿Fallo?"].concat(r.steps.map(function (s) { return s.hit ? "✓" : "F"; })));
      return { title: (label ? label + " · " : "") + M.NAMES[a] + " — " + r.faults + " fallos, " + r.hits + " aciertos (tasa " + r.faultRate + "%)", table: { head: head, rows: rows } };
    });
  }
  function translateSection(size, addr, table, label) {
    var r = M.translate(size, addr, table);
    return { title: (label ? label + " · " : "") + "Traducción de la dirección " + r.address, list: [
      "Página = " + r.address + " ÷ " + r.pageSize + " = " + r.page + ".",
      "Desplazamiento = " + r.address + " mod " + r.pageSize + " = " + r.offset + ".",
      r.frame == null ? "La página no está cargada: fallo de página." : "Marco de la página " + r.page + ": " + r.frame + ".",
      r.physical == null ? "No hay dirección física hasta traer la página." : "Dirección física = " + r.frame + " × " + r.pageSize + " + " + r.offset + " = " + r.physical + "."] };
  }
  $("pdf").addEventListener("click", function () {
    var sections;
    try {
      sections = activeTab() === "replace"
        ? [{ title: "Datos", text: "Referencias: " + $("refs").value + "\nMarcos: " + $("frames").value }].concat(replaceSections($("refs").value, $("frames").value, algos()))
        : [translateSection($("t-size").value, $("t-addr").value, M.parseTable($("t-table").value))];
    } catch (e) { alert(e.message); return; }
    ORTDoc.pdf({ tool: "Simulador de memoria", title: activeTab() === "replace" ? "Reemplazo de páginas" : "Traducción de direcciones", filename: "memoria", sections: sections });
  });
  $("csv").addEventListener("click", function () {
    var rows = [];
    try {
      if (activeTab() === "replace") {
        replaceSections($("refs").value, $("frames").value, algos()).forEach(function (s) { rows.push([s.title]); rows.push(s.table.head); rows = rows.concat(s.table.rows); rows.push([]); });
      } else {
        translateSection($("t-size").value, $("t-addr").value, M.parseTable($("t-table").value)).list.forEach(function (l) { rows.push([l]); });
      }
    } catch (e) { alert(e.message); return; }
    var csv = "﻿" + rows.map(function (r) { return r.map(function (x) { return "\"" + String(x).replace(/"/g, "\"\"") + "\""; }).join(";"); }).join("\r\n");
    ORTDoc.file("memoria.csv", csv, "text/csv");
  });

  window.ORTConsigna = window.ORTConsigna || {};
  window.ORTConsigna.onItem = function (it) {
    if (it.kind === "translate") {
      document.querySelector('.tab[data-tab="translate"]').click();
      $("t-size").value = it.pageSize; $("t-addr").value = it.address;
      $("t-table").value = Object.keys(it.pageTable || {}).map(function (k) { return k + ":" + it.pageTable[k]; }).join(", ");
      renderTranslate();
    } else {
      document.querySelector('.tab[data-tab="replace"]').click();
      $("refs").value = (it.refs || []).join(" "); $("frames").value = it.frames || 3;
      var want = (it.algorithms && it.algorithms.length ? it.algorithms : ["FIFO", "LRU", "OPT"]).map(function (a) { return /opt|ópt/i.test(a) ? "OPT" : String(a).toUpperCase(); });
      document.querySelectorAll('input[name="algo"]').forEach(function (c) { c.checked = want.indexOf(c.value) >= 0; });
      renderReplace();
    }
    document.querySelector(".tabs").scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.ORT) window.ORT.done();
  };
  window.ORTConsigna.all = function (items, consignaText) {
    var sections = [{ title: "Consigna", pre: consignaText.slice(0, 4000) }];
    items.forEach(function (it) {
      try {
        if (it.kind === "translate") sections.push(translateSection(it.pageSize, it.address, it.pageTable || {}, it.label));
        else {
          var want = (it.algorithms && it.algorithms.length ? it.algorithms : ["FIFO", "LRU", "OPT"]).map(function (a) { return /opt|ópt/i.test(a) ? "OPT" : String(a).toUpperCase(); }).filter(function (a) { return M.NAMES[a]; });
          sections = sections.concat(replaceSections((it.refs || []).join(" "), it.frames || 3, want, it.label));
        }
      } catch (e) { sections.push({ title: it.label, text: "No se pudo resolver: " + e.message }); }
    });
    ORTDoc.pdf({ tool: "Simulador de memoria", title: "Ejercicios de memoria", subtitle: items.length + " ejercicios resueltos.", filename: "memoria", sections: sections });
  };

  renderReplace();
  renderTranslate();
  armed = true;
})();
