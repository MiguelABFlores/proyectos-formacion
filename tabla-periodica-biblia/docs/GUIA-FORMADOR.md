# Guía del formador

## Antes de la sesión

1. **Prueba el proyector con anticipación.** El tema "proyector" del juego usa fondos claros y tipografía grande para que se lea bien con poca luz. Aun así, ajusta el brillo del proyector y verifica desde el fondo de la sala.
2. **Verifica el WiFi.** Hasta 30 dispositivos pueden estar conectados a la vez. Si tu sala tiene WiFi pobre, usa un hotspot.
3. **Despierta el server (si está en Render free tier).** El servicio gratuito duerme tras 15 min sin tráfico y tarda ~30 s en despertar al primer request. Abre la app de la app **al menos 1 minuto antes** de empezar.
4. **Revisa las preguntas** que se mostrarán. La app elige aleatoriamente entre las del JSON, así que asegúrate de tener un set adecuado para tu grupo. Ver [`CONTRIBUIR-PREGUNTAS.md`](./CONTRIBUIR-PREGUNTAS.md) para añadir o editar.

## Configuración recomendada para una sesión de 1 hora

| Tiempo | Actividad |
| --- | --- |
| 0–5 min | Bienvenida, explicar la dinámica, mostrar QR |
| 5–10 min | Que entren al juego, comprobar nombres |
| 10–55 min | Jugar 8 rondas (≈5 min cada una: selección + pregunta + reveal + comentar) |
| 55–60 min | Pasaporte personal de cada jugador, premiación, exportar JSON |

Configura **8 rondas** con **modo formación activado**.

## El flujo del juego

Cada partida funciona enteramente con la **tabla periódica**. En cada ronda:

1. **Selección**: cada jugador ve su tabla en el celular. Los libros que ya jugó en rondas anteriores aparecen marcados (✓ verde si los acertó, ✗ rojo si falló) y no puede re-elegirlos. Toca un libro disponible.
2. **Pregunta personal**: cada jugador recibe una pregunta asociada al libro que eligió.
3. **Reveal**: en su celular ve si acertó o falló (su tabla se actualiza). Tú ves un panel resumen de quién tomó qué y cómo le fue.
4. **Leaderboard**: ranking acumulado. Pulsas "siguiente ronda" o "ver pasaporte final".

Al final, cada jugador ve su **pasaporte personal**: la tabla completa con sus ✓ y ✗ — un recuerdo visual del recorrido.

> **Puntuación**: rapidez × racha × dificultad del libro × (×2 si usó power-up). Un libro de dificultad 3 acertado a tiempo da hasta ×3 puntos. Premia atrevimiento.

## En la sesión

1. Abre la URL pública del juego en tu computadora.
2. Pulsa **"Crear partida"**.
3. Configura:
   - ✅ **Modo formación** (recomendado)
   - **Número de rondas** = 8
4. Pulsa **"Crear partida"**. Aparecerá un código y un QR.
5. Invita a los jugadores a escanear el QR o ingresar el código en `tu-url/play`.
6. Cuando estén todos, pulsa **"Empezar partida"**.
7. En cada ronda:
   - **Selección**: ves cuántos jugadores hay; espera a que elijan (o lanza ya) y pulsa **"Lanzar preguntas de la ronda →"**.
   - **Pregunta**: aparece "todos respondiendo". Espera al timeout o pulsa **"Cerrar ronda y revelar"**.
   - **Reveal**: ves la tabla resumen — quién tomó qué libro y cómo le fue. Excelente momento para hablar 30 segundos sobre los libros más interesantes que se eligieron.
   - **Leaderboard**: pulsa **"Siguiente ronda →"**.
8. Al terminar la última ronda, en lugar de "siguiente ronda" verás **"Ver pasaporte final →"**.
9. La pantalla final muestra el podio + el pasaporte personal de cada jugador. Pulsa **"Descargar resumen (JSON)"** si quieres conservarlo.

## Tips pedagógicos

- **Aprovecha la elección.** Cuando un jugador elige un libro raro (Abdías, Filemón, Habacuc), aprovecha para contar de qué trata.
- **Conversa tras el reveal.** El panel resumen muestra el libro de cada uno y si acertó. Si la mayoría falló una pregunta, hay tela para enseñar.
- **Contrasta con la Biblia física.** Tras una pregunta sobre un libro concreto, invita a alguien a abrirlo y leer un versículo.
- **Premio simbólico.** Lleva un detalle (estampa, libro, rosario) para los 3 primeros.
- **Pasaporte como recuerdo.** Sugiere a los jóvenes una foto de su pasaporte final — los marca como "estos libros ya los conozco" y los rete: "los próximos libros que voy a leer son los que me faltan".

## Correr con Docker (local o servidor propio)

Si tienes Docker instalado, puedes levantar la app sin tocar Node ni npm.

El Dockerfile espera el directorio padre como build context (usa `app/...` y `contenidos/...` como rutas), así que se construye apuntando a `tabla-periodica-biblia/`:

```bash
# Desde la raíz del repo (proyectos-formacion/)
docker build -t tabla-periodica-biblia -f tabla-periodica-biblia/app/Dockerfile tabla-periodica-biblia

# Levantar en el puerto 3000
docker run -p 3000:3000 tabla-periodica-biblia
```

Abre `http://localhost:3000`. Para detenerlo: `Ctrl+C` o `docker stop <id>`.

**Con puerto distinto** (ej. 8080 en el host):
```bash
docker run -p 8080:3000 tabla-periodica-biblia
```

**En segundo plano** (y que se reinicie solo si el servidor se apaga):
```bash
docker run -d --restart unless-stopped -p 3000:3000 --name biblia tabla-periodica-biblia
docker logs -f biblia   # ver logs en vivo
docker stop biblia      # detener
```

> El contenedor no guarda estado entre reinicios — las partidas son efímeras, igual que en producción.

---

## Despliegue gratuito en Render

Esta es la ruta más simple para una URL pública sin costo.

1. Crea una cuenta en [render.com](https://render.com) (gratis).
2. Sube tu repo a GitHub.
3. En Render → **New** → **Web Service** → conecta tu repo.
4. Configura:
   - **Root Directory**: `tabla-periodica-biblia/app`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Guarda. Render te dará una URL `https://<tu-servicio>.onrender.com`.
6. Comparte esa URL con los jugadores.

**Limitaciones del free tier**:
- El servicio duerme tras 15 min sin tráfico. Primer request tarda ~30 s.
- 750 horas/mes de cómputo gratis (más que suficiente para un grupo).
- No persiste datos entre reinicios — pero las partidas son efímeras, así que da igual.

Si necesitas evitar los cold starts, el plan Starter ($7/mes) los elimina, o usa **Fly.io free tier** que también soporta WebSockets.

## Solución de problemas

- **"No me deja entrar, dice ‘La partida ya empezó’"**: solo se admiten jugadores en fase lobby. Si llegan tarde, créales una partida nueva o empieza con quienes están.
- **Un jugador se desconectó**: aparece marcado como desconectado pero sigue en la lista. Si vuelve a entrar con el mismo nombre, será rechazado (nombre en uso); pídele que use un nombre ligeramente distinto.
- **No suena nada**: el juego no usa audio, todo es visual.
- **El proyector se ve oscuro**: el tema por defecto ya es de alto contraste. Si aún así no se ve bien, sube el brillo del proyector y baja la luz ambiente.
