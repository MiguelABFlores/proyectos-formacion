"use client";

import { create } from "zustand";
import type {
  HistorialPersonal,
  JugadorPublico,
  PartidaPublica,
  PreguntaPublica,
  RespuestaJugador,
  ResumenJugadorRonda
} from "@/types/game";
import type { ResumenSesion } from "@/lib/socketEvents";

/**
 * Estado global compartido por host y jugador.
 *
 * - El host lee `partida`, `top`, `resumenesRonda` y `historiales`.
 * - El jugador lee `partida`, `preguntaPersonal` (su pregunta de la ronda),
 *   `historialPersonal` (sus libros marcados ✓/✗), `top`, `miResultadoUltimo`.
 */
interface GameState {
  partida: PartidaPublica | null;
  /** Pregunta personal asignada al jugador en la ronda actual (null entre rondas). */
  preguntaPersonal: { pregunta: PreguntaPublica; libroSimbolo: string } | null;
  /** Historial del jugador: libros que ya jugó con su estado ✓/✗. */
  historialPersonal: HistorialPersonal;
  /** Resumen de la última ronda completada (para el host). */
  resumenesRonda: ResumenJugadorRonda[];
  /** Top jugadores en el leaderboard / final. */
  top: JugadorPublico[];
  /** Resultado de la última respuesta del jugador (para feedback inmediato). */
  miResultadoUltimo: RespuestaJugador | null;
  /** Índices a ocultar tras activar el power-up 50/50. */
  ocultar5050: [number, number] | null;
  /** Resumen final de la sesión + historiales de todos (al terminar la partida). */
  resumen: ResumenSesion | null;
  historiales: Record<string, HistorialPersonal>;

  setPartida: (p: PartidaPublica) => void;
  setPreguntaPersonal: (data: { pregunta: PreguntaPublica; libroSimbolo: string } | null) => void;
  setHistorialPersonal: (h: HistorialPersonal) => void;
  setResumenesRonda: (resumenes: ResumenJugadorRonda[]) => void;
  setTop: (top: JugadorPublico[]) => void;
  setMiResultado: (r: RespuestaJugador) => void;
  setOcultar5050: (idx: [number, number] | null) => void;
  setFin: (data: { resumen: ResumenSesion; historiales: Record<string, HistorialPersonal> }) => void;
  reset: () => void;
}

const ESTADO_INICIAL: Pick<
  GameState,
  | "partida"
  | "preguntaPersonal"
  | "historialPersonal"
  | "resumenesRonda"
  | "top"
  | "miResultadoUltimo"
  | "ocultar5050"
  | "resumen"
  | "historiales"
> = {
  partida: null,
  preguntaPersonal: null,
  historialPersonal: {},
  resumenesRonda: [],
  top: [],
  miResultadoUltimo: null,
  ocultar5050: null,
  resumen: null,
  historiales: {}
};

export const useGame = create<GameState>((set) => ({
  ...ESTADO_INICIAL,

  setPartida: (p) => set({ partida: p }),
  setPreguntaPersonal: (data) =>
    set({
      preguntaPersonal: data,
      // Al recibir nueva pregunta personal, reseteamos UI de respuesta
      miResultadoUltimo: null,
      ocultar5050: null
    }),
  setHistorialPersonal: (h) => set({ historialPersonal: h }),
  setResumenesRonda: (resumenes) => set({ resumenesRonda: resumenes }),
  setTop: (top) => set({ top }),
  setMiResultado: (r) => set({ miResultadoUltimo: r }),
  setOcultar5050: (idx) => set({ ocultar5050: idx }),
  setFin: ({ resumen, historiales }) => set({ resumen, historiales }),
  reset: () => set({ ...ESTADO_INICIAL })
}));
