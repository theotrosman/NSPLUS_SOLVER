/*!
 * NS Solver — pruebas del validador
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { normalizeProject } from "../api/_normalize.js";

// Respuesta típica de la IA, con algunos detalles a corregir
const ok = normalizeProject({
  name: "Prueba",
  explanation: "x",
  diagrams: [{
    className: "A", name: "main", modifiers: "public static", returnType: "void",
    variables: [{ type: "int", name: "i" }, { type: "int", name: "c", value: 0 }],
    statements: [
      { type: "for", variable: "i", start: 1, stop: 10, statements: [{ type: "Do-While", condition: "x<0", statements: [{ type: "input", variable: "x" }] }] },
      { type: "switch", expression: "op", options: [{ case: "1", statements: [] }, { statements: [{ type: "break" }] }] }
    ]
  }]
});
assert.equal(ok.diagrams[0].statements[0].step, "1");
assert.equal(ok.diagrams[0].statements[0].start, "1");
assert.equal(ok.diagrams[0].statements[0].statements[0].type, "dowhile");
assert.equal(ok.diagrams[0].variables[1].value, "0");
assert.equal(ok.diagrams[0].statements[1].options[1].case, "default");

assert.throws(() => normalizeProject({ diagrams: [] }), /diagrams/);
assert.throws(() => normalizeProject({ diagrams: [{ name: "m", statements: [{ type: "goto" }] }] }), /no existe/);
assert.throws(() => normalizeProject({ diagrams: [{ name: "m", statements: [] }] }), /instrucciones/);

console.log("normalize: todas las pruebas pasaron");
