/*!
 * Armador de PC — API: situación de un cliente → configuraciones de PC explicadas
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { solveWithGroq, readBody, cleanConsigna, ValidationError } from "./_groq.js";

const PARTS = ["Procesador", "Motherboard", "Memoria RAM", "Placa de video", "Almacenamiento", "Fuente", "Gabinete", "Refrigeración"];

const SYSTEM = `Sos un técnico en computación que explica muy claro, para el trabajo práctico de Componentes de la materia Sistemas de Soporte de Información (ORT, Argentina). Te pasan la situación de un cliente que no sabe de tecnología. Tenés que entender qué necesita y proponer configuraciones de PC distintas, explicando qué cambia entre una y otra.

Respondés SOLO con un objeto JSON válido, sin texto antes ni después, con esta forma:

{
  "client": "nombre del cliente (o 'El cliente' si no se dice)",
  "summary": "qué necesita, en 2 o 3 oraciones simples",
  "needs": ["necesidad concreta 1 (ej: jugar Valorant a muchos FPS)", "necesidad 2", "..."],
  "options": [
    {
      "name": "Opción 1 · Económica",
      "level": "Gama de entrada",
      "goal": "para qué alcanza esta opción, en una oración",
      "components": [
        { "part": "Procesador", "choice": "modelo concreto", "why": "por qué este, en palabras simples y relacionado con lo que pide el cliente" },
        { "part": "Motherboard", "choice": "...", "why": "..." },
        { "part": "Memoria RAM", "choice": "...", "why": "..." },
        { "part": "Placa de video", "choice": "...", "why": "..." },
        { "part": "Almacenamiento", "choice": "...", "why": "..." },
        { "part": "Fuente", "choice": "...", "why": "..." },
        { "part": "Gabinete", "choice": "...", "why": "..." },
        { "part": "Refrigeración", "choice": "...", "why": "..." }
      ],
      "pros": ["ventaja 1", "ventaja 2"],
      "cons": ["desventaja 1"]
    }
  ],
  "comparison": "qué cambia entre las opciones, explicado al cliente sin palabras difíciles (4 a 6 oraciones)",
  "recommendation": "cuál le recomendás y por qué, en 2 o 3 oraciones",
  "glossary": [ { "term": "FPS", "meaning": "explicación simple" } ]
}

Reglas:
- Hacé 3 opciones (económica, intermedia y más potente), salvo que la situación pida otra cantidad.
- Cada opción lleva SIEMPRE estas piezas en este orden: ${PARTS.join(", ")}. Si la situación lo necesita (ej: no tiene monitor, quiere streamear, quiere dos monitores), agregá también periféricos al final ("Monitor", "Cámara", "Micrófono", "Placa Wi-Fi", etc.).
- Elegí componentes reales y compatibles entre sí: el socket del procesador coincide con el de la motherboard, el tipo de RAM (DDR4/DDR5) con la motherboard, y la fuente alcanza con margen para la placa de video. Si integrás gráficos (sin placa de video), decilo en "choice" ("Gráficos integrados del procesador").
- Nada de precios exactos (cambian todo el tiempo): solo el nivel de gama.
- Relacioná cada elección con lo que contó el cliente (juegos, programas, streaming, estudio, presupuesto, que le dure).
- Explicá como para alguien que no sabe nada. En "glossary" poné 4 a 8 términos técnicos que usaste (RAM, SSD, FPS, núcleos, etc.).`;

const ALIASES = {
  "Procesador": ["proces", "cpu"],
  "Motherboard": ["mother", "placa madre", "placa base", "mainboard"],
  "Memoria RAM": ["memoria", "ram"],
  "Placa de video": ["video", "gpu", "gráfic", "grafic"],
  "Almacenamiento": ["almacen", "ssd", "disco", "nvme"],
  "Fuente": ["fuente", "psu", "alimentaci"],
  "Gabinete": ["gabinete", "case", "caja"],
  "Refrigeración": ["refrig", "cooler", "disipa"]
};

function str(v) { return v == null ? "" : String(v).trim(); }
function list(v) { return (Array.isArray(v) ? v : []).map(str).filter(Boolean).slice(0, 10); }

export function normalizePc(raw) {
  if (!raw || typeof raw !== "object") throw new ValidationError("La respuesta no es un objeto JSON");
  if (!Array.isArray(raw.options) || raw.options.length < 2) throw new ValidationError('Hacen falta al menos 2 opciones en "options"');
  const options = raw.options.slice(0, 4).map((o, i) => {
    const comps = (Array.isArray(o.components) ? o.components : []).map((c) => ({ part: str(c && c.part), choice: str(c && c.choice), why: str(c && c.why) }))
      .filter((c) => c.part && c.choice);
    const missing = PARTS.filter((p) => !comps.some((c) => ALIASES[p].some((a) => c.part.toLowerCase().includes(a))));
    if (missing.length) throw new ValidationError(`options[${i}] no tiene: ${missing.join(", ")}`);
    return { name: str(o.name) || `Opción ${i + 1}`, level: str(o.level), goal: str(o.goal), components: comps, pros: list(o.pros), cons: list(o.cons) };
  });
  return {
    client: str(raw.client) || "El cliente",
    summary: str(raw.summary),
    needs: list(raw.needs),
    options,
    comparison: str(raw.comparison),
    recommendation: str(raw.recommendation),
    glossary: (Array.isArray(raw.glossary) ? raw.glossary : []).map((g) => ({ term: str(g && g.term), meaning: str(g && g.meaning) })).filter((g) => g.term && g.meaning).slice(0, 10)
  };
}

export default async function handler(req, res) {
  const body = readBody(req);
  return solveWithGroq(req, res, {
    system: SYSTEM,
    consigna: cleanConsigna(body.consigna),
    validate: normalizePc,
    resultKey: "pc",
    what: "una propuesta"
  });
}
