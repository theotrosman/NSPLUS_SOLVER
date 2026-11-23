/*!
 * Calculadora IP — pruebas
 * © 2026 Theo Trosman. Todos los derechos reservados.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

vm.runInThisContext(readFileSync(new URL("../js/ip-engine.js", import.meta.url), "utf8"));
const E = globalThis.IPEngine;

let i = E.info(E.parseIP("192.168.1.130"), 26);
assert.equal(i.network, "192.168.1.128");
assert.equal(i.broadcast, "192.168.1.191");
assert.equal(i.first, "192.168.1.129");
assert.equal(i.last, "192.168.1.190");
assert.equal(i.mask, "255.255.255.192");
assert.equal(i.hosts, 62);
assert.equal(i.cls.cls, "C");
assert.equal(i.type, "Privada");

i = E.info(E.parseIP("10.20.30.40"), 8);
assert.equal(i.network, "10.0.0.0");
assert.equal(i.broadcast, "10.255.255.255");
assert.equal(i.hosts, 16777214);

assert.equal(E.parsePrefix("255.255.240.0"), 20);
assert.throws(() => E.parsePrefix("255.0.255.0"), /no es válida/);
assert.throws(() => E.parseIP("300.1.1.1"), /0 a 255/);
assert.equal(E.info(E.parseIP("8.8.8.8"), 24).type, "Pública");

const f = E.flsm("192.168.10.0/24", null, 4);
assert.equal(f.newPrefix, 26);
assert.equal(f.rows[3].network, "192.168.10.192");
assert.equal(f.rows[3].broadcast, "192.168.10.255");

// Ejercicio típico de VLSM
const v = E.vlsm("192.168.1.0/24", null, [
  { name: "Ventas", hosts: 50 }, { name: "Admin", hosts: 20 }, { name: "Gerencia", hosts: 10 }, { name: "Enlace", hosts: 2 }
]);
assert.deepEqual(v.rows.map((r) => [r.name, r.network, r.prefix, r.broadcast]), [
  ["Ventas", "192.168.1.0", 26, "192.168.1.63"],
  ["Admin", "192.168.1.64", 27, "192.168.1.95"],
  ["Gerencia", "192.168.1.96", 28, "192.168.1.111"],
  ["Enlace", "192.168.1.112", 30, "192.168.1.115"]
]);
assert.equal(v.nextFree, "192.168.1.116");
// Se ordena de mayor a menor aunque las carguen desordenadas
const v2 = E.vlsm("10.0.0.0", "/24", [{ name: "chica", hosts: 5 }, { name: "grande", hosts: 100 }]);
assert.equal(v2.rows[0].name, "grande");
assert.equal(v2.rows[1].network, "10.0.0.128");
assert.throws(() => E.vlsm("192.168.1.0/26", null, [{ name: "A", hosts: 100 }]), /No alcanza/);

console.log("ip: todas las pruebas pasaron");
