/*!
 * ORT Info es fácil — generador de .docx (Word) para los entregables
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * ORTDocx.build(opts) -> Promise<Blob>. Mismas "sections" que el PDF:
 * { title, text } · { title, pre } · { title, list } · { title, table:{head,rows} } · { title, html (SVG) }
 * El documento NO lleva ninguna marca: es un trabajo de alumno (título + fecha y el contenido).
 */
(function (global) {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function run(text, o) {
    o = o || {};
    var rPr = "";
    if (o.b) rPr += "<w:b/>";
    if (o.i) rPr += "<w:i/>";
    if (o.mono) rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>';
    if (o.sz) rPr += '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>';
    if (o.color) rPr += '<w:color w:val="' + o.color + '"/>';
    rPr = rPr ? "<w:rPr>" + rPr + "</w:rPr>" : "";
    var parts = String(text).split("\n");
    var t = "";
    for (var i = 0; i < parts.length; i++) { if (i) t += "<w:br/>"; t += '<w:t xml:space="preserve">' + esc(parts[i]) + "</w:t>"; }
    return "<w:r>" + rPr + t + "</w:r>";
  }

  function para(runs, o) {
    o = o || {};
    var pPr = "";
    if (o.before || o.after) pPr += '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after || 0) + '"/>';
    if (o.shd) pPr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shd + '"/>';
    if (o.border) pPr += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="D0CCC2"/></w:pBdr>';
    pPr = pPr ? "<w:pPr>" + pPr + "</w:pPr>" : "";
    return "<w:p>" + pPr + (runs || "") + "</w:p>";
  }

  function tableXml(head, rows) {
    var border = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="BBB6AA"/><w:left w:val="single" w:sz="4" w:color="BBB6AA"/><w:bottom w:val="single" w:sz="4" w:color="BBB6AA"/><w:right w:val="single" w:sz="4" w:color="BBB6AA"/><w:insideH w:val="single" w:sz="4" w:color="BBB6AA"/><w:insideV w:val="single" w:sz="4" w:color="BBB6AA"/></w:tblBorders>';
    var tblPr = '<w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + border + '<w:tblLayout w:type="autofit"/></w:tblPr>';
    function cell(text, isHead) {
      var shd = isHead ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF0FB"/>' : "";
      return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>' + shd + '</w:tcPr>' + para(run(text, { sz: 19, b: !!isHead })) + "</w:tc>";
    }
    var out = "<w:tbl>" + tblPr;
    if (head && head.length) out += "<w:tr>" + head.map(function (h) { return cell(h, true); }).join("") + "</w:tr>";
    (rows || []).forEach(function (r) { out += "<w:tr>" + r.map(function (c) { return cell(c, false); }).join("") + "</w:tr>"; });
    return out + "</w:tbl>" + para("");
  }

  // SVG string -> PNG (Uint8Array) con tamaño en px
  function rasterize(svg) {
    return new Promise(function (resolve, reject) {
      var m = svg.match(/width="(\d+(?:\.\d+)?)"[^>]*height="(\d+(?:\.\d+)?)"/) || svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
      var w = m ? +m[1] : 600, h = m ? +m[2] : 400;
      var img = new Image();
      var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      img.onload = function () {
        var s = 2;
        var cw = Math.round((img.naturalWidth || w) * s), ch = Math.round((img.naturalHeight || h) * s);
        var c = document.createElement("canvas"); c.width = cw; c.height = ch;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(img, 0, 0, cw, ch);
        c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { URL.revokeObjectURL(url); resolve({ bytes: new Uint8Array(ab), w: img.naturalWidth || w, h: img.naturalHeight || h }); }); }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("svg")); };
      img.src = url;
    });
  }

  function imageXml(rid, id, wPx, hPx) {
    var maxW = 15.5 * 360000; // 15.5 cm en EMU
    var cx = Math.round(wPx * 9525), cy = Math.round(hPx * 9525);
    if (cx > maxW) { cy = Math.round(cy * maxW / cx); cx = Math.round(maxW); }
    return para('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="' + id + '" name="imagen' + id + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="imagen' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>');
  }

  async function build(opts) {
    var media = [], rels = [];
    var body = "";

    // Título y fecha (sin ninguna marca)
    body += para(run(opts.title || "Trabajo", { b: true, sz: 36 }), { after: 40 });
    var meta = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    if (opts.author) meta = opts.author + " · " + meta;
    body += para(run(meta, { color: "666666", sz: 18 }), { after: 160, border: true });
    if (opts.subtitle) body += para(run(opts.subtitle, { color: "444444", sz: 22 }), { after: 120 });

    for (var s = 0; s < (opts.sections || []).length; s++) {
      var sec = opts.sections[s];
      if (!sec) continue;
      if (sec.title) body += para(run(sec.title, { b: true, sz: 26, color: "1B2130" }), { before: 240, after: 60 });
      if (sec.text) String(sec.text).split(/\n{2,}/).forEach(function (pp) { body += para(run(pp, { sz: 22 }), { after: 80 }); });
      if (sec.pre) body += para(run(sec.pre, { mono: true, sz: 20 }), { shd: "F4F2EC", after: 80 });
      if (sec.list) sec.list.forEach(function (it, i) { body += para(run((i + 1) + ". " + it, { sz: 22 }), { after: 20 }); });
      if (sec.table) body += tableXml(sec.table.head, sec.table.rows);
      if (sec.html) {
        var svg = String(sec.html).trim();
        if (/^<svg[\s>]/i.test(svg)) {
          try {
            var png = await rasterize(svg);
            var n = media.length + 1;
            media.push({ name: "word/media/imagen" + n + ".png", bytes: png.bytes });
            rels.push('<Relationship Id="rIdImg' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/imagen' + n + '.png"/>');
            body += imageXml("rIdImg" + n, 100 + n, png.w, png.h);
          } catch (e) {
            body += para(run("(El diagrama se ve en la versión PDF o en el archivo descargable.)", { i: true, color: "666666", sz: 20 }));
          }
        } else {
          body += para(run("(El diagrama se ve en la versión PDF o en el archivo descargable.)", { i: true, color: "666666", sz: 20 }));
        }
      }
    }

    var sectPr = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
    var document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
      '<w:body>' + body + sectPr + '</w:body></w:document>';

    var types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>';
    var mainRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join("") + '</Relationships>';

    var fflate = await import("https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js");
    var enc = new TextEncoder();
    var zip = {
      "[Content_Types].xml": enc.encode(types),
      "_rels/.rels": enc.encode(mainRels),
      "word/document.xml": enc.encode(document),
      "word/_rels/document.xml.rels": enc.encode(docRels)
    };
    media.forEach(function (m) { zip[m.name] = m.bytes; });
    var bytes = fflate.zipSync(zip, { level: 6 });
    return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  global.ORTDocx = { build: build };
})(window);
