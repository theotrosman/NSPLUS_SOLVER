/*!
 * UML Solver — pruebas del validador y del armado del diagrama
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { normalizeUml } from "../api/_uml-normalize.js";

vm.runInThisContext(readFileSync(new URL("../js/uml-layout.js", import.meta.url), "utf8"));
const { layout, buildUxf, buildSvg } = globalThis.UMLLayout;

const fixture = JSON.parse(readFileSync(new URL("./fixtures/biblioteca.json", import.meta.url), "utf8").replace(/^﻿/, ""));
const uml = normalizeUml(fixture);

// Las puntas de cada flecha tienen que caer justo sobre el borde de su clase
const L = layout(uml);
function onBorder(p, n) {
  const inX = p.x >= n.x && p.x <= n.x + n.w, inY = p.y >= n.y && p.y <= n.y + n.h;
  return (inX && (p.y === n.y || p.y === n.y + n.h)) || (inY && (p.x === n.x || p.x === n.x + n.w));
}
L.edges.forEach((e) => {
  assert.ok(onBorder(e.points[0], L.nodes[e.from]), `${e.from}→${e.to}: el inicio no está en el borde`);
  assert.ok(onBorder(e.points[e.points.length - 1], L.nodes[e.to]), `${e.from}→${e.to}: la punta no está en el borde`);
  e.points.forEach((p) => assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y), "coordenadas con decimales"));
});

// Las clases no se pisan
const ns = Object.values(L.nodes);
ns.forEach((a, i) => ns.slice(i + 1).forEach((b) => {
  const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.ok(!overlap, `${a.cls.name} y ${b.cls.name} se superponen`);
}));

const uxf = buildUxf(uml);
assert.match(uxf, /<diagram program="umlet"/);
assert.equal((uxf.match(/<id>UMLClass<\/id>/g) || []).length, 3);
assert.equal((uxf.match(/<id>Relation<\/id>/g) || []).length, 3);
assert.match(uxf, /lt=-&gt;\nr2=- socios\nm2=0..n/);
assert.match(uxf, /\+ pedirLibro\(Libro\):void/);
assert.ok(buildSvg(uml).startsWith("<svg"));

// Normalización: tipos de relación en castellano, multiplicidades y atributos repetidos
const n = normalizeUml({
  classes: [
    { name: "Animal", kind: "abstracta", attributes: [{ name: "nombre", type: "String" }], methods: [{ name: "hacerSonido()", params: [], returns: "void", abstract: true }] },
    { name: "Perro", attributes: [], methods: [] },
    { name: "Zoo", attributes: [{ name: "animales", type: "ArrayList<Animal>" }], methods: [] },
    { name: "Puesto", kind: "enum", values: ["arquero", "defensa"] }
  ],
  relations: [
    { from: "Perro", to: "Animal", type: "herencia" },
    { from: "Zoo", to: "Animal", type: "agregación", role: "animales", multiplicity: "*" }
  ]
});
assert.equal(n.classes[0].kind, "abstract");
assert.equal(n.classes[0].methods[0].name, "hacerSonido");
assert.equal(n.relations[0].type, "inheritance");
assert.equal(n.relations[1].type, "aggregation");
assert.equal(n.relations[1].multiplicity, "0..n");
assert.equal(n.classes[2].attributes.length, 0, "el atributo repetido con la relación se saca");
assert.deepEqual(n.classes[3].values, ["ARQUERO", "DEFENSA"]);
const L2 = layout(n);
assert.ok(L2.nodes.Perro.level > L2.nodes.Animal.level, "la hija va abajo del padre");
assert.match(buildUxf(n), /lt=&lt;&lt;-/);
assert.match(buildUxf(n), /\/Animal\//);

assert.throws(() => normalizeUml({ classes: [{ name: "A" }], relations: [{ from: "A", to: "B" }] }), /no es una clase/);

if (process.argv[2]) writeFileSync(process.argv[2], uxf);
console.log("uml: todas las pruebas pasaron");
