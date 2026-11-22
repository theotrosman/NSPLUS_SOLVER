/*!
 * NS Solver — generador de archivos .nsplus
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Convierte un diagrama en JSON (formato de NS Solver) al formato de proyecto
 * que abre NS Plus (https://nsplus.netlify.app). NS Solver no es una herramienta
 * oficial de NS Plus ni de ORT.
 */
(function (global) {
  "use strict";

  var SYM = { TRUE: "V", FALSE: "F", INPUT: "E", OUTPUT: "S" };
  var ANCHOR = '<i class="fa fa-xs fa-arrows"></i>';
  var ARROW = '<span class="arrow">&larr;</span>';

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function createBuilder(counter) {
    function block(cls, inner, droppable, draggable) {
      var id = counter.next++;
      return '<div id="xnsd-' + cls + "-" + id + '" droppable="' + (droppable || "false") + '" class="' + cls + '"' +
        (draggable ? ' draggable="true"' : "") + ">" + (inner || "") + "</div>";
    }
    function fixed(v) { return '<div class="fixed-value-in-statement">' + v + "</div>"; }
    function input(v) { return '<input class="input-for-statement" type="text" value="' + esc(v) + '">'; }
    function empty() { return block("empty", "", "true"); }

    function corner(side, caption) {
      var opt = block("option-block", '<canvas class="corner corner-' + side + '"></canvas>' + block("caption", caption));
      return block("option " + side, opt);
    }

    // Igual que NS Plus: una caja vacía antes, entre y después de cada instrucción
    // (son los lugares donde se pueden soltar bloques nuevos al editar).
    function seq(statements) {
      if (!statements || !statements.length) return empty();
      return empty() + statements.map(function (s) { return stmt(s) + empty(); }).join("");
    }

    function list(cls, statements) {
      return block(cls, seq(statements));
    }

    function loop(controlHtml, statements, cls) {
      var controller = block("controller",
        block("top", "&nbsp;") + block("content-block", block("content", controlHtml)) + block("bottom", "&nbsp;"));
      return block(cls + " block-container", block("container", controller + list("statements", statements)), "false", true);
    }

    function stmt(s) {
      switch (s.type) {
        case "block":
          return block("block-statement", block("content", input(s.content)), "false", true);
        case "assignment":
          return block("assignment-statement", input(s.variable) + fixed(" " + ARROW + " ") + input(s.value), "false", true);
        case "comment":
          return block("comment-statement", fixed("/* ") + input(s.content) + fixed(" */"), "false", true);
        case "if": {
          var header = block("header", corner("true", SYM.TRUE) + block("condition", input(s.condition)) + corner("false", SYM.FALSE));
          var body = block("body", list("then", s.then) + list("else", s.else));
          return block("conditional-statement conditional block-container", header + body, "false", true);
        }
        case "switch": {
          var sh = block("header", corner("true", "&nbsp;") + block("condition", input(s.expression)) + corner("false", "&nbsp;"));
          var cases = (s.options || []).map(function (opt) {
            var buttons = '<a type="button" class="switch-button switch-add-button"><i class="fa fa-sm fa-plus"></i></a>' +
              '<a type="button" class="switch-button switch-remove-button"><i class="fa fa-sm fa-minus"></i></a>';
            return block("case", block("test-value", input(opt.case) + buttons) + list("statements", opt.statements));
          }).join("");
          return block("conditional-statement switch block-container", sh + block("body", cases), "false", true);
        }
        case "break":
          return block("break-statement", fixed("break"), "false", true);
        case "input":
          return block("input-statement", block("symbol", SYM.INPUT) + block("body", input(s.variable)), "false", true);
        case "output":
          return block("output-statement", block("symbol", SYM.OUTPUT) + block("body", input(s.message)), "false", true);
        case "while":
          return block("while-statement block-container",
            block("condition-block", block("condition", input(s.condition))) +
            block("container", block("side-while") + list("statements", s.statements)), "false", true);
        case "dowhile":
          return block("dowhile-statement block-container",
            block("container", block("side-dowhile") + list("statements", s.statements)) +
            block("condition-block", block("condition", input(s.condition))), "false", true);
        case "for":
          return loop(input(s.variable) + fixed(ARROW) + input(s.start) + fixed(",") + input(s.stop) + fixed(",") + input(s.step),
            s.statements, "for-statement");
        case "foreach":
          return loop(input(s.class) + input(s.variable) + fixed(":") + input(s.collection), s.statements, "for-statement");
        case "call":
          return block("call-statement", block("margin left", "&nbsp;") + block("call", input(s.statement)) + block("margin right", "&nbsp;"), "false", true);
        case "return":
          return block("return-statement", fixed("return ") + input(s.value), "false", true);
        default:
          return block("block-statement", block("content", input(JSON.stringify(s))), "false", true);
      }
    }

    function variable(v) {
      if (v.value != null && v.value !== "") {
        var assign = block("assignment-statement", input(v.name) + fixed(" " + ARROW + " ") + input(v.value));
        return block("initialized-variable-declaration", fixed(ANCHOR) + block("type", input(v.type)) + assign, "false", true);
      }
      return block("variable-declaration", fixed(ANCHOR) + block("type", input(v.type)) + block("name", input(v.name)), "false", true);
    }

    function diagram(d) {
      var params = (d.parameters || []).map(function (p, i) {
        return block("parameter-declaration", (i > 0 ? " , " : "") + fixed(ANCHOR) + block("type", input(p.type)) + block("name", input(p.name)), "false", true);
      }).join("");
      var decl = block("method-declaration",
        block("class-declaration", fixed("class") + block("class-name", input(d.className)) + fixed(":")) +
        block("method-signature",
          block("method-modifiers", input(d.modifiers)) +
          block("method-type", input(d.returnType)) +
          block("method-name", input(d.name)) +
          fixed("(") + block("method-parameters", params) + fixed(")")));
      var isConst = function (v) { return /\b(final|const)\b/.test(v.type) ? 1 : 0; };
      var vars = (d.variables || []).slice().sort(function (a, b) { return isConst(b) - isConst(a); });
      var locals = block("local-variable-declaration", vars.map(variable).join(""));
      return decl + locals + block("statements", seq(d.statements), "true");
    }

    return { diagram: diagram };
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  /**
   * project: { name, diagrams: [ {className, modifiers, returnType, name, parameters, variables, statements} ] }
   * options: { author, group }
   * Devuelve el texto del archivo .nsplus.
   */
  function buildProjectFile(project, options) {
    options = options || {};
    var counter = { next: 0 };
    var builder = createBuilder(counter);
    var now = new Date().toISOString();
    var usr = options.author || "Sin autor";
    var com = options.group || "Sin comisión";
    var data = {
      name: project.name || "Proyecto sin título",
      diagrams: project.diagrams.map(function (d, i) {
        return { id: "NSPDiagram-" + (i + 1), theClass: d.className, name: d.name, code: builder.diagram(d) };
      }),
      usr: usr,
      uid: null,
      com: com,
      date: now,
      minutes: 0
    };
    data.meta = b64(JSON.stringify([{ d: now, i: { usr: usr, com: com, start: now, minutes: 0 } }]));
    return JSON.stringify({ ver: 0.5, data: b64(JSON.stringify(data)).split("").reverse().join("") });
  }

  global.NSPlusFile = { buildProjectFile: buildProjectFile };
})(typeof window !== "undefined" ? window : globalThis);
