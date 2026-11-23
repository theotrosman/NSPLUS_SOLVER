/*!
 * ORT Info es fácil — entregables descargables (PDF o Word)
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * El documento que descarga el alumno NO lleva ninguna marca del sitio:
 * es un trabajo de alumno (título + fecha y el contenido).
 *
 * ORTDoc.download({...}) muestra "PDF o Word" y descarga lo elegido.
 * ORTDoc.pdf({...}) / ORTDoc.docx({...}) van directo a un formato.
 * ORTDoc.file(n, t) descarga un archivo (.sql, .uxf, .csv, etc.).
 * Secciones: { title, text } · { title, pre } · { title, list } · { title, table:{head,rows} } · { title, html (SVG) }
 */
(function (global) {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function sectionHtml(s) {
    var out = "<section>";
    if (s.title) out += "<h2>" + esc(s.title) + "</h2>";
    if (s.text) out += String(s.text).split(/\n{2,}/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
    if (s.pre) out += "<pre>" + esc(s.pre) + "</pre>";
    if (s.list) out += "<ol>" + s.list.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>";
    if (s.table) {
      out += "<table><thead><tr>" + s.table.head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        s.table.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table>";
    }
    if (s.html) out += s.html;
    return out + "</section>";
  }

  // Estilo sobrio de documento, sin color de marca (negro sobre blanco, como un trabajo escrito).
  var CSS =
    "@page{size:A4;margin:18mm 16mm}" +
    "*{box-sizing:border-box}body{margin:0;font:14px/1.55 'Segoe UI',Roboto,Arial,sans-serif;color:#111;background:#fff}" +
    ".doc{max-width:820px;margin:0 auto;padding:28px 24px 40px}" +
    "header{border-bottom:1.5px solid #333;padding-bottom:10px;margin-bottom:18px}" +
    "h1{margin:0 0 2px;font-size:24px;line-height:1.2}.sub{margin:4px 0 0;color:#333}" +
    ".meta{margin-top:6px;font-size:12px;color:#555}" +
    "section{margin:0 0 18px;break-inside:avoid-page}h2{font-size:16px;margin:0 0 8px;border-bottom:1px solid #ccc;padding-bottom:3px}" +
    "p{margin:0 0 8px}ol{margin:0;padding-left:20px}li{margin:3px 0}" +
    "pre{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:10px 12px;font:12.5px/1.5 Consolas,'Cascadia Code',monospace;white-space:pre-wrap;word-break:break-word;margin:0}" +
    "table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top;white-space:pre-line}th{background:#eee}" +
    "svg{max-width:100%;height:auto}" +
    ".bar{position:sticky;top:0;background:#333;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:center;font-weight:600}" +
    ".bar button{font:700 14px inherit;padding:8px 16px;border-radius:8px;border:2px solid #fff;background:#fff;color:#333;cursor:pointer}" +
    ".bar span{font-size:13px;opacity:.9}" +
    "@media print{.bar{display:none}.doc{padding:0}}";

  function pdf(opts) {
    var date = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    var sheet = opts.stylesheet ? "<link rel=\"stylesheet\" href=\"" + location.origin + "/css/style.css\">" : "";
    var meta = (opts.author ? esc(opts.author) + " · " : "") + esc(date);
    var html = "<!doctype html><html lang=\"es\" style=\"color-scheme:light\"><head><meta charset=\"utf-8\"><meta name=\"color-scheme\" content=\"light\"><title>" + esc(opts.title) + "</title>" + sheet + "<style>" + CSS + "body{padding:0!important}.nsd{min-width:0!important}</style></head><body>" +
      "<div class=\"bar\"><button onclick=\"window.print()\">Guardar como PDF / Imprimir</button><span>En la ventana de impresión elegí “Guardar como PDF”.</span></div>" +
      "<div class=\"doc\"><header><h1>" + esc(opts.title) + "</h1>" +
      (opts.subtitle ? "<p class=\"sub\">" + esc(opts.subtitle) + "</p>" : "") +
      "<div class=\"meta\">" + meta + "</div></header>" +
      (opts.sections || []).filter(Boolean).map(sectionHtml).join("") +
      "</div><script>setTimeout(function(){try{window.print()}catch(e){}},500)<\/script></body></html>";
    var w = window.open("", "_blank");
    if (!w) { file((opts.filename || opts.title || "trabajo") + ".html", html, "text/html"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    done();
  }

  function docx(opts) {
    if (!global.ORTDocx) { pdf(opts); return; }
    global.ORTDocx.build(opts).then(function (blob) {
      downloadBlob(blob, (opts.filename || opts.title || "trabajo").replace(/[\\/:*?"<>|]+/g, "").trim() + ".docx");
      done();
    }).catch(function () {
      if (global.AITool) global.AITool.toast("No se pudo crear el Word. Probá con PDF.");
      else alert("No se pudo crear el Word. Probá con PDF.");
    });
  }

  // Cartelito para elegir formato
  function download(opts) {
    var back = document.createElement("div");
    back.className = "dl-modal-back";
    back.innerHTML = '<div class="dl-modal" role="dialog" aria-label="Descargar">' +
      '<p class="dl-title">¿Cómo lo querés descargar?</p>' +
      '<div class="dl-btns"><button type="button" class="btn btn-primary" data-k="pdf">PDF</button>' +
      '<button type="button" class="btn" data-k="docx">Word (.docx)</button></div>' +
      '<button type="button" class="dl-x" aria-label="Cancelar">Cancelar</button></div>';
    function close() { back.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    back.querySelector(".dl-x").addEventListener("click", close);
    back.querySelector('[data-k="pdf"]').addEventListener("click", function () { close(); pdf(opts); });
    back.querySelector('[data-k="docx"]').addEventListener("click", function () { close(); docx(opts); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(back);
    back.querySelector('[data-k="pdf"]').focus();
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

  function file(name, content, mime) {
    var safe = String(name).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "archivo.txt";
    downloadBlob(new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" }), safe);
    done();
  }

  function done() { if (global.ORT && global.ORT.done) global.ORT.done(); }

  global.ORTDoc = { download: download, pdf: pdf, docx: docx, file: file, esc: esc };
})(window);
