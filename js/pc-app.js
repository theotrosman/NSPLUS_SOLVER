/*!
 * Armador de PC — interfaz
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function () {
  "use strict";

  console.log("%cArmador de PC%c — © 2026 Theo Trosman. Todos los derechos reservados. https://github.com/theotrosman",
    "font-weight:700", "font-weight:400");

  var EXAMPLES = [
    { label: "Gamer con presupuesto justo", text: "Tengo 14 años, juego Fortnite, Minecraft y Rocket League en una notebook vieja que se calienta y anda a 20 FPS. Mis viejos me dijeron que podemos gastar poco, pero que dure varios años. Ya tengo monitor y teclado." },
    { label: "Estudiante de arquitectura", text: "Empiezo la facultad de arquitectura y me dijeron que voy a usar AutoCAD, Revit y renderizar con Lumion. No juego. Necesito algo que no se trabe con proyectos grandes. Es para tener en casa, no hace falta que sea portátil." },
    { label: "Oficina de una contadora", text: "Soy contadora, trabajo con Excel, el sistema de AFIP, muchas pestañas de Chrome y videollamadas por Zoom. La compu actual tarda mucho en prender. No necesito nada para juegos, quiero algo silencioso y que no gaste mucha luz." },
    { label: "Editor de videos para YouTube", text: "Hago videos para YouTube: grabo en 4K con el celular y edito en DaVinci Resolve y Premiere. Cuando exporto tarda una eternidad. A veces también juego. Quiero dos monitores." }
  ];
  var KEY = "pc:last";
  var $ = function (id) { return document.getElementById(id); };
  var consigna = $("consigna"), current = null, toastTimer = null;
  var views = { loading: $("state-loading"), error: $("state-error"), result: $("state-result") };
  $("year").textContent = String(Math.max(2026, new Date().getFullYear()));

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    if (name && views[name]) views[name].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
  }
  function updateCount() { $("count").textContent = consigna.value.length.toLocaleString("es-AR"); }
  consigna.addEventListener("input", function () { $("form-error").hidden = true; updateCount(); });

  EXAMPLES.forEach(function (ex) {
    var b = el("button", "chip", ex.label);
    b.type = "button";
    b.addEventListener("click", function () { consigna.value = ex.text; updateCount(); consigna.focus(); });
    $("examples").appendChild(b);
  });

  $("file").addEventListener("change", async function (e) {
    var f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var st = $("file-status");
    st.hidden = false; st.classList.remove("is-error"); st.textContent = "Leyendo " + f.name + "…";
    try {
      var text = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name) ? await PDFText.extractText(f) : await f.text();
      if (text.replace(/\s/g, "").length < 20) throw new Error("vacío");
      consigna.value = text.slice(0, 20000);
      updateCount();
      st.textContent = "Listo, cargué " + f.name + ".";
    } catch (err) {
      st.classList.add("is-error");
      st.textContent = "No pude leer texto de ese archivo. Copiá y pegá la situación.";
    }
  });

  async function generate() {
    var text = consigna.value.trim();
    if (text.length < 10) { $("form-error").textContent = "Primero pegá la situación del cliente."; $("form-error").hidden = false; return; }
    $("submit").disabled = true;
    show("loading");
    try {
      var res = await fetch("/api/pc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consigna: text }) });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.pc) throw new Error(data.error || "Algo falló en el servidor. Probá de nuevo.");
      current = { pc: data.pc, consigna: text };
      try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) { /* nada */ }
      render(true);
    } catch (err) {
      $("error-text").textContent = err.message === "Failed to fetch" ? "No hay conexión. Revisá internet y probá de nuevo." : err.message;
      show("error");
    } finally {
      $("submit").disabled = false;
    }
  }

  function render(scroll) {
    var p = current.pc;
    $("client").textContent = "Propuestas para " + p.client;
    $("summary").textContent = p.summary;
    var needs = $("needs"); needs.innerHTML = "";
    p.needs.forEach(function (n) { needs.appendChild(el("li", null, n)); });
    var box = $("options"); box.innerHTML = "";
    p.options.forEach(function (o) {
      var card = el("article", "pc-option");
      card.appendChild(el("p", "pc-level", o.level));
      card.appendChild(el("h3", null, o.name));
      if (o.goal) card.appendChild(el("p", "pc-goal", o.goal));
      var dl = el("dl", "pc-parts");
      o.components.forEach(function (c) {
        var row = el("div");
        row.appendChild(el("dt", null, c.part));
        var dd = el("dd");
        dd.appendChild(el("strong", null, c.choice));
        if (c.why) dd.appendChild(el("span", null, c.why));
        row.appendChild(dd);
        dl.appendChild(row);
      });
      card.appendChild(dl);
      if (o.pros.length) { var ul = el("ul", "pc-pros"); o.pros.forEach(function (x) { ul.appendChild(el("li", null, x)); }); card.appendChild(ul); }
      if (o.cons.length) { var ul2 = el("ul", "pc-cons"); o.cons.forEach(function (x) { ul2.appendChild(el("li", null, x)); }); card.appendChild(ul2); }
      box.appendChild(card);
    });
    $("comparison").textContent = p.comparison;
    $("recommendation").textContent = p.recommendation;
    var gl = $("glossary"); gl.innerHTML = "";
    p.glossary.forEach(function (g) { gl.appendChild(el("dt", null, g.term)); gl.appendChild(el("dd", null, g.meaning)); });
    $("glossary-box").hidden = !p.glossary.length;
    if (scroll) show("result"); else Object.keys(views).forEach(function (k) { views[k].hidden = k !== "result"; });
  }

  function plain() {
    var p = current.pc, out = [];
    out.push("Propuestas para " + p.client, "", p.summary, "", "Necesidades:");
    p.needs.forEach(function (n) { out.push("- " + n); });
    p.options.forEach(function (o) {
      out.push("", o.name + (o.level ? " (" + o.level + ")" : ""), o.goal || "");
      o.components.forEach(function (c) { out.push("- " + c.part + ": " + c.choice + (c.why ? " — " + c.why : "")); });
      if (o.pros.length) out.push("Ventajas: " + o.pros.join("; "));
      if (o.cons.length) out.push("Desventajas: " + o.cons.join("; "));
    });
    out.push("", "Qué cambia entre las opciones:", p.comparison, "", "Recomendación:", p.recommendation);
    if (p.glossary.length) { out.push("", "Glosario:"); p.glossary.forEach(function (g) { out.push("- " + g.term + ": " + g.meaning); }); }
    return out.join("\n");
  }

  $("copy").addEventListener("click", function () {
    if (!current) return;
    navigator.clipboard.writeText(plain()).then(function () { toast("Copiado. Pegalo en tu documento del TP."); }, function () { toast("No se pudo copiar."); });
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); generate(); });
  $("retry").addEventListener("click", generate);
  $("regenerate").addEventListener("click", generate);
  $("new").addEventListener("click", function () { consigna.value = ""; updateCount(); show(null); window.scrollTo({ top: 0, behavior: "smooth" }); consigna.focus(); });

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.pc) { current = saved; consigna.value = saved.consigna || ""; render(false); }
  } catch (e) { /* nada */ }
  updateCount();
})();
