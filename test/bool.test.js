/*!
 * Simplificador booleano — pruebas con los 20 ejercicios de la guía de SSI
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../js/bool-engine.js", import.meta.url), "utf8"));
const B = globalThis.BoolEngine;

// [ejercicio, respuesta de la guía]
const GUIA = [
  ["AB(A+CB’)", "AB"],
  ["(C+D)’C + (C+BA)’", "C’ (B’+A’)"],
  ["DA [ B + C + AB(CD)’ + (B+A)’ ]", "DA (B+C)"],
  ["[ (B+CA)’ + C ]’ + D’ + C", "C + B + D’"],
  ["D’C + [ (B+A)(C+D) ]’ + A’B’", "D’ + B’A’"],
  ["[ (D+B)’ ]’ + AC + (BD+C)’", "D + C’ + A + B"],
  ["[ (CB+D’)B ]’ + AD", "C’D + B’ + AD"],
  ["(AD)’ + { D [ (CB)’ + BC ]’ }’", "1"],
  ["AA + [ (AC+BD) B ]’", "A + D’ + B’"],
  ["[ (AB’)’ + D’C’ ]’ + ABC + D", "D + AC"],
  ["C [ BD + (DB)’ ] + CA", "C"],
  ["(A’C)’ + B (BC+BD)", "A + C’ + B"],
  ["[ (B’C+AD’) A + B’ ]’ + BA", "B"],
  ["B + [ D (AB+CC) ]’", "B + C’ + D’"],
  ["CA’ + [ B’ + (DCA’)’ ]’", "CA’"],
  ["[ A(BC+DA) + CA ]’", "A’ + C’D’"],
  ["DB + B’ (D+A’C’)", "D + B’A’C’"],
  ["[ (BA)’ + (BD+CB)C ]’", "BAC’"],
  ["(DA’A+CA)BA + D’DA", "CAB"],
  ["AB’ + C [ DB + (CB’)’ ]", "AB’ + CB"]
];

let worse = 0;
GUIA.forEach(([expr, answer], idx) => {
  const r = B.simplify(expr);
  const ans = B.parse(answer);
  assert.ok(r.verified, `Ej ${idx + 1}: el resultado no es equivalente`);
  assert.ok(B.equivalent(r.resultTree, ans), `Ej ${idx + 1}: ${r.result} no coincide con la guía (${answer})`);
  const mine = B.literals(r.resultTree), theirs = B.literals(ans);
  if (mine > theirs) worse++;
  console.log(`${String(idx + 1).padStart(2)}. ${expr}  →  Fs = ${r.result}   (${r.steps.length} pasos, ${mine} literales; guía ${theirs})${mine > theirs ? "  <-- más largo" : ""}`);
});
assert.equal(worse, 0, `${worse} ejercicios quedaron más largos que en la guía`);

// Lectura de distintas formas de escribir
assert.equal(B.toString(B.parse("~(a.b)+c'")), "(AB)’ + C’");
assert.throws(() => B.parse("A+"), /incompleta/);
assert.throws(() => B.parse("(A+B"), /cerrar/);

console.log("bool: todas las pruebas pasaron");
