/*!
 * UML Solver — API: consigna → diagrama de clases UML con Groq
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { buildUmlPrompt } from "./_uml-prompt.js";
import { normalizeUml } from "./_uml-normalize.js";
import { solveWithGroq, readBody, cleanConsigna } from "./_groq.js";

export default async function handler(req, res) {
  const body = readBody(req);
  const lang = body.lang === "java" ? "java" : "csharp";
  return solveWithGroq(req, res, {
    system: buildUmlPrompt({ lang }),
    consigna: cleanConsigna(body.consigna),
    validate: normalizeUml,
    resultKey: "uml",
    what: "un diagrama UML"
  });
}
