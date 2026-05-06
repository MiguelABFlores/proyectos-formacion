"use client";

import { useEffect } from "react";
import { useSocket } from "./useSocket";
import { useGame } from "./useGame";
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
 * Suscribe la store global a todos los eventos del servidor.
 * Llamar UNA vez en el componente raíz de cada pantalla (host o player).
 */
export function useGameWiring(): void {
  const socket = useSocket();
  const setPartida = useGame((s) => s.setPartida);
  const setPreguntaPersonal = useGame((s) => s.setPreguntaPersonal);
  const setHistorialPersonal = useGame((s) => s.setHistorialPersonal);
  const setResumenesRonda = useGame((s) => s.setResumenesRonda);
  const setTop = useGame((s) => s.setTop);
  const setMiResultado = useGame((s) => s.setMiResultado);
  const setFin = useGame((s) => s.setFin);

  useEffect(() => {
    if (!socket) return;

    const onEstado = (p: PartidaPublica) => setPartida(p);
    const onRondaSeleccion = () => {
      // Limpia pregunta personal anterior (la siguiente ronda asignará una nueva)
      setPreguntaPersonal(null);
    };
    const onPreguntaPersonal = (data: { pregunta: PreguntaPublica; libroSimbolo: string }) =>
      setPreguntaPersonal(data);
    const onResultadoRonda = (data: { respuesta: RespuestaJugador; historial: HistorialPersonal }) => {
      setMiResultado(data.respuesta);
      setHistorialPersonal(data.historial);
    };
    const onResultadoLegacy = (r: RespuestaJugador) => setMiResultado(r);
    const onResumenRonda = (data: { rondaIndice: number; resumenes: ResumenJugadorRonda[] }) =>
      setResumenesRonda(data.resumenes);
    const onLeaderboard = (data: { top: JugadorPublico[] }) => setTop(data.top);
    const onFin = (data: {
      top: JugadorPublico[];
      resumen: ResumenSesion;
      historiales: Record<string, HistorialPersonal>;
    }) => {
      setTop(data.top);
      setFin({ resumen: data.resumen, historiales: data.historiales });
    };

    socket.on("partida:estado", onEstado);
    socket.on("partida:rondaSeleccion", onRondaSeleccion);
    socket.on("jugador:preguntaPersonal", onPreguntaPersonal);
    socket.on("jugador:resultadoRonda", onResultadoRonda);
    socket.on("jugador:resultado", onResultadoLegacy);
    socket.on("partida:resumenRonda", onResumenRonda);
    socket.on("partida:leaderboard", onLeaderboard);
    socket.on("partida:fin", onFin);

    return () => {
      socket.off("partida:estado", onEstado);
      socket.off("partida:rondaSeleccion", onRondaSeleccion);
      socket.off("jugador:preguntaPersonal", onPreguntaPersonal);
      socket.off("jugador:resultadoRonda", onResultadoRonda);
      socket.off("jugador:resultado", onResultadoLegacy);
      socket.off("partida:resumenRonda", onResumenRonda);
      socket.off("partida:leaderboard", onLeaderboard);
      socket.off("partida:fin", onFin);
    };
  }, [socket, setPartida, setPreguntaPersonal, setHistorialPersonal, setResumenesRonda, setTop, setMiResultado, setFin]);
}
