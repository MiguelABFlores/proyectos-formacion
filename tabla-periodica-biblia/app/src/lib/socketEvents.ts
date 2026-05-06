import type {
  HistorialPersonal,
  JugadorPublico,
  PartidaPublica,
  PreguntaPublica,
  PowerUp,
  RespuestaJugador,
  ResumenJugadorRonda
} from "@/types/game";

/**
 * Contratos tipados de eventos cliente↔servidor.
 * Compartido entre `server/` y `src/hooks/useSocket.ts`.
 */

// ============= Cliente → Servidor =============

export interface ClienteEventos {
  /** Host crea una nueva partida. */
  "host:crear": (
    payload: { modoFormacion?: boolean; numRondas?: number },
    cb: (res: { ok: true; code: string } | { ok: false; error: string }) => void
  ) => void;

  /** Host solicita re-asociación tras refresh / reconexión. */
  "host:reconectar": (
    payload: { code: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  /** Host avanza al siguiente estado del flujo (lobby → ronda 1 → ... → ended). */
  "host:siguiente": (payload: { code: string }) => void;

  /** Host termina la partida antes de tiempo. */
  "host:terminar": (payload: { code: string }) => void;

  /** Jugador se une a una partida. */
  "jugador:unirse": (
    payload: { code: string; nombre: string },
    cb: (res: { ok: true; jugador: JugadorPublico } | { ok: false; error: string }) => void
  ) => void;

  /** Jugador elige un libro de la tabla en la fase roundSelection. */
  "jugador:elegirLibro": (
    payload: { simbolo: string },
    cb: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;

  /** Jugador responde su pregunta personal de la ronda actual. */
  "jugador:responder": (payload: { opcion: 0 | 1 | 2 | 3 }) => void;

  /** Jugador activa un power-up. */
  "jugador:powerUp": (
    payload: { power: PowerUp },
    cb: (res: { ok: true; ocultar?: [number, number] } | { ok: false; error: string }) => void
  ) => void;
}

// ============= Servidor → Cliente =============

export interface ServidorEventos {
  /** Estado completo de la partida (host y jugadores reciben proyecciones distintas). */
  "partida:estado": (estado: PartidaPublica) => void;

  /**
   * Empieza una nueva ronda — fase roundSelection.
   * El cliente no recibe la lista de libros aquí (la tiene cargada del JSON);
   * solo el número de ronda actual.
   */
  "partida:rondaSeleccion": (data: { rondaIndice: number; totalRondas: number }) => void;

  /**
   * Pregunta personal asignada al jugador para la ronda actual.
   * Cada jugador recibe la suya (porque eligieron libros distintos).
   */
  "jugador:preguntaPersonal": (data: { pregunta: PreguntaPublica; libroSimbolo: string }) => void;

  /**
   * El jugador recibe SU resultado tras responder (o tras timeout).
   * Incluye el historial actualizado para que pueda repintarlo en su tabla.
   */
  "jugador:resultadoRonda": (data: {
    respuesta: RespuestaJugador;
    historial: HistorialPersonal;
  }) => void;

  /**
   * Resumen de la ronda enviado al host: qué libro tomó cada jugador y cómo le fue.
   */
  "partida:resumenRonda": (data: { rondaIndice: number; resumenes: ResumenJugadorRonda[] }) => void;

  /** Leaderboard tras una ronda. */
  "partida:leaderboard": (data: { top: JugadorPublico[] }) => void;

  /** Confirmación al jugador con su resultado individual de la ronda. */
  "jugador:resultado": (data: RespuestaJugador) => void;

  /**
   * Partida terminada.
   * `historiales` permite a cada jugador (y al host) renderizar el "pasaporte" final.
   */
  "partida:fin": (data: {
    top: JugadorPublico[];
    resumen: ResumenSesion;
    historiales: Record<string, HistorialPersonal>;
  }) => void;

  /** Errores genéricos. */
  "partida:error": (data: { mensaje: string }) => void;
}

export interface ResumenSesion {
  code: string;
  inicioMs: number;
  finMs: number;
  modoFormacion: boolean;
  totalRondas: number;
  jugadores: {
    nombre: string;
    puntosFinal: number;
    mejorRacha: number;
    aciertos: number;
    fallos: number;
    sinResponder: number;
    librosCorrectos: string[];
    librosIncorrectos: string[];
  }[];
}
