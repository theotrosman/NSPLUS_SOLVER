/*!
 * NS Solver — vista previa de diagramas Nassi-Shneiderman
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
(function (global) {
  "use strict";

  function el(tag, cls, children) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function diagonals(points) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "nsd-diag");
    svg.setAttribute("aria-hidden", "true");
    points.forEach(function (p) {
      var line = document.createElementNS(ns, "line");
      line.setAttribute("x1", p[0]); line.setAttribute("y1", p[1]);
      line.setAttribute("x2", p[2]); line.setAttribute("y2", p[3]);
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(line);
    });
    return svg;
  }

  function seq(statements) {
    var box = el("div", "nsd-seq");
    if (!statements || !statements.length) {
      box.appendChild(el("div", "nsd-empty", [" "]));
      return box;
    }
    statements.forEach(function (s) { box.appendChild(stmt(s)); });
    return box;
  }

  function code(text) { return el("span", "nsd-code", [text]); }

  function loop(headText, statements, bottom) {
    var head = el("div", "nsd-loop-head", [code(headText)]);
    var body = el("div", "nsd-loop-body", [el("div", "nsd-loop-side"), seq(statements)]);
    return el("div", "nsd-loop" + (bottom ? " is-bottom" : ""), bottom ? [body, head] : [head, body]);
  }

  function stmt(s) {
    switch (s.type) {
      case "input":
      case "output":
        return el("div", "nsd-io nsd-" + s.type, [
          el("div", "nsd-io-sym", [s.type === "input" ? "E" : "S"]),
          el("div", "nsd-io-body", [code(s.type === "input" ? s.variable : s.message)])
        ]);
      case "assignment":
        return el("div", "nsd-simple nsd-assign", [code(s.variable + " ← " + s.value)]);
      case "block":
        return el("div", "nsd-simple", [code(s.content)]);
      case "comment":
        return el("div", "nsd-simple nsd-comment", [code("/* " + s.content + " */")]);
      case "break":
        return el("div", "nsd-simple", [code("break")]);
      case "return":
        return el("div", "nsd-simple nsd-return", [code("return " + s.value)]);
      case "call":
        return el("div", "nsd-call", [el("div", "nsd-call-inner", [code(s.statement)])]);
      case "if": {
        var head = el("div", "nsd-if-head", [
          diagonals([[0, 0, 50, 100], [100, 0, 50, 100]]),
          el("span", "nsd-if-v", ["V"]),
          code(s.condition),
          el("span", "nsd-if-f", ["F"])
        ]);
        var body = el("div", "nsd-if-body", [seq(s.then), seq(s.else)]);
        return el("div", "nsd-if", [head, body]);
      }
      case "switch": {
        var n = s.options.length;
        var split = n > 1 ? (100 * (n - 1)) / n : 50;
        var sh = el("div", "nsd-if-head nsd-switch-head", [diagonals([[0, 0, split, 100], [100, 0, split, 100]]), code(s.expression)]);
        var cols = el("div", "nsd-switch-body", s.options.map(function (o) {
          return el("div", "nsd-case", [el("div", "nsd-case-label", [code(o.case)]), seq(o.statements)]);
        }));
        cols.style.gridTemplateColumns = "repeat(" + n + ", minmax(0, 1fr))";
        return el("div", "nsd-if nsd-switch", [sh, cols]);
      }
      case "while":
        return loop(s.condition, s.statements, false);
      case "dowhile":
        return loop(s.condition, s.statements, true);
      case "for":
        return loop(s.variable + " ← " + s.start + ", " + s.stop + ", " + s.step, s.statements, false);
      case "foreach":
        return loop(s.class + " " + s.variable + " : " + s.collection, s.statements, false);
      default:
        return el("div", "nsd-simple", [code(JSON.stringify(s))]);
    }
  }

  function renderDiagram(d) {
    var params = (d.parameters || []).map(function (p) { return p.type + " " + p.name; }).join(", ");
    var vars = el("div", "nsd-vars", (d.variables || []).map(function (v) {
      return el("span", "nsd-var", [v.type + " " + v.name + (v.value != null ? " ← " + v.value : "")]);
    }));
    var head = el("div", "nsd-head", [
      el("div", "nsd-class", ["class " + d.className + ":"]),
      el("div", "nsd-sign", [(d.modifiers ? d.modifiers + " " : "") + d.returnType + " " + d.name + "(" + params + ")"]),
      (d.variables && d.variables.length) ? vars : null
    ]);
    return el("div", "nsd", [head, seq(d.statements)]);
  }

  global.NSPreview = { renderDiagram: renderDiagram };
})(window);
