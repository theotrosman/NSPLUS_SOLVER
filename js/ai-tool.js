/*!
 * ORT Info es fácil — piezas comunes de las herramientas con IA nuevas
 * (cuadro de consigna con PDF, interruptores de temas, carga y errores)
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function (global) {
  "use strict";

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // Conecta un textarea con un botón de "Subir PDF" (o archivo de texto) y un contador
  function attachUpload(textarea, fileInput, statusEl, opts) {
    opts = opts || {};
    fileInput.addEventListener("change", async function (e) {
      var f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      statusEl.hidden = false;
      statusEl.classList.remove("is-error");
      statusEl.textContent = "Leyendo " + f.name + "…";
      try {
        var isPdf = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
        var t = isPdf ? await global.PDFText.extractText(f) : await f.text();
        if (t.replace(/\s/g, "").length < 5) throw new Error("vacío");
        textarea.value = t.slice(0, opts.max || 20000);
        textarea.dispatchEvent(new Event("input"));
        statusEl.textContent = "Listo, cargué " + f.name + ".";
      } catch (err) {
        statusEl.classList.add("is-error");
        statusEl.textContent = "No pude leer ese archivo. Copiá y pegá el texto.";
      }
    });
  }

  // Interruptores de temas: [{ key, label }] → chips con checkbox
  function topics(container, list, storageKey, defaults) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch (e) { /* nada */ }
    container.innerHTML = "";
    list.forEach(function (t) {
      var lab = el("label", "topic");
      var cb = el("input");
      cb.type = "checkbox";
      cb.value = t.key;
      cb.checked = saved ? saved.indexOf(t.key) >= 0 : (defaults ? defaults.indexOf(t.key) >= 0 : true);
      cb.addEventListener("change", save);
      lab.appendChild(cb);
      lab.appendChild(el("span", null, t.label));
      container.appendChild(lab);
    });
    function save() { try { localStorage.setItem(storageKey, JSON.stringify(get())); } catch (e) { /* nada */ } }
    function get() { return Array.prototype.filter.call(container.querySelectorAll("input"), function (c) { return c.checked; }).map(function (c) { return c.value; }); }
    function setAll(v) { container.querySelectorAll("input").forEach(function (c) { c.checked = v; }); save(); }
    return { get: get, setAll: setAll };
  }

  async function post(url, body) {
    var res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || "Algo falló en el servidor. Probá de nuevo.");
    return data;
  }

  function copy(text, toastFn) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(
      function () { toastFn && toastFn("Copiado."); },
      function () { toastFn && toastFn("No se pudo copiar."); });
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 3500);
  }

  global.AITool = { el: el, attachUpload: attachUpload, topics: topics, post: post, copy: copy, toast: toast };
})(window);
