# Reglas del juego

## Idea general

Cada **libro de la Biblia** es un **elemento** de una tabla periódica. La partida está dividida en **rondas**: en cada una, todos los jugadores eligen un libro de su tabla personal y reciben una pregunta asociada. A lo largo de la partida, cada jugador construye su propio "**pasaporte**" — la tabla con los libros que ha conquistado (✓) o fallado (✗).

## Antes de empezar

- El **host** (formador) abre la app en una computadora y proyecta la pantalla.
- Los **jugadores** entran a la URL pública del juego en su celular y escriben el **código de sala** (6 caracteres) o escanean el QR.
- Hay un máximo de **30 jugadores** por partida.

## Fases de una partida

```
lobby → ronda 1 (selección → pregunta → reveal → leaderboard)
      → ronda 2 → ... → ronda N → fin (pasaporte personal)
```

1. **Lobby**: el host ve quién se va conectando. Empieza cuando todos están listos.
2. **Selección de libro**: cada jugador ve su tabla periódica. Los libros que ya jugó en rondas anteriores aparecen marcados (✓ o ✗) y no pueden re-elegirse. Toca un libro disponible para reclamarlo.
3. **Pregunta**: cada jugador recibe una pregunta asociada al libro que eligió. El timer corre. Toca **A**, **B**, **C** o **D**.
4. **Reveal**: en el celular se marca el libro elegido en su tabla con ✓ verde (acertó) o ✗ rojo (falló). En la pantalla del host aparece un panel con quién tomó qué y cómo le fue a cada uno.
5. **Leaderboard**: ranking acumulado.
6. **(loop)** hasta que se completen las rondas configuradas.
7. **Fin**: podio + cada jugador ve su **pasaporte personal completo** con todas las marcas.

## Puntuación

Por cada respuesta correcta:

```
puntos = base × racha × dificultadDelLibro × double
```

- **Base** (rapidez): entre **200** y **1 000** puntos según qué tan rápido respondas.
- **Multiplicador de racha** (rondas correctas seguidas):
  - 2ª seguida: ×1.2
  - 3ª seguida: ×1.5
  - 4ª en adelante: ×2.0
- **Dificultad del libro** elegido: ×1, ×2 o ×3 (estrellas de la celda).
- **Power-up "doble"**: ×2 si lo activaste antes de responder.

Respuesta incorrecta o vencida: 0 puntos. La racha se rompe.

> **Atrévete con libros difíciles**: un libro de dificultad 3 acertado a tiempo da 3 veces más puntos que uno fácil. Pero si fallas, no obtienes nada y rompes la racha.

## Power-ups

Cada jugador tiene **un uso** de cada power-up por partida:

- **50 / 50**: oculta dos opciones incorrectas. Solo durante la pregunta.
- **x2 puntos**: la siguiente respuesta correcta cuenta el doble. Si fallas o no respondes a tiempo, se consume igual. Puedes activarlo en cualquier momento antes de responder.

## Tipos de pregunta

- **Identificación** — reconocer libros, testamentos o categorías.
- **Relación** — emparejar historias, citas o personajes con su libro.
- **Aplicación** — un caso de vida, ¿qué libro nos guía?
- **Tabla** — preguntas asignadas explícitamente a un libro concreto.

## Modo formación

Activable al crear la partida. En la pantalla de revelación aparece una **frase reflexiva** asociada a la pregunta. Pensado para hacer una pausa pedagógica de 30 segundos antes de avanzar.

## Pasaporte personal

Es la tabla periódica de cada jugador con marcas ✓ y ✗ de todos los libros que jugó durante la partida. Aparece al final del juego. Sirve como recuerdo y como motivación: "me faltan tantos libros por conocer".
