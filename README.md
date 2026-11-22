# NS Solver

**© 2026 [Theo Trosman](https://github.com/theotrosman). Todos los derechos reservados.**

De consigna a diagrama Nassi-Shneiderman en segundos. Pegás el enunciado de un ejercicio de programación, la IA (Groq) arma el diagrama completo, lo ves en una vista previa y lo descargás como archivo `.nsplus` para abrirlo directo en [NS Plus](https://nsplus.netlify.app/).

Creado por **Theo Trosman** — [github.com/theotrosman](https://github.com/theotrosman)

## Qué hace

- Genera uno o varios diagramas (un método por diagrama) a partir de la consigna.
- Usa todos los bloques de NS Plus: entrada, salida, asignación, si/sino, según (switch), mientras, hacer-mientras, para, para cada, llamada, return y comentarios.
- Declara variables y constantes con las convenciones de ORT.
- Explica la lógica en castellano.
- Exporta un `.nsplus` que NS Plus abre con el botón de abrir proyecto.

## Deploy en Vercel

1. Importá este repo en [vercel.com/new](https://vercel.com/new) (Framework preset: **Other**, sin build command).
2. En **Settings → Environment Variables** agregá:
   - `GROQ_API_KEY` = tu clave de [console.groq.com/keys](https://console.groq.com/keys)
   - `GROQ_MODEL` (opcional) = modelo de Groq a usar. Por defecto `openai/gpt-oss-120b`. Si el modelo elegido deja de existir, la API prueba sola con `openai/gpt-oss-20b` y `qwen/qwen3.8-27b`.
3. Hacé **Redeploy** para que tome la variable.

La clave queda solo en el servidor (`api/generate.js`); nunca llega al navegador.

## Probarlo en tu compu

```powershell
$env:GROQ_API_KEY="tu_clave"; npm run dev
```

Abrí <http://localhost:3000>. Sin `GROQ_API_KEY` funciona en modo demo con un diagrama de ejemplo.

```powershell
npm test
```

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `index.html`, `css/style.css`, `js/app.js` | La página |
| `js/preview.js` | Dibuja la vista previa del diagrama |
| `js/nsplus-file.js` | Convierte el diagrama al formato de archivo de NS Plus |
| `api/generate.js` | Función de Vercel que consulta a Groq |
| `api/_prompt.js` | Instrucciones para el modelo |
| `api/_normalize.js` | Valida y corrige la respuesta de la IA |

## Aviso

Herramienta independiente y no oficial. No está afiliada a ORT ni a NS Plus; NS Plus es obra de sus autores, los profesores C. Daniel Vázquez y Carlos E. Cimino. La IA puede equivocarse: revisá siempre el diagrama con una prueba de escritorio.

---

© 2026 Theo Trosman. Todos los derechos reservados. Ver [LICENSE](LICENSE).
