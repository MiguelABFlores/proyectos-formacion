"use client";

import { useEffect } from "react";
import { useSocket } from "./useSocket";
import { useGame } from "./useGame";

/**
 * Suscribe la store global a todos los eventos del servidor.
 * Llamar UNA vez en el componente raíz de cada pantalla (host o player).
 */
export function useGameWiring(): void {
  const socket = useSocket();
  const setPartida = useGame((s) => s.setPartida);
  const setPregunta = useGame((s) => s.setPregunta);
  const setReveal = useGame((s) => s.setReveal);
  const setTop = useGame((s) => s.setTop);
  const setMiResultado = useGame((s) => s.setMiResultado);
  const setLibrosFinal = useGame((s) => s.setLibrosFinal);
  const setPreguntaFinal = useGame((s) => s.setPreguntaFinal);
  const setResumen = useGame((s) => s.setResumen);

  useEffect(() => {
    if (!socket) return;
    const onEstado = (p: Parameters<typeof setPartida>[0]) => setPartida(p);
    const onPregunta = (d: { pregunta: Parameters<typeof setPregunta>[0]; indice: number; total: number }) =>
      setPregunta(d.pregunta, d.indice, d.total);
    const onReveal = (d: Parameters<typeof setReveal>[0]) => setReveal(d);
    const onLeaderboard = (d: { top: Parameters<typeof setTop>[0] }) => setTop(d.top);
    const onResultado = (r: Parameters<typeof setMiResultado>[0]) => setMiResultado(r);
    const onFinalLobby = (d: { libros: Parameters<typeof setLibrosFinal>[0]; elegidos: Record<string, string> }) =>
      setLibrosFinal(d.libros, d.elegidos);
    const onPreguntaFinal = (d: Parameters<typeof setPreguntaFinal>[0]) => setPreguntaFinal(d);
    const onFin = (d: { top: Parameters<typeof setTop>[0]; resumen: Parameters<typeof setResumen>[0] }) => {
      setTop(d.top);
      setResumen(d.resumen);
    };

    socket.on("partida:estado", onEstado);
    socket.on("partida:pregunta", onPregunta);
    socket.on("partida:reveal", onReveal);
    socket.on("partida:leaderboard", onLeaderboard);
    socket.on("jugador:resultado", onResultado);
    socket.on("partida:rondaFinalLobby", onFinalLobby);
    socket.on("jugador:preguntaFinal", onPreguntaFinal);
    socket.on("partida:fin", onFin);

    return () => {
      socket.off("partida:estado", onEstado);
      socket.off("partida:pregunta", onPregunta);
      socket.off("partida:reveal", onReveal);
      socket.off("partida:leaderboard", onLeaderboard);
      socket.off("jugador:resultado", onResultado);
      socket.off("partida:rondaFinalLobby", onFinalLobby);
      socket.off("jugador:preguntaFinal", onPreguntaFinal);
      socket.off("partida:fin", onFin);
    };
  }, [socket, setPartida, setPregunta, setReveal, setTop, setMiResultado, setLibrosFinal, setPreguntaFinal, setResumen]);
}
