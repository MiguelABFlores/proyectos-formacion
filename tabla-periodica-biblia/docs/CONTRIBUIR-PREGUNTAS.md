# Contribuir preguntas

Las preguntas viven en [`../contenidos/preguntas.json`](../contenidos/preguntas.json). Cualquier persona puede editar este archivo y las preguntas estarán disponibles tras `npm run build` y un re-deploy.

## Estructura de una pregunta

```json
{
  "id": "q26",
  "tipo": "relacion",
  "dificultad": 2,
  "tiempoSegundos": 20,
  "enunciado": "¿En qué libro Moisés recibe la zarza ardiente?",
  "opciones": ["Génesis", "Éxodo", "Números", "Deuteronomio"],
  "correcta": 1,
  "reflexion": "El Dios que se revela como YO SOY EL QUE SOY (Ex 3,14)."
}
```

| Campo | Descripción |
| --- | --- |
| `id` | Identificador único, normalmente `qNN`. **Debe ser único en el archivo.** |
| `tipo` | `identificacion` \| `relacion` \| `aplicacion` \| `tabla` |
| `dificultad` | `1` (fácil), `2` (media), `3` (difícil) |
| `tiempoSegundos` | Entre 5 y 120. Recomendado: 20 para fáciles, 25 para difíciles. |
| `enunciado` | El texto de la pregunta. |
| `opciones` | Exactamente 4 opciones, en orden. |
| `correcta` | Índice de la opción correcta: `0`, `1`, `2` o `3`. |
| `reflexion` | (Opcional) Frase breve para mostrar tras la pregunta en *modo formación*. |

## Tipos

- **identificacion** — reconocer libros, testamentos, categorías, hechos sueltos.
- **relacion** — emparejar personajes/citas/historias con su libro o pasaje.
- **aplicacion** — un caso de la vida del joven, ¿qué libro o enseñanza lo ilumina?
- **tabla** — preguntas usadas exclusivamente en la ronda final (asociadas a un libro concreto).

## Sección `preguntasPorLibro`

Al final de `preguntas.json` hay un mapa opcional:

```json
"preguntasPorLibro": {
  "Gn": ["q01", "q08", "q13"],
  "Mt": ["q12"]
}
```

En la ronda final, si un jugador elige un libro presente en este mapa, se le asignará una de esas preguntas. Si no, se elige al azar una pregunta de la dificultad del libro.

Símbolos disponibles: ver [`../contenidos/libros.json`](../contenidos/libros.json) (ej: `Gn`, `Ex`, `1S`, `Mt`, `Hch`, `Ap`).

## Buenas prácticas

1. **Una sola respuesta correcta clara.** Si dos opciones podrían ser correctas, reescribe.
2. **Distractores plausibles.** Las 3 opciones incorrectas deben ser tentadoras, no obviamente absurdas.
3. **Lenguaje juvenil pero respetuoso.** Sin coloquialismos que envejezcan rápido.
4. **Citas exactas.** Si citas un versículo, verifica.
5. **Modera la cantidad de Aplicación.** Funciona mejor 1 cada 3–4 preguntas.
6. **Reflexiones cortas** (máx. 1–2 líneas).

## Validar que el JSON está bien formado

```bash
cd tabla-periodica-biblia/app
npm run typecheck
npm test
```

Si el JSON está mal estructurado, la app falla al arrancar con un error de Zod indicando qué pregunta tiene problema.

## Aporta más preguntas

Idealmente queremos llegar a 100+ preguntas para que las partidas se sientan variadas. Áreas con menos cobertura actualmente:

- Cartas paulinas (Romanos, Gálatas, Efesios, etc.)
- Profetas menores
- Libros sapienciales que no sean Salmos/Proverbios
- Aplicaciones contemporáneas
