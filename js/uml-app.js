/*!
 * UML Solver — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cUML Solver%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var STORAGE_KEY = "uml-solver:last";
  var LANG_KEY = "uml-solver:lang";
  var MAX_LEN = 20000;
  var LOADING_STEPS = [
    "Leyendo la consigna…",
    "Buscando clases y atributos…",
    "Detectando relaciones y cardinalidad…",
    "Acomodando el diagrama…"
  ];
  var REL_TEXT = {
    association: "tiene",
    aggregation: "agrupa (agregación)",
    composition: "está compuesto por (composición)",
    inheritance: "es un tipo de (herencia)",
    implementation: "implementa",
    dependency: "usa"
  };
  var MULT_TEXT = { "1": "un/a", "0..1": "ninguno o un/a", "1..n": "uno o muchos", "0..n": "ninguno o muchos" };

  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), consigna = $("consigna"), submit = $("submit"), dropzone = $("dropzone");
  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  var current = null, loadingTimer = null, toastTimer = null;

  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    if (name && views[name]) views[name].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function formError(msg) { $("form-error").textContent = msg || ""; $("form-error").hidden = !msg; }
  function fileStatus(msg, isError) {
    var el = $("file-status");
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("is-error", !!isError);
  }
  function updateCount() {
    var n = consigna.value.length;
    $("count").textContent = n.toLocaleString("es-AR");
    $("clear").hidden = n === 0;
  }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 5000);
  }
  function lang() {
    var r = form.querySelector('input[name="lang"]:checked');
    return r ? r.value : "csharp";
  }

  try {
    var savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) {
      var radio = form.querySelector('input[name="lang"][value="' + savedLang + '"]');
      if (radio) radio.checked = true;
    }
  } catch (e) { /* nada */ }
  form.querySelectorAll('input[name="lang"]').forEach(function (r) {
    r.addEventListener("change", function () { try { localStorage.setItem(LANG_KEY, lang()); } catch (e) { /* nada */ } });
  });

  consigna.addEventListener("input", function () { formError(""); updateCount(); });
  consigna.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); }
  });
  $("clear").addEventListener("click", function () { consigna.value = ""; fileStatus(""); updateCount(); consigna.focus(); });

  /* --- PDF --- */
  async function loadFile(file) {
    if (!file) return;
    formError("");
    var isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    var isTxt = /^text\//.test(file.type) || /\.txt$/i.test(file.name);
    if (!isPdf && !isTxt) { fileStatus("Ese archivo no es un PDF. Subí un PDF o pegá el texto.", true); return; }
    if (file.size > 25 * 1024 * 1024) { fileStatus("El PDF es muy pesado (más de 25 MB).", true); return; }
    fileStatus("Leyendo " + file.name + "…");
    try {
      var text = isPdf ? await PDFText.extractText(file) : (await file.text()).trim();
      if (text.replace(/\s/g, "").length < 20) {
        fileStatus("No pude leer texto de ese PDF (parece una foto o un escaneo). Copiá la consigna y pegala arriba.", true);
        return;
      }
      if (text.length > MAX_LEN) {
        text = text.slice(0, MAX_LEN);
        fileStatus("Listo, cargué " + file.name + ". Era muy largo, así que usé solo el principio.");
      } else {
        fileStatus("Listo, cargué " + file.name + ". Podés revisar el texto arriba.");
      }
      consigna.value = text;
      consigna.scrollTop = 0;
      updateCount();
    } catch (err) {
      console.error(err);
      fileStatus("No pude abrir ese PDF. Probá de nuevo o copiá y pegá la consigna.", true);
    }
  }
  $("file").addEventListener("change", function (e) { loadFile(e.target.files[0]); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") >= 0) {
        e.preventDefault();
        dropzone.classList.add("is-dragging");
      }
    });
  });
  ["dragleave", "drop"].forEach(function (ev) { dropzone.addEventListener(ev, function () { dropzone.classList.remove("is-dragging"); }); });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }
  });
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
    var i = 0, list = $("loading-steps");
    list.innerHTML = "";
    LOADING_STEPS.forEach(function (s) { var li = document.createElement("li"); li.textContent = s.replace(/…$/, ""); list.appendChild(li); });
    setLoadingStep(0);
    clearInterval(loadingTimer);
    loadingTimer = setInterval(function () { i = Math.min(i + 1, LOADING_STEPS.length - 1); setLoadingStep(i); }, 5000);
    submit.disabled = true;
    submit.querySelector(".btn-label").textContent = "Armando…";
    show("loading");
  }
  function stopLoading() {
    clearInterval(loadingTimer);
    submit.disabled = false;
    submit.querySelector(".btn-label").textContent = "Armar el UML";
  }

  async function generate() {
    var text = consigna.value.trim();
    if (text.length < 10) { formError("Primero pegá la consigna o subí el PDF."); consigna.focus(); return; }
    formError("");
    startLoading();
    try {
      var res = await fetch("/api/uml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consigna: text, lang: lang() })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.uml) throw new Error(data.error || "Algo falló en el servidor. Probá de nuevo.");
      current = { uml: data.uml, consigna: text };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (e) { /* sin espacio */ }
      renderResult(true);
    } catch (err) {
      $("error-text").textContent = err.message === "Failed to fetch" ? "No hay conexión. Revisá internet y probá de nuevo." : err.message;
      show("error");
    } finally {
      stopLoading();
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderSummary(uml) {
    var box = $("uml-summary");
    box.innerHTML = "";
    var classes = el("div", "uml-summary-col");
    classes.appendChild(el("h3", null, "Clases"));
    uml.classes.forEach(function (c) {
      var card = el("div", "uml-sum-class");
      var kind = { abstract: " (abstracta)", interface: " (interfaz)", enum: " (enumerado)" }[c.kind] || "";
      card.appendChild(el("strong", null, c.name + kind));
      var lines = [];
      if (c.kind === "enum") lines.push("Valores: " + c.values.join(", "));
      if (c.attributes.length) lines.push("Datos: " + c.attributes.map(function (a) { return a.name; }).join(", "));
      if (c.methods.length) lines.push("Acciones: " + c.methods.map(function (m) { return m.name + "()"; }).join(", "));
      lines.forEach(function (l) { card.appendChild(el("p", null, l)); });
      classes.appendChild(card);
    });
    var rels = el("div", "uml-summary-col");
    rels.appendChild(el("h3", null, "Relaciones"));
    var ul = el("ul", "uml-sum-rels");
    if (!uml.relations.length) ul.appendChild(el("li", null, "No hay relaciones entre clases."));
    uml.relations.forEach(function (r) {
      var li = el("li");
      var txt = r.from + " " + (REL_TEXT[r.type] || "se relaciona con") + " ";
      if (r.multiplicity) txt += (MULT_TEXT[r.multiplicity] || r.multiplicity) + " ";
      txt += r.to;
      if (r.role) txt += " → atributo «" + r.role + "»";
      if (r.multiplicity) txt += " [" + r.multiplicity + "]";
      li.textContent = txt;
      ul.appendChild(li);
    });
    rels.appendChild(ul);
    box.appendChild(classes);
    box.appendChild(rels);
  }

  function renderResult(scroll) {
    var u = current.uml;
    $("result-name").textContent = u.name;
    $("result-meta").textContent = u.classes.length + (u.classes.length === 1 ? " clase" : " clases") +
      " · " + u.relations.length + (u.relations.length === 1 ? " relación" : " relaciones");
    $("explanation").textContent = u.explanation || "";
    $("explanation-box").hidden = !u.explanation;
    $("uml-preview").innerHTML = UMLLayout.buildSvg(u);
    renderSummary(u);
    var codeLang = lang() === "java" ? "java" : "csharp";
    var radio = document.querySelector('input[name="code-lang"][value="' + codeLang + '"]');
    if (radio) radio.checked = true;
    renderCode();
    if (scroll) show("result");
    else Object.keys(views).forEach(function (k) { views[k].hidden = k !== "result"; });
  }

  /* --- Código Java / C# --- */
  var codeFiles = [];
  function renderCode() {
    if (!current || !window.UMLCode) return;
    var sel = document.querySelector('input[name="code-lang"]:checked');
    codeFiles = UMLCode.generate(current.uml, sel ? sel.value : "java");
    var box = $("code-files");
    box.innerHTML = "";
    codeFiles.forEach(function (f) {
      box.appendChild(el("p", "code-file", f.file));
      box.appendChild(el("pre", "code-block", f.code));
    });
  }
  document.querySelectorAll('input[name="code-lang"]').forEach(function (r) { r.addEventListener("change", renderCode); });
  $("copy-code").addEventListener("click", function () {
    var text = codeFiles.map(function (f) { return f.code; }).join("\n\n");
    navigator.clipboard.writeText(text).then(function () { toast("Código copiado."); }, function () { toast("No se pudo copiar."); });
  });

  function fileName(name) {
    return (name || "diagrama").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "diagrama";
  }
  function downloadBlob(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  $("download").addEventListener("click", function () {
    if (!current) return;
    var name = fileName(current.uml.name) + ".uxf";
    downloadBlob(new Blob([UMLLayout.buildUxf(current.uml)], { type: "application/xml;charset=utf-8" }), name);
    toast("Descargado: " + name + ". En UMLetino tocá File Import y elegilo.");
  });

  $("download-png").addEventListener("click", function () {
    if (!current) return;
    var svg = UMLLayout.buildSvg(current.uml);
    var m = svg.match(/width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/);
    var w = m ? +m[1] : 1000, h = m ? +m[2] : 700, scale = 2;
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        var name = fileName(current.uml.name) + ".png";
        downloadBlob(blob, name);
        toast("Descargado: " + name + ".");
      }, "image/png");
    };
    img.onerror = function () { toast("No se pudo crear la imagen. Probá con el archivo de UMLetino."); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
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
    if (saved && saved.uml && saved.uml.classes) {
      current = saved;
      consigna.value = saved.consigna || "";
      renderResult(false);
    }
  } catch (e) { /* ignorar */ }
  updateCount();
})();
