/*!
 * NS Solver — servidor local para probar sin Vercel
 * © 2026 Theo Trosman. Todos los derechos reservados.
 * https://github.com/theotrosman
 *
 * Uso:
 *   $env:GROQ_API_KEY="tu_clave"; npm run dev     (PowerShell)
 *   GROQ_API_KEY=tu_clave npm run dev             (bash)
 * Sin GROQ_API_KEY responde con un diagrama de ejemplo (modo demo).
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./api/generate.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };

const DEMO = {
  name: "Demo pares e impares",
  explanation: "Modo demo (no hay GROQ_API_KEY). Se piden 10 números con un for; con el resto de dividir por 2 se cuenta si es par o impar, y se guarda el mayor.",
  diagrams: [{
    className: "ParesImpares", modifiers: "public static", returnType: "void", name: "main", parameters: [],
    variables: [
      { type: "final int", name: "CANTIDAD", value: "10" }, { type: "int", name: "i" }, { type: "int", name: "num" },
      { type: "int", name: "pares", value: "0" }, { type: "int", name: "impares", value: "0" }, { type: "int", name: "mayor" }
    ],
    statements: [
      { type: "for", variable: "i", start: "1", stop: "CANTIDAD", step: "1", statements: [
        { type: "output", message: "\"Ingrese el número \" + i" },
        { type: "input", variable: "num" },
        { type: "if", condition: "num % 2 == 0", then: [{ type: "assignment", variable: "pares", value: "pares + 1" }], else: [{ type: "assignment", variable: "impares", value: "impares + 1" }] },
        { type: "if", condition: "i == 1 || num > mayor", then: [{ type: "assignment", variable: "mayor", value: "num" }], else: [] }
      ] },
      { type: "output", message: "\"Pares: \" + pares" },
      { type: "output", message: "\"Impares: \" + impares" },
      { type: "output", message: "\"Mayor: \" + mayor" }
    ]
  }]
};

const DEMO_MODULAR = {
  name: "Demo notas modularizadas",
  explanation: "Modo demo. main pide tres notas usando ingresarNota, las suma con sumarNotas, saca el promedio con calcularPromedio y lo muestra con mostrarPromedio.",
  diagrams: [
    { className: "Programa", modifiers: "public", returnType: "void", name: "main", parameters: [],
      variables: [{ type: "int", name: "nota1" }, { type: "int", name: "nota2" }, { type: "int", name: "nota3" }, { type: "int", name: "suma" }, { type: "double", name: "promedio" }],
      statements: [
        { type: "assignment", variable: "nota1", value: "ingresarNota()" },
        { type: "assignment", variable: "nota2", value: "ingresarNota()" },
        { type: "assignment", variable: "nota3", value: "ingresarNota()" },
        { type: "assignment", variable: "suma", value: "sumarNotas(nota1, nota2, nota3)" },
        { type: "assignment", variable: "promedio", value: "calcularPromedio(suma)" },
        { type: "call", statement: "mostrarPromedio(promedio)" }
      ] },
    { className: "Programa", modifiers: "public", returnType: "int", name: "ingresarNota", parameters: [], variables: [{ type: "int", name: "nota" }],
      statements: [{ type: "output", message: "\"Ingrese nota\"" }, { type: "input", variable: "nota" }, { type: "return", value: "nota" }] },
    { className: "Programa", modifiers: "public", returnType: "int", name: "sumarNotas", parameters: [{ type: "int", name: "n1" }, { type: "int", name: "n2" }, { type: "int", name: "n3" }], variables: [{ type: "int", name: "suma" }],
      statements: [{ type: "assignment", variable: "suma", value: "n1 + n2 + n3" }, { type: "return", value: "suma" }] },
    { className: "Programa", modifiers: "public", returnType: "double", name: "calcularPromedio", parameters: [{ type: "int", name: "s" }], variables: [{ type: "double", name: "p" }],
      statements: [{ type: "assignment", variable: "p", value: "s / 3.0" }, { type: "return", value: "p" }] },
    { className: "Programa", modifiers: "public", returnType: "void", name: "mostrarPromedio", parameters: [{ type: "double", name: "p" }], variables: [],
      statements: [{ type: "output", message: "\"La nota final es \" + p" }] }
  ]
};

const DEMO_CLASSES = {
  name: "Demo club y jugadores",
  explanation: "Modo demo. Hay dos clases: Jugador guarda nombre y edad, y Club guarda la lista de jugadores. main crea el club, carga 3 jugadores y muestra cuántos son mayores de edad.",
  diagrams: [
    { className: "Programa", modifiers: "public", returnType: "void", name: "main", parameters: [],
      variables: [{ type: "Club", name: "club" }, { type: "Jugador", name: "j" }, { type: "string", name: "nombre" }, { type: "int", name: "edad" }, { type: "int", name: "i" }],
      statements: [
        { type: "assignment", variable: "club", value: "new Club(\"River\")" },
        { type: "for", variable: "i", start: "1", stop: "3", step: "1", statements: [
          { type: "output", message: "\"Nombre del jugador\"" }, { type: "input", variable: "nombre" },
          { type: "output", message: "\"Edad\"" }, { type: "input", variable: "edad" },
          { type: "assignment", variable: "j", value: "new Jugador(nombre, edad)" },
          { type: "call", statement: "club.agregarJugador(j)" }
        ] },
        { type: "output", message: "\"Mayores: \" + club.contarMayores()" }
      ] },
    { className: "Club", modifiers: "public", returnType: "", name: "Club", parameters: [{ type: "string", name: "nombre" }], variables: [],
      statements: [{ type: "assignment", variable: "this.nombre", value: "nombre" }, { type: "assignment", variable: "this.jugadores", value: "new List<Jugador>()" }] },
    { className: "Club", modifiers: "public", returnType: "void", name: "agregarJugador", parameters: [{ type: "Jugador", name: "j" }], variables: [],
      statements: [{ type: "call", statement: "this.jugadores.Add(j)" }] },
    { className: "Club", modifiers: "public", returnType: "int", name: "contarMayores", parameters: [], variables: [{ type: "int", name: "cant", value: "0" }],
      statements: [
        { type: "foreach", class: "Jugador", variable: "j", collection: "this.jugadores", statements: [
          { type: "if", condition: "j.getEdad() >= 18", then: [{ type: "assignment", variable: "cant", value: "cant + 1" }], else: [] }
        ] },
        { type: "return", value: "cant" }
      ] },
    { className: "Jugador", modifiers: "public", returnType: "", name: "Jugador", parameters: [{ type: "string", name: "nombre" }, { type: "int", name: "edad" }], variables: [],
      statements: [{ type: "assignment", variable: "this.nombre", value: "nombre" }, { type: "assignment", variable: "this.edad", value: "edad" }] },
    { className: "Jugador", modifiers: "public", returnType: "int", name: "getEdad", parameters: [], variables: [],
      statements: [{ type: "return", value: "this.edad" }] }
  ]
};

function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  wrapRes(res);
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/generate") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = JSON.parse(raw || "{}"); } catch { req.body = {}; }
    if (!process.env.GROQ_API_KEY) {
      await new Promise((r) => setTimeout(r, 900));
      const demo = req.body.classes ? DEMO_CLASSES : req.body.modular ? DEMO_MODULAR : DEMO;
      return res.status(200).json({ project: demo, model: "demo" });
    }
    return handler(req, res);
  }
  const path = normalize(join(root, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname)));
  if (!path.startsWith(root) || /[\\/](api|node_modules|\.git)[\\/]/.test(path.slice(root.length - 1))) {
    res.statusCode = 404; return res.end("No encontrado");
  }
  try {
    const data = await readFile(path);
    res.setHeader("Content-Type", TYPES[extname(path)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404; res.end("No encontrado");
  }
}).listen(PORT, () => {
  console.log(`NS Solver — © Theo Trosman — http://localhost:${PORT}` + (process.env.GROQ_API_KEY ? "" : "  (modo demo, sin GROQ_API_KEY)"));
});
