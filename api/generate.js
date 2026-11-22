/*!
 * NS Solver — API: consigna → diagrama Nassi-Shneiderman con Groq
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GROQ_API_KEY  (obligatoria)
 *   GROQ_MODEL    (opcional, por defecto llama-3.3-70b-versatile)
 */
import { buildSystemPrompt } from "./_prompt.js";
import { normalizeProject, ValidationError } from "./_normalize.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_CONSIGNA = 4000;
const MAX_ATTEMPTS = 3;

// Límite simple por IP (por instancia del servidor): 8 pedidos por minuto.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 8;
}

async function askGroq(messages, model, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `Groq respondió ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body?.choices?.[0]?.message?.content || "";
}

export default async function handler(req, res) {
  res.setHeader("X-Author", "Theo Trosman - https://github.com/theotrosman");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Usá POST" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta configurar GROQ_API_KEY en Vercel." });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) return res.status(429).json({ error: "Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo." });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const consigna = String(body?.consigna || "").trim();
  const mode = body?.mode === "metodos" ? "metodos" : "simple";
  if (consigna.length < 10) return res.status(400).json({ error: "Escribí una consigna un poco más completa." });
  if (consigna.length > MAX_CONSIGNA) return res.status(400).json({ error: `La consigna es muy larga (máximo ${MAX_CONSIGNA} caracteres).` });

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const messages = [
    { role: "system", content: buildSystemPrompt(mode) },
    { role: "user", content: `Consigna:\n"""\n${consigna}\n"""` }
  ];

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let content;
    try {
      content = await askGroq(messages, model, apiKey);
    } catch (err) {
      const status = err.status === 429 ? 429 : 502;
      const msg = err.status === 429
        ? "Se alcanzó el límite de uso de Groq. Probá de nuevo en un rato."
        : `No se pudo consultar a Groq: ${err.message}`;
      return res.status(status).json({ error: msg });
    }

    try {
      const project = normalizeProject(JSON.parse(content));
      return res.status(200).json({ project, model });
    } catch (err) {
      lastError = err instanceof ValidationError || err instanceof SyntaxError ? err.message : "respuesta inválida";
      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content: `Tu respuesta tiene un problema: ${lastError}. Devolvé de nuevo el JSON completo y corregido, con la misma forma pedida.`
      });
    }
  }
  return res.status(502).json({ error: `La IA no devolvió un diagrama válido (${lastError}). Probá de nuevo o reformulá la consigna.` });
}
