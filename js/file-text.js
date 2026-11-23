/*!
 * ORT Info es fácil — lectura de texto de varios tipos de archivo
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * FileText.read(file) → texto. Soporta PDF (pdf.js), Word .docx (fflate),
 * RTF básico, y archivos de texto (.txt, .csv, .sql, .html, .cs, .java, .md…).
 */
(function (global) {
  "use strict";

  // Tipos de archivo que se pueden subir (para el atributo accept de los <input>)
  var ACCEPT = ".pdf,.docx,.doc,.rtf,.txt,.csv,.tsv,.md,.sql,.html,.htm,.css,.js,.ts,.cs,.java,.json,.xml,.py," +
    "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/rtf,text/*";

  function entities(s) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); });
  }

  async function readDocx(file) {
    var fflate = await import("https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js");
    var buf = new Uint8Array(await file.arrayBuffer());
    var files = fflate.unzipSync(buf, { filter: function (f) { return f.name === "word/document.xml"; } });
    var xmlBytes = files["word/document.xml"];
    if (!xmlBytes) throw new Error("docx sin documento");
    var xml = new TextDecoder("utf-8").decode(xmlBytes);
    var text = xml
      .replace(/<w:tab\b[^>]*\/?>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br\b[^>]*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "");
    return entities(text).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function stripRtf(s) {
    return entities(String(s)
      .replace(/\\par[d]?\b/g, "\n")
      .replace(/\\line\b/g, "\n")
      .replace(/\\tab\b/g, "\t")
      .replace(/\\'[0-9a-fA-F]{2}/g, "")
      .replace(/\{\\\*[^{}]*\}/g, "")
      .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
      .replace(/[{}]/g, ""))
      .replace(/\n{3,}/g, "\n\n").trim();
  }

  async function read(file) {
    var name = (file.name || "").toLowerCase();
    var type = file.type || "";
    if (/pdf/.test(type) || name.endsWith(".pdf")) {
      if (!global.PDFText) throw new Error("Falta el lector de PDF en esta página.");
      return global.PDFText.extractText(file);
    }
    if (name.endsWith(".docx")) return readDocx(file);
    if (name.endsWith(".doc")) throw new Error("Los .doc viejos de Word no se pueden leer. Guardalo como .docx o PDF, o copiá y pegá el texto.");
    if (name.endsWith(".rtf") || /rtf/.test(type)) return stripRtf(await file.text());
    if (/^text\//.test(type) || /\.(txt|csv|tsv|md|sql|html?|css|js|ts|cs|java|json|xml|py)$/.test(name)) {
      return (await file.text()).replace(/\r\n/g, "\n");
    }
    // Último intento: leerlo como texto; si parece texto real, lo usamos
    try {
      var t = await file.text();
      if (t && /[a-záéíóúñ]{3}/i.test(t.slice(0, 2000))) return t.replace(/\r\n/g, "\n");
    } catch (e) { /* nada */ }
    throw new Error("No pude leer ese archivo. Subí un PDF, un Word (.docx) o pegá el texto.");
  }

  global.FileText = { read: read, ACCEPT: ACCEPT };
})(window);
