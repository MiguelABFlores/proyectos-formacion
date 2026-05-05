# Tabla Periódica de la Biblia — App

Juego web tipo Kahoot. Un servidor Node corre Next.js + Socket.io en un solo proceso. El host abre la app en su computadora (proyector) y los jugadores se unen desde su celular escaneando un QR o entrando un código de 6 caracteres.

## Requisitos

- Node.js ≥ 20
- npm ≥ 10

## Empezar (desarrollo)

```bash
npm install
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000):

- Pantalla principal: elige **Crear partida** para abrir la vista del host.
- Para simular jugadores: en otras pestañas o en celulares en la misma red WiFi, abre `http://<tu-ip-local>:3000/play` e ingresa el código que muestra el host.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Server con hot reload |
| `npm run build` | Build de producción (Next + server TS) |
| `npm start` | Arranca el servidor compilado |
| `npm test` | Tests unitarios (motor + scoring) |
| `npm run typecheck` | Type check sin emitir |
| `npm run lint` | ESLint |

## Variables de entorno

Ver [`.env.example`](./.env.example).

## Despliegue

Ver [`../docs/GUIA-FORMADOR.md`](../docs/GUIA-FORMADOR.md) para el paso a paso en Render.
