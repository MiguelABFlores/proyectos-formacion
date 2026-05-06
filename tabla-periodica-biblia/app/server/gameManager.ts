import type {
  HistorialPersonal,
  Pregunta,
  ResumenJugadorRonda
} from "../src/types/game";
import { cargarContenido, preguntaParaLibro } from "../src/lib/content";
import {
  crearPartida,
  nuevoJugador,
  preguntaPublica,
  partidaPublica,
  nuevaRonda,
  elegirLibroEnRonda,
  aplicarRespuestaRonda,
  aplicarTimeoutsRonda,
  actualizarHistorialesPostRonda,
  resumenRonda,
  activarPowerUp,
  indicesParaFiftyFifty,
  leaderboard,
  type PartidaInterna
} from "../src/lib/gameEngine";
import { nuevoRoomCode } from "../src/lib/roomCode";
import type { ResumenSesion } from "../src/lib/socketEvents";

const TOTAL_RONDAS_DEFAULT = 8;
/** Tiempo máximo (ms) que el host le da a los jugadores para elegir libro. Por ahora ilimitado y avanza solo cuando el host pulsa "Iniciar". */
const TIEMPO_QUESTION_DEFAULT_MS = 25_000;

export class GameManager {
  private partidas = new Map<string, PartidaInterna>();
  private jugadorEnPartida = new Map<string, string>();
  private hostDePartida = new Map<string, string>();
  /** Timers de cierre de pregunta por code. */
  private timers = new Map<string, NodeJS.Timeout>();

  // ============= ciclo de vida =============

  crear(hostId: string, opciones: { modoFormacion?: boolean; numRondas?: number } = {}): PartidaInterna {
    let code = nuevoRoomCode();
    while (this.partidas.has(code)) code = nuevoRoomCode();
    const totalRondas = opciones.numRondas ?? TOTAL_RONDAS_DEFAULT;
    const partida = crearPartida(code, hostId, totalRondas, opciones.modoFormacion ?? false);
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

  unirJugador(
    code: string,
    jugadorId: string,
    nombre: string
  ): { ok: true; partida: PartidaInterna } | { ok: false; error: string } {
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

  // ============= flujo del juego =============

  /**
   * El host pulsa "Siguiente" — avanza el flujo según la fase actual.
   *
   *   lobby           → roundSelection (ronda 1)
   *   roundSelection  → roundQuestion  (asigna preguntas a quienes eligieron)
   *   roundQuestion   → roundReveal    (cierra ronda, vuelca historial)
   *   roundReveal     → leaderboard
   *   leaderboard     → siguiente ronda OR ended (si era la última)
   */
  avanzar(code: string, callbacks: ServerCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida) return;

    switch (partida.fase) {
      case "lobby":
        this.iniciarNuevaRonda(partida, callbacks);
        return;

      case "roundSelection":
        // Asignar preguntas a quienes eligieron y arrancar fase question
        this.iniciarPreguntasRonda(partida, callbacks);
        return;

      case "roundQuestion":
        // Cierre forzado por el host
        this.cerrarRondaQuestion(code, callbacks);
        return;

      case "roundReveal":
        partida.fase = "leaderboard";
        callbacks.estado(partida);
        callbacks.leaderboard(leaderboard(partida));
        return;

      case "leaderboard":
        // ¿Otra ronda o se acabó?
        if (partida.rondaIndice + 1 >= partida.totalRondas) {
          this.terminarPartida(partida, callbacks);
        } else {
          this.iniciarNuevaRonda(partida, callbacks);
        }
        return;

      default:
        return;
    }
  }

  /** Jugador elige un libro en roundSelection. */
  elegirLibro(jugadorId: string, simbolo: string): { ok: true } | { ok: false; error: string } {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return { ok: false, error: "No estás en una partida" };
    const { libros } = cargarContenido();
    return elegirLibroEnRonda(partida, jugadorId, simbolo, libros);
  }

  /** Jugador responde su pregunta personal de la ronda actual. */
  responder(jugadorId: string, opcion: number, callbacks: ServerCallbacks): void {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return;
    if (partida.fase !== "roundQuestion") return;

    const { libros } = cargarContenido();
    const r = aplicarRespuestaRonda(partida, jugadorId, opcion, Date.now(), libros);
    if (!r) return;

    callbacks.resultadoRondaIndividual(jugadorId, r, this.historialJugador(partida, jugadorId));

    // Si todos los que eligieron libro ya respondieron, cerramos antes
    if (partida.respuestasRonda.size >= partida.librosElegidosRonda.size) {
      this.cerrarRondaQuestion(partida.code, callbacks);
    }
  }

  activarPowerUp(
    jugadorId: string,
    power: "fiftyFifty" | "double"
  ): { ok: true; ocultar?: [number, number] } | { ok: false; error: string } {
    const partida = this.getPorJugador(jugadorId);
    if (!partida) return { ok: false, error: "No estás en una partida" };
    const ok = activarPowerUp(partida, jugadorId, power);
    if (!ok) return { ok: false, error: "No se puede usar ahora" };
    if (power === "fiftyFifty") {
      const pregunta = partida.preguntasAsignadasRonda.get(jugadorId);
      if (!pregunta) return { ok: false, error: "Sin pregunta activa" };
      return { ok: true, ocultar: indicesParaFiftyFifty(pregunta) };
    }
    return { ok: true };
  }

  terminar(code: string, callbacks: ServerCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida) return;
    this.terminarPartida(partida, callbacks);
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

  private iniciarNuevaRonda(partida: PartidaInterna, callbacks: ServerCallbacks): void {
    nuevaRonda(partida);
    callbacks.estado(partida);
    callbacks.rondaSeleccion(partida.rondaIndice, partida.totalRondas);
  }

  private iniciarPreguntasRonda(partida: PartidaInterna, callbacks: ServerCallbacks): void {
    // Asigna pregunta a cada jugador que eligió libro.
    // Marcamos las preguntas usadas durante la partida para no repetir.
    const usadas = new Set<string>();
    for (const j of partida.jugadores.values()) {
      for (const r of j.respuestas) usadas.add(r.preguntaId);
    }

    const { libros } = cargarContenido();
    for (const [jugadorId, simbolo] of partida.librosElegidosRonda) {
      const libro = libros.find(l => l.simbolo === simbolo);
      if (!libro) continue;
      const pregunta = preguntaParaLibro(simbolo, libro.dificultad, usadas);
      if (pregunta) {
        usadas.add(pregunta.id);
        partida.preguntasAsignadasRonda.set(jugadorId, pregunta);
      }
    }

    partida.fase = "roundQuestion";
    partida.rondaInicioMs = Date.now();
    callbacks.estado(partida);

    // Emite la pregunta personal a cada jugador con su libro asignado.
    for (const [jugadorId, pregunta] of partida.preguntasAsignadasRonda) {
      const simbolo = partida.librosElegidosRonda.get(jugadorId)!;
      callbacks.preguntaPersonal(
        jugadorId,
        preguntaPublica(pregunta, partida.rondaInicioMs, partida.modoFormacion),
        simbolo
      );
    }

    // Programa cierre por timeout (usa el mayor tiempo entre las preguntas asignadas)
    let mayorTimeoutMs = TIEMPO_QUESTION_DEFAULT_MS;
    for (const p of partida.preguntasAsignadasRonda.values()) {
      mayorTimeoutMs = Math.max(mayorTimeoutMs, p.tiempoSegundos * 1000);
    }
    this.programarCierre(partida.code, mayorTimeoutMs, callbacks);
  }

  private cerrarRondaQuestion(code: string, callbacks: ServerCallbacks): void {
    const partida = this.partidas.get(code);
    if (!partida || partida.fase !== "roundQuestion") return;
    this.cancelarTimer(code);

    const sinResponder = aplicarTimeoutsRonda(partida);
    actualizarHistorialesPostRonda(partida);

    // Notifica a los que cayeron en timeout su resultado e historial actualizado.
    for (const jugadorId of sinResponder) {
      const jugador = partida.jugadores.get(jugadorId);
      if (!jugador) continue;
      const ultima = jugador.respuestas[jugador.respuestas.length - 1];
      if (ultima) {
        callbacks.resultadoRondaIndividual(jugadorId, ultima, jugador.historial);
      }
    }

    partida.fase = "roundReveal";
    callbacks.estado(partida);
    callbacks.resumenRonda(partida.rondaIndice, resumenRonda(partida));
  }

  private terminarPartida(partida: PartidaInterna, callbacks: ServerCallbacks): void {
    this.cancelarTimer(partida.code);
    partida.fase = "ended";
    callbacks.estado(partida);
    callbacks.fin(
      leaderboard(partida, 30),
      this.resumenSesion(partida),
      this.historialesTodos(partida)
    );
  }

  private historialJugador(partida: PartidaInterna, jugadorId: string): HistorialPersonal {
    return partida.jugadores.get(jugadorId)?.historial ?? {};
  }

  private historialesTodos(partida: PartidaInterna): Record<string, HistorialPersonal> {
    const out: Record<string, HistorialPersonal> = {};
    for (const j of partida.jugadores.values()) {
      out[j.id] = j.historial;
    }
    return out;
  }

  private programarCierre(code: string, ms: number, callbacks: ServerCallbacks): void {
    this.cancelarTimer(code);
    const t = setTimeout(() => this.cerrarRondaQuestion(code, callbacks), ms);
    this.timers.set(code, t);
  }

  private cancelarTimer(code: string): void {
    const t = this.timers.get(code);
    if (t) {
      clearTimeout(t);
      this.timers.delete(code);
    }
  }

  private resumenSesion(partida: PartidaInterna): ResumenSesion {
    return {
      code: partida.code,
      inicioMs: partida.creadaEn,
      finMs: Date.now(),
      modoFormacion: partida.modoFormacion,
      totalRondas: partida.totalRondas,
      jugadores: [...partida.jugadores.values()]
        .sort((a, b) => b.puntos - a.puntos)
        .map(j => {
          const librosCorrectos: string[] = [];
          const librosIncorrectos: string[] = [];
          for (const [simbolo, estado] of Object.entries(j.historial)) {
            if (estado === "correcto") librosCorrectos.push(simbolo);
            else librosIncorrectos.push(simbolo);
          }
          return {
            nombre: j.nombre,
            puntosFinal: j.puntos,
            mejorRacha: j.mejorRacha,
            aciertos: j.respuestas.filter(r => r.correcta).length,
            fallos: j.respuestas.filter(r => !r.correcta && r.elegida !== null).length,
            sinResponder: j.respuestas.filter(r => r.elegida === null).length,
            librosCorrectos,
            librosIncorrectos
          };
        })
    };
  }
}

/** Callbacks que el manager invoca para que el server emita por sockets. */
export interface ServerCallbacks {
  estado: (partida: PartidaInterna) => void;
  rondaSeleccion: (rondaIndice: number, totalRondas: number) => void;
  preguntaPersonal: (
    jugadorId: string,
    pregunta: ReturnType<typeof preguntaPublica>,
    libroSimbolo: string
  ) => void;
  resultadoRondaIndividual: (
    jugadorId: string,
    respuesta: import("../src/types/game").RespuestaJugador,
    historial: HistorialPersonal
  ) => void;
  resumenRonda: (rondaIndice: number, resumenes: ResumenJugadorRonda[]) => void;
  leaderboard: (top: ReturnType<typeof leaderboard>) => void;
  fin: (
    top: ReturnType<typeof leaderboard>,
    resumen: ResumenSesion,
    historiales: Record<string, HistorialPersonal>
  ) => void;
}

// Re-export para tipado en server/index.ts
export { partidaPublica };
// Marcar Pregunta como usado para evitar el warning de import no usado en algunos compiladores
export type { Pregunta };
