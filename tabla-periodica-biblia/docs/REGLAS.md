# Reglas del juego

## Idea general

Cada **libro de la Biblia** es un **elemento** de una tabla periódica. Los jugadores responden preguntas de opción múltiple desde su celular y suman puntos según aciertos, rapidez y constancia. Al final hay una **ronda especial** donde cada jugador elige un libro y recibe una pregunta cuyo bote depende de la dificultad del libro elegido.

## Antes de empezar

- El **host** (formador) abre la app en una computadora y proyecta la pantalla.
- Los **jugadores** entran a la URL pública del juego en su celular y escriben el **código de sala** (6 caracteres) o escanean el QR.
- Hay un máximo de **30 jugadores** por partida.

## Fases de una partida

```
lobby → pregunta → revelación → leaderboard → … → ronda final → fin
```

1. **Lobby**: el host ve quién se va conectando. Empieza cuando todos están listos.
2. **Pregunta**: aparece la pregunta. El timer corre. Cada jugador toca **A**, **B**, **C** o **D**.
3. **Revelación**: el host muestra la respuesta correcta y la **distribución** de respuestas (cuántos eligieron cada opción). En *modo formación* se añade una breve reflexión.
4. **Leaderboard**: ranking actualizado. El host pulsa "siguiente pregunta".
5. **Ronda final**: tras agotarse las preguntas regulares, cada jugador elige un libro de la tabla. Recibe una pregunta personalizada cuyo bote depende de la dificultad del libro.
6. **Fin**: ranking final, opción de descargar el resumen en JSON.

## Puntuación

- **Respuesta correcta**: entre **200** y **1 000** puntos según rapidez. Cuanto antes respondas, más puntos.
- **Respuesta incorrecta o tardía**: 0 puntos.
- **Racha** (rondas consecutivas correctas):
  - 2ª seguida: ×1.2
  - 3ª seguida: ×1.5
  - 4ª en adelante: ×2.0
- **Power-up "x2 puntos"**: activado, duplica los puntos de la siguiente respuesta correcta.

## Power-ups

Cada jugador tiene **un uso** de cada power-up por partida:

- **50 / 50**: se ocultan dos opciones incorrectas. Solo se puede usar antes de responder.
- **x2 puntos**: la siguiente respuesta correcta cuenta el doble. Si fallas o no respondes, se consume igual.

## Ronda final

- El host pulsa **"Iniciar ronda final"** desde el último leaderboard.
- En el celular, cada jugador ve la **tabla periódica completa** y elige **un libro disponible** (no se puede elegir uno ya tomado).
- Cada libro tiene una **dificultad** (1★ a 3★) que determina el multiplicador del bote: la pregunta correcta otorga `base × dificultad × 2`.
- En la ronda final no aplican rachas ni power-ups: es a libro descubierto.
- Si dos jugadores no eligieron a tiempo y el host cierra antes, esos jugadores no juegan la final.

## Tipos de pregunta

- **Identificación** — reconocer libros, testamentos o categorías. (ej: ¿Qué libro NO pertenece al Pentateuco?)
- **Relación** — emparejar historias, citas o personajes con su libro. (ej: ¿En qué libro David vence a Goliat?)
- **Aplicación** — un caso de vida, ¿qué libro nos guía? (ej: estás en duelo, ¿qué libro abres?)
- **Tabla** (ronda final) — preguntas asignadas a libros específicos.

## Modo formación

Activable al crear la partida. Tras cada revelación, aparece una **frase reflexiva** en pantalla del host y del jugador. Pensado para hacer una pausa pedagógica de 30 segundos antes de avanzar.
