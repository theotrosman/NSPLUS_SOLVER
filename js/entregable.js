/*!
 * ORT Info es fácil — entregables descargables
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * ORTDoc.pdf({...})   abre el entregable listo para imprimir / "Guardar como PDF".
 * ORTDoc.file(n, t)   descarga un archivo de texto (.sql, .java, .csv, etc.).
 * Secciones: { title, text } · { title, pre } · { title, html } · { title, table: { head: [], rows: [[]] } } · { title, list: [] }
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
    if (s.html) out += s.html; // ya armado por la herramienta (por ejemplo un SVG)
    return out + "</section>";
  }

  var CSS =
    "@page{size:A4;margin:16mm 14mm}" +
    "*{box-sizing:border-box}body{margin:0;font:14px/1.55 'Segoe UI',Roboto,Arial,sans-serif;color:#1b2130;background:#fff}" +
    ".doc{max-width:820px;margin:0 auto;padding:28px 24px 40px}" +
    "header{border-bottom:3px solid #3f51b5;padding-bottom:12px;margin-bottom:18px}" +
    ".kicker{margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3f51b5}" +
    "h1{margin:4px 0 2px;font-size:26px;line-height:1.2}.sub{margin:0;color:#485064}" +
    ".meta{margin-top:8px;font-size:12px;color:#7b8295;display:flex;gap:16px;flex-wrap:wrap}" +
    "section{margin:0 0 20px;break-inside:avoid-page}h2{font-size:16px;margin:0 0 8px;color:#3f51b5;border-bottom:1px solid #dedad0;padding-bottom:4px}" +
    "p{margin:0 0 8px}ol{margin:0;padding-left:20px}li{margin:3px 0}" +
    "pre{background:#f4f2ec;border:1px solid #dedad0;border-radius:8px;padding:10px 12px;font:12.5px/1.5 Consolas,'Cascadia Code',monospace;white-space:pre-wrap;word-break:break-word;margin:0}" +
    "table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #cdc8bb;padding:5px 8px;text-align:left;vertical-align:top;white-space:pre-line}th{background:#eef0fb}" +
    "svg{max-width:100%;height:auto}" +
    "footer{margin-top:26px;border-top:1px solid #dedad0;padding-top:10px;font-size:11px;color:#7b8295;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}" +
    ".bar{position:sticky;top:0;background:#3f51b5;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:center;font-weight:600}" +
    ".bar button{font:700 14px inherit;padding:8px 16px;border-radius:8px;border:2px solid #fff;background:#fff;color:#3f51b5;cursor:pointer}" +
    ".bar span{font-size:13px;opacity:.9}" +
    "@media print{.bar{display:none}.doc{padding:0}}";

  function pdf(opts) {
    var date = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    var sheet = opts.stylesheet ? "<link rel=\"stylesheet\" href=\"" + location.origin + "/css/style.css\">" : "";
    var html = "<!doctype html><html lang=\"es\" style=\"color-scheme:light\"><head><meta charset=\"utf-8\"><meta name=\"color-scheme\" content=\"light\"><title>" + esc(opts.title) + "</title>" + sheet + "<style>" + CSS + "body{padding:0!important}.nsd{min-width:0!important}</style></head><body>" +
      "<div class=\"bar\"><button onclick=\"window.print()\">Guardar como PDF / Imprimir</button><span>En la ventana de impresión elegí “Guardar como PDF”.</span></div>" +
      "<div class=\"doc\"><header><p class=\"kicker\">" + esc(opts.tool || "ORT Info es fácil") + "</p><h1>" + esc(opts.title) + "</h1>" +
      (opts.subtitle ? "<p class=\"sub\">" + esc(opts.subtitle) + "</p>" : "") +
      "<div class=\"meta\"><span>" + esc(date) + "</span>" + (opts.author ? "<span>" + esc(opts.author) + "</span>" : "") + "</div></header>" +
      (opts.sections || []).filter(Boolean).map(sectionHtml).join("") +
      "<footer><span>Hecho con ORT Info es fácil · " + esc(opts.tool || "") + "</span><span>© 2026 Theo Trosman · github.com/theotrosman</span></footer>" +
      "</div><script>setTimeout(function(){try{window.print()}catch(e){}},500)<\/script></body></html>";
    var w = window.open("", "_blank");
    if (!w) {
      // Si el navegador bloquea la ventana, se descarga como .html (se abre y se imprime igual)
      file((opts.filename || opts.title || "entregable") + ".html", html, "text/html");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    if (global.ORT && global.ORT.done) global.ORT.done();
  }

  function file(name, content, mime) {
    var safe = String(name).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "entregable.txt";
    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    if (global.ORT && global.ORT.done) global.ORT.done();
  }

  global.ORTDoc = { pdf: pdf, file: file, esc: esc };
})(window);
