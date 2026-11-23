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
import umlHandler from "./api/uml.js";
import pcHandler, { normalizePc } from "./api/pc.js";
import extractHandler from "./api/extract.js";
import sqlHandler from "./api/sql.js";
import adaptHandler from "./api/adapt.js";
import { normalizeUml } from "./api/_uml-normalize.js";

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

// APIs nuevas con su respuesta de ejemplo para el modo demo (sin GROQ_API_KEY)
const DEMO_EXTRACT = {
  bool: [{ label: "Ejercicio 1", expr: "AB(A+CB')" }, { label: "Ejercicio 2", expr: "[ (B+CA)' + C ]' + D' + C" }],
  base: [{ label: "1.a", kind: "convert", number: "45", from: 10, to: 2 }, { label: "1.b", kind: "convert", number: "2D", from: 16, to: 10 }, { label: "2", kind: "op", a: "1011", op: "+", b: "110" }],
  ip: [{ label: "1", kind: "calc", ip: "172.16.5.77", mask: "/20" }, { label: "2", kind: "vlsm", network: "10.0.0.0/24", subnets: [{ name: "Aulas", hosts: 100 }, { name: "Secretaría", hosts: 25 }, { name: "Enlace", hosts: 2 }] }],
  tda: [{ label: "1", kind: "pila", ops: [{ method: "push", arg: "4" }, { method: "push", arg: "9" }, { method: "peek" }, { method: "pop" }, { method: "push", arg: "1" }] }],
  memoria: [{ label: "1", kind: "replace", refs: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], frames: 3, algorithms: ["FIFO", "LRU"] }, { label: "2", kind: "translate", pageSize: 2048, address: 9000, pageTable: { 0: 3, 1: 6, 2: 1, 3: 4, 4: 2 } }],
  osi: [{ label: "Pregunta 1", question: "¿En qué capa trabaja el router?", answer: "En la capa 3, Red.", explanation: "El router usa direcciones IP para elegir el camino entre redes." }]
};
const EXTRA = {
  "/api/extract": { handler: extractHandler, demo: (b) => ({ items: DEMO_EXTRACT[b.tool] || [], model: "demo" }) },
  "/api/sql": { handler: sqlHandler, demo: () => ({ model: "demo", result: {
    name: "Demo: escuela", explanation: "Modo demo (sin GROQ_API_KEY). Se usan las tablas Alumnos y Cursos.", schema: "Alumnos(IdAlumno, Nombre, Apellido, IdCurso)\nCursos(IdCurso, Nombre, Anio)",
    items: [
      { label: "1", statement: "Listar los alumnos ordenados por apellido", sql: "SELECT Nombre, Apellido\nFROM Alumnos\nORDER BY Apellido;", explanation: "Trae nombre y apellido de todos los alumnos, ordenados de la A a la Z por apellido." },
      { label: "2", statement: "Cantidad de alumnos por curso", sql: "SELECT C.Nombre, COUNT(A.IdAlumno) AS Cantidad\nFROM Cursos AS C\nINNER JOIN Alumnos AS A ON A.IdCurso = C.IdCurso\nGROUP BY C.Nombre;", explanation: "Une cursos con alumnos y cuenta cuántos alumnos hay en cada curso." }
    ] } }) },
  "/api/adapt": { handler: adaptHandler, demo: (b) => ({ model: "demo", result: {
    code: String(b.code || "").replace(/display:\s*grid/g, "display: flex"), changes: [{ before: "display: grid", after: "display: flex", why: "Modo demo: si Grid no se vio, se arma la misma fila con Flexbox." }],
    used: ["Flexbox"], notes: "Modo demo (sin GROQ_API_KEY): solo se muestra un ejemplo de cambio." } }) }
};

function wrapRes(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  wrapRes(res);
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (EXTRA[url.pathname]) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = JSON.parse(raw || "{}"); } catch { req.body = {}; }
    if (!process.env.GROQ_API_KEY) {
      await new Promise((r) => setTimeout(r, 700));
      return res.status(200).json(EXTRA[url.pathname].demo(req.body));
    }
    return EXTRA[url.pathname].handler(req, res);
  }
  if (url.pathname === "/api/pc") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = JSON.parse(raw || "{}"); } catch { req.body = {}; }
    if (!process.env.GROQ_API_KEY) {
      await new Promise((r) => setTimeout(r, 900));
      const demo = JSON.parse((await readFile(join(root, "test", "fixtures", "pc-demo.json"), "utf8")).replace(/^﻿/, ""));
      return res.status(200).json({ pc: normalizePc(demo), model: "demo" });
    }
    return pcHandler(req, res);
  }
  if (url.pathname === "/api/uml") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = JSON.parse(raw || "{}"); } catch { req.body = {}; }
    if (!process.env.GROQ_API_KEY) {
      await new Promise((r) => setTimeout(r, 900));
      const file = req.body.lang === "java" ? "club-java.json" : "biblioteca.json";
      const demo = JSON.parse((await readFile(join(root, "test", "fixtures", file), "utf8")).replace(/^﻿/, ""));
      return res.status(200).json({ uml: normalizeUml(demo), model: "demo" });
    }
    return umlHandler(req, res);
  }
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
  let pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  // Igual que cleanUrls de Vercel: /ns-solver → ns-solver.html
  if (!extname(pathname)) pathname += ".html";
  const path = normalize(join(root, pathname));
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
