/*!
 * Cambio de base — pruebas
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../js/base-engine.js", import.meta.url), "utf8"));
const E = globalThis.BaseEngine;

assert.equal(E.convert("45", 10, 2).value, "101101");
assert.equal(E.convert("101101", 2, 10).value, "45");
assert.equal(E.convert("101101", 2, 8).value, "55");
assert.equal(E.convert("101101", 2, 16).value, "2D");
assert.equal(E.convert("2D", 16, 2).value, "101101");
assert.equal(E.convert("FF", 16, 10).value, "255");
assert.equal(E.convert("777", 8, 16).value, "1FF");
assert.equal(E.convert("0", 10, 2).value, "0");
assert.equal(E.convert("10.625", 10, 2).value, "1010.101");
assert.equal(E.convert("1010.101", 2, 10).value, "10.625");
assert.equal(E.convert("123456789012345678901234567890", 10, 16).value, "18EE90FF6C373E0EE4E3F0AD2");
assert.equal(E.convert("0.1", 10, 2).approx, true);
assert.equal(E.convert("2D", 16, 2).method.kind, "expand");
assert.equal(E.convert("101101", 2, 16).method.kind, "group");
assert.equal(E.convert("45", 10, 2).method.kind, "div");
assert.equal(E.convert("FF", 16, 10).method.kind, "poly");
assert.equal(E.convert("21", 3, 5).method.kind, "via10");
assert.equal(E.convert("21", 3, 5).value, "12");
assert.throws(() => E.convert("102", 2, 10), /no existe en binario/);
assert.throws(() => E.convert("G1", 16, 10), /no existe/);

assert.equal(E.addBin("1011", "110").result, "10001");
assert.equal(E.subBin("1011", "110").result, "101");
assert.equal(E.subBin("110", "1011").result, "−101");
assert.equal(E.subBin("1000", "1").result, "111");
assert.equal(E.mulBin("101", "11").result, "1111");
assert.deepEqual(E.complement("101", 8), { original: "00000101", c1: "11111010", c2: "11111011", bits: 8 });

console.log("base: todas las pruebas pasaron");
