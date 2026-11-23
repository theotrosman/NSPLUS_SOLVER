/*!
 * Creador de consultas SQL — API: consigna → consultas T-SQL usando solo los temas vistos
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { solveWithGroq, readBody, cleanConsigna, ValidationError } from "./_groq.js";

export const SQL_TOPICS = {
  ddl: "DDL: CREATE TABLE con tipos de datos, PRIMARY KEY, FOREIGN KEY, IDENTITY, ALTER TABLE y DROP",
  dml: "DML: INSERT, UPDATE y DELETE",
  select: "SELECT con WHERE y ORDER BY",
  alias: "Alias con AS",
  utiles: "Funciones útiles: TOP, DISTINCT, BETWEEN, IN, LIKE, IS NULL / IS NOT NULL",
  joins: "JOIN entre tablas (INNER JOIN, LEFT JOIN, RIGHT JOIN)",
  agregacion: "Funciones de agregación (COUNT, SUM, AVG, MAX, MIN) con GROUP BY",
  having: "HAVING para filtrar grupos",
  subconsultas: "Subconsultas (en WHERE con IN, =, EXISTS, o en el FROM)",
  variables: "Variables (DECLARE, SET) y SCOPE_IDENTITY()",
  sp: "Stored procedures (CREATE PROCEDURE con parámetros, EXEC)",
  transacciones: "Transacciones (BEGIN TRAN, COMMIT, ROLLBACK, TRY/CATCH)"
};

function buildPrompt(seen, schema) {
  const yes = seen.map((k) => "- " + SQL_TOPICS[k]).join("\n");
  const no = Object.keys(SQL_TOPICS).filter((k) => !seen.includes(k)).map((k) => "- " + SQL_TOPICS[k]).join("\n") || "- (nada)";
  return `Sos un alumno de 4to año de la escuela ORT (Argentina), materia Bases de Datos. Resolvés consignas escribiendo consultas para SQL Server (T-SQL), prolijas y simples, como se ven en clase.

Temas que SÍ vimos (podés usar solo esto):
${yes}

Temas que todavía NO vimos (PROHIBIDO usarlos; buscá otra forma con lo que sí vimos):
${no}

${schema ? `Tablas de la base (DLR / esquema que dio la consigna):\n${schema}\n\nUsá exactamente esos nombres de tablas y columnas.` : `Si la consigna no da las tablas, deducí un esquema razonable con nombres en español y usalo de forma coherente en todas las consultas.`}

Respondés SOLO con un objeto JSON válido, sin texto antes ni después:
{
  "name": "título corto",
  "explanation": "cómo se resolvió en general, simple (2 a 4 oraciones)",
  "schema": "si tuviste que suponer tablas, escribilas acá como Tabla(columna1, columna2, ...) una por línea; si no, vacío",
  "items": [
    { "label": "1", "statement": "lo que pide ese punto, resumido", "sql": "la consulta completa terminada en ;", "explanation": "qué hace la consulta, paso a paso y simple" }
  ]
}

Reglas:
- Un item por cada punto de la consigna, en orden, con su número o letra en "label".
- SQL de SQL Server: TOP en vez de LIMIT, GETDATE(), comillas simples para textos, palabras clave en MAYÚSCULAS, una cláusula por renglón con sangría.
- Usá alias cortos de tabla solo si vimos "Alias con AS" o JOIN.
- Que cada consulta funcione de verdad y devuelva exactamente lo que se pide (columnas pedidas, orden pedido).
- No uses nada de la lista de temas NO vistos.`;
}

function normalize(raw) {
  if (!raw || typeof raw !== "object") throw new ValidationError("La respuesta no es un objeto JSON");
  if (!Array.isArray(raw.items) || !raw.items.length) throw new ValidationError('Falta la lista "items" con las consultas');
  const items = raw.items.slice(0, 40).map((it, i) => {
    const sql = String((it && it.sql) || "").trim();
    if (!sql) throw new ValidationError(`items[${i}] no tiene "sql"`);
    return { label: String(it.label || i + 1).slice(0, 20), statement: String(it.statement || "").trim(), sql, explanation: String(it.explanation || "").trim() };
  });
  return { name: String(raw.name || "Consultas SQL").slice(0, 80), explanation: String(raw.explanation || "").trim(), schema: String(raw.schema || "").trim(), items };
}

export default async function handler(req, res) {
  const body = readBody(req);
  const seen = (Array.isArray(body.topics) ? body.topics : []).filter((k) => SQL_TOPICS[k]);
  if (!seen.length) return res.status(400).json({ error: "Prendé al menos un tema de los que viste." });
  const schema = String(body.schema || "").slice(0, 6000).trim();
  return solveWithGroq(req, res, {
    system: buildPrompt(seen, schema),
    consigna: cleanConsigna(body.consigna),
    validate: normalize,
    resultKey: "result",
    what: "consultas"
  });
}
