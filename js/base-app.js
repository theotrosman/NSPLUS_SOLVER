/*!
 * Cambio de base — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cCambio de base%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var E = window.BaseEngine;
  var $ = function (id) { return document.getElementById(id); };
  var TARGETS = [2, 8, 10, 16];
  var selected = 2;
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fromBase() {
    var v = $("from").value;
    if (v !== "other") return +v;
    var b = Math.round(+$("from-other").value);
    return b >= 2 && b <= 36 ? b : null;
  }
  function extraTarget() {
    var b = Math.round(+$("to-other").value);
    return b >= 2 && b <= 36 ? b : null;
  }
  function sub(n) { return String(n).split("").map(function (c) { return "₀₁₂₃₄₅₆₇₈₉"[+c]; }).join(""); }

  /* ---------- Conversión ---------- */
  function update() {
    $("other-from-row").hidden = $("from").value !== "other";
    var text = $("num").value.trim(), err = $("num-error"), from = fromBase();
    var cards = $("cards");
    cards.innerHTML = "";
    $("method").hidden = true;
    err.hidden = true;
    if (!text) return;
    if (!from) { err.textContent = "La base tiene que ser un número entre 2 y 36."; err.hidden = false; return; }
    var targets = TARGETS.slice();
    var extra = extraTarget();
    if (extra && targets.indexOf(extra) < 0) targets.push(extra);
    if (targets.indexOf(selected) < 0 || selected === from) selected = targets.filter(function (t) { return t !== from; })[0];
    var results = {};
    try {
      targets.forEach(function (t) { results[t] = E.convert(text, from, t); });
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
      return;
    }
    targets.forEach(function (t) {
      var r = results[t];
      var b = el("button", "base-card" + (t === selected ? " is-active" : ""));
      b.type = "button";
      b.appendChild(el("small", null, E.baseName(t) + " (" + t + ")" + (t === from ? " · original" : "")));
      b.appendChild(el("strong", null, r.value + (r.approx ? "…" : "")));
      if (t !== from) b.addEventListener("click", function () { selected = t; update(); });
      cards.appendChild(b);
    });
    if (selected) renderMethod(results[selected]);
  }

  function table(headers, rows, hlCol) {
    var t = el("table", "steps-table");
    var tr = el("tr");
    headers.forEach(function (h) { tr.appendChild(el("th", null, h)); });
    t.appendChild(tr);
    rows.forEach(function (r) {
      var row = el("tr");
      r.forEach(function (c, i) { row.appendChild(el("td", i === hlCol ? "hl" : "", String(c))); });
      t.appendChild(row);
    });
    var wrap = el("div", "table-wrap");
    wrap.appendChild(t);
    return wrap;
  }

  function polyBlock(box, r) {
    var p = r.method.poly;
    box.appendChild(el("h3", null, "De " + E.baseName(r.from) + " a decimal: polinomio"));
    box.appendChild(el("p", null, "Cada dígito se multiplica por la base elevada a su posición (desde la derecha, empezando en 0) y se suma todo."));
    box.appendChild(el("div", "poly", r.input + sub(r.from) + " = " + p.terms.join(" + ") + "\n= " + p.values.join(" + ") + "\n= " + p.result));
  }

  function divBlock(box, r, title) {
    var d = r.method.div;
    box.appendChild(el("h3", null, title || "De decimal a " + E.baseName(r.to) + ": divisiones sucesivas"));
    box.appendChild(el("p", null, "Se divide por " + r.to + " hasta que el cociente da 0. El resultado son los restos leídos de abajo hacia arriba."));
    box.appendChild(table(["Número", "÷ " + r.to + " =", "Resto"], d.rows.map(function (x) { return [x.dividend, x.quotient, x.digit + (r.to > 10 && x.rest > 9 ? " (" + x.rest + ")" : "")]; }), 2));
    var m = r.method.mult;
    if (m && m.rows.length) {
      box.appendChild(el("p", null, "Parte decimal: se multiplica por " + r.to + " y se va guardando la parte entera, de arriba hacia abajo."));
      box.appendChild(table(["Fracción", "× " + r.to + " =", "Dígito"], m.rows.map(function (x) { return [x.value, x.times, x.digit]; }), 2));
      if (m.cut) box.appendChild(el("p", "muted", "La parte decimal no termina nunca en esta base: se cortó en " + m.rows.length + " cifras."));
    }
  }

  function renderMethod(r) {
    var box = $("method");
    box.innerHTML = "";
    var m = r.method;
    if (m.kind === "same") return;
    if (m.kind === "group" || m.kind === "expand") {
      var size = m.data.size;
      box.appendChild(el("h3", null, m.kind === "group"
        ? "De binario a " + E.baseName(r.to) + ": grupos de " + size + " bits"
        : "De " + E.baseName(r.from) + " a binario: cada dígito en " + size + " bits"));
      box.appendChild(el("p", null, m.kind === "group"
        ? "Se separan los bits de a " + size + " desde la coma hacia afuera (completando con ceros) y cada grupo se cambia por su dígito."
        : "Cada dígito se reemplaza por sus " + size + " bits. Después se sacan los ceros de la izquierda."));
      var groups = el("div", "groups");
      m.data.intGroups.concat(m.data.fracGroups.length ? [{ sep: true }] : [], m.data.fracGroups).forEach(function (g) {
        var d = el("div");
        if (g.sep) { d.textContent = ","; d.style.border = "0"; groups.appendChild(d); return; }
        d.appendChild(el("span", null, m.kind === "group" ? g.bits : g.digit));
        d.appendChild(el("b", null, m.kind === "group" ? g.digit : g.bits));
        groups.appendChild(d);
      });
      box.appendChild(groups);
    } else if (m.kind === "poly") {
      polyBlock(box, r);
    } else if (m.kind === "div") {
      divBlock(box, r);
    } else {
      box.appendChild(el("p", null, "Entre dos bases que no son 10, se pasa primero a decimal y después a la base de destino."));
      polyBlock(box, r);
      divBlock(box, r, "Paso 2: de decimal a " + E.baseName(r.to) + " (divisiones sucesivas)");
    }
    box.appendChild(el("p", "answer", r.input + sub(r.from) + " = " + r.value + (r.approx ? "…" : "") + sub(r.to)));
    box.hidden = false;
    clearTimeout(doneTimer);
    doneTimer = setTimeout(function () { if (window.ORT) window.ORT.done(); }, 6000);
  }
  var doneTimer = null;

  ["input", "change"].forEach(function (ev) {
    $("num").addEventListener(ev, update);
    $("from").addEventListener(ev, update);
    $("from-other").addEventListener(ev, update);
    $("to-other").addEventListener(ev, update);
  });

  /* ---------- Operaciones ---------- */
  function updateOps() {
    var a = $("op-a").value.trim(), b = $("op-b").value.trim(), op = $("op").value;
    var box = $("op-result"), err = $("op-error");
    box.hidden = true; err.hidden = true;
    if (!a || !b) return;
    var r;
    try { r = op === "+" ? E.addBin(a, b) : op === "-" ? E.subBin(a, b) : E.mulBin(a, b); } catch (e) {
      err.textContent = e.message; err.hidden = false; return;
    }
    box.innerHTML = "";
    var block = el("div", "column-op");
    if (op === "*") {
      var w = r.result.length + 2;
      var lines = [r.a.padStart(w), "× " + r.b.padStart(w - 2)];
      block.appendChild(document.createTextNode(lines.join("\n") + "\n"));
      block.appendChild(el("span", "rule", ""));
      block.appendChild(document.createTextNode(r.partials.map(function (p) { return p.padStart(w); }).join("\n") + "\n"));
      block.appendChild(el("span", "rule", ""));
      block.appendChild(document.createTextNode(r.result.padStart(w)));
    } else {
      var width = Math.max(r.width, r.result.replace("−", "").length) + 2;
      var carry = el("span", "carry", r.carries.padStart(width) + "\n");
      block.appendChild(carry);
      block.appendChild(document.createTextNode(r.a.padStart(width) + "\n" + (op === "+" ? "+ " : "− ") + r.b.padStart(width - 2) + "\n"));
      block.appendChild(el("span", "rule", ""));
      block.appendChild(document.createTextNode(r.result.replace("−", "").padStart(width)));
    }
    box.appendChild(block);
    if (op !== "*") box.appendChild(el("p", "muted", "Los números en rojo de arriba son " + (op === "+" ? "los que \"me llevo\" (acarreo)." : "los préstamos (\"pido prestado\").")));
    if (r.swapped) box.appendChild(el("p", "muted", "Como el segundo es más grande, se resta al revés y el resultado queda negativo."));
    box.appendChild(el("p", "answer", "Resultado: " + r.result + "₂  (en decimal: " + r.check + ")"));
    box.appendChild(el("p", "muted", op === "+"
      ? "Reglas: 0+0=0 · 0+1=1 · 1+1=0 y me llevo 1 · 1+1+1=1 y me llevo 1."
      : op === "-" ? "Reglas: 0−0=0 · 1−0=1 · 1−1=0 · 0−1=1 pidiendo prestado 1 a la izquierda."
        : "Se multiplica por cada bit de abajo (por 1 se copia, por 0 da ceros), corriendo un lugar a la izquierda, y se suman los parciales."));
    box.hidden = false;
  }
  ["input", "change"].forEach(function (ev) {
    $("op-a").addEventListener(ev, updateOps);
    $("op-b").addEventListener(ev, updateOps);
    $("op").addEventListener(ev, updateOps);
  });

  /* ---------- Complementos ---------- */
  function updateComp() {
    var v = $("c-num").value.trim(), bits = Math.round(+$("c-bits").value) || 8;
    var box = $("c-result"), err = $("c-error");
    box.hidden = true; err.hidden = true;
    if (!v) return;
    var r;
    try { r = E.complement(v, Math.min(64, Math.max(1, bits))); } catch (e) { err.textContent = e.message; err.hidden = false; return; }
    box.innerHTML = "";
    box.appendChild(table(["", "Bits"], [
      ["Número con " + r.bits + " bits", r.original],
      ["Complemento a 1 (invertir cada bit)", r.c1],
      ["Complemento a 2 (C1 + 1)", r.c2]
    ], 1));
    box.appendChild(el("p", "muted", "El complemento a 2 se usa para representar negativos: " + r.c2 + " representa a −" + parseInt(r.original, 2) + " en " + r.bits + " bits."));
    box.hidden = false;
  }
  ["input", "change"].forEach(function (ev) {
    $("c-num").addEventListener(ev, updateComp);
    $("c-bits").addEventListener(ev, updateComp);
  });

  /* ---------- Entregable (texto del método, igual al de la pantalla) ---------- */
  function sub10(n) { return String(n).split("").map(function (c) { return "₀₁₂₃₄₅₆₇₈₉"[+c]; }).join(""); }
  function methodText(r) {
    var m = r.method, L = [];
    function poly() { var p = m.poly; L.push("Polinomio (a decimal):", r.input + sub10(r.from) + " = " + p.terms.join(" + "), "= " + p.values.join(" + "), "= " + p.result, ""); }
    function div() {
      L.push("Divisiones sucesivas por " + r.to + " (se leen los restos de abajo hacia arriba):");
      m.div.rows.forEach(function (x) { L.push("  " + x.dividend + " ÷ " + r.to + " = " + x.quotient + "   resto " + x.digit); });
      if (m.mult && m.mult.rows.length) {
        L.push("", "Parte con coma: multiplicaciones sucesivas por " + r.to + " (se lee de arriba hacia abajo):");
        m.mult.rows.forEach(function (x) { L.push("  " + x.value + " × " + r.to + " = " + x.times + "   → " + x.digit); });
      }
      L.push("");
    }
    if (m.kind === "group" || m.kind === "expand") {
      L.push(m.kind === "group" ? "Grupos de " + m.data.size + " bits desde la coma:" : "Cada dígito en " + m.data.size + " bits:");
      m.data.intGroups.concat(m.data.fracGroups).forEach(function (g) { L.push("  " + (m.kind === "group" ? g.bits + " → " + g.digit : g.digit + " → " + g.bits)); });
      L.push("");
    } else if (m.kind === "poly") poly();
    else if (m.kind === "div") div();
    else if (m.kind === "via10") { poly(); div(); }
    L.push("Resultado: " + r.input + sub10(r.from) + " = " + r.value + (r.approx ? "…" : "") + sub10(r.to));
    return L.join("\n");
  }
  function opText(r) {
    if (r.op === "×") return r.a + " × " + r.b + "\nParciales:\n" + r.partials.map(function (p) { return "  " + p; }).join("\n") + "\nResultado: " + r.result + "₂ (decimal " + r.check + ")";
    return (r.op === "+" ? "Acarreos: " : "Préstamos: ") + r.carries.trim() + "\n  " + r.a + "\n" + r.op + " " + r.b + "\n= " + r.result + "₂  (decimal " + r.check + ")";
  }
  function compText(r) { return "Número con " + r.bits + " bits: " + r.original + "\nComplemento a 1 (invertir): " + r.c1 + "\nComplemento a 2 (C1 + 1): " + r.c2; }

  function itemSection(it) {
    try {
      if (it.kind === "convert") return { title: it.label + " · " + it.number + " de base " + it.from + " a base " + it.to, pre: methodText(E.convert(String(it.number), +it.from, +it.to)) };
      if (it.kind === "op") { var op = it.op === "-" || it.op === "−" ? E.subBin(it.a, it.b) : it.op === "*" || it.op === "×" ? E.mulBin(it.a, it.b) : E.addBin(it.a, it.b); return { title: it.label + " · Operación en binario", pre: opText(op) }; }
      if (it.kind === "complement") return { title: it.label + " · Complementos", pre: compText(E.complement(String(it.number), +it.bits || 8)) };
    } catch (e) { return { title: it.label, text: "No se pudo resolver: " + e.message }; }
    return null;
  }

  $("pdf").addEventListener("click", function () {
    var sections = [];
    var text = $("num").value.trim(), from = fromBase();
    if (text && from) {
      var targets = TARGETS.slice(); var extra = extraTarget(); if (extra && targets.indexOf(extra) < 0) targets.push(extra);
      targets.filter(function (t) { return t !== from; }).forEach(function (t) {
        try { sections.push({ title: text + " en " + E.baseName(t), pre: methodText(E.convert(text, from, t)) }); } catch (e) { /* inválido */ }
      });
    }
    if ($("op-a").value.trim() && $("op-b").value.trim()) sections.push(itemSection({ kind: "op", label: "Operación", a: $("op-a").value.trim(), b: $("op-b").value.trim(), op: $("op").value }));
    if ($("c-num").value.trim()) sections.push(itemSection({ kind: "complement", label: "Complemento", number: $("c-num").value.trim(), bits: $("c-bits").value }));
    if (!sections.length) { alert("Primero escribí un número para convertir."); return; }
    ORTDoc.pdf({ tool: "Cambio de base", title: "Cambio de base y operaciones", subtitle: "Con el método de cada paso.", filename: "cambio-de-base", sections: sections });
  });

  window.ORTConsigna = window.ORTConsigna || {};
  window.ORTConsigna.onItem = function (it) {
    if (it.kind === "convert") {
      $("num").value = String(it.number);
      var f = String(it.from);
      if (["2", "8", "10", "16"].indexOf(f) >= 0) $("from").value = f; else { $("from").value = "other"; $("from-other").value = f; }
      var t = +it.to;
      if (TARGETS.indexOf(t) < 0) $("to-other").value = t;
      selected = t;
      update();
      $("method").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (it.kind === "op") {
      $("op-a").value = it.a; $("op-b").value = it.b;
      $("op").value = it.op === "-" || it.op === "−" ? "-" : it.op === "*" || it.op === "×" ? "*" : "+";
      updateOps();
      $("op-result").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (it.kind === "complement") {
      $("c-num").value = it.number; $("c-bits").value = it.bits || 8;
      updateComp();
      $("c-result").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (window.ORT) window.ORT.done();
  };
  window.ORTConsigna.all = function (items, consignaText) {
    var sections = [{ title: "Consigna", pre: consignaText.slice(0, 4000) }].concat(items.map(itemSection).filter(Boolean));
    ORTDoc.pdf({ tool: "Cambio de base", title: "Ejercicios de cambio de base", subtitle: items.length + " ejercicios resueltos con su método.", filename: "cambio-de-base", sections: sections });
  };
})();
