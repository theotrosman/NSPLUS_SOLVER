# ORT Info es fácil

**© 2026 [Theo Trosman](https://github.com/theotrosman). Todos los derechos reservados.**

Página con herramientas simples para la materia de Informática. La página principal (`index.html`) es el hall con todas las herramientas, y cada herramienta tiene su propia página:

| Herramienta | Página | Archivo |
| --- | --- | --- |
| NS Solver | `/ns-solver` | `ns-solver.html` |
| UML Solver | `/uml-solver` | `uml-solver.html` |

Para sumar una herramienta nueva: crear su `.html` en la raíz y agregar su tarjeta en `index.html`.

## NS Solver

De consigna a diagrama Nassi-Shneiderman en segundos. Pegás el enunciado de un ejercicio de programación, la IA (Groq) arma el diagrama completo, lo ves en una vista previa y lo descargás como archivo `.nsplus` para abrirlo directo en [NS Plus](https://nsplus.netlify.app/).

Creado por **Theo Trosman** — [github.com/theotrosman](https://github.com/theotrosman)

### Qué hace

- Muy simple: pegás la consigna (o subís el PDF), tocás **Resolver** y descargás.
- Dos interruptores opcionales, según lo que pida la consigna:
  - **Modularizar**: `main` llama a métodos que hacen una sola cosa cada uno (`nota1 ← ingresarNota()`, llamadas a métodos `void`), como en el ejemplo "Notas y promedios modularizados" de la materia.
  - **Usar clases y objetos**: clases con constructor (`public Club(string nombre)` y `this.nombre ← nombre`), métodos, objetos creados con `new` y listas `List<T>` (`Add`, `Remove`, `Count`, `[i]`, `foreach`). No usa `Find()` ni `Contains()`, por disposición de la cátedra.
- Sintaxis y tipos de C# (`int`, `double`, `bool`, `string`), como en la materia.
- Lee el texto de PDFs directo en el navegador (con pdf.js). Los PDFs escaneados como foto no se pueden leer.
- Acepta consignas largas (hasta 20.000 caracteres). Si el texto trae varios ejercicios, arma un diagrama por ejercicio.
- Resuelve de la forma más simple posible, como lo haría un alumno de 15 años: estructuras básicas, pocas variables y nombres claros. Con los interruptores apagados, todo va en un solo diagrama `main`.
- Explica la lógica con palabras simples.
- Exporta un `.nsplus` que NS Plus abre con el botón de abrir proyecto.

### Deploy en Vercel

1. Importá este repo en [vercel.com/new](https://vercel.com/new) (Framework preset: **Other**, sin build command).
2. En **Settings → Environment Variables** agregá:
   - `GROQ_API_KEY` = tu clave de [console.groq.com/keys](https://console.groq.com/keys)
   - `GROQ_MODEL` (opcional) = modelo de Groq a usar. Por defecto `openai/gpt-oss-120b`. Si el modelo elegido deja de existir, la API prueba sola con `openai/gpt-oss-20b` y `qwen/qwen3.8-27b`.
3. Hacé **Redeploy** para que tome la variable.

La clave queda solo en el servidor (`api/generate.js`); nunca llega al navegador.

### Probarlo en tu compu

```powershell
$env:GROQ_API_KEY="tu_clave"; npm run dev
```

Abrí <http://localhost:3000>. Sin `GROQ_API_KEY` funciona en modo demo con un diagrama de ejemplo.

```powershell
npm test
```

### Estructura

| Archivo | Qué hace |
| --- | --- |
| `index.html` | Hall con todas las herramientas |
| `ns-solver.html`, `js/app.js` | Página de NS Solver |
| `css/style.css` | Estilos compartidos |
| `js/preview.js` | Dibuja la vista previa del diagrama |
| `js/pdf-text.js` | Saca el texto de los PDFs |
| `js/nsplus-file.js` | Convierte el diagrama al formato de archivo de NS Plus |
| `api/generate.js` | Función de Vercel que consulta a Groq |
| `api/_prompt.js` | Instrucciones para el modelo |
| `api/_normalize.js` | Valida y corrige la respuesta de la IA |
| `api/_groq.js` | Conexión con Groq compartida (reintentos y modelos de respaldo) |
| `uml-solver.html`, `js/uml-app.js` | Página de UML Solver |
| `js/uml-layout.js` | Ubica las clases, traza las flechas y arma el `.uxf` y la vista previa |
| `api/uml.js`, `api/_uml-prompt.js`, `api/_uml-normalize.js` | API, instrucciones y validación del UML |

## UML Solver

De consigna a diagrama de clases UML listo para [UMLetino](https://www.umletino.com/umletino.html). Pegás el enunciado (o subís el PDF), la IA detecta clases, atributos, métodos y relaciones siguiendo la guía de UML de la materia, y descargás un archivo `.uxf` que se abre con **File Import** en UMLetino.

- Estilo de la materia: atributos privados (`- titulo: string`), métodos con tipos (`+ pedirLibro(Libro):void`), colecciones como flecha con rol en plural y cardinalidad (`- socios`, `0..n`), no como atributo.
- **3er año (C#)**: clases y asociaciones con `string`, `int`, `bool`.
- **5to año (Java)**: además herencia, clases abstractas, interfaces, enumerados, agregación (rombo blanco) y composición (rombo negro).
- Ubica las clases solo (quien "tiene" arriba, padres arriba de las hijas) y traza las flechas en ángulo recto con las puntas sobre el borde, así UMLetino las deja pegadas a las clases.
- Vista previa en la página, descarga en PNG y un detalle de clases y relaciones explicado.
## Aviso

Herramienta independiente y no oficial. No está afiliada a ORT ni a NS Plus; NS Plus es obra de sus autores, los profesores C. Daniel Vázquez y Carlos E. Cimino. La IA puede equivocarse: revisá siempre el diagrama con una prueba de escritorio.

---

© 2026 Theo Trosman. Todos los derechos reservados. Ver [LICENSE](LICENSE).
