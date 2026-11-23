/*!
 * Simulador de memoria — pruebas con el ejemplo clásico (7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1, 3 marcos)
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../js/mem-engine.js", import.meta.url), "utf8"));
const M = globalThis.MemEngine;
const refs = M.parseRefs("7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1");

assert.equal(M.simulate(refs, 3, "FIFO").faults, 15);
assert.equal(M.simulate(refs, 3, "LRU").faults, 12);
assert.equal(M.simulate(refs, 3, "OPT").faults, 9);
// Anomalía de Belady con FIFO
const b = M.parseRefs("1,2,3,4,1,2,5,1,2,3,4,5");
assert.equal(M.simulate(b, 3, "FIFO").faults, 9);
assert.equal(M.simulate(b, 4, "FIFO").faults, 10);

const t = M.translate(1024, 3500, M.parseTable("0:5, 1:2, 2:7, 3:1"));
assert.equal(t.page, 3);
assert.equal(t.offset, 428);
assert.equal(t.frame, 1);
assert.equal(t.physical, 1452);
assert.equal(M.translate(1024, 5000, { 0: 1 }).physical, null);
assert.throws(() => M.parseRefs("7 a 1"), /números/);

console.log("mem: todas las pruebas pasaron");
