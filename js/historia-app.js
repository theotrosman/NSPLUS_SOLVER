/*!
 * TP de Historia 5 (UML + NS Plus) — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cTP Historia (UML + NS)%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman", "font-weight:700", "font-weight:400");

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));
  var form = $("form"), consigna = $("consigna"), dropzone = $("dropzone");
  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  var current = null, toastTimer = null, loadTimer = null;
  var STORAGE = "historia:last";
  var STEPS = ["Armando el diagrama de clases…", "Implementando los métodos en NS…", "Revisando que coincidan…"];

  function show(n) { Object.keys(views).forEach(function (k) { views[k].hidden = k !== n; }); if (n) views[n].scrollIntoView({ behavior: "smooth", block: "start" }); }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 5000); }
  function count() { var n = consigna.value.length; $("count").textContent = n.toLocaleString("es-AR"); $("clear").hidden = n === 0; }
  function formError(m) { $("form-error").textContent = m || ""; $("form-error").hidden = !m; }
  function fileStatus(m, bad) { var e = $("file-status"); e.textContent = m || ""; e.hidden = !m; e.classList.toggle("is-error", !!bad); }

  consigna.addEventListener("input", function () { formError(""); count(); });
  consigna.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
  $("clear").addEventListener("click", function () { consigna.value = ""; fileStatus(""); count(); consigna.focus(); });

  if (window.FileText) $("file").setAttribute("accept", window.FileText.ACCEPT);
  async function loadFile(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { fileStatus("El archivo es muy pesado (más de 25 MB).", true); return; }
    fileStatus("Leyendo " + file.name + "…");
    try {
      var text = (await window.FileText.read(file)).trim();
      if (text.replace(/\s/g, "").length < 20) { fileStatus("No pude leer texto de ese archivo (puede ser una foto o un escaneo). Copiá la consigna y pegala.", true); return; }
      consigna.value = text.slice(0, 20000);
      consigna.scrollTop = 0;
      count();
      fileStatus("Listo, cargué " + file.name + ".");
    } catch (err) { fileStatus(err.message || "No pude abrir ese archivo. Copiá y pegá la consigna.", true); }
  }
  $("file").addEventListener("change", function (e) { loadFile(e.target.files[0]); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { dropzone.addEventListener(ev, function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, "Files") >= 0) { e.preventDefault(); dropzone.classList.add("is-dragging"); } }); });
  ["dragleave", "drop"].forEach(function (ev) { dropzone.addEventListener(ev, function () { dropzone.classList.remove("is-dragging"); }); });
  dropzone.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); loadFile(e.dataTransfer.files[0]); } });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { if (!dropzone.contains(e.target)) e.preventDefault(); });

  function startLoading() {
    var i = 0;
    $("loading-text").textContent = STEPS[0];
    clearInterval(loadTimer);
    loadTimer = setInterval(function () { i = Math.min(i + 1, STEPS.length - 1); $("loading-text").textContent = STEPS[i]; }, 12000);
    $("submit").disabled = true;
    show("loading");
  }

  async function generate() {
    var text = consigna.value.trim();
    if (text.length < 10) { formError("Primero pegá la consigna o subí el archivo."); consigna.focus(); return; }
    formError("");
    startLoading();
    try {
      var res = await fetch("/api/historia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consigna: text }) });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.uml || !data.project) throw new Error(data.error || "Algo falló en el servidor. Probá de nuevo.");
      current = { uml: data.uml, project: data.project, consigna: text };
      try { localStorage.setItem(STORAGE, JSON.stringify(current)); } catch (e) { /* nada */ }
      render(true);
      if (window.ORT) window.ORT.done();
    } catch (err) {
      $("error-text").textContent = err.message === "Failed to fetch" ? "No hay conexión. Revisá internet y probá de nuevo." : err.message;
      show("error");
    } finally {
      clearInterval(loadTimer);
      $("submit").disabled = false;
    }
  }

  function render(scroll) {
    var uml = current.uml, project = current.project;
    $("r-name").textContent = project.name || uml.name || "Trabajo de Historia";
    $("r-meta").textContent = uml.classes.length + (uml.classes.length === 1 ? " clase" : " clases") + " · " + project.diagrams.length + " diagramas NS";
    $("explanation").textContent = project.explanation || uml.explanation || "";
    $("explanation-box").hidden = !($("explanation").textContent);

    $("uml-preview").innerHTML = UMLLayout.buildSvg(uml);

    var box = $("ns-preview");
    box.innerHTML = "";
    var classes = project.diagrams.map(function (d) { return d.className; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    var lastClass = null;
    project.diagrams.forEach(function (d) {
      if (classes.length > 1 && d.className !== lastClass) { box.appendChild(el("h4", "class-title", "Clase " + d.className)); lastClass = d.className; }
      var frame = el("div", "diagram-frame");
      frame.appendChild(NSPreview.renderDiagram(d));
      box.appendChild(frame);
    });
    if (scroll) show("result"); else Object.keys(views).forEach(function (k) { views[k].hidden = k !== "result"; });
  }

  function fileName() {
    var n = (current.project.name || current.uml.name || "trabajo-historia");
    return n.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "trabajo-historia";
  }

  $("dl-uxf").addEventListener("click", function () {
    if (!current) return;
    ORTDoc.file(fileName() + ".uxf", UMLLayout.buildUxf(current.uml), "application/xml");
    toast("Descargado el .uxf. En UMLetino tocá File Import y elegilo.");
  });
  $("dl-nsplus").addEventListener("click", function () {
    if (!current) return;
    ORTDoc.file(fileName() + ".nsplus", NSPlusFile.buildProjectFile(current.project), "text/plain");
    toast("Descargado el .nsplus. En NS Plus tocá el botón de la carpeta y elegilo.");
  });

  $("dl-doc").addEventListener("click", function () {
    if (!current) return;
    var uml = current.uml, project = current.project;
    var rels = uml.relations.map(function (r) { return r.from + " → " + r.to + " (" + r.type + (r.role ? ", atributo «" + r.role + "»" : "") + (r.multiplicity ? ", " + r.multiplicity : "") + ")"; });
    ORTDoc.download({
      tool: "TP Historia", title: project.name || uml.name || "Trabajo de Historia", subtitle: "Diagrama de clases UML y diagramas Nassi-Shneiderman.", filename: fileName(),
      sections: [
        current.consigna ? { title: "Consigna", pre: current.consigna.slice(0, 5000) } : null,
        (project.explanation || uml.explanation) ? { title: "Cómo se resolvió", text: project.explanation || uml.explanation } : null,
        { title: "Diagrama de clases (UML)", html: UMLLayout.buildSvg(uml) },
        { title: "Clases", table: { head: ["Clase", "Atributos", "Métodos"], rows: uml.classes.map(function (c) {
          return [c.name + (c.kind !== "class" ? " (" + c.kind + ")" : ""), c.kind === "enum" ? (c.values || []).join(", ") : c.attributes.map(function (a) { return "- " + a.name + ": " + a.type; }).join("\n"), c.methods.map(UMLLayout.methodText).join("\n")];
        }) } },
        rels.length ? { title: "Relaciones", list: rels } : null,
        { title: "Diagramas NS", text: "El detalle de cada método está en el archivo .nsplus (abrilo en NS Plus). Métodos: " + project.diagrams.map(function (d) { return d.className + "." + d.name + "()"; }).join(", ") + "." }
      ]
    });
  });

  form.addEventListener("submit", function (e) { e.preventDefault(); generate(); });
  $("retry").addEventListener("click", generate);
  $("regenerate").addEventListener("click", generate);

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (saved && saved.uml && saved.project) { current = saved; consigna.value = saved.consigna || ""; render(false); }
  } catch (e) { /* nada */ }
  count();
})();
