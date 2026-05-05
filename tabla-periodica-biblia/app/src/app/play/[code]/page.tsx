"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";
import { useGameWiring } from "@/hooks/useGameWiring";
import { Timer } from "@/components/Timer";
import { AnswerButton } from "@/components/AnswerButton";
import { PowerUpBar } from "@/components/PowerUpBar";
import { PeriodicTable } from "@/components/PeriodicTable";
import { cargarContenido } from "@/lib/content";
import type { PreguntaPublica } from "@/types/game";

export default function PlayJuego({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const socket = useSocket();
  const router = useRouter();
  useGameWiring();

  const partida = useGame((s) => s.partida);
  const pregunta = useGame((s) => s.pregunta);
  const reveal = useGame((s) => s.reveal);
  const miResultado = useGame((s) => s.miResultadoUltimo);
  const ocultar5050 = useGame((s) => s.ocultar5050);
  const setOcultar = useGame((s) => s.setOcultar5050);
  const top = useGame((s) => s.top);
  const librosFinal = useGame((s) => s.librosFinal);
  const elegidos = useGame((s) => s.elegidosFinal);
  const preguntaFinal = useGame((s) => s.preguntaFinal);

  const { libros, categorias } = useMemo(() => cargarContenido(), []);

  // Estado local para feedback inmediato del jugador
  const [eleccion, setEleccion] = useState<number | null>(null);
  const [doubleArmado, setDoubleArmado] = useState(false);
  const [fiftyDisp, setFiftyDisp] = useState(true);
  const [doubleDisp, setDoubleDisp] = useState(true);

  useEffect(() => {
    if (!socket) return;
    const nombre = sessionStorage.getItem("playNombre");
    const guardadoCode = sessionStorage.getItem("playCode");
    if (!nombre || guardadoCode !== code) {
      router.replace(`/play?code=${code}`);
      return;
    }
    // Reintenta unirse en caso de reconexión (idempotente: el server rechaza si ya empezó)
    socket.emit("jugador:unirse", { code, nombre }, (res: { ok: boolean }) => {
      if (!res.ok) {
        // Probablemente la partida ya empezó; nos dejamos en una pantalla informativa
      }
    });
  }, [socket, code, router]);

  // Cuando cambia la pregunta, resetear elección local
  useEffect(() => {
    setEleccion(null);
    setDoubleArmado(false);
  }, [pregunta?.id, preguntaFinal?.pregunta.id]);

  function responder(opcion: 0 | 1 | 2 | 3) {
    if (eleccion !== null) return;
    setEleccion(opcion);
    socket?.emit("jugador:responder", { opcion });
  }

  function usarPower(power: "fiftyFifty" | "double") {
    socket?.emit("jugador:powerUp", { power }, (res: { ok: true; ocultar?: [number, number] } | { ok: false; error: string }) => {
      if (!res.ok) return;
      if (power === "fiftyFifty") {
        setFiftyDisp(false);
        if (res.ocultar) setOcultar(res.ocultar);
      } else {
        setDoubleDisp(false);
        setDoubleArmado(true);
      }
    });
  }

  function elegirLibro(simbolo: string) {
    socket?.emit("jugador:elegirLibro", { simbolo }, (res: { ok: true } | { ok: false; error: string }) => {
      if (!res.ok) alert(res.error);
    });
  }

  if (!partida) {
    return <Pantalla mensaje="Conectando…" />;
  }

  // Encontrar mi info
  const miId = socket?.id;
  const yo = partida.jugadores.find((j) => j.id === miId);

  if (!yo && partida.fase !== "ended") {
    return (
      <Pantalla
        titulo="No estás en esta partida"
        mensaje="Quizá ya empezó o hubo un error de conexión."
        accion={{ texto: "Volver", onClick: () => router.replace("/play") }}
      />
    );
  }

  // ---- LOBBY ----
  if (partida.fase === "lobby") {
    return (
      <Pantalla titulo={`Hola, ${yo?.nombre}`} mensaje="Esperando que el formador inicie la partida…">
        <p className="mt-4 text-sm text-proyector-textoSuave">{partida.jugadores.length} jugador{partida.jugadores.length === 1 ? "" : "es"} conectado{partida.jugadores.length === 1 ? "" : "s"}</p>
      </Pantalla>
    );
  }

  // ---- PREGUNTA ACTIVA ----
  if (partida.fase === "question" && pregunta) {
    return (
      <PreguntaJugador
        pregunta={pregunta}
        eleccion={eleccion}
        ocultar={ocultar5050}
        onResponder={responder}
        powerUp={{ fiftyDisp: fiftyDisp && eleccion === null, doubleDisp: doubleDisp && eleccion === null, doubleArmado, onUse: usarPower }}
      />
    );
  }

  // ---- REVEAL ----
  if (partida.fase === "reveal" && reveal) {
    return (
      <RevealJugador miResultado={miResultado} reveal={reveal} miPuntos={yo?.puntos ?? 0} />
    );
  }

  // ---- LEADERBOARD ----
  if (partida.fase === "leaderboard") {
    const puesto = top.findIndex((j) => j.id === miId);
    return (
      <Pantalla titulo="Marcador">
        <div className="mt-4 space-y-3 w-full max-w-sm">
          <div className="rounded-xl bg-proyector-acento text-white p-4 text-center">
            <p className="text-sm uppercase tracking-widest">Tu posición</p>
            <p className="text-4xl font-extrabold">{puesto >= 0 ? `#${puesto + 1}` : "—"}</p>
            <p className="text-2xl font-bold">{(yo?.puntos ?? 0).toLocaleString("es")} pts</p>
            {yo && yo.rachaActual >= 2 && <p className="text-orange-200">🔥 Racha: {yo.rachaActual}</p>}
          </div>
          {top.slice(0, 3).map((j, i) => (
            <p key={j.id} className="flex justify-between bg-white rounded-lg px-3 py-2">
              <span>{["🥇", "🥈", "🥉"][i]} {j.nombre}</span>
              <span className="font-bold">{j.puntos.toLocaleString("es")}</span>
            </p>
          ))}
        </div>
      </Pantalla>
    );
  }

  // ---- RONDA FINAL: ELEGIR LIBRO ----
  if (partida.fase === "finalRoundLobby") {
    const yaElegi = elegidos[miId ?? ""] !== undefined;
    return (
      <main className="min-h-screen p-3 bg-proyector-fondo">
        <header className="mb-3 text-center">
          <h2 className="text-xl font-extrabold">Elige tu libro</h2>
          <p className="text-sm text-proyector-textoSuave">{yaElegi ? `Elegiste ${elegidos[miId ?? ""]}. Esperando al resto…` : "Toca un elemento de la tabla."}</p>
        </header>
        <PeriodicTable
          libros={librosFinal.length ? libros.filter(l => librosFinal.find(lf => lf.simbolo === l.simbolo)) : libros}
          categorias={categorias}
          elegidoMio={elegidos[miId ?? ""]}
          tomados={elegidos}
          onElegir={yaElegi ? undefined : elegirLibro}
        />
      </main>
    );
  }

  // ---- RONDA FINAL: PREGUNTA ----
  if (partida.fase === "finalQuestion") {
    if (!preguntaFinal) {
      return <Pantalla mensaje="Esperando tu pregunta personalizada…" />;
    }
    return (
      <PreguntaJugador
        pregunta={preguntaFinal.pregunta}
        eleccion={eleccion}
        ocultar={null}
        onResponder={responder}
        encabezado={`Tu libro: ${preguntaFinal.libroSimbolo}`}
      />
    );
  }

  // ---- RONDA FINAL: REVEAL / FIN ----
  if (partida.fase === "finalReveal" || partida.fase === "ended") {
    const puesto = top.findIndex((j) => j.id === miId);
    return (
      <Pantalla titulo={partida.fase === "ended" ? "🎉 Fin de la partida" : "Resultados"}>
        <div className="mt-4 rounded-xl bg-proyector-acento text-white p-6 text-center max-w-sm w-full">
          <p className="text-sm uppercase tracking-widest">Posición final</p>
          <p className="text-5xl font-extrabold">{puesto >= 0 ? `#${puesto + 1}` : "—"}</p>
          <p className="text-3xl font-bold mt-2">{(yo?.puntos ?? 0).toLocaleString("es")} pts</p>
          {yo && <p className="mt-1 text-sm opacity-90">Mejor racha: 🔥 {yo.rachaActual}</p>}
        </div>
        <button
          onClick={() => router.replace("/")}
          className="mt-6 rounded-xl border-2 border-proyector-acento text-proyector-acento px-6 py-3 font-bold"
        >
          Volver al inicio
        </button>
      </Pantalla>
    );
  }

  return <Pantalla mensaje="…" />;
}

function PreguntaJugador({
  pregunta,
  eleccion,
  ocultar,
  onResponder,
  powerUp,
  encabezado
}: {
  pregunta: PreguntaPublica;
  eleccion: number | null;
  ocultar: [number, number] | null;
  onResponder: (op: 0 | 1 | 2 | 3) => void;
  powerUp?: { fiftyDisp: boolean; doubleDisp: boolean; doubleArmado: boolean; onUse: (p: "fiftyFifty" | "double") => void };
  encabezado?: string;
}) {
  return (
    <main className="min-h-screen p-4 bg-proyector-fondo">
      <div className="max-w-md mx-auto space-y-4">
        {encabezado && (
          <p className="text-center text-sm font-bold text-pink-700 bg-pink-50 rounded-full py-1 px-3">{encabezado}</p>
        )}
        <Timer inicioMs={pregunta.inicioMs} segundos={pregunta.tiempoSegundos} />
        <h2 className="text-xl font-extrabold leading-tight bg-proyector-panel rounded-2xl p-5 border border-proyector-borde">
          {pregunta.enunciado}
        </h2>
        {powerUp && (
          <PowerUpBar
            fiftyDisponible={powerUp.fiftyDisp}
            doubleDisponible={powerUp.doubleDisp}
            doubleArmado={powerUp.doubleArmado}
            onUse={powerUp.onUse}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pregunta.opciones.map((op, i) => {
            const idx = i as 0 | 1 | 2 | 3;
            const oculta = ocultar?.includes(idx);
            const estado = oculta
              ? "oculta"
              : eleccion === idx
              ? "elegida"
              : eleccion !== null
              ? "deshabilitada"
              : "idle";
            return (
              <AnswerButton
                key={i}
                indice={idx}
                texto={op}
                estado={estado as never}
                onClick={() => onResponder(idx)}
              />
            );
          })}
        </div>
        {eleccion !== null && (
          <p className="text-center text-proyector-textoSuave animate-fade-in">
            Respuesta enviada. Esperando a los demás…
          </p>
        )}
      </div>
    </main>
  );
}

function RevealJugador({
  miResultado,
  reveal,
  miPuntos
}: {
  miResultado: ReturnType<typeof useGame.getState>["miResultadoUltimo"];
  reveal: NonNullable<ReturnType<typeof useGame.getState>["reveal"]>;
  miPuntos: number;
}) {
  const correcta = miResultado?.correcta;
  const sinResponder = miResultado === null || miResultado?.elegida === null;
  return (
    <main className="min-h-screen p-4 bg-proyector-fondo flex flex-col items-center justify-center">
      <div className={`max-w-sm w-full rounded-2xl p-8 text-center animate-fade-in ${
        sinResponder ? "bg-proyector-borde/40" : correcta ? "bg-emerald-100 border-4 border-emerald-500" : "bg-red-100 border-4 border-red-500 animate-shake"
      }`}>
        <p className="text-6xl">
          {sinResponder ? "⌛" : correcta ? "✅" : "❌"}
        </p>
        <h2 className="text-3xl font-extrabold mt-2">
          {sinResponder ? "Sin respuesta" : correcta ? "¡Correcto!" : "Incorrecto"}
        </h2>
        {miResultado && miResultado.puntosObtenidos > 0 && (
          <p className="text-xl font-bold text-emerald-800 mt-2">
            +{miResultado.puntosObtenidos.toLocaleString("es")} pts
            {miResultado.doubleAplicado && <span className="ml-1 text-amber-700">×2</span>}
          </p>
        )}
        <p className="mt-4 text-proyector-textoSuave">Tus puntos: <span className="font-bold text-proyector-texto">{miPuntos.toLocaleString("es")}</span></p>
        {reveal.reflexion && (
          <p className="mt-4 italic text-sm text-proyector-textoSuave">{reveal.reflexion}</p>
        )}
      </div>
    </main>
  );
}

function Pantalla({
  titulo,
  mensaje,
  accion,
  children
}: {
  titulo?: string;
  mensaje?: string;
  accion?: { texto: string; onClick: () => void };
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-proyector-fondo text-center">
      {titulo && <h1 className="text-3xl font-extrabold">{titulo}</h1>}
      {mensaje && <p className="mt-2 text-proyector-textoSuave">{mensaje}</p>}
      {children}
      {accion && (
        <button onClick={accion.onClick} className="mt-6 rounded-xl bg-proyector-acento text-white px-6 py-3 font-bold">
          {accion.texto}
        </button>
      )}
    </main>
  );
}
