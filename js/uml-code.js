/*!
 * UML Solver — código Java / C# a partir del diagrama de clases
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Arma el esqueleto de cada clase: atributos privados, relaciones como atributos
 * (listas cuando la cardinalidad es "muchos"), constructor, herencia (extends / :),
 * interfaces, clases abstractas, enumerados y los métodos con un return por defecto.
 */
(function (global) {
  "use strict";

  var JAVA_T = { string: "String", bool: "boolean", "boolean": "boolean", "int": "int", "double": "double", "float": "float", "char": "char", "long": "long", datetime: "LocalDate", "void": "void" };
  var CS_T = { string: "string", "boolean": "bool", bool: "bool", "int": "int", "double": "double", "float": "float", "char": "char", "long": "long", localdate: "DateTime", "void": "void" };

  function mapType(t, lang) {
    var s = String(t || "").trim();
    var generic = s.match(/^(?:List|ArrayList)<(.+)>$/i);
    if (generic) return (lang === "java" ? "ArrayList<" : "List<") + mapType(generic[1], lang) + ">";
    var table = lang === "java" ? JAVA_T : CS_T;
    return table[s.toLowerCase()] || s;
  }
  function isMany(m) { return /n|\*/i.test(String(m || "")) && !/^0\.\.1$|^1$/.test(m); }
  function vis(v) { return v === "-" ? "private" : v === "#" ? "protected" : "public"; }
  function pascal(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function defaultReturn(t, lang) {
    var s = String(t).toLowerCase();
    if (s === "void") return null;
    if (/^(int|long|short|byte)$/.test(s)) return "0";
    if (/^(double|float)$/.test(s)) return "0";
    if (/^(bool|boolean)$/.test(s)) return "false";
    if (/^string$/.test(s)) return "\"\"";
    if (s === "char") return "' '";
    return lang === "java" ? "null" : "null";
  }
  function paramNames(types) {
    var used = {};
    return types.map(function (t) {
      var s = String(t).toLowerCase();
      var base = /^(int|long)$/.test(s) ? "numero" : /^(double|float)$/.test(s) ? "valor" : /^(bool|boolean)$/.test(s) ? "condicion"
        : s === "string" ? "texto" : s === "char" ? "letra" : lowerFirst(String(t).replace(/<.*$/, ""));
      used[base] = (used[base] || 0) + 1;
      return used[base] > 1 ? base + used[base] : base;
    });
  }

  // Atributos simples del padre (y del abuelo, etc.), para el constructor de la hija
  function parentFields(name, uml, lang, seen) {
    seen = seen || {};
    if (seen[name]) return [];
    seen[name] = true;
    var p = uml.classes.find(function (x) { return x.name === name; });
    if (!p || p.kind === "interface") return [];
    var grand = uml.relations.find(function (r) { return r.from === name && r.type === "inheritance"; });
    var up = grand ? parentFields(grand.to, uml, lang, seen) : [];
    return up.concat(p.attributes.filter(function (a) { return !a.static; }).map(function (a) { return { name: a.name, type: mapType(a.type, lang) }; }));
  }

  function classCode(c, uml, lang) {
    var java = lang === "java";
    var out = [];
    var parent = null, ifaces = [];
    uml.relations.forEach(function (r) {
      if (r.from !== c.name) return;
      if (r.type === "inheritance") parent = r.to;
      if (r.type === "implementation") ifaces.push(r.to);
    });

    if (c.kind === "enum") {
      out.push("public enum " + c.name);
      out.push("{");
      out.push("    " + c.values.join(", ") + (java ? ";" : ""));
      out.push("}");
      return out.join("\n");
    }

    if (c.kind === "interface") {
      out.push("public interface " + c.name + (parent ? (java ? " extends " : " : ") + parent : ""));
      out.push("{");
      c.methods.forEach(function (m) {
        var ps = paramNames(m.params);
        var name = java ? m.name : pascal(m.name);
        out.push("    " + mapType(m.returns, lang) + " " + name + "(" + m.params.map(function (p, i) { return mapType(p, lang) + " " + ps[i]; }).join(", ") + ");");
      });
      out.push("}");
      return out.join("\n");
    }

    var head = "public " + (c.kind === "abstract" ? "abstract " : "") + "class " + c.name;
    if (java) {
      if (parent) head += " extends " + parent;
      if (ifaces.length) head += " implements " + ifaces.join(", ");
    } else {
      var bases = (parent ? [parent] : []).concat(ifaces);
      if (bases.length) head += " : " + bases.join(", ");
    }
    out.push(head);
    out.push("{");

    // Atributos propios
    var fields = c.attributes.map(function (a) { return { name: a.name, type: mapType(a.type, lang), isStatic: a.static, list: false }; });
    // Relaciones como atributos
    uml.relations.forEach(function (r) {
      if (r.from !== c.name || !r.role) return;
      if (r.type !== "association" && r.type !== "aggregation" && r.type !== "composition") return;
      var many = isMany(r.multiplicity);
      fields.push({ name: r.role, type: many ? (java ? "ArrayList<" + r.to + ">" : "List<" + r.to + ">") : r.to, list: many, rel: r });
    });
    fields.forEach(function (f) {
      out.push("    private " + (f.isStatic ? "static " : "") + f.type + " " + f.name + ";" + (f.rel ? "   // " + (f.rel.type === "composition" ? "composición" : f.rel.type === "aggregation" ? "agregación" : "relación") + " " + f.rel.multiplicity : ""));
    });
    if (fields.length) out.push("");

    // Constructor: recibe los datos del padre (si hereda) y los propios, y crea las listas vacías
    var simple = fields.filter(function (f) { return !f.list && !f.rel && !f.isStatic; });
    var inherited = parent ? parentFields(parent, uml, lang) : [];
    var ctorParams = inherited.concat(simple).map(function (f) { return f.type + " " + f.name; }).join(", ");
    var superArgs = inherited.map(function (f) { return f.name; }).join(", ");
    out.push("    public " + c.name + "(" + ctorParams + ")" + (parent && !java ? " : base(" + superArgs + ")" : ""));
    out.push("    {");
    if (parent && java) out.push("        super(" + superArgs + ");");
    simple.forEach(function (f) { out.push("        this." + f.name + " = " + f.name + ";"); });
    fields.filter(function (f) { return f.list; }).forEach(function (f) {
      out.push("        this." + f.name + " = new " + f.type + "();");
    });
    out.push("    }");

    // Métodos
    c.methods.forEach(function (m) {
      var ps = paramNames(m.params);
      var name = java ? m.name : pascal(m.name);
      var sig = vis(m.visibility) + " " + (m.abstract ? "abstract " : "") + mapType(m.returns, lang) + " " + name + "(" +
        m.params.map(function (p, i) { return mapType(p, lang) + " " + ps[i]; }).join(", ") + ")";
      out.push("");
      if (m.abstract) { out.push("    " + sig + ";"); return; }
      if (parent && !java) {
        var parentCls = uml.classes.find(function (x) { return x.name === parent; });
        if (parentCls && parentCls.methods.some(function (pm) { return pm.name === m.name && pm.abstract; })) sig = sig.replace(/^public /, "public override ");
      }
      if (parent && java) {
        var pc = uml.classes.find(function (x) { return x.name === parent; });
        if (pc && pc.methods.some(function (pm) { return pm.name === m.name; })) out.push("    @Override");
      }
      out.push("    " + sig);
      out.push("    {");
      out.push("        // TODO: completar");
      var ret = defaultReturn(mapType(m.returns, lang), lang);
      if (ret != null) out.push("        return " + ret + ";");
      out.push("    }");
    });
    out.push("}");
    return out.join("\n");
  }

  function generate(uml, lang) {
    lang = lang === "csharp" ? "csharp" : "java";
    var ext = lang === "java" ? ".java" : ".cs";
    var header = lang === "java"
      ? "import java.util.ArrayList;\n"
      : "using System;\nusing System.Collections.Generic;\n";
    return uml.classes.map(function (c) {
      return { file: c.name + ext, code: "// " + c.name + ext + "\n" + header + "\n" + classCode(c, uml, lang) };
    });
  }

  global.UMLCode = { generate: generate };
})(typeof window !== "undefined" ? window : globalThis);
