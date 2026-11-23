/*!
 * ORT Info es fácil — conexión con Groq compartida por todas las herramientas
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   GROQ_API_KEY  (obligatoria)
 *   GROQ_MODEL    (opcional, por defecto openai/gpt-oss-120b)
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Si GROQ_MODEL no está o deja de existir, se prueban estos en orden.
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
export const MAX_CONSIGNA = 20000;
const MAX_ATTEMPTS = 3;

export class ValidationError extends Error {}

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
    throw err;
  }
  return body?.choices?.[0]?.message?.content || "";
}

async function askGroq(messages, model, apiKey) {
  const payload = { model, messages, temperature: 0.2, max_completion_tokens: 30000, response_format: { type: "json_object" } };
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
export function extractJSON(text) {
  const clean = String(text).replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(clean); } catch { /* sigue */ }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
  throw new SyntaxError("La respuesta no tiene un JSON válido");
}

export function readBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body || {};
}

export function cleanConsigna(text) {
  return String(text || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Maneja todo el pedido: validación básica, límite de uso, consulta a Groq con reintentos
 * y respaldo de modelos. `validate` recibe el JSON de la IA y devuelve el resultado limpio
 * (o tira ValidationError, y se le pide a la IA que lo corrija).
 */
export async function solveWithGroq(req, res, { system, consigna, validate, resultKey, what }) {
  res.setHeader("X-Author", "Theo Trosman - https://github.com/theotrosman");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Usá POST" });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta configurar GROQ_API_KEY en Vercel." });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) return res.status(429).json({ error: "Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo." });

  if (consigna.length < 10) return res.status(400).json({ error: "Escribí una consigna un poco más completa." });
  if (consigna.length > MAX_CONSIGNA) return res.status(400).json({ error: "La consigna es demasiado larga. Probá pegando un ejercicio por vez." });

  try {
    const { result, model } = await groqJSON({ apiKey, system, user: `Consigna:\n"""\n${consigna}\n"""`, validate, what });
    return res.status(200).json({ [resultKey]: result, model });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message });
  }
}

export function checkLimit(req, res) {
  res.setHeader("X-Author", "Theo Trosman - https://github.com/theotrosman");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); res.status(405).json({ error: "Usá POST" }); return false; }
  if (!process.env.GROQ_API_KEY) { res.status(500).json({ error: "Falta configurar GROQ_API_KEY en Vercel." }); return false; }
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "local";
  if (rateLimited(ip)) { res.status(429).json({ error: "Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo." }); return false; }
  return true;
}

// Una consulta a Groq que devuelve JSON validado (con reintentos y respaldo de modelos).
// Tira un Error con .status si no se pudo. Sirve para encadenar varias llamadas.
export async function groqJSON({ apiKey, system, user, validate, what }) {
  const models = [...new Set([process.env.GROQ_MODEL, ...FALLBACK_MODELS].map((m) => (m || "").trim()).filter(Boolean))];
  let modelIndex = 0;
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let content;
    const model = models[modelIndex];
    try {
      content = await askGroq(messages, model, apiKey);
    } catch (err) {
      if (isModelError(err) && modelIndex < models.length - 1) { modelIndex++; attempt--; continue; }
      const e = new Error(err.status === 429 ? "Se alcanzó el límite de uso de Groq. Probá de nuevo en un rato." : `No se pudo consultar a Groq: ${err.message}`);
      e.status = err.status === 429 ? 429 : 502;
      throw e;
    }
    try {
      return { result: validate(extractJSON(content)), model };
    } catch (err) {
      lastError = err instanceof ValidationError || err instanceof SyntaxError ? err.message : "respuesta inválida";
      messages.push({ role: "assistant", content });
      messages.push({ role: "user", content: `Tu respuesta tiene un problema: ${lastError}. Devolvé de nuevo el JSON completo y corregido, con la misma forma pedida.` });
    }
  }
  const e = new Error(`La IA no devolvió ${what} válido (${lastError}). Probá de nuevo o reformulá la consigna.`);
  e.status = 502;
  throw e;
}
