# Proyectos de Formación

Monorepo de juegos y dinámicas interactivas para **formación católica juvenil**. Pensado para usarse en sesiones presenciales (catequesis, retiros, encuentros parroquiales) con grupos de hasta ~30 jóvenes y proyector.

## Proyectos

| Proyecto | Descripción | Estado |
| --- | --- | --- |
| [tabla-periodica-biblia](./tabla-periodica-biblia) | Juego tipo Kahoot donde cada libro de la Biblia es un "elemento" de una tabla periódica. Preguntas de opción múltiple con sistema de puntos, rachas, power-ups y ronda final. | MVP |
| [otros-proyectos](./otros-proyectos) | Espacio reservado para futuras dinámicas. | Vacío |

## Filosofía de diseño

1. **Mobile-first para los jugadores, proyector-first para el host.** El host se proyecta en pantalla con poca luz, así que las interfaces usan **alto contraste por defecto** (fondos claros, tipografía grande).
2. **Cero fricción para empezar a jugar.** El jugador entra con un código de 6 caracteres (o escaneando un QR). Sin login, sin descargas.
3. **Contenido editable por el formador.** Las preguntas y los libros son archivos JSON que cualquiera puede leer y modificar con un editor de texto.
4. **Despliegue gratis.** Cada proyecto debe poder correrse en un free tier (Render, Fly.io o similar) sin costo recurrente.

## Estructura del repo

```
proyectos-formacion/
├── README.md                       ← este archivo
├── .gitignore
├── .editorconfig
├── tabla-periodica-biblia/         ← primer juego
│   ├── app/                        ← código fuente
│   ├── contenidos/                 ← libros, categorías, preguntas (JSON)
│   └── docs/                       ← reglas, guía del formador, etc.
└── otros-proyectos/                ← futuras dinámicas
```

## Empezar

Cada proyecto tiene su propio README con instrucciones. Para el primer juego:

```bash
cd tabla-periodica-biblia/app
npm install
npm run dev
```

Más detalles en [`tabla-periodica-biblia/README.md`](./tabla-periodica-biblia/README.md).

## Contribuir

Si quieres añadir preguntas, sigue [`tabla-periodica-biblia/docs/CONTRIBUIR-PREGUNTAS.md`](./tabla-periodica-biblia/docs/CONTRIBUIR-PREGUNTAS.md). Si quieres proponer una nueva dinámica, abre un issue describiendo la mecánica.

## Licencia

MIT — úsalo, modifícalo y compártelo libremente con tu comunidad.
