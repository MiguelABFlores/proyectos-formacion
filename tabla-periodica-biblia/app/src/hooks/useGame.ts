"use client";

import { create } from "zustand";
import type { JugadorPublico, PartidaPublica, PreguntaPublica, RespuestaJugador } from "@/types/game";
import type { ResumenSesion } from "@/lib/socketEvents";

interface GameState {
  partida: PartidaPublica | null;
  preguntaIndice: number;
  totalPreguntas: number;
  pregunta: PreguntaPublica | null;
  reveal: { correcta: 0 | 1 | 2 | 3; distribucion: { porOpcion: [number, number, number, number]; noRespondio: number; totalJugadores: number }; reflexion?: string } | null;
  top: JugadorPublico[];
  miResultadoUltimo: RespuestaJugador | null;
  ocultar5050: [number, number] | null;
  librosFinal: { simbolo: string; dificultad: 1 | 2 | 3 }[];
  elegidosFinal: Record<string, string>;
  preguntaFinal: { pregunta: PreguntaPublica; libroSimbolo: string } | null;
  resumen: ResumenSesion | null;

  setPartida: (p: PartidaPublica) => void;
  setPregunta: (p: PreguntaPublica, indice: number, total: number) => void;
  setReveal: (r: NonNullable<GameState["reveal"]>) => void;
  setTop: (top: JugadorPublico[]) => void;
  setMiResultado: (r: RespuestaJugador) => void;
  setOcultar5050: (idx: [number, number] | null) => void;
  setLibrosFinal: (libros: { simbolo: string; dificultad: 1 | 2 | 3 }[], elegidos: Record<string, string>) => void;
  setPreguntaFinal: (data: { pregunta: PreguntaPublica; libroSimbolo: string }) => void;
  setResumen: (r: ResumenSesion) => void;
  reset: () => void;
}

export const useGame = create<GameState>((set) => ({
  partida: null,
  preguntaIndice: -1,
  totalPreguntas: 0,
  pregunta: null,
  reveal: null,
  top: [],
  miResultadoUltimo: null,
  ocultar5050: null,
  librosFinal: [],
  elegidosFinal: {},
  preguntaFinal: null,
  resumen: null,

  setPartida: (p) => set({ partida: p }),
  setPregunta: (p, i, t) => set({ pregunta: p, preguntaIndice: i, totalPreguntas: t, reveal: null, ocultar5050: null, miResultadoUltimo: null }),
  setReveal: (r) => set({ reveal: r }),
  setTop: (top) => set({ top }),
  setMiResultado: (r) => set({ miResultadoUltimo: r }),
  setOcultar5050: (idx) => set({ ocultar5050: idx }),
  setLibrosFinal: (libros, elegidos) => set((s) => ({
    librosFinal: libros.length ? libros : s.librosFinal,
    elegidosFinal: elegidos
  })),
  setPreguntaFinal: (d) => set({ preguntaFinal: d, reveal: null }),
  setResumen: (r) => set({ resumen: r }),
  reset: () => set({
    partida: null, preguntaIndice: -1, totalPreguntas: 0, pregunta: null, reveal: null,
    top: [], miResultadoUltimo: null, ocultar5050: null, librosFinal: [], elegidosFinal: {},
    preguntaFinal: null, resumen: null
  })
}));
