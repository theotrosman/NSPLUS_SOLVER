/*!
 * UML Solver — validación del diagrama de clases devuelto por la IA
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 */
import { ValidationError } from "./_groq.js";

const KINDS = ["class", "abstract", "interface", "enum"];
const REL_TYPES = ["association", "aggregation", "composition", "inheritance", "implementation", "dependency"];
const MULTS = { "*": "0..n", "0..*": "0..n", "1..*": "1..n", "n": "0..n", "0..N": "0..n", "1..N": "1..n" };

const str = (v, fallback = "") => (v == null ? fallback : String(v)).trim();
const ident = (v) => str(v).replace(/\s+/g, "");

function normKind(k) {
  const s = str(k).toLowerCase();
  if (s.startsWith("abstract")) return "abstract";
  if (s.startsWith("interf")) return "interface";
  if (s.startsWith("enum")) return "enum";
  return "class";
}

function normRelType(t) {
  const s = str(t).toLowerCase();
  if (/herenc|inherit|generaliz|extends/.test(s)) return "inheritance";
  if (/implement|realiz/.test(s)) return "implementation";
  if (/compos/.test(s)) return "composition";
  if (/agreg|aggreg/.test(s)) return "aggregation";
  if (/depend|usa/.test(s)) return "dependency";
  return "association";
}

export function normalizeUml(raw) {
  if (!raw || typeof raw !== "object") throw new ValidationError("La respuesta no es un objeto JSON");
  if (!Array.isArray(raw.classes) || raw.classes.length === 0) throw new ValidationError('Falta la lista "classes"');
  if (raw.classes.length > 30) throw new ValidationError("Demasiadas clases");

  const seen = new Set();
  const classes = raw.classes.map((c, i) => {
    const name = ident(c && c.name);
    if (!name) throw new ValidationError(`classes[${i}] necesita "name"`);
    if (seen.has(name)) throw new ValidationError(`La clase "${name}" está repetida`);
    seen.add(name);
    const kind = normKind(c.kind);
    const attributes = (Array.isArray(c.attributes) ? c.attributes : []).map((a, j) => {
      const an = ident(a && a.name);
      if (!an) throw new ValidationError(`${name}.attributes[${j}] necesita "name"`);
      return { visibility: "-", name: an, type: str(a.type, "string") || "string", static: !!a.static };
    });
    const methods = (Array.isArray(c.methods) ? c.methods : []).map((m, j) => {
      const mn = ident(m && m.name).replace(/\(.*$/, "");
      if (!mn) throw new ValidationError(`${name}.methods[${j}] necesita "name"`);
      const params = (Array.isArray(m.params) ? m.params : str(m.params).split(","))
        .map((p) => str(typeof p === "object" && p ? p.type : p).split(/\s+/)[0])
        .filter(Boolean);
      const vis = str(m.visibility, "+");
      return {
        visibility: vis === "-" || vis === "#" ? vis : "+",
        name: mn,
        params,
        returns: str(m.returns, "void") || "void",
        abstract: !!m.abstract || kind === "interface"
      };
    });
    const values = kind === "enum"
      ? (Array.isArray(c.values) ? c.values : []).map((v) => ident(v).toUpperCase()).filter(Boolean)
      : [];
    if (kind === "enum" && values.length === 0) throw new ValidationError(`El enumerado ${name} necesita "values"`);
    return { name, kind, attributes: kind === "interface" ? [] : attributes, methods, values };
  });

  const relSeen = new Set();
  const relations = (Array.isArray(raw.relations) ? raw.relations : []).map((r, i) => {
    const from = ident(r && r.from), to = ident(r && r.to);
    if (!seen.has(from)) throw new ValidationError(`relations[${i}].from "${from}" no es una clase de "classes"`);
    if (!seen.has(to)) throw new ValidationError(`relations[${i}].to "${to}" no es una clase de "classes"`);
    if (from === to) throw new ValidationError(`relations[${i}] une una clase consigo misma`);
    const type = normRelType(r.type);
    const structural = type === "association" || type === "aggregation" || type === "composition";
    let multiplicity = structural ? str(r.multiplicity, "1") : "";
    multiplicity = MULTS[multiplicity] || multiplicity;
    const role = structural ? ident(r.role).replace(/^-/, "") : "";
    return { from, to, type, role, multiplicity };
  }).filter((r) => {
    const key = [r.from, r.to, r.type, r.role].join("|");
    if (relSeen.has(key)) return false;
    relSeen.add(key);
    return true;
  });

  // Un atributo que repite el rol de una relación se saca (la relación ya lo representa).
  relations.forEach((r) => {
    if (!r.role) return;
    const owner = classes.find((c) => c.name === r.from);
    owner.attributes = owner.attributes.filter((a) => a.name.toLowerCase() !== r.role.toLowerCase());
  });

  return {
    name: str(raw.name, "Diagrama de clases").slice(0, 80) || "Diagrama de clases",
    explanation: str(raw.explanation).slice(0, 2500),
    classes,
    relations
  };
}

export { KINDS, REL_TYPES };
