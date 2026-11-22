/*!
 * NS Solver — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cNS Solver%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var EXAMPLES = [
    { label: "Pares e impares", text: "Pedir 10 números enteros y mostrar cuántos son pares, cuántos son impares y cuál fue el mayor de todos." },
    { label: "Promedio con fin", text: "Ingresar notas (del 1 al 10, validando) hasta que se ingrese 0. Al final mostrar el promedio, la nota más alta y cuántos aprobaron (nota >= 6)." },
    { label: "Menú calculadora", text: "Mostrar un menú con las opciones 1-Sumar, 2-Restar, 3-Multiplicar, 4-Dividir y 5-Salir. Pedir dos números para cada operación y mostrar el resultado. Repetir hasta que el usuario elija Salir. No permitir dividir por cero." },
    { label: "Número primo", text: "Pedir un número entero positivo y mostrar si es primo o no." },
    { label: "Cajero", text: "Un cajero automático tiene billetes de 1000, 500 y 100. Pedir un monto múltiplo de 100 (validarlo) y mostrar la cantidad mínima de billetes de cada tipo que hay que entregar." }
  ];
  var STORAGE_KEY = "ns-solver:last";
  var LOADING_STEPS = ["Leyendo la consigna…", "Pensando la lógica…", "Armando los bloques…", "Revisando el diagrama…"];

  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), consigna = $("consigna"), submit = $("submit");
  var states = { empty: $("state-empty"), loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  var current = null;
  var loadingTimer = null;

  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  EXAMPLES.forEach(function (ex) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = ex.label;
    b.addEventListener("click", function () {
      consigna.value = ex.text;
      updateCount();
      consigna.focus();
    });
    $("examples").appendChild(b);
  });

  function updateCount() { $("count").textContent = consigna.value.length; }
  consigna.addEventListener("input", updateCount);
  consigna.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
  });

  function show(name) {
    Object.keys(states).forEach(function (k) { states[k].hidden = k !== name; });
  }

  function startLoading() {
    var i = 0;
    $("loading-text").textContent = LOADING_STEPS[0];
    clearInterval(loadingTimer);
    loadingTimer = setInterval(function () {
      i = Math.min(i + 1, LOADING_STEPS.length - 1);
      $("loading-text").textContent = LOADING_STEPS[i];
    }, 2200);
    submit.disabled = true;
    submit.querySelector(".btn-label").textContent = "Generando…";
    show("loading");
  }

  function stopLoading() {
    clearInterval(loadingTimer);
    submit.disabled = false;
    submit.querySelector(".btn-label").textContent = "Generar diagrama";
  }

  function selectedMode() {
    var r = form.querySelector('input[name="mode"]:checked');
    return r ? r.value : "simple";
  }

  async function generate() {
    var text = consigna.value.trim();
    if (text.length < 10) {
      consigna.focus();
      showError("Escribí una consigna un poco más completa.");
      return;
    }
    startLoading();
    try {
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consigna: text, mode: selectedMode() })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.project) throw new Error(data.error || "El servidor respondió con un error (" + res.status + ").");
      current = { project: data.project, consigna: text, model: data.model };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (e) { /* sin espacio */ }
      renderResult();
    } catch (err) {
      showError(err.message || "Error de conexión.");
    } finally {
      stopLoading();
    }
  }

  function showError(msg) {
    $("error-text").textContent = msg;
    show("error");
  }

  function projectName() {
    return $("projectName").value.trim() || current.project.name;
  }

  function renderResult() {
    var p = current.project;
    $("result-name").textContent = projectName();
    var n = p.diagrams.length;
    $("result-meta").textContent = n + (n === 1 ? " diagrama" : " diagramas") + " · " + p.diagrams.map(function (d) { return d.name + "()"; }).join(", ");
    $("explanation").textContent = p.explanation || "";
    $("explanation").hidden = !p.explanation;
    var box = $("diagrams");
    box.innerHTML = "";
    p.diagrams.forEach(function (d) { box.appendChild(NSPreview.renderDiagram(d)); });
    show("result");
  }

  function fileName(name) {
    return (name || "proyecto").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "proyecto";
  }

  $("download").addEventListener("click", function () {
    if (!current) return;
    var project = Object.assign({}, current.project, { name: projectName() });
    var text = NSPlusFile.buildProjectFile(project, { author: $("author").value.trim(), group: $("group").value.trim() });
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName(project.name) + ".nsplus";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $("projectName").addEventListener("input", function () { if (current) $("result-name").textContent = projectName(); });
  $("regenerate").addEventListener("click", generate);
  $("retry").addEventListener("click", generate);
  form.addEventListener("submit", function (e) { e.preventDefault(); generate(); });

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.project && saved.project.diagrams) {
      current = saved;
      consigna.value = saved.consigna || "";
      renderResult();
    }
  } catch (e) { /* ignorar */ }
  updateCount();
})();
