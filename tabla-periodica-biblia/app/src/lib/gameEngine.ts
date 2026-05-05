import type {
  FaseJuego,
  Jugador,
  JugadorPublico,
  PartidaPublica,
  Pregunta,
  PreguntaPublica,
  RespuestaJugador
} from "@/types/game";
import { calcularPuntos } from "./scoring";

export interface PartidaInterna {
  code: string;
  hostId: string;
  fase: FaseJuego;
  modoFormacion: boolean;
  creadaEn: number;
  /** Preguntas seleccionadas para esta partida (orden definitivo). */
  preguntas: Pregunta[];
  preguntaIndice: number;
  preguntaInicioMs: number;
  /** sockId → respuesta dada en la pregunta actual. */
  respuestasActual: Map<string, { elegida: number; ms: number }>;
  /** Solo en ronda final: libro elegido por jugador. */
  libroFinalPorJugador: Map<string, string>;
  /** Solo en ronda final: pregunta asignada a cada jugador (id pregunta). */
  preguntaFinalPorJugador: Map<string, Pregunta>;
  preguntasFinalUsadas: Set<string>;
  jugadores: Map<string, Jugador>;
  /** Sockets desconectados pero conservados por si reconectan. */
  desconectados: Set<string>;
}

export function crearPartida(code: string, hostId: string, preguntas: Pregunta[], modoFormacion = false): PartidaInterna {
  return {
    code,
    hostId,
    fase: "lobby",
    modoFormacion,
    creadaEn: Date.now(),
    preguntas,
    preguntaIndice: -1,
    preguntaInicioMs: 0,
    respuestasActual: new Map(),
    libroFinalPorJugador: new Map(),
    preguntaFinalPorJugador: new Map(),
    preguntasFinalUsadas: new Set(),
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
    respuestas: []
  };
}

export function preguntaActual(p: PartidaInterna): Pregunta | null {
  if (p.preguntaIndice < 0 || p.preguntaIndice >= p.preguntas.length) return null;
  return p.preguntas[p.preguntaIndice];
}

export function preguntaPublica(pregunta: Pregunta, inicioMs: number, modoFormacion: boolean): PreguntaPublica {
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
    conectado
  };
}

export function partidaPublica(p: PartidaInterna): PartidaPublica {
  const preg = preguntaActual(p);
  return {
    code: p.code,
    fase: p.fase,
    modoFormacion: p.modoFormacion,
    preguntaIndice: p.preguntaIndice,
    totalPreguntas: p.preguntas.length,
    preguntaActual: preg && (p.fase === "question" || p.fase === "reveal")
      ? preguntaPublica(preg, p.preguntaInicioMs, p.modoFormacion)
      : null,
    jugadores: [...p.jugadores.values()].map(j => jugadorPublico(j, !p.desconectados.has(j.id)))
  };
}

/**
 * Aplica la respuesta de un jugador a la pregunta actual y devuelve la entrada del historial.
 * Idempotente: si el jugador ya respondió esta pregunta, devuelve null.
 */
export function aplicarRespuesta(
  partida: PartidaInterna,
  jugadorId: string,
  opcion: number,
  ahoraMs: number
): RespuestaJugador | null {
  const pregunta = preguntaActual(partida);
  const jugador = partida.jugadores.get(jugadorId);
  if (!pregunta || !jugador) return null;
  if (partida.fase !== "question") return null;
  if (partida.respuestasActual.has(jugadorId)) return null;

  const tiempoLimiteMs = pregunta.tiempoSegundos * 1000;
  const msTomados = Math.max(0, ahoraMs - partida.preguntaInicioMs);
  const correcta = opcion === pregunta.correcta;
  const doubleActivo = jugador.doubleArmadoParaSiguiente;

  const { puntos } = calcularPuntos({
    correcta,
    msTomados,
    tiempoLimiteMs,
    rachaPrevia: jugador.rachaActual,
    doubleActivo
  });

  jugador.puntos += puntos;
  if (correcta) {
    jugador.rachaActual += 1;
    jugador.mejorRacha = Math.max(jugador.mejorRacha, jugador.rachaActual);
  } else {
    jugador.rachaActual = 0;
  }
  // El "double" se consume tras esta pregunta, sea correcta o no
  jugador.doubleArmadoParaSiguiente = false;

  const entrada: RespuestaJugador = {
    preguntaId: pregunta.id,
    elegida: opcion,
    correcta,
    msTomados,
    puntosObtenidos: puntos,
    rachaTras: jugador.rachaActual,
    doubleAplicado: doubleActivo && correcta
  };
  jugador.respuestas.push(entrada);
  partida.respuestasActual.set(jugadorId, { elegida: opcion, ms: msTomados });
  return entrada;
}

/**
 * Marca como "no respondido" (timeout) a quienes no respondieron al cerrar la pregunta.
 * Su racha vuelve a 0. Devuelve la lista de jugadores afectados.
 */
export function aplicarTimeoutsPregunta(partida: PartidaInterna): string[] {
  const pregunta = preguntaActual(partida);
  if (!pregunta) return [];
  const afectados: string[] = [];
  for (const jugador of partida.jugadores.values()) {
    if (partida.respuestasActual.has(jugador.id)) continue;
    jugador.rachaActual = 0;
    jugador.doubleArmadoParaSiguiente = false;
    jugador.respuestas.push({
      preguntaId: pregunta.id,
      elegida: null,
      correcta: false,
      msTomados: pregunta.tiempoSegundos * 1000,
      puntosObtenidos: 0,
      rachaTras: 0,
      doubleAplicado: false
    });
    afectados.push(jugador.id);
  }
  return afectados;
}

/**
 * Consume un power-up. Devuelve true si se pudo activar.
 *  - fiftyFifty: solo válido si está la pregunta abierta y el jugador no respondió aún.
 *  - double: válido en lobby, leaderboard o question (si no respondió aún) — se consume al responder.
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
    if (partida.fase !== "question") return false;
    if (partida.respuestasActual.has(jugadorId)) return false;
    jugador.powerUpsDisponibles.fiftyFifty = false;
    return true;
  }
  // double
  if (partida.fase === "question" && partida.respuestasActual.has(jugadorId)) return false;
  jugador.powerUpsDisponibles.double = false;
  jugador.doubleArmadoParaSiguiente = true;
  return true;
}

/** Devuelve los 2 índices a ocultar para el power-up 50/50 (las 2 incorrectas más obvias). */
export function indicesParaFiftyFifty(pregunta: Pregunta): [number, number] {
  const incorrectas: number[] = [0, 1, 2, 3].filter(i => i !== pregunta.correcta);
  // Elige 2 al azar para variedad
  const barajadas = [...incorrectas].sort(() => Math.random() - 0.5);
  return [barajadas[0], barajadas[1]];
}

/** % de jugadores que eligieron cada opción (incluye 'noRespondio'). */
export function distribucionRespuestas(partida: PartidaInterna): {
  porOpcion: [number, number, number, number];
  noRespondio: number;
  totalJugadores: number;
} {
  const por: [number, number, number, number] = [0, 0, 0, 0];
  let respondieron = 0;
  for (const r of partida.respuestasActual.values()) {
    if (r.elegida >= 0 && r.elegida <= 3) {
      por[r.elegida] += 1;
      respondieron += 1;
    }
  }
  const total = partida.jugadores.size;
  return { porOpcion: por, noRespondio: total - respondieron, totalJugadores: total };
}

/** Top N jugadores ordenados por puntos descendente. */
export function leaderboard(partida: PartidaInterna, top = 10): JugadorPublico[] {
  return [...partida.jugadores.values()]
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, top)
    .map(j => jugadorPublico(j, !partida.desconectados.has(j.id)));
}
