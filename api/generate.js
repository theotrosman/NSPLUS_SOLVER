/*!
 * NS Solver — API: consigna → diagrama Nassi-Shneiderman con Groq
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GROQ_API_KEY  (obligatoria)
 *   GROQ_MODEL    (opcional, por defecto openai/gpt-oss-120b)
 */
import { buildSystemPrompt } from "./_prompt.js";
import { normalizeProject, ValidationError } from "./_normalize.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Si GROQ_MODEL no está o deja de existir, se prueban estos en orden.
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
const MAX_CONSIGNA = 20000;
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

function isModelError(err) {
  return err.status === 404 || /model[\s\S]*(does not exist|not found|decommissioned|deprecated|do not have access|not supported)/i.test(err.message);
}

async function callGroq(payload, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Groq respondió ${res.status}`);
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }
  return body?.choices?.[0]?.message?.content || "";
}

async function askGroq(messages, model, apiKey) {
  const payload = {
    model,
    messages,
    temperature: 0.2,
    max_completion_tokens: 30000,
    response_format: { type: "json_object" }
  };
  if (/gpt-oss/.test(model)) payload.reasoning_effort = "medium";
  try {
    return await callGroq(payload, apiKey);
  } catch (err) {
    // Algunos modelos no aceptan modo JSON o reasoning_effort: se reintenta sin esos parámetros.
    if (err.status === 400 && !isModelError(err) && /response_format|json|reasoning/i.test(err.message)) {
      const { response_format, reasoning_effort, ...plain } = payload;
      return callGroq(plain, apiKey);
    }
    throw err;
  }
}

// Saca el JSON aunque el modelo lo haya envuelto en ```json ... ``` o con texto alrededor.
function extractJSON(text) {
  const clean = String(text).replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(clean); } catch { /* sigue */ }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
  throw new SyntaxError("La respuesta no tiene un JSON válido");
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
  const consigna = String(body?.consigna || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const options = { modular: body?.modular === true, classes: body?.classes === true };
  if (consigna.length < 10) return res.status(400).json({ error: "Escribí una consigna un poco más completa." });
  if (consigna.length > MAX_CONSIGNA) return res.status(400).json({ error: "La consigna es demasiado larga. Probá pegando un ejercicio por vez." });

  const models = [...new Set([process.env.GROQ_MODEL, ...FALLBACK_MODELS].map((m) => (m || "").trim()).filter(Boolean))];
  let modelIndex = 0;
  const messages = [
    { role: "system", content: buildSystemPrompt(options) },
    { role: "user", content: `Consigna:\n"""\n${consigna}\n"""` }
  ];

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let content;
    const model = models[modelIndex];
    try {
      content = await askGroq(messages, model, apiKey);
    } catch (err) {
      if (isModelError(err) && modelIndex < models.length - 1) {
        console.warn(`Modelo ${model} no disponible, pruebo ${models[modelIndex + 1]}: ${err.message}`);
        modelIndex++;
        attempt--;
        continue;
      }
      const status = err.status === 429 ? 429 : 502;
      const msg = err.status === 429
        ? "Se alcanzó el límite de uso de Groq. Probá de nuevo en un rato."
        : `No se pudo consultar a Groq: ${err.message}`;
      return res.status(status).json({ error: msg });
    }

    try {
      const project = normalizeProject(extractJSON(content));
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
