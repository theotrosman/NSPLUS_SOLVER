/*!
 * TP de Historia 5 — API: una consigna → diagrama UML (.uxf) + diagramas NS (.nsplus) coordinados
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Primero arma el UML (Java, 5to). Después implementa cada método de ese UML como
 * un diagrama Nassi-Shneiderman, respetando los mismos nombres y tipos, para que
 * los dos entregables sean coherentes entre sí.
 */
import { buildUmlPrompt } from "./_uml-prompt.js";
import { normalizeUml } from "./_uml-normalize.js";
import { buildSystemPrompt } from "./_prompt.js";
import { normalizeProject } from "./_normalize.js";
import { readBody, cleanConsigna, checkLimit, groqJSON, MAX_CONSIGNA } from "./_groq.js";

// Resumen del UML en texto, para pasarlo como contexto a los diagramas NS
function umlResumen(uml) {
  return uml.classes.map(function (c) {
    var head = c.name + (c.kind && c.kind !== "class" ? " («" + c.kind + "»)" : "");
    var attrs = c.kind === "enum"
      ? "valores: " + (c.values || []).join(", ")
      : "atributos: " + (c.attributes.length ? c.attributes.map(function (a) { return "- " + a.name + ": " + a.type; }).join(", ") : "(ninguno)");
    var meth = "métodos: " + (c.methods.length ? c.methods.map(function (m) {
      return m.visibility + " " + m.name + "(" + (m.params || []).join(", ") + "): " + m.returns + (m.abstract ? " [abstracto]" : "");
    }).join("; ") : "(ninguno)");
    return "Clase " + head + "\n  " + attrs + "\n  " + meth;
  }).join("\n") + "\n\nRelaciones:\n" + (uml.relations.length
    ? uml.relations.map(function (r) { return "- " + r.from + " → " + r.to + " (" + r.type + (r.role ? ", atributo " + r.role : "") + (r.multiplicity ? ", " + r.multiplicity : "") + ")"; }).join("\n")
    : "- (ninguna)");
}

export default async function handler(req, res) {
  if (!checkLimit(req, res)) return;
  const body = readBody(req);
  const consigna = cleanConsigna(body.consigna);
  if (consigna.length < 10) return res.status(400).json({ error: "Escribí la consigna del trabajo." });
  if (consigna.length > MAX_CONSIGNA) return res.status(400).json({ error: "La consigna es demasiado larga." });
  const apiKey = process.env.GROQ_API_KEY;

  try {
    // 1) Diagrama de clases UML (Java, 5to)
    const uml = (await groqJSON({
      apiKey,
      system: buildUmlPrompt({ lang: "java" }),
      user: `Consigna:\n"""\n${consigna}\n"""`,
      validate: normalizeUml,
      what: "un diagrama UML"
    })).result;

    // 2) Diagramas NS (uno por método) que implementan ESE UML
    const nsUser = `Implementá en diagramas Nassi-Shneiderman (para NS Plus) las clases de este diagrama UML: un diagrama por cada método, respetando EXACTAMENTE los nombres de clases, atributos y métodos, y usando los mismos tipos que el UML (sintaxis de Java). El método principal (main) va en una clase Programa que crea los objetos y los usa. Si un método del UML es solo un getter/setter simple, igual hacé su diagrama.

Diagrama UML a implementar:
${umlResumen(uml)}

Consigna original:
"""
${consigna}
"""`;
    const project = (await groqJSON({
      apiKey,
      system: buildSystemPrompt({ classes: true }),
      user: nsUser,
      validate: normalizeProject,
      what: "los diagramas NS"
    })).result;

    return res.status(200).json({ uml, project });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message || "No se pudo generar el trabajo." });
  }
}
