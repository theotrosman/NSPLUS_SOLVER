/*!
 * NS Solver — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cNS Solver%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var STORAGE_KEY = "ns-solver:last";
  var MAX_LEN = 20000;
  var LOADING_STEPS = [
    "Leyendo la consigna…",
    "Pensando cómo resolverlo…",
    "Armando las cajas del diagrama…",
    "Revisando que no falte nada…"
  ];

  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), consigna = $("consigna"), submit = $("submit"), dropzone = $("dropzone");
  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  var current = null;
  var loadingTimer = null;

  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    if (name && views[name]) views[name].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function formError(msg) {
    $("form-error").textContent = msg || "";
    $("form-error").hidden = !msg;
  }

  function updateCount() {
    var n = consigna.value.length;
    $("count").textContent = n.toLocaleString("es-AR");
    $("clear").hidden = n === 0;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 5000);
  }

  function fileStatus(msg, isError) {
    var el = $("file-status");
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("is-error", !!isError);
  }

  /* --- Interruptores: modularizar / clases --- */
  var OPTS_KEY = "ns-solver:opts";
  var optModular = $("opt-modular"), optClasses = $("opt-classes");

  function syncToggles() {
    // Con clases siempre hay métodos, así que modularizar queda prendido.
    if (optClasses.checked) optModular.checked = true;
    optModular.disabled = optClasses.checked;
    try { localStorage.setItem(OPTS_KEY, JSON.stringify({ modular: optModular.checked, classes: optClasses.checked })); } catch (e) { /* nada */ }
  }
  try {
    var savedOpts = JSON.parse(localStorage.getItem(OPTS_KEY) || "{}");
    optModular.checked = !!savedOpts.modular;
    optClasses.checked = !!savedOpts.classes;
  } catch (e) { /* nada */ }
  optModular.addEventListener("change", syncToggles);
  optClasses.addEventListener("change", syncToggles);
  syncToggles();

  consigna.addEventListener("input", function () { formError(""); updateCount(); });
  $("clear").addEventListener("click", function () {
    consigna.value = "";
    fileStatus("");
    updateCount();
    consigna.focus();
  });
  consigna.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
  });

  /* --- PDF --- */
  async function loadFile(file) {
    if (!file) return;
    formError("");
    var isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    var isTxt = /^text\//.test(file.type) || /\.txt$/i.test(file.name);
    if (!isPdf && !isTxt) {
      fileStatus("Ese archivo no es un PDF. Subí un PDF o pegá el texto.", true);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      fileStatus("El PDF es muy pesado (más de 25 MB).", true);
      return;
    }
    fileStatus("Leyendo " + file.name + "…");
    try {
      var text = isPdf ? await PDFText.extractText(file) : (await file.text()).trim();
      if (text.replace(/\s/g, "").length < 20) {
        fileStatus("No pude leer texto de ese PDF (parece una foto o un escaneo). Copiá la consigna y pegala arriba.", true);
        return;
      }
      if (text.length > MAX_LEN) {
        text = text.slice(0, MAX_LEN);
        fileStatus("Listo, cargué " + file.name + ". Era muy largo, así que usé solo el principio. Si te falta algo, pegá ese ejercicio solo.");
      } else {
        fileStatus("Listo, cargué " + file.name + ". Podés revisar el texto arriba y tocar Resolver.");
      }
      consigna.value = text;
      consigna.scrollTop = 0;
      updateCount();
    } catch (err) {
      console.error(err);
      fileStatus("No pude abrir ese PDF. Probá de nuevo o copiá y pegá la consigna.", true);
    }
  }

  $("file").addEventListener("change", function (e) {
    loadFile(e.target.files[0]);
    e.target.value = "";
  });

  ["dragenter", "dragover"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") >= 0) {
        e.preventDefault();
        dropzone.classList.add("is-dragging");
      }
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropzone.addEventListener(ev, function () { dropzone.classList.remove("is-dragging"); });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      loadFile(e.dataTransfer.files[0]);
    }
  });
  // Evita que el navegador abra el PDF si se suelta fuera del cuadro.
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { if (!dropzone.contains(e.target)) e.preventDefault(); });

  /* --- Generar --- */
  function setLoadingStep(i) {
    $("loading-text").textContent = LOADING_STEPS[i];
    Array.prototype.forEach.call($("loading-steps").children, function (li, j) {
      li.className = j < i ? "is-done" : j === i ? "is-active" : "";
    });
  }

  function startLoading() {
    var i = 0;
    var list = $("loading-steps");
    list.innerHTML = "";
    LOADING_STEPS.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s.replace(/…$/, "");
      list.appendChild(li);
    });
    setLoadingStep(0);
    clearInterval(loadingTimer);
    // La IA no avisa en qué paso está: los pasos avanzan con el tiempo y el último espera.
    loadingTimer = setInterval(function () {
      i = Math.min(i + 1, LOADING_STEPS.length - 1);
      setLoadingStep(i);
    }, 5000);
    submit.disabled = true;
    submit.querySelector(".btn-label").textContent = "Resolviendo…";
    show("loading");
  }

  function stopLoading() {
    clearInterval(loadingTimer);
    submit.disabled = false;
    submit.querySelector(".btn-label").textContent = "Resolver";
  }

  async function generate() {
    var text = consigna.value.trim();
    if (text.length < 10) {
      formError("Primero pegá la consigna o subí el PDF.");
      consigna.focus();
      return;
    }
    formError("");
    startLoading();
    try {
      var res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consigna: text, modular: optModular.checked, classes: optClasses.checked })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.project) throw new Error(data.error || "Algo falló en el servidor. Probá de nuevo.");
      current = { project: data.project, consigna: text };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (e) { /* sin espacio */ }
      renderResult(true);
    } catch (err) {
      $("error-text").textContent = err.message === "Failed to fetch"
        ? "No hay conexión. Revisá internet y probá de nuevo."
        : err.message;
      show("error");
    } finally {
      stopLoading();
    }
  }

  function renderResult(scroll) {
    var p = current.project;
    $("result-name").textContent = p.name;
    $("explanation").textContent = p.explanation || "";
    $("explanation-box").hidden = !p.explanation;
    var box = $("diagrams"), nav = $("diagram-nav");
    box.innerHTML = "";
    nav.innerHTML = "";
    var classes = p.diagrams.map(function (d) { return d.className; }).filter(function (c, i, all) { return all.indexOf(c) === i; });
    var n = p.diagrams.length;
    $("result-meta").textContent = n === 1
      ? "1 diagrama"
      : n + " diagramas" + (classes.length > 1 ? " en " + classes.length + " clases" : "");
    var lastClass = null;
    p.diagrams.forEach(function (d, i) {
      var newClass = classes.length > 1 && d.className !== lastClass;
      if (newClass) {
        var h = document.createElement("h3");
        h.className = "class-title";
        h.textContent = "Clase " + d.className;
        box.appendChild(h);
        var label = document.createElement("span");
        label.className = "nav-class";
        label.textContent = d.className;
        nav.appendChild(label);
        lastClass = d.className;
      }
      var frame = document.createElement("div");
      frame.className = "diagram-frame";
      frame.id = "diagrama-" + (i + 1);
      frame.appendChild(NSPreview.renderDiagram(d));
      box.appendChild(frame);
      var link = document.createElement("a");
      link.href = "#" + frame.id;
      link.textContent = d.name + "()";
      nav.appendChild(link);
    });
    nav.hidden = n < 2;
    if (scroll) show("result");
    else Object.keys(views).forEach(function (k) { views[k].hidden = k !== "result"; });
  }

  function fileName(name) {
    return (name || "diagrama").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "diagrama";
  }

  $("download").addEventListener("click", function () {
    if (!current) return;
    var text = NSPlusFile.buildProjectFile(current.project);
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName(current.project.name) + ".nsplus";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Descargado: " + a.download + ". Ahora abrilo en NS Plus con el botón de la carpeta.");
  });

  $("regenerate").addEventListener("click", generate);
  $("retry").addEventListener("click", generate);
  $("new").addEventListener("click", function () {
    consigna.value = "";
    fileStatus("");
    formError("");
    updateCount();
    show(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    consigna.focus();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); generate(); });

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.project && saved.project.diagrams) {
      current = saved;
      consigna.value = saved.consigna || "";
      renderResult(false);
    }
  } catch (e) { /* ignorar */ }
  updateCount();
})();
