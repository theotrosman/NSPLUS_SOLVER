/*!
 * UML Solver — armado del diagrama, archivo .uxf de UMLetino y vista previa SVG
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Formato .uxf (UMLet / UMLetino 15): cada clase es un <element> UMLClass y cada flecha un
 * <element> Relation con sus puntos relativos al rectángulo del elemento. Las puntas de las
 * flechas se ubican exactamente sobre el borde de las clases, así UMLetino las deja "pegadas".
 */
(function (global) {
  "use strict";

  var CHAR_W = 7.2;      // ancho aproximado de una letra (zoom 10, fuente por defecto)
  var LINE_H = 17;       // alto de cada renglón
  var SEP = 8;           // espacio de cada separador "--"
  var MIN_W = 160;
  var H_GAP = 100;       // espacio horizontal entre clases
  var V_GAP = 140;       // espacio vertical entre filas (lugar para etiquetas y codos)
  var MARGIN = 40;

  var snap = function (v) { return Math.round(v / 10) * 10; };
  var snapUp = function (v) { return Math.ceil(v / 10) * 10; };

  /* ---------- Texto de cada clase ---------- */

  function methodText(m) {
    return m.visibility + " " + m.name + "(" + (m.params || []).join(",") + "):" + m.returns;
  }

  function classSections(c) {
    var header = [];
    if (c.kind === "interface") header.push({ text: "«interface»" });
    if (c.kind === "enum") header.push({ text: "«enumeration»" });
    header.push({ text: c.name, title: true, italic: c.kind === "abstract" });

    var sections = [header];
    if (c.kind === "enum") {
      sections.push(c.values.map(function (v) { return { text: v }; }));
      if (c.attributes.length) sections.push(c.attributes.map(function (a) { return { text: "- " + a.name + ": " + a.type }; }));
      if (c.methods.length) sections.push(c.methods.map(function (m) { return { text: methodText(m) }; }));
    } else if (c.kind === "interface") {
      sections.push(c.methods.map(function (m) { return { text: methodText(m), italic: true }; }));
    } else {
      sections.push(c.attributes.map(function (a) { return { text: "- " + a.name + ": " + a.type, underline: !!a.static }; }));
      sections.push(c.methods.map(function (m) { return { text: methodText(m), italic: !!m.abstract }; }));
    }
    return sections;
  }

  function measure(c) {
    var sections = classSections(c);
    var longest = 0, h = 6;
    sections.forEach(function (sec, i) {
      sec.forEach(function (l) { longest = Math.max(longest, l.text.length); });
      h += Math.max(sec.length, i === 0 ? 1 : 1) * LINE_H + SEP;
    });
    h += 14; // un poco de aire abajo, como en los diagramas de la materia
    return { w: Math.max(MIN_W, snapUp(longest * CHAR_W + 24)), h: Math.max(80, snapUp(h)), sections: sections };
  }

  /* ---------- Ubicación de las clases ---------- */

  function isStructural(t) { return t === "association" || t === "aggregation" || t === "composition"; }
  function isHierarchy(t) { return t === "inheritance" || t === "implementation"; }

  function layout(uml) {
    var nodes = {};
    uml.classes.forEach(function (c, i) {
      var m = measure(c);
      nodes[c.name] = { cls: c, index: i, w: m.w, h: m.h, sections: m.sections, level: 0, x: 0, y: 0 };
    });
    var names = uml.classes.map(function (c) { return c.name; });

    // Niveles: cada clase va una fila abajo de quien la "tiene" (lo más cerca posible, por
    // recorrido en anchura). La herencia es estricta: la hija siempre abajo del padre.
    var down = {}, hasParent = {}, parentOf = [];
    names.forEach(function (n) { down[n] = []; });
    uml.relations.forEach(function (r) {
      if (isStructural(r.type)) { down[r.from].push(r.to); hasParent[r.to] = true; }
      else if (isHierarchy(r.type)) { down[r.to].push(r.from); hasParent[r.from] = true; parentOf.push([r.to, r.from]); }
    });
    var levelOf = {};
    function bfs(starts) {
      var queue = starts.slice();
      starts.forEach(function (n) { if (levelOf[n] == null) levelOf[n] = 0; });
      while (queue.length) {
        var n = queue.shift();
        down[n].forEach(function (m) {
          if (levelOf[m] == null) { levelOf[m] = levelOf[n] + 1; queue.push(m); }
        });
      }
    }
    bfs(names.filter(function (n) { return !hasParent[n] && down[n].length; }));
    // Ciclos o grupos sin raíz: arranca desde la clase con más relaciones que falte
    names.slice().sort(function (a, b) { return down[b].length - down[a].length; }).forEach(function (n) {
      if (levelOf[n] == null && down[n].length) bfs([n]);
    });
    names.forEach(function (n) { nodes[n].level = levelOf[n] || 0; });
    for (var it = 0; it < names.length; it++) {
      var changed = false;
      parentOf.forEach(function (c) {
        var p = nodes[c[0]], h = nodes[c[1]];
        if (h.level < p.level + 1) { h.level = p.level + 1; changed = true; }
      });
      if (!changed) break;
    }

    // Clases sueltas (sin relaciones, ej: enumerados): a la última fila.
    var linked = {};
    uml.relations.forEach(function (r) { linked[r.from] = linked[r.to] = true; });
    var maxLevel = 0;
    names.forEach(function (n) { if (linked[n]) maxLevel = Math.max(maxLevel, nodes[n].level); });
    var hasLinked = names.some(function (n) { return linked[n]; });
    names.forEach(function (n) { if (!linked[n]) nodes[n].level = hasLinked ? maxLevel + 1 : 0; });

    // Compactar niveles vacíos
    var used = [];
    names.forEach(function (n) { if (used.indexOf(nodes[n].level) < 0) used.push(nodes[n].level); });
    used.sort(function (a, b) { return a - b; });
    names.forEach(function (n) { nodes[n].level = used.indexOf(nodes[n].level); });

    var rows = [];
    names.forEach(function (n) { (rows[nodes[n].level] = rows[nodes[n].level] || []).push(n); });

    // Vecinos para ordenar cada fila según la posición de sus clases relacionadas (baricentro)
    var neighbors = {};
    names.forEach(function (n) { neighbors[n] = []; });
    uml.relations.forEach(function (r) { neighbors[r.from].push(r.to); neighbors[r.to].push(r.from); });

    function placeRow(row) {
      var x = 0;
      row.forEach(function (n) { nodes[n].x = x; x += nodes[n].w + H_GAP; });
      return x - H_GAP;
    }

    rows[0].sort(function (a, b) { return neighbors[b].length - neighbors[a].length || nodes[a].index - nodes[b].index; });
    // La clase con más relaciones va al centro de la primera fila
    if (rows[0].length > 2) {
      var first = rows[0].shift();
      rows[0].splice(Math.floor(rows[0].length / 2), 0, first);
    }
    placeRow(rows[0]);
    for (var l = 1; l < rows.length; l++) {
      var bary = {};
      rows[l].forEach(function (n) {
        var xs = neighbors[n].filter(function (m) { return nodes[m].level < l; }).map(function (m) { return nodes[m].x + nodes[m].w / 2; });
        bary[n] = xs.length ? xs.reduce(function (s, v) { return s + v; }, 0) / xs.length : Infinity;
      });
      rows[l].sort(function (a, b) { return bary[a] - bary[b] || nodes[a].index - nodes[b].index; });
      placeRow(rows[l]);
    }

    // Centrar las filas y calcular las alturas
    var widths = rows.map(function (row) {
      var last = nodes[row[row.length - 1]];
      return last.x + last.w;
    });
    var maxW = Math.max.apply(null, widths);
    var y = MARGIN + 30;
    var rowTop = [], rowBottom = [];
    rows.forEach(function (row, l) {
      var offset = snap((maxW - widths[l]) / 2) + MARGIN;
      var rowH = 0;
      row.forEach(function (n) {
        nodes[n].x = snap(nodes[n].x + offset);
        nodes[n].y = y;
        rowH = Math.max(rowH, nodes[n].h);
      });
      rowTop[l] = y;
      rowBottom[l] = y + rowH;
      y += rowH + V_GAP;
    });

    var edges = routeEdges(uml, nodes, rows, rowTop, rowBottom);
    var bounds = computeBounds(nodes, edges);
    return { nodes: nodes, names: names, edges: edges, bounds: bounds };
  }

  /* ---------- Recorrido de las flechas ---------- */

  function routeEdges(uml, nodes, rows, rowTop, rowBottom) {
    var ports = {}; // "Clase|lado" → lista de extremos que llegan a ese lado
    function addPort(name, side, ref) { var k = name + "|" + side; (ports[k] = ports[k] || []).push(ref); }

    var edges = uml.relations.map(function (r, i) {
      var a = nodes[r.from], b = nodes[r.to];
      var e = { rel: r, index: i, from: r.from, to: r.to };
      if (b.level > a.level) { e.kind = "down"; e.fromSide = "bottom"; e.toSide = "top"; }
      else if (b.level < a.level) { e.kind = "up"; e.fromSide = "top"; e.toSide = "bottom"; }
      else {
        var row = rows[a.level], ia = row.indexOf(r.from), ib = row.indexOf(r.to);
        if (Math.abs(ia - ib) === 1) {
          e.kind = "side";
          e.fromSide = ia < ib ? "right" : "left";
          e.toSide = ia < ib ? "left" : "right";
        } else { e.kind = "over"; e.fromSide = "top"; e.toSide = "top"; }
      }
      e.fromRef = { edge: e, end: "from", other: r.to };
      e.toRef = { edge: e, end: "to", other: r.from };
      addPort(r.from, e.fromSide, e.fromRef);
      addPort(r.to, e.toSide, e.toRef);
      return e;
    });

    // Repartir los extremos a lo largo de cada lado, ordenados según dónde está la otra clase
    Object.keys(ports).forEach(function (k) {
      var parts = k.split("|"), n = nodes[parts[0]], side = parts[1], list = ports[k];
      var horizontal = side === "top" || side === "bottom";
      list.sort(function (p, q) {
        var o1 = nodes[p.other], o2 = nodes[q.other];
        return horizontal ? (o1.x + o1.w / 2) - (o2.x + o2.w / 2) : (o1.y - o2.y);
      });
      list.forEach(function (ref, i) {
        var t = (i + 1) / (list.length + 1);
        if (horizontal) {
          ref.x = snap(n.x + n.w * t);
          ref.y = side === "top" ? n.y : n.y + n.h;
        } else {
          ref.x = side === "left" ? n.x : n.x + n.w;
          ref.y = snap(n.y + Math.min(n.h, 120) * t);
        }
      });
    });

    // Si dos clases están una arriba de la otra, la flecha va derecha (sin codos)
    edges.forEach(function (e) {
      if (e.kind !== "down" && e.kind !== "up") return;
      var a = nodes[e.from], b = nodes[e.to];
      if (ports[e.from + "|" + e.fromSide].length !== 1 || ports[e.to + "|" + e.toSide].length !== 1) return;
      var lo = Math.max(a.x, b.x) + 20, hi = Math.min(a.x + a.w, b.x + b.w) - 20;
      if (hi - lo >= 0) { var x = snap((lo + hi) / 2); e.fromRef.x = e.toRef.x = x; }
    });
    edges.forEach(function (e) {
      if (e.kind === "side") {
        var y = snap((e.fromRef.y + e.toRef.y) / 2);
        var a = nodes[e.from], b = nodes[e.to];
        if (y > a.y && y < a.y + a.h && y > b.y && y < b.y + b.h) e.fromRef.y = e.toRef.y = y;
      }
    });

    // Canales: cada flecha con codo usa una altura distinta dentro del hueco entre filas
    var channels = {};
    function channel(key) { channels[key] = (channels[key] || 0) + 1; return channels[key] - 1; }

    edges.forEach(function (e) {
      var s = { x: e.fromRef.x, y: e.fromRef.y }, t = { x: e.toRef.x, y: e.toRef.y };
      var pts;
      var la = nodes[e.from].level;
      if (e.kind === "down" || e.kind === "up") {
        if (s.x === t.x) pts = [s, t];
        else {
          var midY = e.kind === "down"
            ? rowBottom[la] + 40 + channel("gap" + la) * 12
            : rowTop[la] - 40 - channel("gap" + (la - 1)) * 12;
          pts = [s, { x: s.x, y: midY }, { x: t.x, y: midY }, t];
        }
      } else if (e.kind === "side") {
        pts = s.y === t.y ? [s, t] : [s, { x: snap((s.x + t.x) / 2), y: s.y }, { x: snap((s.x + t.x) / 2), y: t.y }, t];
      } else {
        var topY = rowTop[la] - 30 - channel("over" + la) * 12;
        pts = [s, { x: s.x, y: topY }, { x: t.x, y: topY }, t];
      }
      e.points = pts;
    });
    return edges;
  }

  function labelWidth(text) { return text ? text.length * CHAR_W : 0; }

  function computeBounds(nodes, edges) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
    });
    edges.forEach(function (e) {
      e.points.forEach(function (p) {
        minX = Math.min(minX, p.x - 60); maxX = Math.max(maxX, p.x + 60 + labelWidth(e.rel.role));
        minY = Math.min(minY, p.y - 20); maxY = Math.max(maxY, p.y + 20);
      });
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /* ---------- Archivo .uxf ---------- */

  function xml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function classPanel(c) {
    var name = c.kind === "abstract" ? "/" + c.name + "/" : c.name;
    var lines = [];
    if (c.kind === "interface") lines.push("<<interface>>");
    if (c.kind === "enum") lines.push("<<enumeration>>");
    lines.push(name);
    var methods = c.methods.map(function (m) {
      var t = methodText(m);
      return m.abstract && c.kind !== "interface" ? "/" + t + "/" : t;
    });
    var attrs = c.attributes.map(function (a) {
      var t = "- " + a.name + ": " + a.type;
      return a.static ? "_" + t + "_" : t;
    });
    if (c.kind === "enum") {
      lines.push("--");
      lines = lines.concat(c.values);
      if (attrs.length) { lines.push("--"); lines = lines.concat(attrs); }
      if (methods.length) { lines.push("--"); lines = lines.concat(methods); }
    } else if (c.kind === "interface") {
      lines.push("--");
      lines = lines.concat(methods);
    } else {
      lines.push("--");
      lines = lines.concat(attrs);
      lines.push("--");
      lines = lines.concat(methods);
    }
    return lines.join("\n");
  }

  // Tipo de línea de UMLet. "reverse": la punta especial va en el primer punto.
  function relStyle(r) {
    switch (r.type) {
      case "inheritance": return { lt: "<<-", reverse: true };
      case "implementation": return { lt: "<<.", reverse: true };
      case "aggregation": return { lt: "<<<<-", reverse: false };
      case "composition": return { lt: "<<<<<-", reverse: false };
      case "dependency": return { lt: "<.", reverse: true };
      default: return { lt: "->", reverse: false };
    }
  }

  function relationPanel(r) {
    var st = relStyle(r);
    var lines = ["lt=" + st.lt];
    if (r.role) lines.push("r2=- " + r.role);
    if (r.multiplicity) lines.push("m2=" + r.multiplicity);
    return lines.join("\n");
  }

  function element(id, x, y, w, h, panel, extra) {
    return "  <element>\n" +
      "    <id>" + id + "</id>\n" +
      "    <coordinates>\n" +
      "      <x>" + Math.round(x) + "</x>\n" +
      "      <y>" + Math.round(y) + "</y>\n" +
      "      <w>" + Math.round(w) + "</w>\n" +
      "      <h>" + Math.round(h) + "</h>\n" +
      "    </coordinates>\n" +
      "    <panel_attributes>" + xml(panel) + "</panel_attributes>\n" +
      "    <additional_attributes>" + (extra || "") + "</additional_attributes>\n" +
      "  </element>\n";
  }

  function buildUxf(uml) {
    var L = layout(uml);
    var out = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
      '<diagram program="umlet" version="15.1">\n' +
      "  <zoom_level>10</zoom_level>\n" +
      "  <help_text>// " + xml(uml.name) + "\n// Hecho con ORT Info es fácil · UML Solver · © 2026 Theo Trosman</help_text>\n";
    L.names.forEach(function (n) {
      var node = L.nodes[n];
      out += element("UMLClass", node.x, node.y, node.w, node.h, classPanel(node.cls));
    });
    L.edges.forEach(function (e) {
      var st = relStyle(e.rel);
      var pts = st.reverse ? e.points.slice().reverse() : e.points;
      var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
      // Todo en números enteros: así las puntas caen justo sobre el borde de las clases.
      var padX = snapUp(Math.max(30, labelWidth(e.rel.role ? "- " + e.rel.role : "") + 20, labelWidth(e.rel.multiplicity) + 20));
      var padY = 30;
      var ex = Math.min.apply(null, xs) - padX, ey = Math.min.apply(null, ys) - padY;
      var ew = Math.max.apply(null, xs) - Math.min.apply(null, xs) + padX * 2;
      var eh = Math.max.apply(null, ys) - Math.min.apply(null, ys) + padY * 2;
      var rel = pts.map(function (p) { return Math.round(p.x - ex).toFixed(1) + ";" + Math.round(p.y - ey).toFixed(1); }).join(";");
      out += element("Relation", ex, ey, ew, eh, relationPanel(e.rel), rel);
    });
    out += "</diagram>\n";
    return out;
  }

  /* ---------- Vista previa SVG ---------- */

  var SVG_NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs, text) {
    var parts = ["<" + tag];
    Object.keys(attrs || {}).forEach(function (k) { parts.push(" " + k + '="' + xml(attrs[k]) + '"'); });
    if (text == null) return parts.join("") + "/>";
    return parts.join("") + ">" + xml(text) + "</" + tag + ">";
  }

  function buildSvg(uml) {
    var L = layout(uml);
    var b = L.bounds, pad = 20;
    var vx = b.x - pad, vy = b.y - pad, vw = b.w + pad * 2, vh = b.h + pad * 2;
    var s = [];
    s.push('<svg xmlns="' + SVG_NS + '" viewBox="' + [vx, vy, vw, vh].join(" ") + '" width="' + vw + '" height="' + vh + '" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13">');
    s.push('<defs>' +
      '<marker id="u-open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#1b2130" stroke-width="1.3"/></marker>' +
      '<marker id="u-tri" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="16" markerHeight="16" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1,1 L15,8 L1,15 Z" fill="#fff" stroke="#1b2130" stroke-width="1.3"/></marker>' +
      '<marker id="u-dia" viewBox="0 0 22 12" refX="1" refY="6" markerWidth="22" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,6 L11,1 L21,6 L11,11 Z" fill="#fff" stroke="#1b2130" stroke-width="1.3"/></marker>' +
      '<marker id="u-dia-f" viewBox="0 0 22 12" refX="1" refY="6" markerWidth="22" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,6 L11,1 L21,6 L11,11 Z" fill="#1b2130" stroke="#1b2130" stroke-width="1.3"/></marker>' +
      '</defs>');
    s.push(svgEl("rect", { x: vx, y: vy, width: vw, height: vh, fill: "#ffffff" }));

    // Flechas
    L.edges.forEach(function (e) {
      var r = e.rel, pts = e.points;
      var d = pts.map(function (p, i) { return (i ? "L" : "M") + p.x + "," + p.y; }).join(" ");
      var attrs = { d: d, fill: "none", stroke: "#1b2130", "stroke-width": 1.2 };
      if (r.type === "implementation" || r.type === "dependency") attrs["stroke-dasharray"] = "6 4";
      if (r.type === "association") attrs["marker-end"] = "url(#u-open)";
      if (r.type === "dependency") attrs["marker-end"] = "url(#u-open)";
      if (r.type === "inheritance" || r.type === "implementation") attrs["marker-end"] = "url(#u-tri)";
      if (r.type === "aggregation") attrs["marker-start"] = "url(#u-dia)";
      if (r.type === "composition") attrs["marker-start"] = "url(#u-dia-f)";
      s.push(svgEl("path", attrs));

      // Etiquetas cerca de la punta (rol y multiplicidad), como las ubica UMLetino
      var end = pts[pts.length - 1], prev = pts[pts.length - 2];
      var vertical = prev.x === end.x;
      var role = r.role ? "- " + r.role : "", mult = r.multiplicity || "";
      if (vertical) {
        var dir = end.y > prev.y ? -1 : 1;
        if (role) s.push(svgEl("text", { x: end.x + 7, y: end.y + dir * 30 + (dir > 0 ? 10 : 0), fill: "#1b2130" }, role));
        if (mult) s.push(svgEl("text", { x: end.x + 7, y: end.y + dir * 12 + (dir > 0 ? 10 : 0), fill: "#1b2130" }, mult));
      } else {
        var right = end.x > prev.x;
        var tx = right ? end.x - 14 : end.x + 14, anchor = right ? "end" : "start";
        if (role) s.push(svgEl("text", { x: tx, y: end.y - 6, "text-anchor": anchor, fill: "#1b2130" }, role));
        if (mult) s.push(svgEl("text", { x: tx, y: end.y + 16, "text-anchor": anchor, fill: "#1b2130" }, mult));
      }
    });

    // Clases
    L.names.forEach(function (n) {
      var node = L.nodes[n];
      s.push(svgEl("rect", { x: node.x, y: node.y, width: node.w, height: node.h, fill: "#ffffff", stroke: "#1b2130", "stroke-width": 1.2 }));
      var y = node.y + 4;
      node.sections.forEach(function (sec, i) {
        if (i > 0) {
          s.push(svgEl("line", { x1: node.x, y1: y + SEP / 2, x2: node.x + node.w, y2: y + SEP / 2, stroke: "#1b2130", "stroke-width": 1 }));
          y += SEP;
        } else y += 2;
        sec.forEach(function (l) {
          y += LINE_H;
          var center = i === 0;
          var attrs = {
            x: center ? node.x + node.w / 2 : node.x + 6,
            y: y - 4,
            "text-anchor": center ? "middle" : "start",
            fill: "#1b2130"
          };
          if (l.italic) attrs["font-style"] = "italic";
          if (l.underline) attrs["text-decoration"] = "underline";
          s.push(svgEl("text", attrs, l.text));
        });
        if (sec.length === 0) y += LINE_H;
      });
    });
    s.push("</svg>");
    return s.join("");
  }

  global.UMLLayout = { layout: layout, buildUxf: buildUxf, buildSvg: buildSvg, methodText: methodText };
})(typeof window !== "undefined" ? window : globalThis);
