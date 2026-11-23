/*!
 * Simplificador booleano — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cSimplificador%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  // Ejercicios de la guía "Ejercicios de Simplificación" de SSI
  var GUIA = [
    "AB(A+CB’)", "(C+D)’C + (C+BA)’", "DA [ B + C + AB(CD)’ + (B+A)’ ]", "[ (B+CA)’ + C ]’ + D’ + C",
    "D’C + [ (B+A)(C+D) ]’ + A’B’", "[ (D+B)’ ]’ + AC + (BD+C)’", "[ (CB+D’)B ]’ + AD", "(AD)’ + { D [ (CB)’ + BC ]’ }’",
    "AA + [ (AC+BD) B ]’", "[ (AB’)’ + D’C’ ]’ + ABC + D", "C [ BD + (DB)’ ] + CA", "(A’C)’ + B (BC+BD)",
    "[ (B’C+AD’) A + B’ ]’ + BA", "B + [ D (AB+CC) ]’", "CA’ + [ B’ + (DCA’)’ ]’", "[ A(BC+DA) + CA ]’",
    "DB + B’ (D+A’C’)", "[ (BA)’ + (BD+CB)C ]’", "(DA’A+CA)BA + D’DA", "AB’ + C [ DB + (CB’)’ ]"
  ];
  var KEY = "simplificador:last";

  var $ = function (id) { return document.getElementById(id); };
  var input = $("expr"), last = null, toastTimer = null;
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  // Teclado en pantalla
  document.querySelectorAll(".keypad button").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-k");
      var s = input.selectionStart, e = input.selectionEnd, v = input.value;
      if (k === "⌫") {
        if (s === e && s > 0) s--;
        input.value = v.slice(0, s) + v.slice(e);
        input.setSelectionRange(s, s);
      } else {
        input.value = v.slice(0, s) + k + v.slice(e);
        input.setSelectionRange(s + k.length, s + k.length);
      }
      input.focus();
      onInput();
    });
  });

  // La tecla ' se muestra como ’ (como en la guía)
  input.addEventListener("input", function () {
    var pos = input.selectionStart;
    var fixed = input.value.replace(/'/g, "’");
    if (fixed !== input.value) { input.value = fixed; input.setSelectionRange(pos, pos); }
    onInput();
  });

  function onInput() {
    $("form-error").hidden = true;
    var v = input.value.trim(), p = $("preview");
    if (!v) { p.hidden = true; return; }
    try {
      var t = BoolEngine.parse(v);
      p.textContent = "Se lee como: " + BoolEngine.toString(t) + "  ·  variables: " + BoolEngine.varList(t).join(", ");
      p.classList.remove("is-error");
    } catch (err) {
      p.textContent = err.message;
      p.classList.add("is-error");
    }
    p.hidden = false;
  }

  GUIA.forEach(function (ex, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ex-chip";
    b.innerHTML = "<span>" + (i + 1) + ".</span> ";
    b.appendChild(document.createTextNode(ex));
    b.addEventListener("click", function () { input.value = ex; onInput(); run(); });
    $("examples").appendChild(b);
  });

  /* --- Pestañas --- */
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) {
        var on = o === t;
        o.classList.toggle("is-active", on);
        o.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
    });
  });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderTable(r) {
    var tt = BoolEngine.truthTable(r.tree);
    var table = el("table", "truth");
    var head = el("tr");
    tt.vars.forEach(function (v) { head.appendChild(el("th", null, v)); });
    head.appendChild(el("th", "out", "F"));
    head.appendChild(el("th", "out", "Fs"));
    table.appendChild(el("thead")).appendChild(head);
    var body = el("tbody");
    var fsTable = BoolEngine.truthTable(r.resultTree, tt.vars);
    tt.rows.forEach(function (row, i) {
      var tr = el("tr", row.out ? "is-one" : "");
      row.values.forEach(function (v) { tr.appendChild(el("td", null, String(v))); });
      tr.appendChild(el("td", "out", String(row.out)));
      tr.appendChild(el("td", "out", String(fsTable.rows[i].out)));
      body.appendChild(tr);
    });
    table.appendChild(body);
    $("table").innerHTML = "";
    $("table").appendChild(table);
    $("table").appendChild(el("p", "muted", "F es la expresión original y Fs la simplificada: dan lo mismo en todas las filas."));
  }

  function renderKmap(r) {
    var k = BoolEngine.karnaugh(r.tree), box = $("kmap");
    box.innerHTML = "";
    if (!k) {
      box.appendChild(el("p", "muted", "El mapa de Karnaugh se muestra para expresiones de 2 a 4 variables."));
      return;
    }
    var table = el("table", "kmap");
    var head = el("tr");
    head.appendChild(el("th", "corner", k.rowVars.join("") + " \\ " + k.colVars.join("")));
    k.colLabels.forEach(function (c) { head.appendChild(el("th", null, c)); });
    table.appendChild(head);
    k.cells.forEach(function (row, i) {
      var tr = el("tr");
      tr.appendChild(el("th", null, k.rowLabels[i]));
      row.forEach(function (v) { tr.appendChild(el("td", v ? "is-one" : "", String(v))); });
      table.appendChild(tr);
    });
    box.appendChild(table);
    box.appendChild(el("p", "muted", "Filas y columnas en código Gray (cambia un solo bit entre vecinas). Agrupá los 1 en bloques de 1, 2, 4 u 8. Forma mínima en suma de productos: " + r.minimal));
  }

  function plainSteps(r) {
    var lines = [r.input];
    r.steps.forEach(function (s) { lines.push(s.law + ") " + s.expr); });
    lines.push("Fs = " + r.result);
    return lines.join("\n");
  }

  function run() {
    var v = input.value.trim();
    if (!v) { $("form-error").textContent = "Primero escribí una expresión."; $("form-error").hidden = false; input.focus(); return; }
    var r;
    try { r = BoolEngine.simplify(v); } catch (err) {
      $("form-error").textContent = err.message;
      $("form-error").hidden = false;
      return;
    }
    last = r;
    try { localStorage.setItem(KEY, v); } catch (e) { /* nada */ }

    $("fs").textContent = r.result;
    $("badge").textContent = (r.verified ? "✓ Verificado con la tabla de verdad" : "⚠ No se pudo verificar") + " · " + r.steps.length + (r.steps.length === 1 ? " paso" : " pasos");
    var ol = $("steps");
    ol.innerHTML = "";
    var first = el("li", "law-start");
    first.appendChild(el("span", "law-expr", r.input));
    ol.appendChild(first);
    r.steps.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("span", "law-name", s.law + ")"));
      li.appendChild(el("span", "law-expr", s.expr));
      ol.appendChild(li);
    });
    var end = el("li", "law-end");
    end.appendChild(el("span", "law-expr", "Fs = " + r.result));
    ol.appendChild(end);

    var note = $("minimal-note");
    note.hidden = r.isMinimal;
    if (!r.isMinimal) note.textContent = "Con las leyes llegamos a esto. Con el mapa de Karnaugh se puede escribir todavía más corta: " + r.minimal;

    renderTable(r);
    renderKmap(r);
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
  $("copy").addEventListener("click", function () {
    if (!last) return;
    var text = plainSteps(last);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(function () { toast("Pasos copiados. Pegalos en tu carpeta o documento."); })
      .catch(function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        toast("Pasos copiados.");
      });
  });

  try {
    var saved = localStorage.getItem(KEY);
    if (saved) { input.value = saved; onInput(); }
  } catch (e) { /* nada */ }
})();
