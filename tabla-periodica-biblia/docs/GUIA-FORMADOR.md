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
| 10–40 min | Jugar 8 preguntas regulares (≈3 min cada una con la pausa reflexiva) |
| 40–55 min | Ronda final con tabla periódica + reflexión grupal |
| 55–60 min | Premiación, exportar resumen JSON, cierre |

Configura **8 preguntas** con **modo formación activado**. Esto deja espacio para conversar tras cada pregunta.

## En la sesión

1. Abre la URL pública del juego en tu computadora.
2. Pulsa **"Crear partida"**.
3. Configura:
   - ✅ **Modo formación** (recomendado)
   - **Número de preguntas** = 8
4. Pulsa **"Crear partida"**. Aparecerá un código y un QR.
5. Invita a los jugadores a escanear el QR o ingresar el código en `tu-url/play`.
6. Cuando estén todos, pulsa **"Empezar partida"**.
7. Tras cada pregunta, la app muestra:
   - La respuesta correcta
   - La distribución de respuestas (gran momento para hacer una breve catequesis)
   - Una reflexión, si la pregunta tiene una asociada
8. En el **leaderboard**, pulsa "siguiente pregunta" cuando estés listo.
9. Tras la última pregunta, en el header verás **"Iniciar ronda final →"**.
10. Cada jugador elige un libro. Cuando todos eligieron (o cuando lo decidas), pulsa "Lanzar ronda final".
11. Tras la ronda final, la pantalla muestra el podio. Pulsa **"Mostrar ganadores →"**.
12. En la pantalla de fin, pulsa **"Descargar resumen (JSON)"** si quieres conservar quién participó.

## Tips pedagógicos

- **No te apresures.** Después de la revelación, antes de pulsar "siguiente leaderboard", pausa 30 segundos para que los jóvenes comenten su respuesta.
- **Usa los % de respuesta.** Si la mayoría falló una pregunta, es una excelente oportunidad para enseñar.
- **Contrasta con la Biblia física.** Después de una pregunta sobre un libro concreto, invita a alguien a abrir su Biblia en ese libro y leer un versículo.
- **Premio simbólico.** Lleva un detalle (estampa, libro, rosario) para los 3 primeros — refuerza la motivación sin desvirtuar el sentido.
- **Para grupos muy nuevos**, considera quitar las preguntas de dificultad 3 al inicio.

## Correr con Docker (local o servidor propio)

Si tienes Docker instalado, puedes levantar la app sin tocar Node ni npm.

```bash
# Desde la raíz del repo (proyectos-formacion/)
docker build -t tabla-periodica-biblia ./tabla-periodica-biblia/app

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
