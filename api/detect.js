/*!
 * ORT Info es fácil — API: leer la consigna y decir qué temas pide EXPRESAMENTE
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Sirve para prender solos los interruptores de temas que la consigna nombra.
 */
import { solveWithGroq, readBody, cleanConsigna, ValidationError } from "./_groq.js";

export default async function handler(req, res) {
  const body = readBody(req);
  const options = (Array.isArray(body.options) ? body.options : []).slice(0, 40)
    .filter((o) => o && o.key).map((o) => ({ key: String(o.key), label: String(o.label || o.key), hint: String(o.hint || "") }));
  if (!options.length) return res.status(400).json({ error: "Faltan las opciones a detectar." });

  const list = options.map((o) => `- ${o.key}: ${o.label}${o.hint ? ` (${o.hint})` : ""}`).join("\n");
  const system = `Te paso el texto de una consigna de un trabajo de la escuela y una lista de temas con su clave. Decime SOLO cuáles de esos temas la consigna pide usar de forma EXPLÍCITA: los nombra, los pide o claramente los exige (por ejemplo "resolver con stored procedures", "usando JOIN", "aplicar FIFO y LRU", "dividir en métodos", "con clases y objetos").

No incluyas un tema solo porque podría servir o porque es parte normal de la materia: solo si la consigna lo menciona o lo pide de manera inequívoca. Ante la duda, no lo incluyas.

Respondé SOLO con un objeto JSON, sin texto antes ni después: { "keys": ["clave1", "clave2"] } con las claves EXACTAS de la lista de abajo (lista vacía si la consigna no pide ninguno en particular).

Temas:
${list}`;

  const valid = new Set(options.map((o) => o.key));
  return solveWithGroq(req, res, {
    system,
    consigna: cleanConsigna(body.consigna),
    validate: (raw) => {
      if (!raw || !Array.isArray(raw.keys)) throw new ValidationError('Falta la lista "keys"');
      return [...new Set(raw.keys.map(String).filter((k) => valid.has(k)))];
    },
    resultKey: "keys",
    what: "los temas"
  });
}
