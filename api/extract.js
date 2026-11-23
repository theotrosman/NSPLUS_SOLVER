/*!
 * ORT Info es fácil — API: leer una consigna y encontrar los ejercicios para las calculadoras
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * La IA solo ENCUENTRA los datos de cada ejercicio. Las cuentas las hace cada herramienta
 * (sin IA), así el resultado es siempre correcto.
 */
import { solveWithGroq, readBody, cleanConsigna, ValidationError } from "./_groq.js";

const COMMON = `Te pasan el texto de una consigna (a veces copiada de un PDF, desordenada). Encontrá TODOS los ejercicios que se pueden resolver con esta herramienta, en el orden en que aparecen, y devolvé SOLO un objeto JSON válido, sin texto antes ni después, con la forma { "items": [ ... ] }. Cada item tiene "label" (corto, por ejemplo "Ejercicio 3" o "3.b"). Si no hay ninguno, devolvé { "items": [] }. No resuelvas nada: solo copiá los datos.`;

const TOOLS = {
  bool: `${COMMON}
Herramienta: simplificador de álgebra de Boole. Cada item: { "label": "...", "expr": "expresión" }.
Escribí la expresión con letras mayúsculas, + para OR, producto implícito (letras juntas) para AND, ' después de una letra o paréntesis para negar, y ( ) [ ] { } para agrupar. Ejemplo: "[ (B+CA)' + C ]' + D' + C". Si la consigna usa ¬, ~, ! o una barra encima, pasalo a '.`,
  base: `${COMMON}
Herramienta: cambio de base y operaciones binarias. Cada item es uno de estos:
{ "label": "...", "kind": "convert", "number": "45", "from": 10, "to": 2 }
{ "label": "...", "kind": "op", "a": "1011", "op": "+", "b": "110" }   (op: "+", "-" o "*", números en binario)
{ "label": "...", "kind": "complement", "number": "101", "bits": 8 }
Si piden pasar un número a varias bases, hacé un item por cada base. Las bases son números (2, 8, 10, 16, …).`,
  ip: `${COMMON}
Herramienta: direcciones IP, subredes y VLSM. Cada item es uno de estos:
{ "label": "...", "kind": "calc", "ip": "192.168.1.130", "mask": "/26" }   (calcular red, broadcast, hosts de una IP; mask puede ser /n o 255.255.255.x)
{ "label": "...", "kind": "flsm", "network": "192.168.10.0/24", "count": 4 }   (dividir en subredes iguales)
{ "label": "...", "kind": "vlsm", "network": "192.168.1.0/24", "subnets": [ { "name": "Ventas", "hosts": 50 } ] }`,
  tda: `${COMMON}
Herramienta: laboratorio de TDA. Cada item: { "label": "...", "kind": "pila" | "cola" | "lista", "ops": [ { "method": "push", "arg": "5" }, { "method": "pop" } ] }.
Métodos válidos — pila: push(arg), peek, pop · cola: add(arg), get, remove · lista ordenada: add(arg), get(arg = posición), remove(arg), removeAt(arg = posición), exists(arg), search(arg). También size, isEmpty, isFull.`,
  memoria: `${COMMON}
Herramienta: memoria (reemplazo de páginas y paginación). Cada item es uno de estos:
{ "label": "...", "kind": "replace", "refs": [7,0,1,2,0,3], "frames": 3, "algorithms": ["FIFO","LRU","OPT"] }   (cadena de referencias a páginas y cantidad de marcos; algorithms solo los que pide la consigna, o los tres si no dice)
{ "label": "...", "kind": "translate", "pageSize": 1024, "address": 3500, "pageTable": { "0": 5, "1": 2, "2": 7, "3": 1 } }   (traducir dirección lógica a física; tamaño de página en bytes)`,
  osi: `Te pasan el texto de una consigna sobre redes (modelo OSI, TCP/IP, protocolos, dispositivos). Encontrá cada pregunta y respondela bien, en castellano simple, como un alumno de 5to de la escuela ORT. Devolvé SOLO un objeto JSON válido: { "items": [ { "label": "Pregunta 1", "question": "la pregunta", "answer": "respuesta corta y correcta", "explanation": "por qué, en 1 a 3 oraciones" } ] }. Si no hay preguntas, { "items": [] }.`
};

function validate(tool) {
  return (raw) => {
    if (!raw || !Array.isArray(raw.items)) throw new ValidationError('Falta la lista "items"');
    const items = raw.items.filter((x) => x && typeof x === "object").slice(0, 40)
      .map((x, i) => ({ ...x, label: String(x.label || `Ejercicio ${i + 1}`).slice(0, 60) }));
    if (tool === "bool") items.forEach((x, i) => { if (!x.expr) throw new ValidationError(`items[${i}] necesita "expr"`); });
    return items;
  };
}

export default async function handler(req, res) {
  const body = readBody(req);
  const tool = Object.prototype.hasOwnProperty.call(TOOLS, body.tool) ? body.tool : null;
  if (!tool) return res.status(400).json({ error: "Herramienta desconocida." });
  return solveWithGroq(req, res, {
    system: TOOLS[tool],
    consigna: cleanConsigna(body.consigna),
    validate: validate(tool),
    resultKey: "items",
    what: "una lista de ejercicios"
  });
}
