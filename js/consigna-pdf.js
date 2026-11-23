/*!
 * ORT Info es fácil — "Subí la consigna": PDF o texto → ejercicios para las calculadoras
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Uso: <div data-consigna="bool"></div> y window.ORTConsigna.onItem = function (item) { ... }
 * (y opcionalmente ORTConsigna.render(items, box) para mostrarlos distinto).
 */
(function () {
  "use strict";

  var box = document.querySelector("[data-consigna]");
  if (!box) return;
  var tool = box.getAttribute("data-consigna");
  window.ORTConsigna = window.ORTConsigna || {};

  box.className += " card consigna-card";
  box.innerHTML =
    '<details class="consigna-details">' +
    '<summary><span class="cc-icon" aria-hidden="true">📄</span><span><strong>¿Tenés la consigna en PDF?</strong> Subila (o pegala) y te encuentro los ejercicios para resolverlos acá.</span></summary>' +
    '<div class="cc-body">' +
    '<div class="composer cc-composer">' +
    '<textarea class="cc-text" rows="5" maxlength="20000" placeholder="Pegá la consigna acá, o subí el PDF con el botón de abajo…"></textarea>' +
    '<div class="composer-bar">' +
    '<label class="btn btn-soft btn-sm">Subir PDF<input class="cc-file" type="file" accept="application/pdf,.pdf,text/plain,.txt" hidden></label>' +
    '<button type="button" class="btn btn-primary btn-sm cc-go">Buscar ejercicios</button>' +
    '<span class="counter cc-status"></span>' +
    "</div></div>" +
    '<div class="cc-items"></div>' +
    "</div></details>";

  var text = box.querySelector(".cc-text"), status = box.querySelector(".cc-status"), list = box.querySelector(".cc-items");
  function setStatus(msg, bad) { status.textContent = msg || ""; status.classList.toggle("is-error", !!bad); }

  var fileInput = box.querySelector(".cc-file");
  if (window.FileText) fileInput.setAttribute("accept", window.FileText.ACCEPT);
  fileInput.addEventListener("change", async function (e) {
    var f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setStatus("Leyendo " + f.name + "…");
    try {
      var t = await window.FileText.read(f);
      if (t.replace(/\s/g, "").length < 15) throw new Error("No pude leer texto de ese archivo (puede ser una foto o un escaneo).");
      text.value = t.slice(0, 20000);
      setStatus("Listo. Buscando ejercicios…");
      find();
    } catch (err) {
      setStatus(err.message || "No pude leer ese archivo. Copiá y pegá la consigna.", true);
    }
  });
  box.querySelector(".cc-go").addEventListener("click", find);

  async function find() {
    var t = text.value.trim();
    if (t.length < 10) { setStatus("Primero pegá la consigna o subí el PDF.", true); return; }
    setStatus("Buscando ejercicios…");
    list.innerHTML = '<div class="spinner" aria-hidden="true"></div>';
    try {
      var res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: tool, consigna: t }) });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.items) throw new Error(data.error || "No se pudo leer la consigna.");
      list.innerHTML = "";
      if (!data.items.length) { setStatus("No encontré ejercicios para esta herramienta en la consigna.", true); return; }
      setStatus("Encontré " + data.items.length + (data.items.length === 1 ? " ejercicio." : " ejercicios. Tocá uno para resolverlo."));
      if (window.ORTConsigna.render) { window.ORTConsigna.render(data.items, list); return; }
      var grid = document.createElement("div");
      grid.className = "ex-grid";
      data.items.forEach(function (it) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ex-chip";
        var lab = document.createElement("span");
        lab.textContent = it.label + " ";
        b.appendChild(lab);
        b.appendChild(document.createTextNode(describe(it)));
        b.addEventListener("click", function () {
          grid.querySelectorAll(".ex-chip").forEach(function (x) { x.classList.toggle("is-picked", x === b); });
          if (window.ORTConsigna.onItem) window.ORTConsigna.onItem(it);
        });
        grid.appendChild(b);
      });
      list.appendChild(grid);
      if (window.ORTConsigna.all) {
        var all = document.createElement("button");
        all.type = "button";
        all.className = "btn btn-primary cc-all";
        all.textContent = "Resolver todos y descargar el PDF";
        all.addEventListener("click", function () { window.ORTConsigna.all(data.items, text.value.trim()); });
        list.appendChild(all);
      }
    } catch (err) {
      list.innerHTML = "";
      setStatus(err.message === "Failed to fetch" ? "No hay conexión." : err.message, true);
    }
  }

  function describe(it) {
    if (it.expr) return it.expr;
    if (it.kind === "convert") return it.number + " (base " + it.from + ") → base " + it.to;
    if (it.kind === "op") return it.a + " " + it.op + " " + it.b;
    if (it.kind === "complement") return "C1 y C2 de " + it.number;
    if (it.kind === "calc") return it.ip + " " + (it.mask || "");
    if (it.kind === "flsm") return it.network + " en " + it.count + " subredes";
    if (it.kind === "vlsm") return "VLSM de " + it.network + " (" + (it.subnets || []).length + " subredes)";
    if (it.kind === "replace") return (it.algorithms || []).join(", ") + " · " + (it.frames || "?") + " marcos";
    if (it.kind === "translate") return "dirección " + it.address;
    if (it.ops) return it.kind + ": " + it.ops.map(function (o) { return o.method + (o.arg != null ? "(" + o.arg + ")" : "()"); }).join(", ");
    return it.question || "";
  }
})();
