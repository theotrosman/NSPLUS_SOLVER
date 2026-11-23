/*!
 * Creador de consultas SQL — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cConsultas SQL%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman", "font-weight:700", "font-weight:400");

  var T = window.AITool, el = T.el;
  var $ = function (id) { return document.getElementById(id); };
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));
  var TOPICS = [
    { key: "ddl", label: "DDL: CREATE TABLE, PK, FK" }, { key: "dml", label: "DML: INSERT, UPDATE, DELETE" },
    { key: "select", label: "SELECT, WHERE, ORDER BY" }, { key: "alias", label: "Alias (AS)" },
    { key: "utiles", label: "TOP, DISTINCT, BETWEEN, IN, LIKE, IS NULL" }, { key: "joins", label: "JOIN" },
    { key: "agregacion", label: "COUNT, SUM, AVG, MAX, MIN + GROUP BY" }, { key: "having", label: "HAVING" },
    { key: "subconsultas", label: "Subconsultas" }, { key: "variables", label: "Variables y SCOPE_IDENTITY()" },
    { key: "sp", label: "Stored procedures" }, { key: "transacciones", label: "Transacciones" }
  ];
  var topics = T.topics($("topics"), TOPICS, "sql:topics");
  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  var current = null;

  function show(n) { Object.keys(views).forEach(function (k) { views[k].hidden = k !== n; }); if (n) views[n].scrollIntoView({ behavior: "smooth", block: "start" }); }
  function count() { $("count").textContent = $("consigna").value.length.toLocaleString("es-AR"); }
  $("consigna").addEventListener("input", function () { count(); $("form-error").hidden = true; });

  // Autodetección: la IA lee la consigna y prende los temas que pide expresamente
  function applyKeys(keys) {
    var changed = topics.turnOn(keys);
    if (changed.length) T.toast("Activé por la consigna: " + changed.join(", "));
  }
  var auto = T.autoDetect($("consigna"), TOPICS, applyKeys);
  T.attachUpload($("consigna"), $("file"), $("file-status"), { onText: function () { auto.run(); } });
  T.attachUpload($("schema"), $("schema-file"), $("schema-status"), { max: 6000 });
  $("all-on").addEventListener("click", function () { topics.setAll(true); });
  $("all-off").addEventListener("click", function () { topics.setAll(false); });

  async function generate() {
    var c = $("consigna").value.trim();
    if (c.length < 10) { $("form-error").textContent = "Primero pegá la consigna o subí el PDF."; $("form-error").hidden = false; return; }
    if (!topics.get().length) { $("form-error").textContent = "Prendé al menos un tema."; $("form-error").hidden = false; return; }
    $("submit").disabled = true;
    show("loading");
    try {
      var data = await T.post("/api/sql", { consigna: c, schema: $("schema").value.trim(), topics: topics.get() });
      current = { r: data.result, consigna: c, topics: topics.get() };
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
    $("r-name").textContent = r.name;
    $("r-meta").textContent = r.items.length + (r.items.length === 1 ? " consulta" : " consultas") + " · SQL Server";
    $("r-expl").textContent = r.explanation;
    $("r-expl").hidden = !r.explanation;
    var sch = $("r-schema");
    sch.innerHTML = "";
    if (r.schema) { sch.appendChild(el("p", "explanation-title", "Tablas que se usaron")); sch.appendChild(el("pre", "code-block", r.schema)); }
    var box = $("r-items");
    box.innerHTML = "";
    r.items.forEach(function (it) {
      var card = el("article", "sql-item");
      var head = el("div", "sql-head");
      head.appendChild(el("span", "sql-label", it.label));
      head.appendChild(el("p", null, it.statement));
      var cp = el("button", "btn btn-ghost btn-sm", "Copiar");
      cp.type = "button";
      cp.addEventListener("click", function () { T.copy(it.sql, T.toast); });
      head.appendChild(cp);
      card.appendChild(head);
      card.appendChild(el("pre", "code-block", it.sql));
      if (it.explanation) card.appendChild(el("p", "muted", it.explanation));
      box.appendChild(card);
    });
  }

  function script() {
    var r = current.r, out = ["-- " + r.name, "-- Hecho con ORT Info es fácil · Creador de consultas SQL", ""];
    if (r.schema) out.push("/* Tablas usadas:", r.schema, "*/", "");
    r.items.forEach(function (it) {
      out.push("-- " + it.label + ") " + (it.statement || "").replace(/\n/g, " "), it.sql, "");
    });
    return out.join("\n");
  }

  $("dl-sql").addEventListener("click", function () { if (current) ORTDoc.file((current.r.name || "consultas") + ".sql", script(), "application/sql"); });
  $("copy-all").addEventListener("click", function () { if (current) T.copy(script(), T.toast); });
  $("dl-pdf").addEventListener("click", function () {
    if (!current) return;
    var r = current.r;
    var sections = [{ title: "Consigna", pre: current.consigna.slice(0, 5000) }];
    if (r.schema) sections.push({ title: "Tablas", pre: r.schema });
    r.items.forEach(function (it) {
      sections.push({ title: it.label + ") " + (it.statement || ""), pre: it.sql });
      if (it.explanation) sections.push({ text: it.explanation });
    });
    ORTDoc.download({ tool: "Creador de consultas SQL", title: r.name, subtitle: "Consultas para SQL Server.", filename: "consultas-sql", sections: sections });
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); generate(); });
  $("retry").addEventListener("click", generate);
  $("regenerate").addEventListener("click", generate);
  count();
})();
