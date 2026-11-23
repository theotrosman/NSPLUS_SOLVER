/*!
 * Adaptador de código — API: reescribe código usando solo los temas vistos en clase
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { solveWithGroq, readBody, ValidationError } from "./_groq.js";

export const PRESETS = {
  arte: { name: "Arte · HTML y CSS", lang: "HTML y CSS" },
  sql: { name: "Bases de Datos · SQL Server", lang: "SQL Server (T-SQL)" },
  csharp: { name: "Programación · C#", lang: "C#" },
  java: { name: "Programación · Java", lang: "Java" }
};

function buildPrompt(preset, seen, notSeen, hasConsigna) {
  return `Sos profesor de ${PRESETS[preset].name} en la escuela ORT (Argentina). Un alumno te pasa un código que hace lo que pide su trabajo, pero usa cosas que todavía no se vieron en clase. Tenés que reescribirlo para que haga EXACTAMENTE lo mismo usando solo los temas vistos, y explicarle cada cambio para que lo entienda.

Lenguaje: ${PRESETS[preset].lang}.

Temas vistos en clase (usá solo esto):
${seen.map((s) => "- " + s).join("\n") || "- (lo más básico del lenguaje)"}

Temas NO vistos (prohibido usarlos; reemplazalos por algo equivalente con lo visto):
${notSeen.map((s) => "- " + s).join("\n") || "- (nada)"}
${hasConsigna ? "\nTambién te pasan la consigna del trabajo: el código tiene que seguir cumpliendo todo lo que pide." : ""}

Respondés SOLO con un objeto JSON válido, sin texto antes ni después:
{
  "code": "el código completo reescrito",
  "changes": [ { "before": "qué se usaba (corto)", "after": "con qué se reemplazó", "why": "por qué, en palabras simples" } ],
  "used": ["temas vistos que usa el código final"],
  "notes": "advertencias si algo no se puede hacer con lo visto (o vacío)"
}

Reglas:
- Mantené el mismo resultado/funcionamiento. Si algo de verdad no se puede lograr con lo visto, hacé lo más parecido y explicalo en "notes".
- Código claro y prolijo, con nombres en castellano cuando el original los tenga así; comentarios breves solo donde ayudan a entender.
- Si el código ya usa solo lo visto, devolvelo igual (o apenas ordenado) y "changes" vacío.
- No agregues funcionalidades nuevas.`;
}

function normalize(raw) {
  if (!raw || typeof raw !== "object" || !String(raw.code || "").trim()) throw new ValidationError('Falta "code" con el código reescrito');
  return {
    code: String(raw.code).replace(/\r\n/g, "\n").trim(),
    changes: (Array.isArray(raw.changes) ? raw.changes : []).slice(0, 40).map((c) => ({ before: String(c.before || ""), after: String(c.after || ""), why: String(c.why || "") })),
    used: (Array.isArray(raw.used) ? raw.used : []).map(String).slice(0, 30),
    notes: String(raw.notes || "").trim()
  };
}

export default async function handler(req, res) {
  const body = readBody(req);
  const preset = PRESETS[body.preset] ? body.preset : "arte";
  const code = String(body.code || "").slice(0, 14000).trim();
  if (code.length < 10) return res.status(400).json({ error: "Pegá el código que querés adaptar." });
  const seen = (Array.isArray(body.seen) ? body.seen : []).map(String).slice(0, 40);
  const notSeen = (Array.isArray(body.notSeen) ? body.notSeen : []).map(String).slice(0, 40);
  const consigna = String(body.consigna || "").slice(0, 5000).trim();
  const text = (consigna ? `Consigna del trabajo:\n"""\n${consigna}\n"""\n\n` : "") + `Código a adaptar:\n"""\n${code}\n"""`;
  return solveWithGroq(req, res, {
    system: buildPrompt(preset, seen, notSeen, !!consigna),
    consigna: text,
    validate: normalize,
    resultKey: "result",
    what: "el código adaptado"
  });
}
