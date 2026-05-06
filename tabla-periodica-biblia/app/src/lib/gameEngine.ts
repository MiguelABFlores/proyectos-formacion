import type {
  FaseJuego,
  Jugador,
  JugadorPublico,
  Libro,
  PartidaPublica,
  Pregunta,
  PreguntaPublica,
  RespuestaJugador,
  ResumenJugadorRonda
} from "@/types/game";
import { calcularPuntos } from "./scoring";

/**
 * Estado interno de una partida.
 *
 * En el flujo "tabla periódica recurrente" cada ronda funciona así:
 *   roundSelection: cada jugador elige UN libro de su tabla disponible
 *                   (los del historial quedan excluidos para él).
 *   roundQuestion:  cada jugador recibe una pregunta asociada a su libro
 *                   y la contesta individualmente.
 *   roundReveal:    se vuelca el resultado al historial personal del jugador
 *                   (libro → "correcto" | "incorrecto").
 *   leaderboard:    ranking acumulado.
 *   ... loop hasta totalRondas, luego ended.
 */
export interface PartidaInterna {
  code: string;
  hostId: string;
  fase: FaseJuego;
  modoFormacion: boolean;
  creadaEn: number;
  /** Total de rondas configuradas al crear la partida. */
  totalRondas: number;
  /** Índice 0-based de la ronda en curso. Vale -1 antes de empezar. */
  rondaIndice: number;
  /** Timestamp de inicio de la pregunta de la ronda actual (compartido). */
  rondaInicioMs: number;
  /** jugadorId → símbolo del libro elegido en la ronda actual. */
  librosElegidosRonda: Map<string, string>;
  /** jugadorId → pregunta asignada en la ronda actual. */
  preguntasAsignadasRonda: Map<string, Pregunta>;
  /** jugadorId → respuesta dada en la ronda actual (cleared al cambiar de ronda). */
  respuestasRonda: Map<string, { elegida: number; ms: number }>;
  jugadores: Map<string, Jugador>;
  /** Sockets desconectados pero conservados por si reconectan. */
  desconectados: Set<string>;
}

const TOTAL_RONDAS_DEFAULT = 8;

export function crearPartida(
  code: string,
  hostId: string,
  totalRondas = TOTAL_RONDAS_DEFAULT,
  modoFormacion = false
): PartidaInterna {
  return {
    code,
    hostId,
    fase: "lobby",
    modoFormacion,
    creadaEn: Date.now(),
    totalRondas,
    rondaIndice: -1,
    rondaInicioMs: 0,
    librosElegidosRonda: new Map(),
    preguntasAsignadasRonda: new Map(),
    respuestasRonda: new Map(),
    jugadores: new Map(),
    desconectados: new Set()
  };
}

export function nuevoJugador(id: string, nombre: string): Jugador {
  return {
    id,
    nombre,
    puntos: 0,
    rachaActual: 0,
    mejorRacha: 0,
    powerUpsDisponibles: { fiftyFifty: true, double: true },
    doubleArmadoParaSiguiente: false,
    respuestas: [],
    historial: {}
  };
}

/** Pasa una Pregunta interna a su versión pública (sin la respuesta correcta). */
export function preguntaPublica(
  pregunta: Pregunta,
  inicioMs: number,
  modoFormacion: boolean
): PreguntaPublica {
  return {
    id: pregunta.id,
    tipo: pregunta.tipo,
    enunciado: pregunta.enunciado,
    opciones: pregunta.opciones,
    tiempoSegundos: pregunta.tiempoSegundos,
    inicioMs,
    reflexion: modoFormacion ? pregunta.reflexion : undefined
  };
}

export function jugadorPublico(j: Jugador, conectado: boolean): JugadorPublico {
  return {
    id: j.id,
    nombre: j.nombre,
    puntos: j.puntos,
    rachaActual: j.rachaActual,
    conectado,
    librosJugados: Object.keys(j.historial).length
  };
}

export function partidaPublica(p: PartidaInterna): PartidaPublica {
  return {
    code: p.code,
    fase: p.fase,
    modoFormacion: p.modoFormacion,
    rondaIndice: p.rondaIndice,
    totalRondas: p.totalRondas,
    jugadores: [...p.jugadores.values()].map(j => jugadorPublico(j, !p.desconectados.has(j.id)))
  };
}

/** Inicia una nueva ronda: limpia estado transitorio y avanza el índice. */
export function nuevaRonda(p: PartidaInterna): void {
  p.rondaIndice += 1;
  p.fase = "roundSelection";
  p.librosElegidosRonda.clear();
  p.preguntasAsignadasRonda.clear();
  p.respuestasRonda.clear();
}

/**
 * Devuelve la lista de libros que el jugador AÚN puede elegir
 * (todos los libros menos los que ya están en su historial).
 */
export function librosDisponiblesParaJugador(
  jugador: Jugador | undefined,
  todosLosLibros: Libro[]
): Libro[] {
  if (!jugador) return todosLosLibros;
  return todosLosLibros.filter(l => !(l.simbolo in jugador.historial));
}

/**
 * Registra la elección de libro de un jugador en la ronda actual.
 * Falla si: la fase no es roundSelection, el libro no existe, o ya está en su historial.
 *
 * Múltiples jugadores PUEDEN elegir el mismo libro en la misma ronda — son independientes.
 */
export function elegirLibroEnRonda(
  partida: PartidaInterna,
  jugadorId: string,
  simbolo: string,
  libros: Libro[]
): { ok: true } | { ok: false; error: string } {
  if (partida.fase !== "roundSelection") return { ok: false, error: "No es momento de elegir" };
  const jugador = partida.jugadores.get(jugadorId);
  if (!jugador) return { ok: false, error: "Jugador no encontrado" };
  if (simbolo in jugador.historial) return { ok: false, error: "Ya elegiste este libro antes" };
  const libro = libros.find(l => l.simbolo === simbolo);
  if (!libro) return { ok: false, error: "Libro inválido" };
  partida.librosElegidosRonda.set(jugadorId, simbolo);
  return { ok: true };
}

/**
 * Aplica la respuesta de un jugador a SU pregunta de la ronda actual.
 * Idempotente: si ya respondió, devuelve null.
 */
export function aplicarRespuestaRonda(
  partida: PartidaInterna,
  jugadorId: string,
  opcion: number,
  ahoraMs: number,
  libros: Libro[]
): RespuestaJugador | null {
  if (partida.fase !== "roundQuestion") return null;
  const jugador = partida.jugadores.get(jugadorId);
  const pregunta = partida.preguntasAsignadasRonda.get(jugadorId);
  const simboloElegido = partida.librosElegidosRonda.get(jugadorId);
  if (!jugador || !pregunta || !simboloElegido) return null;
  if (partida.respuestasRonda.has(jugadorId)) return null;

  const libro = libros.find(l => l.simbolo === simboloElegido);
  const dificultadLibro = (libro?.dificultad ?? 1) as 1 | 2 | 3;

  const tiempoLimiteMs = pregunta.tiempoSegundos * 1000;
  const msTomados = Math.max(0, ahoraMs - partida.rondaInicioMs);
  const correcta = opcion === pregunta.correcta;
  const doubleActivo = jugador.doubleArmadoParaSiguiente;

  const { puntos } = calcularPuntos({
    correcta,
    msTomados,
    tiempoLimiteMs,
    rachaPrevia: jugador.rachaActual,
    doubleActivo,
    dificultadLibro
  });

  jugador.puntos += puntos;
  if (correcta) {
    jugador.rachaActual += 1;
    jugador.mejorRacha = Math.max(jugador.mejorRacha, jugador.rachaActual);
  } else {
    jugador.rachaActual = 0;
  }
  jugador.doubleArmadoParaSiguiente = false;

  const entrada: RespuestaJugador = {
    preguntaId: pregunta.id,
    libroSimbolo: simboloElegido,
    elegida: opcion,
    correcta,
    msTomados,
    puntosObtenidos: puntos,
    rachaTras: jugador.rachaActual,
    doubleAplicado: doubleActivo && correcta,
    multiplicadorDificultad: dificultadLibro
  };
  jugador.respuestas.push(entrada);
  partida.respuestasRonda.set(jugadorId, { elegida: opcion, ms: msTomados });
  return entrada;
}

/**
 * Cierra la ronda: a quienes no respondieron les marca timeout.
 * Devuelve la lista de jugadorIds que quedaron sin respuesta.
 */
export function aplicarTimeoutsRonda(partida: PartidaInterna): string[] {
  const afectados: string[] = [];
  for (const jugador of partida.jugadores.values()) {
    if (partida.respuestasRonda.has(jugador.id)) continue;
    const pregunta = partida.preguntasAsignadasRonda.get(jugador.id);
    const simboloElegido = partida.librosElegidosRonda.get(jugador.id);
    if (!pregunta || !simboloElegido) continue; // no había elegido libro, no jugó esta ronda

    jugador.rachaActual = 0;
    jugador.doubleArmadoParaSiguiente = false;
    jugador.respuestas.push({
      preguntaId: pregunta.id,
      libroSimbolo: simboloElegido,
      elegida: null,
      correcta: false,
      msTomados: pregunta.tiempoSegundos * 1000,
      puntosObtenidos: 0,
      rachaTras: 0,
      doubleAplicado: false,
      multiplicadorDificultad: 1
    });
    afectados.push(jugador.id);
  }
  return afectados;
}

/**
 * Vuelca los resultados de la ronda actual al historial personal de cada jugador.
 * Llamar tras aplicar timeouts y antes de pasar a la siguiente ronda.
 */
export function actualizarHistorialesPostRonda(partida: PartidaInterna): void {
  for (const jugador of partida.jugadores.values()) {
    const simboloElegido = partida.librosElegidosRonda.get(jugador.id);
    if (!simboloElegido) continue;
    // La respuesta de esta ronda es la última en jugador.respuestas
    const ultimaRespuesta = jugador.respuestas[jugador.respuestas.length - 1];
    if (!ultimaRespuesta || ultimaRespuesta.libroSimbolo !== simboloElegido) continue;
    jugador.historial[simboloElegido] = ultimaRespuesta.correcta ? "correcto" : "incorrecto";
  }
}

/**
 * Genera el resumen por jugador de la ronda actual (para el host).
 */
export function resumenRonda(partida: PartidaInterna): ResumenJugadorRonda[] {
  return [...partida.jugadores.values()].map(j => {
    const simbolo = partida.librosElegidosRonda.get(j.id) ?? null;
    const ultimaRespuesta = j.respuestas[j.respuestas.length - 1];
    const respuestaDeEstaRonda =
      ultimaRespuesta && simbolo && ultimaRespuesta.libroSimbolo === simbolo ? ultimaRespuesta : null;
    return {
      jugadorId: j.id,
      nombre: j.nombre,
      libroSimbolo: simbolo,
      correcta: respuestaDeEstaRonda?.correcta ?? false,
      puntosObtenidos: respuestaDeEstaRonda?.puntosObtenidos ?? 0,
      respondio: respuestaDeEstaRonda !== null && respuestaDeEstaRonda.elegida !== null
    };
  });
}

/**
 * Activa un power-up. Devuelve true si se pudo activar.
 *  - fiftyFifty: solo válido en roundQuestion y si el jugador no respondió aún.
 *  - double: válido en cualquier momento antes de responder en roundQuestion;
 *            también puede armarse en lobby/leaderboard/roundSelection para usarlo
 *            en la próxima respuesta.
 */
export function activarPowerUp(
  partida: PartidaInterna,
  jugadorId: string,
  power: "fiftyFifty" | "double"
): boolean {
  const jugador = partida.jugadores.get(jugadorId);
  if (!jugador) return false;
  if (!jugador.powerUpsDisponibles[power]) return false;

  if (power === "fiftyFifty") {
    if (partida.fase !== "roundQuestion") return false;
    if (partida.respuestasRonda.has(jugadorId)) return false;
    jugador.powerUpsDisponibles.fiftyFifty = false;
    return true;
  }
  // double: no puede armarse si ya respondió la pregunta actual
  if (partida.fase === "roundQuestion" && partida.respuestasRonda.has(jugadorId)) return false;
  jugador.powerUpsDisponibles.double = false;
  jugador.doubleArmadoParaSiguiente = true;
  return true;
}

/** Devuelve la pregunta del jugador para hacer 50/50 (oculta 2 incorrectas). */
export function indicesParaFiftyFifty(pregunta: Pregunta): [number, number] {
  const incorrectas: number[] = [0, 1, 2, 3].filter(i => i !== pregunta.correcta);
  const barajadas = [...incorrectas].sort(() => Math.random() - 0.5);
  return [barajadas[0], barajadas[1]];
}

/** Top N jugadores ordenados por puntos descendente. */
export function leaderboard(partida: PartidaInterna, top = 10): JugadorPublico[] {
  return [...partida.jugadores.values()]
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, top)
    .map(j => jugadorPublico(j, !partida.desconectados.has(j.id)));
}

/** Cuenta cuántos jugadores activos ya eligieron libro en la ronda. */
export function eleccionesEnCurso(partida: PartidaInterna): { eligieron: number; total: number } {
  const total = partida.jugadores.size;
  const eligieron = partida.librosElegidosRonda.size;
  return { eligieron, total };
}

/** Cuenta cuántos jugadores ya respondieron en la ronda. */
export function respuestasEnCurso(partida: PartidaInterna): { respondieron: number; total: number } {
  const total = partida.librosElegidosRonda.size; // solo cuentan los que jugaron
  const respondieron = partida.respuestasRonda.size;
  return { respondieron, total };
}
