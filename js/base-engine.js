/*!
 * Cambio de base — cálculos paso a paso
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Bases de 2 a 36. Parte entera con BigInt (números largos sin errores) y parte
 * fraccionaria opcional (hasta 12 cifras). Cada conversión devuelve los pasos que se
 * hacen en clase: polinomio (a base 10), divisiones sucesivas (desde base 10),
 * multiplicaciones sucesivas (parte fraccionaria) y agrupación de bits (2 ↔ 8 / 16).
 */
(function (global) {
  "use strict";

  var DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var FRAC_MAX = 12;
  var NAMES = { 2: "binario", 8: "octal", 10: "decimal", 16: "hexadecimal" };
  var SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
  var sup = function (n) { return String(n).split("").map(function (c) { return SUP[c]; }).join(""); };
  var baseName = function (b) { return NAMES[b] || "base " + b; };

  /* ---------- Lectura ---------- */
  function parseNumber(text, base) {
    var s = String(text).trim().toUpperCase().replace(/\s+/g, "").replace(",", ".");
    if (!s) throw new Error("Escribí un número.");
    if (!/^[0-9A-Z]*\.?[0-9A-Z]*$/.test(s) || s === ".") throw new Error("Ese número tiene símbolos que no van.");
    var parts = s.split(".");
    var ip = parts[0] || "0", fp = parts[1] || "";
    (ip + fp).split("").forEach(function (c) {
      var v = DIGITS.indexOf(c);
      if (v < 0 || v >= base) {
        var allowed = base <= 10 ? "0 a " + (base - 1) : "0 a 9 y A a " + DIGITS[base - 1];
        throw new Error("El dígito \"" + c + "\" no existe en " + baseName(base) + " (se usan " + allowed + ").");
      }
    });
    ip = ip.replace(/^0+(?=.)/, "");
    fp = fp.replace(/0+$/, "");
    return { int: ip, frac: fp, base: base };
  }

  function intValue(digits, base) {
    var b = BigInt(base), v = 0n;
    for (var i = 0; i < digits.length; i++) v = v * b + BigInt(DIGITS.indexOf(digits[i]));
    return v;
  }
  // Parte fraccionaria como fracción exacta: numerador / base^cifras
  function fracValue(digits, base) {
    return { num: intValue(digits || "0", base), den: BigInt(base) ** BigInt(digits.length) };
  }

  function intToBase(v, base) {
    if (v === 0n) return "0";
    var b = BigInt(base), out = "";
    while (v > 0n) { out = DIGITS[Number(v % b)] + out; v /= b; }
    return out;
  }

  /* ---------- Pasos ---------- */

  // Polinomio: de cualquier base a decimal
  function polynomial(n) {
    var b = n.base, terms = [], values = [];
    var ip = n.int, fp = n.frac;
    for (var i = 0; i < ip.length; i++) {
      var d = DIGITS.indexOf(ip[i]), exp = ip.length - 1 - i;
      terms.push((b > 10 && d > 9 ? ip[i] + "(" + d + ")" : d) + "·" + b + sup(exp));
      values.push(BigInt(d) * BigInt(b) ** BigInt(exp));
    }
    var fracTerms = [], fracValues = [];
    for (var j = 0; j < fp.length; j++) {
      var df = DIGITS.indexOf(fp[j]);
      fracTerms.push(df + "·" + b + sup(-(j + 1)));
      fracValues.push(df / Math.pow(b, j + 1));
    }
    var intSum = values.reduce(function (s, v) { return s + v; }, 0n);
    var fracSum = fracValues.reduce(function (s, v) { return s + v; }, 0);
    return {
      terms: terms.concat(fracTerms),
      values: values.map(String).concat(fracValues.map(function (v) { return trimFloat(v); })),
      result: intSum.toString() + (fp ? trimFloat(fracSum).replace(/^0/, "") : "")
    };
  }

  // Divisiones sucesivas: de decimal (entero) a otra base
  function divisions(v, base) {
    var rows = [], b = BigInt(base);
    if (v === 0n) rows.push({ dividend: "0", quotient: "0", rest: 0, digit: "0" });
    while (v > 0n) {
      var q = v / b, r = Number(v % b);
      rows.push({ dividend: v.toString(), quotient: q.toString(), rest: r, digit: DIGITS[r] });
      v = q;
    }
    return { rows: rows, result: rows.map(function (r) { return r.digit; }).reverse().join("") };
  }

  // Multiplicaciones sucesivas: parte fraccionaria de decimal a otra base
  function multiplications(frac, base) {
    var rows = [], num = frac.num, den = frac.den, b = BigInt(base), seen = {};
    for (var i = 0; i < FRAC_MAX && num !== 0n; i++) {
      var prod = num * b, digit = prod / den, rest = prod % den;
      rows.push({ value: fracText(num, den), times: fracText(prod, den), digit: DIGITS[Number(digit)] });
      var k = rest.toString();
      if (seen[k]) { rows.periodic = true; num = rest; break; }
      seen[k] = true;
      num = rest;
    }
    return { rows: rows, result: rows.map(function (r) { return r.digit; }).join(""), cut: num !== 0n };
  }
  function fracText(num, den) {
    var whole = num / den, rest = num % den;
    var dec = Number(rest) / Number(den);
    return whole.toString() + (dec ? trimFloat(dec).replace(/^0/, "") : "");
  }
  function trimFloat(x) {
    var s = x.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
    return s === "-0" ? "0" : s;
  }

  // Agrupación de bits: binario ↔ octal (3 bits) / hexadecimal (4 bits)
  function groupBits(n, target) {
    var size = target === 8 ? 3 : 4;
    var ip = n.int, fp = n.frac;
    while (ip.length % size) ip = "0" + ip;
    while (fp.length % size) fp = fp + "0";
    var g = function (s) {
      var out = [];
      for (var i = 0; i < s.length; i += size) {
        var chunk = s.slice(i, i + size);
        out.push({ bits: chunk, digit: DIGITS[parseInt(chunk, 2)] });
      }
      return out;
    };
    var ig = g(ip), fg = g(fp);
    return { size: size, intGroups: ig, fracGroups: fg, result: ig.map(function (x) { return x.digit; }).join("").replace(/^0+(?=.)/, "") + (fg.length ? "." + fg.map(function (x) { return x.digit; }).join("") : "") };
  }
  // Expandir: octal / hexadecimal → binario (cada dígito en 3 / 4 bits)
  function expandBits(n) {
    var size = n.base === 8 ? 3 : 4;
    var pad = function (d) { var s = DIGITS.indexOf(d).toString(2); while (s.length < size) s = "0" + s; return s; };
    var ig = n.int.split("").map(function (d) { return { digit: d, bits: pad(d) }; });
    var fg = n.frac.split("").map(function (d) { return { digit: d, bits: pad(d) }; });
    var res = ig.map(function (x) { return x.bits; }).join("").replace(/^0+(?=.)/, "");
    var fr = fg.map(function (x) { return x.bits; }).join("").replace(/0+$/, "");
    return { size: size, intGroups: ig, fracGroups: fg, result: res + (fr ? "." + fr : "") };
  }

  /* ---------- Conversión completa con método ---------- */

  function convert(text, from, to) {
    var n = parseNumber(text, from);
    var iv = intValue(n.int, from);
    var fv = fracValue(n.frac, from);
    var targetInt = intToBase(iv, to);
    var frac = n.frac ? multiplications(fv, to) : null;
    var value = targetInt + (frac && frac.result ? "." + frac.result : "");

    var method;
    if (from === to) method = { kind: "same" };
    else if (from === 2 && (to === 8 || to === 16)) method = { kind: "group", data: groupBits(n, to) };
    else if ((from === 8 || from === 16) && to === 2) method = { kind: "expand", data: expandBits(n) };
    else if (to === 10) method = { kind: "poly", poly: polynomial(n) };
    else if (from === 10) method = { kind: "div", div: divisions(iv, to), mult: frac };
    else method = { kind: "via10", poly: polynomial(n), div: divisions(iv, to), mult: frac };

    return {
      input: (n.int || "0") + (n.frac ? "." + n.frac : ""),
      from: from, to: to, value: value,
      approx: !!(frac && frac.cut),
      decimal: iv.toString() + (n.frac ? trimFloat(Number(fv.num) / Number(fv.den)).replace(/^0/, "") : ""),
      method: method
    };
  }

  /* ---------- Operaciones en binario ---------- */

  function cleanBin(s) {
    s = String(s).replace(/\s+/g, "");
    if (!/^[01]+$/.test(s)) throw new Error("En las operaciones binarias solo van 0 y 1.");
    return s.replace(/^0+(?=.)/, "");
  }

  function addBin(a, b) {
    a = cleanBin(a); b = cleanBin(b);
    var len = Math.max(a.length, b.length) + 1;
    var A = a.padStart(len, "0"), B = b.padStart(len, "0");
    var carry = 0, res = "", carries = " ".repeat(len).split("");
    for (var i = len - 1; i >= 0; i--) {
      var s = (+A[i]) + (+B[i]) + carry;
      res = (s % 2) + res;
      carry = s >= 2 ? 1 : 0;
      if (carry && i > 0) carries[i - 1] = "1";
    }
    return { a: a, b: b, op: "+", carries: carries.join(""), result: res.replace(/^0+(?=.)/, ""), width: len,
      check: (BigInt("0b" + a) + BigInt("0b" + b)).toString() };
  }

  function subBin(a, b) {
    a = cleanBin(a); b = cleanBin(b);
    var va = BigInt("0b" + a), vb = BigInt("0b" + b), neg = false;
    if (vb > va) { var t = a; a = b; b = t; neg = true; }
    var len = Math.max(a.length, b.length);
    var A = a.padStart(len, "0").split("").map(Number), B = b.padStart(len, "0");
    var borrows = " ".repeat(len).split(""), res = "";
    for (var i = len - 1; i >= 0; i--) {
      var d = A[i] - (+B[i]);
      if (d < 0) {
        d += 2;
        var j = i - 1;
        while (j >= 0 && A[j] === 0) { A[j] = 1; borrows[j] = "1"; j--; }
        if (j >= 0) { A[j] -= 1; borrows[j] = "1"; }
      }
      res = d + res;
    }
    return { a: a, b: b, op: "−", carries: borrows.join(""), result: (neg ? "−" : "") + res.replace(/^0+(?=.)/, ""), width: len, swapped: neg,
      check: (va - vb).toString() };
  }

  function mulBin(a, b) {
    a = cleanBin(a); b = cleanBin(b);
    var partials = [];
    for (var i = b.length - 1; i >= 0; i--) {
      var shift = b.length - 1 - i;
      partials.push((b[i] === "1" ? a : "0".repeat(a.length)) + "0".repeat(shift));
    }
    var prod = (BigInt("0b" + a) * BigInt("0b" + b)).toString(2);
    return { a: a, b: b, op: "×", partials: partials, result: prod, check: (BigInt("0b" + a) * BigInt("0b" + b)).toString() };
  }

  // Complemento a 1 y a 2 con una cantidad de bits
  function complement(bin, bits) {
    var s = cleanBin(bin);
    bits = Math.max(bits || s.length, s.length);
    s = s.padStart(bits, "0");
    var c1 = s.split("").map(function (c) { return c === "0" ? "1" : "0"; }).join("");
    var c2 = (BigInt("0b" + c1) + 1n) % (1n << BigInt(bits));
    var c2s = c2.toString(2).padStart(bits, "0");
    return { original: s, c1: c1, c2: c2s, bits: bits };
  }

  global.BaseEngine = {
    convert: convert, parseNumber: parseNumber, addBin: addBin, subBin: subBin, mulBin: mulBin,
    complement: complement, baseName: baseName, sup: sup
  };
})(typeof window !== "undefined" ? window : globalThis);
