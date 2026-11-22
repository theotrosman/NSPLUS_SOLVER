/*!
 * NS Solver — lectura de texto de PDFs en el navegador
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Usa pdf.js (Mozilla, licencia Apache 2.0) cargado desde un CDN solo cuando hace falta.
 */
(function (global) {
  "use strict";

  var PDFJS_VERSION = "4.10.38";
  var BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@" + PDFJS_VERSION + "/build/";
  var loader = null;

  function loadPdfJs() {
    if (!loader) {
      loader = import(BASE + "pdf.min.mjs").then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.mjs";
        return lib;
      }).catch(function (err) {
        loader = null;
        throw err;
      });
    }
    return loader;
  }

  function pageToText(content) {
    var out = "";
    var lastY = null;
    content.items.forEach(function (item) {
      if (typeof item.str !== "string") return;
      var y = item.transform ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !/\n$/.test(out)) out += "\n";
      out += item.str;
      if (item.hasEOL) out += "\n";
      lastY = y;
    });
    return out;
  }

  async function extractText(file) {
    var lib = await loadPdfJs();
    var data = new Uint8Array(await file.arrayBuffer());
    var pdf = await lib.getDocument({ data: data, isEvalSupported: false }).promise;
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      pages.push(pageToText(await page.getTextContent()));
    }
    await pdf.destroy();
    return pages.join("\n\n")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  global.PDFText = { extractText: extractText };
})(window);
