import type { JugadorPublico, PartidaPublica, PreguntaPublica, PowerUp, RespuestaJugador } from "@/types/game";

/**
 * Contratos tipados de eventos cliente↔servidor.
 * Compartido entre `server/` y `src/hooks/useSocket.ts`.
 */

// ============= Cliente → Servidor =============

export interface ClienteEventos {
  /** Host crea una nueva partida. */
  "host:crear": (
    payload: { modoFormacion?: boolean; numPreguntas?: number },
    cb: (res: { ok: true; code: string } | { ok: false; error: string }) => void
  ) => void;

  /** Host solicita re-asociación tras refresh / reconexión. */
  "host:reconectar": (
    payload: { code: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  /** Host avanza al siguiente estado. */
  "host:siguiente": (payload: { code: string }) => void;

  /** Host inicia la ronda final. */
  "host:rondaFinal": (payload: { code: string }) => void;

  /** Host termina la partida. */
  "host:terminar": (payload: { code: string }) => void;

  /** Jugador se une a una partida. */
  "jugador:unirse": (
    payload: { code: string; nombre: string },
    cb: (res: { ok: true; jugador: JugadorPublico } | { ok: false; error: string }) => void
  ) => void;

  /** Jugador responde la pregunta actual. */
  "jugador:responder": (payload: { opcion: 0 | 1 | 2 | 3 }) => void;

  /** Jugador activa un power-up. */
  "jugador:powerUp": (
    payload: { power: PowerUp },
    cb: (res: { ok: true; ocultar?: [number, number] } | { ok: false; error: string }) => void
  ) => void;

  /** En ronda final, jugador escoge el libro. */
  "jugador:elegirLibro": (
    payload: { simbolo: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}

// ============= Servidor → Cliente =============

export interface ServidorEventos {
  /** Estado completo de la partida (host y jugadores reciben proyecciones distintas). */
  "partida:estado": (estado: PartidaPublica) => void;

  /** Una nueva pregunta empieza. */
  "partida:pregunta": (data: { pregunta: PreguntaPublica; indice: number; total: number }) => void;

  /** La pregunta actual se cierra y se revela la respuesta. */
  "partida:reveal": (data: {
    preguntaId: string;
    correcta: 0 | 1 | 2 | 3;
    distribucion: { porOpcion: [number, number, number, number]; noRespondio: number; totalJugadores: number };
    reflexion?: string;
  }) => void;

  /** Leaderboard tras una pregunta. */
  "partida:leaderboard": (data: { top: JugadorPublico[] }) => void;

  /** Confirmación al jugador con su resultado individual de la pregunta. */
  "jugador:resultado": (data: RespuestaJugador) => void;

  /** Inicio de la ronda final: host muestra la tabla. */
  "partida:rondaFinalLobby": (data: { libros: { simbolo: string; dificultad: 1 | 2 | 3 }[]; elegidos: Record<string, string> }) => void;

  /** Pregunta personalizada para cada jugador en la ronda final. */
  "jugador:preguntaFinal": (data: { pregunta: PreguntaPublica; libroSimbolo: string }) => void;

  /** Partida terminada. */
  "partida:fin": (data: { top: JugadorPublico[]; resumen: ResumenSesion }) => void;

  /** Errores genéricos. */
  "partida:error": (data: { mensaje: string }) => void;
}

export interface ResumenSesion {
  code: string;
  inicioMs: number;
  finMs: number;
  modoFormacion: boolean;
  jugadores: {
    nombre: string;
    puntosFinal: number;
    mejorRacha: number;
    aciertos: number;
    fallos: number;
    sinResponder: number;
    libroFinal?: string;
  }[];
  preguntas: { id: string; enunciado: string; correcta: number }[];
}
