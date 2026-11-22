/*!
 * NS Solver — validación del diagrama devuelto por la IA
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */

const STATEMENT_TYPES = [
  "input", "output", "assignment", "block", "comment", "if", "switch",
  "while", "dowhile", "for", "foreach", "call", "return", "break"
];

const MAX_DEPTH = 12;
const MAX_STATEMENTS = 400;

const str = (v, fallback = "") => (v == null ? fallback : String(v)).trim();

import { ValidationError } from "./_groq.js";

function normalizeStatements(list, path, ctx, depth) {
  if (list == null) return [];
  if (!Array.isArray(list)) throw new ValidationError(`${path} tiene que ser una lista`);
  if (depth > MAX_DEPTH) throw new ValidationError(`${path}: demasiados niveles anidados`);
  return list.map((s, i) => normalizeStatement(s, `${path}[${i}]`, ctx, depth));
}

function normalizeStatement(s, path, ctx, depth) {
  if (!s || typeof s !== "object") throw new ValidationError(`${path} no es un objeto`);
  if (++ctx.count > MAX_STATEMENTS) throw new ValidationError("El diagrama tiene demasiadas instrucciones");
  const type = str(s.type).toLowerCase().replace(/[\s_-]/g, "");
  const kids = (v, name) => normalizeStatements(v, `${path}.${name}`, ctx, depth + 1);
  switch (type) {
    case "input": return { type, variable: str(s.variable) };
    case "output": return { type, message: str(s.message) };
    case "assignment": return { type, variable: str(s.variable), value: str(s.value) };
    case "block": return { type, content: str(s.content) };
    case "comment": return { type, content: str(s.content) };
    case "if": return { type, condition: str(s.condition), then: kids(s.then, "then"), else: kids(s.else, "else") };
    case "switch": {
      if (!Array.isArray(s.options) || s.options.length === 0) throw new ValidationError(`${path}.options necesita al menos un caso`);
      return {
        type,
        expression: str(s.expression),
        options: s.options.map((o, i) => ({ case: str(o && o.case, "default"), statements: kids(o && o.statements, `options[${i}].statements`) }))
      };
    }
    case "while": return { type, condition: str(s.condition), statements: kids(s.statements, "statements") };
    case "dowhile": return { type: "dowhile", condition: str(s.condition), statements: kids(s.statements, "statements") };
    case "for": return {
      type, variable: str(s.variable), start: str(s.start), stop: str(s.stop), step: str(s.step, "1"),
      statements: kids(s.statements, "statements")
    };
    case "foreach": return {
      type, class: str(s.class), variable: str(s.variable), collection: str(s.collection),
      statements: kids(s.statements, "statements")
    };
    case "call": return { type, statement: str(s.statement) };
    case "return": return { type, value: str(s.value) };
    case "break": return { type };
    default:
      throw new ValidationError(`${path}.type "${s.type}" no existe. Usá uno de: ${STATEMENT_TYPES.join(", ")}`);
  }
}

function normalizeDecl(list, path) {
  if (list == null) return [];
  if (!Array.isArray(list)) throw new ValidationError(`${path} tiene que ser una lista`);
  return list.map((v, i) => {
    if (!v || !str(v.name) || !str(v.type)) throw new ValidationError(`${path}[${i}] necesita "type" y "name"`);
    const out = { type: str(v.type), name: str(v.name) };
    if (v.value != null && str(v.value) !== "") out.value = str(v.value);
    return out;
  });
}

export function normalizeProject(raw) {
  if (!raw || typeof raw !== "object") throw new ValidationError("La respuesta no es un objeto JSON");
  if (!Array.isArray(raw.diagrams) || raw.diagrams.length === 0) throw new ValidationError('Falta la lista "diagrams"');
  if (raw.diagrams.length > 40) throw new ValidationError("Demasiados diagramas");
  const ctx = { count: 0 };
  return {
    name: str(raw.name, "Proyecto NS Solver").slice(0, 80) || "Proyecto NS Solver",
    explanation: str(raw.explanation).slice(0, 2000),
    diagrams: raw.diagrams.map((d, i) => {
      const path = `diagrams[${i}]`;
      if (!d || typeof d !== "object") throw new ValidationError(`${path} no es un objeto`);
      if (!str(d.name)) throw new ValidationError(`${path} necesita "name"`);
      const statements = normalizeStatements(d.statements, `${path}.statements`, ctx, 0);
      const className = str(d.className, "Programa") || "Programa";
      const name = str(d.name);
      const isConstructor = name === className;
      if (statements.length === 0 && !isConstructor) throw new ValidationError(`${path} no tiene instrucciones`);
      return {
        className,
        modifiers: str(d.modifiers, "public"),
        // Los constructores no tienen tipo de retorno (public Club()).
        returnType: isConstructor ? "" : (str(d.returnType, "void") || "void"),
        name,
        parameters: normalizeDecl(d.parameters, `${path}.parameters`),
        variables: normalizeDecl(d.variables, `${path}.variables`),
        statements
      };
    })
  };
}

export { ValidationError };
