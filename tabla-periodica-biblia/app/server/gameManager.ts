import type { Pregunta } from "../src/types/game";
import { cargarContenido, preguntaParaLibro } from "../src/lib/content";
import {
  crearPartida,
  nuevoJugador,
  preguntaActual,
  preguntaPublica,
  partidaPublica,
  aplicarRespuesta,
  aplicarTimeoutsPregunta,
  activarPowerUp,
  indicesParaFiftyFifty,
  distribucionRespuestas,
  leaderboard,
  type PartidaInterna
} from "../src/lib/gameEngine";
import { nuevoRoomCode } from "../src/lib/roomCode";
import type { ResumenSesion } from "../src/lib/socketEvents";

const PREGUNTAS_POR_PARTIDA_DEFAULT = 8;

/**
 * Selecciona N preguntas equilibrando dificultad (más fáciles primero).
 */
function seleccionarPreguntas(numero: number): Pregunta[] {
  const { preguntas } = cargarContenido();
  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const faciles = shuffle(preguntas.filter(p => p.dificultad === 1));
  const medias = shuffle(preguntas.filter(p => p.dificultad === 2));
  const dificiles = shuffle(preguntas.filter(p => p.dificultad === 3));
  const result: Pregunta[] = [];
  const tomarDe = (arr: Pregunta[], n: number) => result.push(...arr.slice(0, n));
  // 40% fácil, 40% media, 20% difícil
  const nFacil = Math.max(1, Math.round(numero * 0.4));
  const nMedia = Math.max(1, Math.round(numero * 0.4));
  const nDificil = Math.max(1, numero - nFacil - nMedia);
  tomarDe(faciles, nFacil);
  tomarDe(medias, nMedia);
  tomarDe(dificiles, nDificil);
  // Si quedó corto (poco contenido), rellena con cualquiera
  while (result.length < numero) {
    const restantes = preguntas.filter(p => !result.find(r => r.id === p.id));
    if (restantes.length === 0) break;
    result.push(restantes[Math.floor(Math.random() * restantes.length)]);
  }
  return result.slice(0, numero);
}

export class GameManager {
  private partidas = new Map<string, PartidaInterna>();
  /** sockId → code (para encontrar la partida del jugador rápidamente). */
  private jugadorEnPartida = new Map<string, string>();
  /** sockId → code (para hosts). */
  private hostDePartida = new Map<string, string>();
  /** Timers de cierre de pregunta por code. */
  private timers = new Map<string, NodeJS.Timeout>();

  crear(hostId: string, opciones: { modoFormacion?: boolean; numPreguntas?: number } = {}): PartidaInterna {
    let code = nuevoRoomCode();
    while (this.partidas.has(code)) code = nuevoRoomCode();
    const num = opciones.numPreguntas ?? PREGUNTAS_POR_PARTIDA_DEFAULT;
    const preguntas = seleccionarPreguntas(num);
    const partida = crearPartida(code, hostId, preguntas, opciones.modoFormacion ?? false);
    this.partidas.set(code, partida);
    this.hostDePartida.set(hostId, code);
    return partida;
  }

  reasignarHost(hostId: string, code: string): PartidaInterna | null {
    const partida = this.partidas.get(code);
    if (!partida) return null;
    this.hostDePartida.delete(partida.hostId);
    partida.hostId = hostId;
    this.hostDePartida.set(hostId, code);
    return partida;
  }

  getPorCode(code: string): PartidaInterna | undefined {
    return this.partidas.get(code);
  }

  getPorJugador(jugadorId: string): PartidaInterna | undefined {
    const code = this.jugadorEnPartida.get(jugadorId);
    return code ? this.partidas.get(code) : undefined;
  }

  getPorHost(hostId: string): PartidaInterna | undefined {
    const code = this.hostDePartida.get(hostId);
    return code ? this.partidas.get(code) : undefined;
  }

  unirJugador(code: string, jugadorId: string, nombre: string): { ok: true; partida: PartidaInterna } | { ok: false; error: string } {
    const partida = this.partidas.get(code);
    if (!partida) return { ok: false, error: "Código no encontrado" };
    if (partida.fase !== "lobby") return { ok: false, error: "La partida ya empezó" };
    if (partida.jugadores.size >= 30) return { ok: false, error: "Sala llena (máx 30)" };
    const nombreLimpio = nombre.trim().slice(0, 24);
    if (!nombreLimpio) return { ok: false, error: "Nombre vacío" };
    const yaUsado = [...partida.jugadores.values()].some(j => j.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    if (yaUsado) return { ok: false, error: "Ese nombre ya está en uso" };
    partida.jugadores.set(jugadorId, nuevoJugador(jugadorId, nombreLimpio));
    this.jugadorEnPartida.set(jugadorId, code);
    return { ok: true, partida };
  }

  salirJugador(jugadorId: string): PartidaInterna | undefined {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return undefined;
    if (partida.fase === "lobby") {
      partida.jugadores.delete(jugadorId);
    } else {
      partida.desconectados.add(jugadorId);
    }
    this.jugadorEnPartida.delete(jugadorId);
    return partida;
  }

  /** Inicia o avanza el flujo del juego según la fase actual. */
  avanzar(code: string, callbacks: AvanzarCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida) return;

    const lanzarSiguientePregunta = () => {
      partida.preguntaIndice += 1;
      if (partida.preguntaIndice >= partida.preguntas.length) {
        // Se acabaron las preguntas regulares: ofrece ronda final
        partida.fase = "leaderboard";
        callbacks.estado(partida);
        callbacks.leaderboard(leaderboard(partida));
        return;
      }
      const pregunta = preguntaActual(partida)!;
      partida.fase = "question";
      partida.preguntaInicioMs = Date.now();
      partida.respuestasActual.clear();
      callbacks.pregunta(preguntaPublica(pregunta, partida.preguntaInicioMs, partida.modoFormacion), partida.preguntaIndice, partida.preguntas.length);
      callbacks.estado(partida);
      this.programarCierre(code, pregunta.tiempoSegundos * 1000, callbacks);
    };

    switch (partida.fase) {
      case "lobby":
      case "leaderboard":
        lanzarSiguientePregunta();
        return;
      case "question":
        // Forzar cierre temprano si el host pulsa "siguiente"
        this.cerrarPregunta(code, callbacks);
        return;
      case "reveal":
        // Tras revelar, pasamos a leaderboard y luego, en el próximo "siguiente", a la nueva pregunta.
        partida.fase = "leaderboard";
        callbacks.estado(partida);
        callbacks.leaderboard(leaderboard(partida));
        return;
      case "finalRoundLobby":
        // Asignar pregunta a cada jugador y emitir
        this.asignarPreguntasFinales(partida, callbacks);
        partida.fase = "finalQuestion";
        partida.preguntaInicioMs = Date.now();
        callbacks.estado(partida);
        // Cierre tras 35s (más generoso para la final)
        this.programarCierreFinal(code, 35000, callbacks);
        return;
      case "finalQuestion":
        this.cerrarRondaFinal(code, callbacks);
        return;
      case "finalReveal":
        partida.fase = "ended";
        callbacks.estado(partida);
        callbacks.fin(leaderboard(partida, 30), this.resumenSesion(partida));
        return;
      default:
        return;
    }
  }

  /** Llamado por el host para iniciar la ronda final. */
  iniciarRondaFinal(code: string, callbacks: AvanzarCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida) return;
    partida.fase = "finalRoundLobby";
    partida.libroFinalPorJugador.clear();
    callbacks.estado(partida);
    const { libros } = cargarContenido();
    callbacks.rondaFinalLobby(libros.map(l => ({ simbolo: l.simbolo, dificultad: l.dificultad })), {});
  }

  elegirLibroFinal(jugadorId: string, simbolo: string): { ok: true } | { ok: false; error: string } {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return { ok: false, error: "No estás en una partida" };
    if (partida.fase !== "finalRoundLobby") return { ok: false, error: "No es el momento de elegir" };
    const yaElegido = [...partida.libroFinalPorJugador.values()].includes(simbolo);
    if (yaElegido) return { ok: false, error: "Ese libro ya lo eligió otro jugador" };
    const { libros } = cargarContenido();
    if (!libros.find(l => l.simbolo === simbolo)) return { ok: false, error: "Libro inválido" };
    partida.libroFinalPorJugador.set(jugadorId, simbolo);
    const jugador = partida.jugadores.get(jugadorId);
    if (jugador) jugador.libroFinalSimbolo = simbolo;
    return { ok: true };
  }

  responder(jugadorId: string, opcion: number, callbacks: AvanzarCallbacks): void {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return;

    if (partida.fase === "question") {
      const r = aplicarRespuesta(partida, jugadorId, opcion, Date.now());
      if (r) {
        callbacks.resultadoIndividual(jugadorId, r);
        // Si todos respondieron, cerrar la pregunta antes
        if (partida.respuestasActual.size === partida.jugadores.size) {
          this.cerrarPregunta(partida.code, callbacks);
        }
      }
      return;
    }

    if (partida.fase === "finalQuestion") {
      const pregunta = partida.preguntaFinalPorJugador.get(jugadorId);
      if (!pregunta) return;
      const yaRespondio = partida.jugadores.get(jugadorId)?.respuestas.find(r => r.preguntaId === pregunta.id);
      if (yaRespondio) return;
      const ahora = Date.now();
      const ms = Math.max(0, ahora - partida.preguntaInicioMs);
      const correcta = opcion === pregunta.correcta;
      const jugador = partida.jugadores.get(jugadorId)!;
      // En la final, los puntos son base × dificultad × 2 (apuesta), sin racha ni double
      const baseBase = correcta ? Math.max(200, 1000 - Math.floor(ms / 15)) : 0;
      const puntos = correcta ? baseBase * pregunta.dificultad * 2 : 0;
      jugador.puntos += puntos;
      jugador.respuestas.push({
        preguntaId: pregunta.id,
        elegida: opcion,
        correcta,
        msTomados: ms,
        puntosObtenidos: puntos,
        rachaTras: jugador.rachaActual,
        doubleAplicado: false
      });
      callbacks.resultadoIndividual(jugadorId, jugador.respuestas[jugador.respuestas.length - 1]);
      // Si todos respondieron, cerrar la final antes
      const todosRespondieron = [...partida.jugadores.values()].every(j =>
        j.respuestas.find(r => r.preguntaId === partida.preguntaFinalPorJugador.get(j.id)?.id)
      );
      if (todosRespondieron) {
        this.cerrarRondaFinal(partida.code, callbacks);
      }
    }
  }

  activarPowerUp(jugadorId: string, power: "fiftyFifty" | "double"): { ok: true; ocultar?: [number, number] } | { ok: false; error: string } {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return { ok: false, error: "No estás en una partida" };
    const ok = activarPowerUp(partida, jugadorId, power);
    if (!ok) return { ok: false, error: "No se puede usar ahora" };
    if (power === "fiftyFifty") {
      const pregunta = preguntaActual(partida);
      if (!pregunta) return { ok: false, error: "Sin pregunta activa" };
      return { ok: true, ocultar: indicesParaFiftyFifty(pregunta) };
    }
    return { ok: true };
  }

  terminar(code: string, callbacks: AvanzarCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida) return;
    this.cancelarTimer(code);
    partida.fase = "ended";
    callbacks.estado(partida);
    callbacks.fin(leaderboard(partida, 30), this.resumenSesion(partida));
  }

  /** Limpia partidas acabadas hace > 1h. Llamado periódicamente. */
  limpiarAntiguas(): void {
    const ahora = Date.now();
    const UNA_HORA = 60 * 60 * 1000;
    for (const [code, partida] of this.partidas) {
      if (partida.fase === "ended" && ahora - partida.creadaEn > UNA_HORA) {
        this.partidas.delete(code);
        this.cancelarTimer(code);
      }
    }
  }

  // ============= internos =============

  private programarCierre(code: string, ms: number, callbacks: AvanzarCallbacks): void {
    this.cancelarTimer(code);
    const t = setTimeout(() => this.cerrarPregunta(code, callbacks), ms);
    this.timers.set(code, t);
  }

  private programarCierreFinal(code: string, ms: number, callbacks: AvanzarCallbacks): void {
    this.cancelarTimer(code);
    const t = setTimeout(() => this.cerrarRondaFinal(code, callbacks), ms);
    this.timers.set(code, t);
  }

  private cancelarTimer(code: string): void {
    const t = this.timers.get(code);
    if (t) {
      clearTimeout(t);
      this.timers.delete(code);
    }
  }

  private cerrarPregunta(code: string, callbacks: AvanzarCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida || partida.fase !== "question") return;
    this.cancelarTimer(code);
    aplicarTimeoutsPregunta(partida);
    const pregunta = preguntaActual(partida);
    if (!pregunta) return;
    partida.fase = "reveal";
    callbacks.reveal({
      preguntaId: pregunta.id,
      correcta: pregunta.correcta,
      distribucion: distribucionRespuestas(partida),
      reflexion: partida.modoFormacion ? pregunta.reflexion : undefined
    });
    callbacks.estado(partida);
  }

  private asignarPreguntasFinales(partida: PartidaInterna, callbacks: AvanzarCallbacks): void {
    const usadas = new Set<string>(partida.preguntas.map(p => p.id));
    for (const [jugadorId, simbolo] of partida.libroFinalPorJugador) {
      const { libros } = cargarContenido();
      const libro = libros.find(l => l.simbolo === simbolo);
      if (!libro) continue;
      const pregunta = preguntaParaLibro(simbolo, libro.dificultad, usadas);
      if (pregunta) {
        usadas.add(pregunta.id);
        partida.preguntaFinalPorJugador.set(jugadorId, pregunta);
        callbacks.preguntaFinal(jugadorId, preguntaPublica(pregunta, Date.now(), partida.modoFormacion), simbolo);
      }
    }
  }

  private cerrarRondaFinal(code: string, callbacks: AvanzarCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida || partida.fase !== "finalQuestion") return;
    this.cancelarTimer(code);
    partida.fase = "finalReveal";
    callbacks.estado(partida);
    callbacks.leaderboard(leaderboard(partida, 30));
  }

  private resumenSesion(partida: PartidaInterna): ResumenSesion {
    return {
      code: partida.code,
      inicioMs: partida.creadaEn,
      finMs: Date.now(),
      modoFormacion: partida.modoFormacion,
      jugadores: [...partida.jugadores.values()]
        .sort((a, b) => b.puntos - a.puntos)
        .map(j => ({
          nombre: j.nombre,
          puntosFinal: j.puntos,
          mejorRacha: j.mejorRacha,
          aciertos: j.respuestas.filter(r => r.correcta).length,
          fallos: j.respuestas.filter(r => !r.correcta && r.elegida !== null).length,
          sinResponder: j.respuestas.filter(r => r.elegida === null).length,
          libroFinal: j.libroFinalSimbolo
        })),
      preguntas: partida.preguntas.map(p => ({ id: p.id, enunciado: p.enunciado, correcta: p.correcta }))
    };
  }
}

export interface AvanzarCallbacks {
  estado: (partida: PartidaInterna) => void;
  pregunta: (pregunta: ReturnType<typeof preguntaPublica>, indice: number, total: number) => void;
  reveal: (data: { preguntaId: string; correcta: 0 | 1 | 2 | 3; distribucion: ReturnType<typeof distribucionRespuestas>; reflexion?: string }) => void;
  leaderboard: (top: ReturnType<typeof leaderboard>) => void;
  resultadoIndividual: (jugadorId: string, r: import("../src/types/game").RespuestaJugador) => void;
  rondaFinalLobby: (libros: { simbolo: string; dificultad: 1 | 2 | 3 }[], elegidos: Record<string, string>) => void;
  preguntaFinal: (jugadorId: string, pregunta: ReturnType<typeof preguntaPublica>, libroSimbolo: string) => void;
  fin: (top: ReturnType<typeof leaderboard>, resumen: ResumenSesion) => void;
}

// Re-export para tipado en server/index.ts
export { partidaPublica };
