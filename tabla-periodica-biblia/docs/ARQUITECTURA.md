# Arquitectura

## Visión rápida

Un solo proceso Node sirve **Next.js** (UI host y jugador) y **Socket.io** (tiempo real). Las partidas viven en memoria. No hay base de datos, no hay autenticación, no hay infraestructura externa.

```
┌────────────────────────────────────────────┐
│        Render Free Web Service             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   server/index.ts (Node + Express)   │  │
│  │   ├─ Next.js handler (SSR + UI)      │  │
│  │   └─ Socket.io                       │  │
│  │       └─ GameManager                 │  │
│  │           └─ Map<code, Partida>      │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
        ▲                       ▲
        │ HTTP + WS             │ HTTP + WS
        │                       │
   ┌────┴────┐         ┌────────┴───────────┐
   │  Host   │         │  Jugador (celular) │
   │ /host/X │         │   /play/X          │
   └─────────┘         └────────────────────┘
```

## Stack

| Capa | Tecnología | Justificación |
| --- | --- | --- |
| UI | **Next.js 15 + React 19** (App Router) | SSR + rutas dinámicas + DX moderno |
| Estilos | **Tailwind CSS** | Theming rápido, alto contraste para proyector |
| Estado cliente | **Zustand** | Store global ligero, no hace falta Redux |
| Validación | **Zod** | Validar JSON de contenidos y payloads del socket |
| Realtime | **Socket.io** | Reconexión automática + ack callbacks tipados |
| Server | **Node 20** | Soporte nativo de WS, tsx para hot-reload de dev |
| Tests | **Vitest** | Rápido, compatible con TS y ESM |

## Decisiones de diseño

### Un solo proceso, no dos

Podríamos haber separado Next.js (Vercel) + Socket.io (Render). Decidimos servir todo desde un Node custom porque:
- Una sola URL pública.
- Un solo deploy.
- Render free tier cubre ambos sin problema para 30 jugadores.

Costo: la app no puede aprovechar el edge runtime de Vercel, pero no lo necesita.

### Estado en memoria

Cada partida es un `PartidaInterna` en un `Map<code, ...>`. No persistimos nada porque:
- Las partidas duran ~1 hora; si el server muere, se acabó.
- Sin BD = cero costo y cero ops.
- El resumen final se descarga como JSON desde el navegador del host.

Si en el futuro queremos persistir (rankings históricos, partidas largas), añadir SQLite local o Postgres externo es un cambio acotado al `gameManager`.

### Núcleo puro vs efectos secundarios

Las funciones de **scoring** y **gameEngine** son puras (entrada → salida, sin side-effects). Esto las hace 100% testables. Los efectos (timers, broadcasts) viven en `GameManager` y `server/index.ts`.

### Tipos compartidos cliente↔servidor

`src/lib/socketEvents.ts` exporta interfaces que tipan tanto el cliente como el servidor. Los tipos del juego viven en `src/types/game.ts`. Si cambias el contrato, el typecheck rompe en ambos lados de inmediato.

### Tema "Proyector"

El default es alto contraste con fondos claros. El requerimiento viene de un caso real: en una sesión previa, un proyector de baja luminosidad no mostraba bien los colores oscuros. El tema oscuro existe como toggle pero nunca como default.

## Flujo de una partida

```
host:crear      → crea Partida, devuelve code
                  emite partida:estado (lobby)

jugador:unirse  → añade Jugador
                  emite partida:estado a todos en la sala

host:siguiente  → preg_indice++, fase=question
                  emite partida:pregunta (con preguntaPublica que NO incluye 'correcta')
                  programa timeout

jugador:responder → aplicarRespuesta(): puntos + racha
                    emite jugador:resultado al jugador
                    si todos respondieron: cierra antes

(timeout o todos respondieron) → cerrarPregunta()
                                  emite partida:reveal (correcta + distribución)

host:siguiente → fase=leaderboard
                 emite partida:leaderboard

… (loop) …

host:rondaFinal → fase=finalRoundLobby
                  emite partida:rondaFinalLobby con la lista de libros

jugador:elegirLibro → registra elección, emite update con elegidos

host:siguiente   → asignar Pregunta a cada jugador
                   fase=finalQuestion
                   emite jugador:preguntaFinal individualmente

jugador:responder → puntos × dificultad × 2
                    cuando todos respondieron, cierra

host:siguiente → fase=finalReveal → fase=ended
                 emite partida:fin con resumen completo
```

## Estructura de carpetas

```
app/
├── server/
│   ├── index.ts          ← arranca http + Next + Socket.io
│   └── gameManager.ts    ← Map de partidas + ciclo de vida
├── src/
│   ├── app/              ← App Router pages
│   ├── components/       ← React UI puro (sin sockets)
│   ├── hooks/            ← useSocket, useGame, useGameWiring
│   ├── lib/              ← gameEngine, scoring, content, socketEvents
│   ├── styles/
│   └── types/
├── tailwind.config.ts    ← tema proyector + colores por categoría
├── tsconfig.json         ← cliente (Next)
└── tsconfig.server.json  ← server (tsc → dist-server)
```

## Por qué no <X>

| Alternativa | Por qué no |
| --- | --- |
| Vercel + Pusher | Dos cuentas, dos deploys. Más simple un Render. |
| Supabase realtime | Overkill: trae BD y auth que no necesitamos. |
| Firebase | Vendor lock-in, configuración compleja para algo efímero. |
| WebRTC P2P | Latencias variables; no resuelve el rol del host. |
| Redux | Para un store con 10 propiedades, Zustand sobra. |
| Auth real | El código de sala es suficiente; añadir cuentas es scope creep. |
