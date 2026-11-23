/*!
 * Adaptador de código — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cAdaptador de código%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman", "font-weight:700", "font-weight:400");

  var T = window.AITool, el = T.el;
  var $ = function (id) { return document.getElementById(id); };
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  // Temas de cada materia (según el campus de ORT)
  var PRESETS = {
    arte: { ext: "html", topics: [
      "Etiquetas HTML básicas y semánticas (header, nav, section, footer)", "Clases e ids", "Modelo de caja (margin, padding, border)",
      "Display (block, inline, inline-block, none)", "Flexbox", "Grid", "Position (relative, absolute, fixed, sticky)",
      "Media queries (responsive)", "Bootstrap", "Animaciones CSS (transition, @keyframes)", "Pseudoclases (:hover, :nth-child)",
      "Variables CSS (--color)", "Unidades rem, em, %, vw, vh", "JavaScript"] },
    sql: { ext: "sql", topics: [
      "DDL: CREATE TABLE, PK, FK", "DML: INSERT, UPDATE, DELETE", "SELECT, WHERE, ORDER BY", "Alias (AS)",
      "TOP, DISTINCT, BETWEEN, IN, LIKE, IS NULL", "JOIN", "Funciones de agregación y GROUP BY", "HAVING",
      "Subconsultas", "Variables y SCOPE_IDENTITY()", "Stored procedures", "Transacciones"] },
    csharp: { ext: "cs", topics: [
      "Variables, tipos y operadores", "if / else", "switch", "while y do-while", "for", "foreach", "Métodos con parámetros y return",
      "Clases y objetos", "Constructores", "Listas (List<T>)", "Arrays", "Herencia", "Interfaces", "Polimorfismo (virtual/override)",
      "Enums", "Generics", "Excepciones (try/catch)", "LINQ", "Operador ternario ( ? : )", "Interpolación de strings ($\"…\")"] },
    java: { ext: "java", topics: [
      "Variables, tipos y operadores", "if / else", "switch", "while y do-while", "for", "for-each", "Métodos con parámetros y return",
      "Clases y objetos", "Constructores", "ArrayList", "Arrays", "Herencia (extends)", "Interfaces", "Polimorfismo (@Override)",
      "Enums", "Generics", "Excepciones (try/catch)", "Streams y lambdas", "Operador ternario ( ? : )", "String.format"] }
  };
  var DEFAULT_OFF = {
    arte: ["Bootstrap", "Animaciones CSS (transition, @keyframes)", "Variables CSS (--color)", "JavaScript"],
    sql: ["Subconsultas", "Variables y SCOPE_IDENTITY()", "Stored procedures", "Transacciones"],
    csharp: ["Generics", "LINQ", "Operador ternario ( ? : )", "Interfaces", "Polimorfismo (virtual/override)"],
    java: ["Generics", "Streams y lambdas", "Operador ternario ( ? : )"]
  };

  var topics = null, current = null;
  function preset() { var r = document.querySelector('input[name="preset"]:checked'); return r ? r.value : "arte"; }
  function loadTopics() {
    var p = preset();
    var list = PRESETS[p].topics.map(function (t) { return { key: t, label: t }; });
    topics = T.topics($("topics"), list, "adapt:topics:" + p, PRESETS[p].topics.filter(function (t) { return DEFAULT_OFF[p].indexOf(t) < 0; }));
    try { localStorage.setItem("adapt:preset", p); } catch (e) { /* nada */ }
  }
  try { var sp = localStorage.getItem("adapt:preset"); if (sp) { var r = document.querySelector('input[name="preset"][value="' + sp + '"]'); if (r) r.checked = true; } } catch (e) { /* nada */ }
  document.querySelectorAll('input[name="preset"]').forEach(function (r) { r.addEventListener("change", loadTopics); });
  loadTopics();

  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  function show(n) { Object.keys(views).forEach(function (k) { views[k].hidden = k !== n; }); if (n) views[n].scrollIntoView({ behavior: "smooth", block: "start" }); }
  function count() { $("count").textContent = $("code").value.length.toLocaleString("es-AR"); }
  $("code").addEventListener("input", function () { count(); $("form-error").hidden = true; });
  T.attachUpload($("code"), $("code-file"), $("code-status"), { max: 14000 });

  // Autodetección: si la consigna nombra un tema (ej "usando grid"), se prende solo
  function applyKeys(keys) {
    if (!topics) return;
    var changed = topics.turnOn(keys);
    if (changed.length) T.toast("Activé por la consigna: " + changed.join(", "));
  }
  function detectFromConsigna() {
    var text = $("consigna").value.trim();
    if (text.length < 15 || !topics) return;
    var opts = PRESETS[preset()].topics.map(function (t) { return { key: t, label: t }; });
    T.detect(text, opts).then(applyKeys);
  }
  $("consigna").addEventListener("paste", function () { setTimeout(detectFromConsigna, 60); });
  T.attachUpload($("consigna"), $("consigna-file"), $("consigna-status"), { max: 5000, onText: detectFromConsigna });
  $("all-on").addEventListener("click", function () { topics.setAll(true); });
  $("all-off").addEventListener("click", function () { topics.setAll(false); });
  // Tab dentro del código inserta espacios
  $("code").addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    var s = this.selectionStart;
    this.value = this.value.slice(0, s) + "    " + this.value.slice(this.selectionEnd);
    this.selectionStart = this.selectionEnd = s + 4;
  });

  async function generate() {
    var code = $("code").value.trim();
    if (code.length < 10) { $("form-error").textContent = "Pegá el código que querés adaptar."; $("form-error").hidden = false; return; }
    var p = preset(), seen = topics.get();
    var notSeen = PRESETS[p].topics.filter(function (t) { return seen.indexOf(t) < 0; });
    $("submit").disabled = true;
    show("loading");
    try {
      var data = await T.post("/api/adapt", { preset: p, code: code, consigna: $("consigna").value.trim(), seen: seen, notSeen: notSeen });
      current = { r: data.result, preset: p, original: code, seen: seen, notSeen: notSeen };
      render();
      show("result");
      if (window.ORT) window.ORT.done();
    } catch (e) {
      $("error-text").textContent = e.message === "Failed to fetch" ? "No hay conexión." : e.message;
      show("error");
    } finally { $("submit").disabled = false; }
  }

  function render() {
    var r = current.r;
    $("r-code").textContent = r.code;
    $("r-meta").textContent = r.changes.length ? r.changes.length + (r.changes.length === 1 ? " cambio" : " cambios") : "Ya usaba solo lo visto: no hizo falta cambiar nada.";
    $("r-notes").textContent = r.notes;
    $("r-notes").hidden = !r.notes;
    var box = $("r-changes");
    box.innerHTML = "";
    if (!r.changes.length) box.appendChild(el("p", "muted", "Sin cambios."));
    r.changes.forEach(function (c, i) {
      var d = el("div", "change");
      d.appendChild(el("span", "change-n", String(i + 1)));
      var body = el("div");
      var line = el("p", "change-line");
      line.appendChild(el("code", "change-before", c.before));
      line.appendChild(document.createTextNode(" → "));
      line.appendChild(el("code", "change-after", c.after));
      body.appendChild(line);
      body.appendChild(el("p", "muted", c.why));
      d.appendChild(body);
      box.appendChild(d);
    });
    $("r-used").textContent = r.used.length ? "Usa: " + r.used.join(" · ") : "";
  }

  $("dl-code").addEventListener("click", function () { if (current) ORTDoc.file("codigo-adaptado." + PRESETS[current.preset].ext, current.r.code + "\n"); });
  $("copy").addEventListener("click", function () { if (current) T.copy(current.r.code, T.toast); });
  $("dl-pdf").addEventListener("click", function () {
    if (!current) return;
    var r = current.r;
    ORTDoc.pdf({
      tool: "Adaptador de código", title: "Código adaptado a lo visto en clase", subtitle: document.querySelector('input[name="preset"]:checked').parentNode.textContent.trim(), filename: "codigo-adaptado",
      sections: [
        { title: "Temas vistos", list: current.seen },
        current.notSeen.length ? { title: "Temas que no se usaron (no vistos)", list: current.notSeen } : null,
        { title: "Código final", pre: r.code },
        r.changes.length ? { title: "Cambios y por qué", table: { head: ["Antes", "Ahora", "Por qué"], rows: r.changes.map(function (c) { return [c.before, c.after, c.why]; }) } } : null,
        r.notes ? { title: "Notas", text: r.notes } : null
      ]
    });
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); generate(); });
  $("retry").addEventListener("click", generate);
  $("regenerate").addEventListener("click", generate);
  count();
})();
