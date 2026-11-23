/*!
 * IP, subredes y VLSM — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cIP y VLSM%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var E = window.IPEngine;
  var $ = function (id) { return document.getElementById(id); };
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));
  var COLORS = ["#2b4bd6", "#1e7a3c", "#b4321f", "#8a4fd8", "#c27c0e", "#0f8a8a", "#d63b8f", "#5b6b2b"];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function table(headers, rows, opts) {
    opts = opts || {};
    var wrap = el("div", "table-wrap"), t = el("table", "steps-table ip-table");
    var tr = el("tr");
    headers.forEach(function (h) { tr.appendChild(el("th", null, h)); });
    t.appendChild(tr);
    rows.forEach(function (r, ri) {
      var row = el("tr");
      r.forEach(function (c, i) {
        var td = el("td", (opts.hl || []).indexOf(i) >= 0 ? "hl" : "", String(c));
        if (i === 0 && opts.colors) { td.style.borderLeft = "4px solid " + COLORS[ri % COLORS.length]; }
        row.appendChild(td);
      });
      t.appendChild(row);
    });
    wrap.appendChild(t);
    return wrap;
  }
  function err(id, msg) { $(id).textContent = msg || ""; $(id).hidden = !msg; }

  /* ---------- Pestañas ---------- */
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) { o.classList.toggle("is-active", o === t); o.setAttribute("aria-selected", o === t ? "true" : "false"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
      try { history.replaceState(null, "", "#" + t.getAttribute("data-tab")); } catch (e) { /* nada */ }
    });
  });
  var hash = location.hash.replace("#", "");
  var initial = document.querySelector('.tab[data-tab="' + hash + '"]');
  if (initial) initial.click();

  /* ---------- Calculadora ---------- */
  function calc() {
    var out = $("c-out");
    out.innerHTML = "";
    err("c-error");
    var ipText = $("c-ip").value.trim();
    if (!ipText) return;
    var parsed;
    try { parsed = E.parseCIDR(ipText, ipText.indexOf("/") >= 0 ? null : $("c-mask").value); } catch (e) { err("c-error", e.message); return; }
    var r = E.info(parsed.ip, parsed.prefix);
    var grid = el("div", "base-cards ip-cards");
    [["Dirección de red", r.network + "/" + r.prefix], ["Broadcast", r.broadcast], ["Primer host", r.first], ["Último host", r.last],
      ["Hosts utilizables", r.hosts.toLocaleString("es-AR")], ["Máscara", r.mask], ["Wildcard", r.wildcard], ["Clase · tipo", r.cls.cls + " · " + r.type]
    ].forEach(function (c) {
      var d = el("div", "base-card");
      d.appendChild(el("small", null, c[0]));
      d.appendChild(el("strong", null, c[1]));
      grid.appendChild(d);
    });
    out.appendChild(grid);
    if (r.isNetworkAddress) out.appendChild(el("p", "explanation", "Ojo: " + r.ip + " es la dirección de red, no se le puede asignar a una compu."));
    if (r.isBroadcast) out.appendChild(el("p", "explanation", "Ojo: " + r.ip + " es el broadcast, no se le puede asignar a una compu."));

    var m = el("div", "method");
    m.appendChild(el("h3", null, "Cómo se calcula"));
    m.appendChild(el("p", null, "La máscara /" + r.prefix + " tiene " + r.prefix + " bits en 1 (parte de red) y " + (32 - r.prefix) + " en 0 (parte de hosts). La red sale de hacer AND bit a bit entre la IP y la máscara; el broadcast, de poner en 1 todos los bits de host."));
    m.appendChild(table(["", "En binario", "Decimal"], [
      ["IP", r.bin.ip, r.ip],
      ["Máscara (/" + r.prefix + ")", r.bin.mask, r.mask],
      ["Red = IP AND máscara", r.bin.network, r.network],
      ["Broadcast (hosts en 1)", r.bin.broadcast, r.broadcast]
    ], { hl: [2] }));
    m.appendChild(el("p", "muted", "Hosts = 2^" + (32 - r.prefix) + " − 2 = " + r.hosts.toLocaleString("es-AR") + " (se restan la dirección de red y el broadcast)."));
    out.appendChild(m);
  }
  ["c-ip", "c-mask"].forEach(function (id) { $(id).addEventListener("input", calc); });

  /* ---------- Subredes iguales ---------- */
  function doFlsm() {
    var out = $("f-out");
    out.innerHTML = "";
    err("f-error");
    var net = $("f-net").value.trim(), n = $("f-count").value;
    if (!net || !n) return;
    var r;
    try { r = E.flsm(net, net.indexOf("/") >= 0 ? null : "/24", n); } catch (e) { err("f-error", e.message); return; }
    var m = el("div", "method");
    m.appendChild(el("h3", null, "Paso a paso"));
    var ol = el("ol", "plain-steps");
    ol.appendChild(el("li", null, "Para tener " + n + " subredes hacen falta " + r.bits + " bits prestados (2^" + r.bits + " = " + r.created + " ≥ " + n + ")."));
    ol.appendChild(el("li", null, "El prefijo pasa de /" + r.base.split("/")[1] + " a /" + r.newPrefix + " → máscara " + r.mask + "."));
    ol.appendChild(el("li", null, "Cada subred tiene 2^" + (32 - r.newPrefix) + " = " + r.size + " direcciones, o sea " + r.hosts + " hosts utilizables. Se saltan de a " + r.size + "."));
    m.appendChild(ol);
    m.appendChild(table(["#", "Red", "Primer host", "Último host", "Broadcast"], r.rows.map(function (x) {
      return [x.index, x.network + "/" + x.prefix, x.first, x.last, x.broadcast];
    }), { hl: [1] }));
    if (r.truncated) m.appendChild(el("p", "muted", "Se muestran las primeras 256 de " + r.created + " subredes."));
    out.appendChild(m);
  }
  ["f-net", "f-count"].forEach(function (id) { $(id).addEventListener("input", doFlsm); });

  /* ---------- VLSM ---------- */
  function addRow(name, hosts) {
    var row = el("div", "vlsm-row");
    var a = el("input", "field"); a.type = "text"; a.placeholder = "Nombre (ej: Ventas)"; a.value = name || "";
    var b = el("input", "field mono"); b.type = "number"; b.min = "1"; b.placeholder = "Hosts"; b.value = hosts || "";
    var x = el("button", "btn btn-ghost btn-sm", "✕"); x.type = "button"; x.title = "Quitar";
    x.addEventListener("click", function () { row.remove(); doVlsm(); });
    [a, b].forEach(function (i) { i.addEventListener("input", doVlsm); });
    row.appendChild(a); row.appendChild(b); row.appendChild(x);
    $("v-rows").appendChild(row);
  }
  $("v-add").addEventListener("click", function () { addRow("", ""); $("v-rows").lastChild.firstChild.focus(); });
  $("v-example").addEventListener("click", function () {
    $("v-net").value = "192.168.1.0/24";
    $("v-rows").innerHTML = "";
    [["Ventas", 50], ["Administración", 20], ["Gerencia", 10], ["Enlace router", 2]].forEach(function (r) { addRow(r[0], r[1]); });
    doVlsm();
  });
  $("v-net").addEventListener("input", doVlsm);

  function doVlsm() {
    var out = $("v-out");
    out.innerHTML = "";
    err("v-error");
    var net = $("v-net").value.trim();
    var reqs = Array.prototype.map.call($("v-rows").children, function (row) {
      var i = row.querySelectorAll("input");
      return { name: i[0].value, hosts: i[1].value };
    }).filter(function (r) { return String(r.hosts).trim() !== ""; });
    if (!net || !reqs.length) return;
    var r;
    try { r = E.vlsm(net, net.indexOf("/") >= 0 ? null : "/24", reqs); } catch (e) { err("v-error", e.message); return; }

    // El "playón": cada bloque ocupa su lugar
    var bar = el("div", "vlsm-bar");
    r.rows.forEach(function (x, i) {
      var seg = el("div", "vlsm-seg");
      seg.style.width = (x.block / r.total * 100) + "%";
      seg.style.background = COLORS[i % COLORS.length];
      seg.title = x.name + " · " + x.network + "/" + x.prefix + " (" + x.block + " direcciones)";
      seg.appendChild(el("span", null, x.name));
      bar.appendChild(seg);
    });
    if (r.free) {
      var free = el("div", "vlsm-seg is-free");
      free.style.width = (r.free / r.total * 100) + "%";
      free.appendChild(el("span", null, "libre"));
      bar.appendChild(free);
    }
    out.appendChild(el("p", "muted", "Así quedan acomodadas en " + r.base + " (" + r.total + " direcciones), de mayor a menor como los micros en el playón:"));
    out.appendChild(bar);

    out.appendChild(table(["Subred", "Hosts pedidos", "Bloque", "Prefijo", "Máscara", "Red", "Primer host", "Último host", "Broadcast"], r.rows.map(function (x) {
      return [x.name, x.hostsAsked, x.block, "/" + x.prefix, x.mask, x.network, x.first, x.last, x.broadcast];
    }), { hl: [5], colors: true }));

    var m = el("div", "method");
    m.appendChild(el("h3", null, "Paso a paso"));
    var ol = el("ol", "plain-steps");
    ol.appendChild(el("li", null, "Se ordenan las subredes de mayor a menor cantidad de hosts: " + r.rows.map(function (x) { return x.name + " (" + x.hostsAsked + ")"; }).join(", ") + "."));
    r.rows.forEach(function (x) {
      ol.appendChild(el("li", null, x.name + ": necesita " + x.hostsAsked + " + 2 (red y broadcast) = " + x.need +
        " → la potencia de 2 que alcanza es " + x.block + " → /" + x.prefix + " (" + x.mask + "). Arranca en " + x.network +
        " y termina en " + x.broadcast + (x.wasted ? ". Sobran " + x.wasted + " direcciones." : ".")));
    });
    ol.appendChild(el("li", null, r.nextFree ? "Queda libre desde " + r.nextFree + " (" + r.free + " direcciones) para crecer." : "Se usó toda la red."));
    m.appendChild(ol);
    out.appendChild(m);
  }

  /* ---------- Entregables ---------- */
  function activeTab() { var t = document.querySelector(".tab.is-active"); return t ? t.getAttribute("data-tab") : "calc"; }
  function vlsmReqs() {
    return Array.prototype.map.call($("v-rows").children, function (row) { var i = row.querySelectorAll("input"); return { name: i[0].value, hosts: i[1].value }; })
      .filter(function (r) { return String(r.hosts).trim() !== ""; });
  }
  function calcSection(ipText, maskText, label) {
    var p = E.parseCIDR(ipText, ipText.indexOf("/") >= 0 ? null : maskText), r = E.info(p.ip, p.prefix);
    return [
      { title: (label ? label + " · " : "") + "Datos de " + r.ip + "/" + r.prefix, table: { head: ["Dato", "Valor"], rows: [
        ["Dirección de red", r.network + "/" + r.prefix], ["Broadcast", r.broadcast], ["Primer host", r.first], ["Último host", r.last],
        ["Hosts utilizables", r.hosts], ["Máscara", r.mask], ["Wildcard", r.wildcard], ["Clase", r.cls.cls], ["Tipo", r.type]] } },
      { title: "Cálculo en binario", pre: "IP        " + r.bin.ip + "   " + r.ip + "\nMáscara   " + r.bin.mask + "   " + r.mask + "\nRed       " + r.bin.network + "   " + r.network + "  (IP AND máscara)\nBroadcast " + r.bin.broadcast + "   " + r.broadcast + "  (bits de host en 1)\nHosts = 2^" + (32 - r.prefix) + " − 2 = " + r.hosts }
    ];
  }
  function flsmSection(net, count, label) {
    var r = E.flsm(net, net.indexOf("/") >= 0 ? null : "/24", count);
    return [
      { title: (label ? label + " · " : "") + "Dividir " + r.base + " en " + count + " subredes", list: [
        "Bits prestados: " + r.bits + " (2^" + r.bits + " = " + r.created + " ≥ " + count + ").",
        "Nuevo prefijo: /" + r.newPrefix + " → máscara " + r.mask + ".",
        "Cada subred: " + r.size + " direcciones, " + r.hosts + " hosts utilizables."] },
      { table: { head: ["#", "Red", "Primer host", "Último host", "Broadcast"], rows: r.rows.map(function (x) { return [x.index, x.network + "/" + x.prefix, x.first, x.last, x.broadcast]; }) } }
    ];
  }
  function vlsmSection(net, reqs, label) {
    var r = E.vlsm(net, net.indexOf("/") >= 0 ? null : "/24", reqs);
    return [
      { title: (label ? label + " · " : "") + "Plan VLSM de " + r.base, table: { head: ["Subred", "Hosts pedidos", "Bloque", "Prefijo", "Máscara", "Red", "Primer host", "Último host", "Broadcast"],
        rows: r.rows.map(function (x) { return [x.name, x.hostsAsked, x.block, "/" + x.prefix, x.mask, x.network, x.first, x.last, x.broadcast]; }) } },
      { title: "Paso a paso", list: ["Se ordenan de mayor a menor: " + r.rows.map(function (x) { return x.name + " (" + x.hostsAsked + ")"; }).join(", ") + "."].concat(
        r.rows.map(function (x) { return x.name + ": " + x.hostsAsked + " + 2 = " + x.need + " → bloque de " + x.block + " → /" + x.prefix + " (" + x.mask + "), de " + x.network + " a " + x.broadcast + "."; }),
        [r.nextFree ? "Queda libre desde " + r.nextFree + " (" + r.free + " direcciones)." : "Se usó toda la red."]) }
    ];
  }
  function itemSections(it) {
    try {
      if (it.kind === "calc") return calcSection(it.ip + (it.mask && String(it.ip).indexOf("/") < 0 ? "" : ""), it.mask || "/24", it.label);
      if (it.kind === "flsm") return flsmSection(it.network, it.count, it.label);
      if (it.kind === "vlsm") return vlsmSection(it.network, it.subnets || [], it.label);
    } catch (e) { return [{ title: it.label, text: "No se pudo resolver: " + e.message }]; }
    return [];
  }

  $("pdf").addEventListener("click", function () {
    var tab = activeTab(), sections;
    try {
      if (tab === "calc") sections = calcSection($("c-ip").value.trim(), $("c-mask").value);
      else if (tab === "flsm") sections = flsmSection($("f-net").value.trim(), $("f-count").value);
      else sections = vlsmSection($("v-net").value.trim(), vlsmReqs());
    } catch (e) { alert(e.message); return; }
    ORTDoc.download({ tool: "IP, subredes y VLSM", title: tab === "calc" ? "Cálculo de dirección IP" : tab === "flsm" ? "Subredes iguales" : "Plan VLSM", filename: "redes", sections: sections });
  });
  $("csv").addEventListener("click", function () {
    var tab = activeTab(), rows;
    try {
      if (tab === "vlsm") {
        var v = E.vlsm($("v-net").value.trim(), $("v-net").value.indexOf("/") >= 0 ? null : "/24", vlsmReqs());
        rows = [["Subred", "Hosts pedidos", "Bloque", "Prefijo", "Mascara", "Red", "Primer host", "Ultimo host", "Broadcast"]].concat(v.rows.map(function (x) { return [x.name, x.hostsAsked, x.block, "/" + x.prefix, x.mask, x.network, x.first, x.last, x.broadcast]; }));
      } else if (tab === "flsm") {
        var f = E.flsm($("f-net").value.trim(), $("f-net").value.indexOf("/") >= 0 ? null : "/24", $("f-count").value);
        rows = [["#", "Red", "Primer host", "Ultimo host", "Broadcast"]].concat(f.rows.map(function (x) { return [x.index, x.network + "/" + x.prefix, x.first, x.last, x.broadcast]; }));
      } else {
        var c = calcSection($("c-ip").value.trim(), $("c-mask").value)[0].table;
        rows = [c.head].concat(c.rows);
      }
    } catch (e) { alert(e.message); return; }
    var csv = "﻿" + rows.map(function (r) { return r.map(function (x) { return "\"" + String(x).replace(/"/g, "\"\"") + "\""; }).join(";"); }).join("\r\n");
    ORTDoc.file("redes-" + tab + ".csv", csv, "text/csv");
  });

  window.ORTConsigna = window.ORTConsigna || {};
  window.ORTConsigna.onItem = function (it) {
    if (it.kind === "calc") {
      document.querySelector('.tab[data-tab="calc"]').click();
      $("c-ip").value = it.ip; $("c-mask").value = it.mask || "/24"; calc();
    } else if (it.kind === "flsm") {
      document.querySelector('.tab[data-tab="flsm"]').click();
      $("f-net").value = it.network; $("f-count").value = it.count; doFlsm();
    } else if (it.kind === "vlsm") {
      document.querySelector('.tab[data-tab="vlsm"]').click();
      $("v-net").value = it.network; $("v-rows").innerHTML = "";
      (it.subnets || []).forEach(function (s) { addRow(s.name, s.hosts); });
      doVlsm();
    }
    document.querySelector(".tabs").scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.ORT) window.ORT.done();
  };
  window.ORTConsigna.all = function (items, consignaText) {
    var sections = [{ title: "Consigna", pre: consignaText.slice(0, 4000) }];
    items.forEach(function (it) { sections = sections.concat(itemSections(it)); });
    ORTDoc.download({ tool: "IP, subredes y VLSM", title: "Ejercicios de redes", subtitle: items.length + " ejercicios resueltos.", filename: "redes", sections: sections });
  };

  // Arranque
  calc();
  doFlsm();
  $("v-example").click();
})();
