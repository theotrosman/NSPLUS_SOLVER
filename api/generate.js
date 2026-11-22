/*!
 * NS Solver — API: consigna → diagrama Nassi-Shneiderman con Groq
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { buildSystemPrompt } from "./_prompt.js";
import { normalizeProject } from "./_normalize.js";
import { solveWithGroq, readBody, cleanConsigna } from "./_groq.js";

export default async function handler(req, res) {
  const body = readBody(req);
  const options = { modular: body.modular === true, classes: body.classes === true };
  return solveWithGroq(req, res, {
    system: buildSystemPrompt(options),
    consigna: cleanConsigna(body.consigna),
    validate: normalizeProject,
    resultKey: "project",
    what: "un diagrama"
  });
}
