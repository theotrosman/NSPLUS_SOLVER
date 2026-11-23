/*!
 * Simplificador booleano — motor de álgebra de Boole paso a paso
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Aplica las leyes que se usan en SSI (Involución, Complementación, Identidad, Idempotencia,
 * Absorción, De Morgan, Factor común, Distributiva, Conmutativa) una por renglón, con el mismo
 * formato que la guía de ejercicios: "Ley) expresión" y al final "Fs = ...".
 * No usa IA: todo se calcula, y el resultado se verifica con la tabla de verdad.
 */
(function (global) {
  "use strict";

  /* ================= Árbol de la expresión ================= */
  // { k:"v", n:"A" } variable · { k:"c", v:0|1 } constante · { k:"n", a } negación
  // { k:"a", xs:[...] } producto (AND) · { k:"o", xs:[...] } suma (OR)

  var V = function (n) { return { k: "v", n: n }; };
  var C = function (v) { return { k: "c", v: v }; };
  var N = function (a) { return { k: "n", a: a }; };

  function mk(k, xs) {
    var out = [];
    xs.forEach(function (x) { if (x.k === k) out.push.apply(out, x.xs); else out.push(x); });
    if (out.length === 0) return C(k === "a" ? 1 : 0);
    if (out.length === 1) return out[0];
    return { k: k, xs: out };
  }
  var A = function (xs) { return mk("a", xs); };
  var O = function (xs) { return mk("o", xs); };

  function key(t) {
    switch (t.k) {
      case "v": return t.n;
      case "c": return String(t.v);
      case "n": return "~" + key(t.a);
      case "a": return "(" + t.xs.map(key).sort().join("*") + ")";
      default: return "(" + t.xs.map(key).sort().join("+") + ")";
    }
  }
  var same = function (x, y) { return key(x) === key(y); };
  var isNotOf = function (x, y) { return (x.k === "n" && same(x.a, y)) || (y.k === "n" && same(y.a, x)); };
  var factors = function (t) { return t.k === "a" ? t.xs : [t]; };
  var terms = function (t) { return t.k === "o" ? t.xs : [t]; };

  /* ================= Lectura (parser) ================= */
  // Acepta: A B C (variables), 0 1, + (o), producto implícito o con · * . & ∧,
  // negación con ' ’ ´ ` ′ después, o ~ ! ¬ antes. Agrupar con ( ) [ ] { }.

  function parse(src) {
    var s = String(src).replace(/\s+/g, "").replace(/[’´`′‘]/g, "'").replace(/∨|\|/g, "+").replace(/[·*&∧]|\.(?=[A-Za-z01(\[{~!¬])/g, "");
    if (!s) throw new Error("Escribí una expresión.");
    var i = 0;
    var CLOSE = { "(": ")", "[": "]", "{": "}" };
    function peek() { return s[i]; }
    function expr() {
      var xs = [term()];
      while (peek() === "+") { i++; xs.push(term()); }
      return O(xs);
    }
    function term() {
      var xs = [];
      while (i < s.length && /[A-Za-z01(\[{~!¬]/.test(peek())) xs.push(factor());
      if (!xs.length) throw new Error(i < s.length ? "No entiendo el símbolo \"" + peek() + "\" (posición " + (i + 1) + ")." : "La expresión termina incompleta.");
      return A(xs);
    }
    function factor() {
      var nots = 0;
      while (/[~!¬]/.test(peek())) { nots++; i++; }
      var t, c = peek();
      if (/[A-Za-z]/.test(c)) { t = V(c.toUpperCase()); i++; }
      else if (c === "0" || c === "1") { t = C(+c); i++; }
      else if (CLOSE[c]) {
        i++;
        t = expr();
        if (peek() !== CLOSE[c]) throw new Error("Falta cerrar \"" + c + "\" con \"" + CLOSE[c] + "\".");
        i++;
        t = group(t);
      } else throw new Error("Falta algo después de la negación.");
      while (peek() === "'") { t = N(t); i++; }
      while (nots--) t = N(t);
      return t;
    }
    var t = expr();
    if (i < s.length) throw new Error("Sobra \"" + s.slice(i) + "\" al final.");
    return t;
  }
  // Marca de agrupación para respetar los paréntesis que escribió el alumno al mostrarlos
  function group(t) { return t; }

  /* ================= Escritura (como en la guía) ================= */

  function height(t) {
    if (t.k === "n") return t.a.k === "v" || t.a.k === "c" ? 0 : height(t.a) + 1;
    if (t.k === "a") return Math.max.apply(null, t.xs.map(function (x) { return x.k === "o" ? height(x) + 1 : height(x); }));
    if (t.k === "o") return Math.max.apply(null, t.xs.map(height));
    return 0;
  }
  function wrap(inner, h) {
    var b = [["(", ")"], ["[ ", " ]"], ["{ ", " }"]][Math.min(h, 2)];
    return b[0] + inner + b[1];
  }
  function show(t, top) {
    switch (t.k) {
      case "v": return t.n;
      case "c": return String(t.v);
      case "n":
        if (t.a.k === "v" || t.a.k === "c") return show(t.a) + "’";
        return wrap(show(t.a, height(t.a) >= 1), height(t.a)) + "’";
      case "a": {
        var out = "";
        t.xs.forEach(function (x, idx) {
          var piece = x.k === "o" ? wrap(show(x, height(x) >= 1), height(x)) : show(x);
          // Espacio antes y después de corchetes grandes: DA [ B + C ], como en la guía
          var space = idx > 0 && (/^[\[{]/.test(piece) || /[\]}]’?$/.test(out));
          out += (space ? " " : "") + piece;
        });
        return out;
      }
      default:
        return t.xs.map(function (x) { return show(x); }).join(top ? " + " : "+");
    }
  }
  function toString(t) { return show(t, true); }

  /* ================= Evaluación y tabla de verdad ================= */

  function vars(t, acc) {
    acc = acc || {};
    if (t.k === "v") acc[t.n] = true;
    else if (t.k === "n") vars(t.a, acc);
    else if (t.k === "a" || t.k === "o") t.xs.forEach(function (x) { vars(x, acc); });
    return acc;
  }
  function varList(t) { return Object.keys(vars(t)).sort(); }
  function evalAt(t, env) {
    switch (t.k) {
      case "v": return env[t.n] ? 1 : 0;
      case "c": return t.v;
      case "n": return evalAt(t.a, env) ? 0 : 1;
      case "a": for (var i = 0; i < t.xs.length; i++) if (!evalAt(t.xs[i], env)) return 0; return 1;
      default: for (var j = 0; j < t.xs.length; j++) if (evalAt(t.xs[j], env)) return 1; return 0;
    }
  }
  function truthTable(t, names) {
    names = names || varList(t);
    var rows = [];
    for (var m = 0; m < (1 << names.length); m++) {
      var env = {};
      names.forEach(function (n, i) { env[n] = (m >> (names.length - 1 - i)) & 1; });
      rows.push({ m: m, values: names.map(function (n) { return env[n]; }), out: evalAt(t, env) });
    }
    return { vars: names, rows: rows };
  }
  function equivalent(a, b) {
    var names = Object.keys(Object.assign(vars(a), vars(b))).sort();
    var ta = truthTable(a, names), tb = truthTable(b, names);
    return ta.rows.every(function (r, i) { return r.out === tb.rows[i].out; });
  }
  function literals(t) {
    if (t.k === "v") return 1;
    if (t.k === "c") return 0;
    if (t.k === "n") return literals(t.a);
    return t.xs.reduce(function (s, x) { return s + literals(x); }, 0);
  }

  /* ================= Leyes ================= */
  // Cada ley busca un lugar donde aplicarse. Si necesita que dos términos estén juntos y
  // no lo están, primero se emite un paso de Conmutativa que los acerca (como en la guía).

  function pairRule(name, kinds, test, apply) {
    return function (node) {
      if (kinds.indexOf(node.k) < 0) return null;
      var xs = node.xs;
      // Primero los pares que ya están juntos; así hacen falta menos pasos de Conmutativa
      for (var d = 1; d < xs.length; d++) {
        for (var i = 0; i < xs.length; i++) {
          var cands = [i + d, i - d];
          for (var c = 0; c < 2; c++) {
            var j = cands[c];
            if (j < 0 || j >= xs.length) continue;
            var info = test(xs[i], xs[j], node);
            if (info) return { name: name, node: node, i: i, j: j, info: info, apply: apply };
          }
        }
      }
      return null;
    };
  }

  var RULES = [
    // Involución: (X’)’ = X
    function (node) {
      if (node.k === "n" && node.a.k === "n") return { name: "Involución", replace: node.a.a };
      return null;
    },
    // Identidad con constantes negadas: 0’ = 1, 1’ = 0
    function (node) {
      if (node.k === "n" && node.a.k === "c") return { name: "Identidad", replace: C(1 - node.a.v) };
      return null;
    },
    // Complementación: X·X’ = 0 ; X + X’ = 1
    pairRule("Complementación", ["a", "o"], function (x, y) { return isNotOf(x, y); }, function (node, i, j) {
      var xs = node.xs.filter(function (_, k) { return k !== i && k !== j; });
      xs.splice(Math.min(i, j), 0, C(node.k === "a" ? 0 : 1));
      return mk(node.k, xs);
    }),
    // Identidad: X·1 = X, X·0 = 0, X + 0 = X, X + 1 = 1
    function (node) {
      if (node.k !== "a" && node.k !== "o") return null;
      var absorbing = node.k === "a" ? 0 : 1, neutral = 1 - absorbing;
      for (var i = 0; i < node.xs.length; i++) {
        var x = node.xs[i];
        if (x.k === "c" && x.v === absorbing) return { name: "Identidad", replace: C(absorbing) };
        if (x.k === "c" && x.v === neutral) return { name: "Identidad", replace: mk(node.k, node.xs.filter(function (_, k) { return k !== i; })) };
      }
      return null;
    },
    // Idempotencia: X·X = X ; X + X = X
    pairRule("Idempotencia", ["a", "o"], function (x, y) { return same(x, y); }, function (node, i, j) {
      return mk(node.k, node.xs.filter(function (_, k) { return k !== j; }));
    }),
    // Absorción: X + X·Y = X
    pairRule("Absorción", ["o"], function (x, y) {
      if (y.k !== "a") return false;
      var fy = y.xs.map(key);
      return factors(x).every(function (f) { return fy.indexOf(key(f)) >= 0; }) && factors(x).length < y.xs.length;
    }, function (node, i, j) {
      return mk("o", node.xs.filter(function (_, k) { return k !== j; }));
    }),
    // Absorción: X + X’·Y = X + Y
    pairRule("Absorción", ["o"], function (x, y) {
      if (y.k !== "a") return false;
      for (var k = 0; k < y.xs.length; k++) if (isNotOf(y.xs[k], x)) return { f: k };
      return false;
    }, function (node, i, j, info) {
      var y = node.xs[j];
      var xs = node.xs.slice();
      xs[j] = A(y.xs.filter(function (_, k) { return k !== info.f; }));
      return mk("o", xs);
    }),
    // Absorción: X·(X + Y) = X
    pairRule("Absorción", ["a"], function (x, y) {
      return y.k === "o" && y.xs.some(function (t) { return same(t, x); });
    }, function (node, i, j) {
      return mk("a", node.xs.filter(function (_, k) { return k !== j; }));
    }),
    // Absorción: X·(X’ + Y) = X·Y
    pairRule("Absorción", ["a"], function (x, y) {
      if (y.k !== "o") return false;
      for (var k = 0; k < y.xs.length; k++) if (isNotOf(y.xs[k], x)) return { t: k };
      return false;
    }, function (node, i, j, info) {
      var xs = node.xs.slice();
      xs[j] = O(node.xs[j].xs.filter(function (_, k) { return k !== info.t; }));
      return mk("a", xs);
    }),
    // De Morgan: (X·Y)’ = X’ + Y’ ; (X + Y)’ = X’·Y’
    function (node) {
      if (node.k === "n" && (node.a.k === "a" || node.a.k === "o")) {
        var neg = node.a.xs.map(N);
        return { name: "De Morgan", replace: node.a.k === "a" ? O(neg) : A(neg) };
      }
      return null;
    },
    // Factor común: P·X + P·X’ = P·(X + X’)
    pairRule("Factor común", ["o"], function (x, y) {
      var fx = factors(x), fy = factors(y);
      if (fx.length !== fy.length || fx.length < 2) return false;
      for (var p = 0; p < fx.length; p++) {
        for (var q = 0; q < fy.length; q++) {
          if (!isNotOf(fx[p], fy[q])) continue;
          var rx = fx.filter(function (_, k) { return k !== p; }).map(key).sort().join("|");
          var ry = fy.filter(function (_, k) { return k !== q; }).map(key).sort().join("|");
          if (rx === ry) return { p: p, q: q };
        }
      }
      return false;
    }, function (node, i, j, info) {
      var x = node.xs[i], y = node.xs[j];
      var rest = factors(x).filter(function (_, k) { return k !== info.p; });
      var g = A(rest.concat([O([factors(x)[info.p], factors(y)[info.q]])]));
      var xs = node.xs.slice();
      xs[i] = g;
      return mk("o", xs.filter(function (_, k) { return k !== j; }));
    }),
    // Distributiva: X·(Y + Z) = X·Y + X·Z
    function (node) {
      if (node.k !== "a") return null;
      for (var i = 0; i < node.xs.length; i++) {
        if (node.xs[i].k === "o") {
          var others = node.xs.filter(function (_, k) { return k !== i; });
          var sum = node.xs[i].xs.map(function (t) {
            var fs = others.slice();
            fs.splice(i, 0, t);
            return A(fs);
          });
          return { name: "Distributiva", replace: O(sum) };
        }
      }
      return null;
    },
    // Consenso: X·Y + X’·Z + Y·Z = X·Y + X’·Z
    function (node) {
      if (node.k !== "o") return null;
      var xs = node.xs;
      for (var i = 0; i < xs.length; i++) for (var j = 0; j < xs.length; j++) {
        if (i === j) continue;
        var fi = factors(xs[i]), fj = factors(xs[j]);
        for (var p = 0; p < fi.length; p++) for (var q = 0; q < fj.length; q++) {
          if (!isNotOf(fi[p], fj[q])) continue;
          var need = fi.filter(function (_, k) { return k !== p; }).concat(fj.filter(function (_, k) { return k !== q; })).map(key);
          for (var m = 0; m < xs.length; m++) {
            if (m === i || m === j) continue;
            var fm = factors(xs[m]).map(key);
            if (need.every(function (n) { return fm.indexOf(n) >= 0; })) {
              return { name: "Consenso", replace: mk("o", xs.filter(function (_, k) { return k !== m; })) };
            }
          }
        }
      }
      return null;
    }
  ];

  // Busca la primera ley aplicable (recorriendo de afuera hacia adentro, de izquierda a derecha)
  function findAndApply(tree, rule) {
    var res = rule(tree);
    if (res) {
      if (res.replace) return { name: res.name, tree: res.replace };
      // Ley de a pares: si los dos términos no están juntos, primero Conmutativa
      var i = res.i, j = res.j, node = res.node;
      if (Math.abs(i - j) !== 1) {
        var xs = node.xs.slice();
        var moved = xs.splice(j, 1)[0];
        var at = j < i ? i - 1 : i;
        xs.splice(at + 1, 0, moved);
        return { name: "Conmutativa", tree: { k: node.k, xs: xs } };
      }
      return { name: res.name, tree: res.apply(node, i, j, res.info) };
    }
    if (tree.k === "n") {
      var r = findAndApply(tree.a, rule);
      if (r) return { name: r.name, tree: rebuildNot(r.tree) };
    } else if (tree.k === "a" || tree.k === "o") {
      for (var k = 0; k < tree.xs.length; k++) {
        var rr = findAndApply(tree.xs[k], rule);
        if (rr) {
          var copy = tree.xs.slice();
          copy[k] = rr.tree;
          return { name: rr.name, tree: mk(tree.k, copy) };
        }
      }
    }
    return null;
  }
  function rebuildNot(a) { return N(a); }

  // Factor común final (presentación), como DAB + DAC → DA(B+C), solo si queda más corto
  function finalFactor(t) {
    if (t.k !== "o") return null;
    var common = factors(t.xs[0]).filter(function (f) {
      return t.xs.every(function (x) { return factors(x).some(function (g) { return same(f, g); }); });
    });
    if (!common.length) return null;
    var ck = common.map(key);
    var rests = t.xs.map(function (x) { return A(factors(x).filter(function (g) { return ck.indexOf(key(g)) < 0; })); });
    if (rests.some(function (r) { return r.k === "c"; })) return null;
    var g = A(common.concat([O(rests)]));
    return literals(g) < literals(t) ? g : null;
  }

  /* ================= Forma mínima (Quine-McCluskey) para comparar ================= */

  function minimalSOP(t) {
    var names = varList(t), n = names.length;
    var tt = truthTable(t, names);
    var ones = tt.rows.filter(function (r) { return r.out; }).map(function (r) { return r.m; });
    if (!ones.length) return C(0);
    if (ones.length === 1 << n) return C(1);
    // implicantes primos
    var groups = ones.map(function (m) { return { v: m, mask: 0, ms: [m] }; });
    var primes = [];
    while (groups.length) {
      var next = [], used = {}, seen = {};
      for (var a = 0; a < groups.length; a++) for (var b = a + 1; b < groups.length; b++) {
        var g1 = groups[a], g2 = groups[b];
        if (g1.mask !== g2.mask) continue;
        var diff = g1.v ^ g2.v;
        if (diff && !(diff & (diff - 1))) {
          used[a] = used[b] = true;
          var v = g1.v & ~diff, mask = g1.mask | diff, id = v + ":" + mask;
          if (!seen[id]) { seen[id] = true; next.push({ v: v, mask: mask, ms: g1.ms.concat(g2.ms) }); }
        }
      }
      groups.forEach(function (g, k) { if (!used[k]) primes.push(g); });
      groups = next;
    }
    // cobertura mínima (búsqueda exhaustiva acotada; las consignas tienen pocas variables)
    var best = null;
    function cost(sel) { return sel.reduce(function (s, p) { return s + n - bits(p.mask); }, 0) + sel.length * 0.01; }
    function bits(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
    function covers(sel) { return ones.every(function (m) { return sel.some(function (p) { return (m & ~p.mask) === p.v; }); }); }
    var limit = Math.min(primes.length, 16);
    primes.sort(function (p, q) { return bits(q.mask) - bits(p.mask); });
    var pool = primes.slice(0, limit);
    for (var size = 1; size <= pool.length && !best; size++) {
      (function choose(start, sel) {
        if (sel.length === size) { if (covers(sel) && (!best || cost(sel) < cost(best))) best = sel.slice(); return; }
        for (var s = start; s < pool.length; s++) { sel.push(pool[s]); choose(s + 1, sel); sel.pop(); }
      })(0, []);
    }
    best = best || primes;
    return O(best.map(function (p) {
      var fs = [];
      names.forEach(function (nm, idx) {
        var bit = 1 << (n - 1 - idx);
        if (p.mask & bit) return;
        fs.push(p.v & bit ? V(nm) : N(V(nm)));
      });
      return A(fs);
    }));
  }

  /* ================= Simplificar ================= */

  function simplify(input) {
    var start = typeof input === "string" ? parse(input) : input;
    var steps = [];
    var cur = start;
    var guard = 0;
    var minLits = literals(minimalSOP(start));
    var EXPAND_FROM = RULES.length - 2; // Distributiva y Consenso: solo si todavía hace falta achicar
    while (guard++ < 160) {
      var applied = null;
      for (var r = 0; r < RULES.length && !applied; r++) {
        if (r === EXPAND_FROM && literals(cur) <= minLits) break;
        applied = findAndApply(cur, RULES[r]);
      }
      if (!applied) break;
      cur = applied.tree;
      steps.push({ law: applied.name, expr: toString(cur), tree: cur });
    }
    var f = finalFactor(cur);
    if (f) { cur = f; steps.push({ law: "Factor común", expr: toString(cur), tree: cur }); }

    // Juntar pasos seguidos de la misma ley ("Conmutativa x2"), como en la guía
    var merged = [];
    steps.forEach(function (s) {
      var last = merged[merged.length - 1];
      if (last && last.law === s.law && (s.law === "Conmutativa" || s.law === "Identidad" || s.law === "Idempotencia")) {
        last.count++;
        last.expr = s.expr;
        last.tree = s.tree;
      } else merged.push({ law: s.law, expr: s.expr, tree: s.tree, count: 1 });
    });

    var minimal = minimalSOP(start);
    var ok = equivalent(start, cur);
    return {
      input: toString(start),
      tree: start,
      steps: merged.map(function (s) { return { law: s.law + (s.count > 1 ? " x" + s.count : ""), expr: s.expr }; }),
      result: toString(cur),
      resultTree: cur,
      verified: ok,
      minimal: toString(minimal),
      minimalTree: minimal,
      isMinimal: literals(cur) <= literals(minimal),
      vars: varList(start)
    };
  }

  /* ================= Mapa de Karnaugh (2 a 4 variables) ================= */

  var GRAY = [[0], [0, 1], [0, 1, 3, 2]];
  function karnaugh(t) {
    var names = varList(t);
    if (names.length < 2 || names.length > 4) return null;
    var rowsVars = names.slice(0, Math.floor(names.length / 2));
    var colsVars = names.slice(rowsVars.length);
    var rowCodes = rowsVars.length === 1 ? [0, 1] : [0, 1, 3, 2];
    var colCodes = colsVars.length === 1 ? [0, 1] : [0, 1, 3, 2];
    var bin = function (v, len) { var s = v.toString(2); while (s.length < len) s = "0" + s; return s; };
    var cells = rowCodes.map(function (r) {
      return colCodes.map(function (c) {
        var env = {};
        rowsVars.forEach(function (n, i) { env[n] = (r >> (rowsVars.length - 1 - i)) & 1; });
        colsVars.forEach(function (n, i) { env[n] = (c >> (colsVars.length - 1 - i)) & 1; });
        return evalAt(t, env);
      });
    });
    return {
      rowVars: rowsVars, colVars: colsVars,
      rowLabels: rowCodes.map(function (r) { return bin(r, rowsVars.length); }),
      colLabels: colCodes.map(function (c) { return bin(c, colsVars.length); }),
      cells: cells
    };
  }

  global.BoolEngine = {
    parse: parse, toString: toString, simplify: simplify, truthTable: truthTable,
    karnaugh: karnaugh, equivalent: equivalent, literals: literals, minimalSOP: minimalSOP, varList: varList
  };
})(typeof window !== "undefined" ? window : globalThis);
