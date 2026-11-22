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
      return res.status(200).json({ project: DEMO, model: "demo" });
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
