"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";
import { useGameWiring } from "@/hooks/useGameWiring";
import { Timer } from "@/components/Timer";
import { AnswerButton } from "@/components/AnswerButton";
import { PowerUpBar } from "@/components/PowerUpBar";
import { PeriodicTable } from "@/components/PeriodicTable";
import { libros, categorias } from "@/lib/contentClient";
import type { PreguntaPublica } from "@/types/game";

export default function PlayJuego({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const socket = useSocket();
  const router = useRouter();
  useGameWiring();

  const partida = useGame((s) => s.partida);
  const preguntaPersonal = useGame((s) => s.preguntaPersonal);
  const historialPersonal = useGame((s) => s.historialPersonal);
  const miResultado = useGame((s) => s.miResultadoUltimo);
  const ocultar5050 = useGame((s) => s.ocultar5050);
  const setOcultar = useGame((s) => s.setOcultar5050);
  const top = useGame((s) => s.top);

  // Estado local
  const [eleccion, setEleccion] = useState<number | null>(null);
  const [doubleArmado, setDoubleArmado] = useState(false);
  const [fiftyDisp, setFiftyDisp] = useState(true);
  const [doubleDisp, setDoubleDisp] = useState(true);
  /** Símbolo del libro elegido en la ronda actual (refleja UI inmediata). */
  const [libroElegidoRonda, setLibroElegidoRonda] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const nombre = sessionStorage.getItem("playNombre");
    const guardadoCode = sessionStorage.getItem("playCode");
    if (!nombre || guardadoCode !== code) {
      router.replace(`/play?code=${code}`);
      return;
    }
    socket.emit("jugador:unirse", { code, nombre }, (_res: { ok: boolean }) => {
      // Idempotente; si ya empezó, el server rechaza y nos quedamos en pantalla informativa.
    });
  }, [socket, code, router]);

  // Reset de estado local cuando empieza una ronda nueva
  useEffect(() => {
    if (partida?.fase === "roundSelection") {
      setLibroElegidoRonda(null);
      setEleccion(null);
      setDoubleArmado(false);
    }
  }, [partida?.fase, partida?.rondaIndice]);

  // Reset de estado local cuando llega una nueva pregunta personal
  useEffect(() => {
    setEleccion(null);
    setDoubleArmado(false);
  }, [preguntaPersonal?.pregunta.id]);

  function elegirLibro(simbolo: string) {
    setLibroElegidoRonda(simbolo); // feedback inmediato
    socket?.emit("jugador:elegirLibro", { simbolo }, (res: { ok: true } | { ok: false; error: string }) => {
      if (!res.ok) {
        setLibroElegidoRonda(null);
        alert(res.error);
      }
    });
  }

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

  if (!partida) {
    return <Pantalla mensaje="Conectando…" />;
  }

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
        <p className="mt-4 text-sm text-proyector-textoSuave">
          {partida.jugadores.length} jugador{partida.jugadores.length === 1 ? "" : "es"} conectado{partida.jugadores.length === 1 ? "" : "s"}
          · {partida.totalRondas} rondas
        </p>
      </Pantalla>
    );
  }

  // ---- ELEGIR LIBRO ----
  if (partida.fase === "roundSelection") {
    const yaElegi = libroElegidoRonda !== null;
    return (
      <main className="min-h-screen p-3 bg-proyector-fondo">
        <header className="mb-3 text-center sticky top-0 bg-proyector-fondo/95 backdrop-blur z-20 py-2">
          <p className="text-xs uppercase tracking-widest text-proyector-textoSuave">
            Ronda {partida.rondaIndice + 1} de {partida.totalRondas}
          </p>
          <h2 className="text-2xl font-extrabold">Elige un libro</h2>
          {yaElegi ? (
            <p className="text-sm text-blue-700 font-bold">
              ✓ Elegiste <span className="font-mono">{libroElegidoRonda}</span>. Esperando…
            </p>
          ) : (
            <p className="text-sm text-proyector-textoSuave">
              Toca un elemento. Los marcados ya los jugaste antes.
            </p>
          )}
        </header>
        <PeriodicTable
          libros={libros}
          categorias={categorias}
          historial={historialPersonal}
          elegidoMio={libroElegidoRonda ?? undefined}
          onElegir={yaElegi ? undefined : elegirLibro}
          tamano="md"
        />
      </main>
    );
  }

  // ---- PREGUNTA ACTIVA ----
  if (partida.fase === "roundQuestion") {
    if (!preguntaPersonal) {
      return <Pantalla mensaje="Esperando tu pregunta…" />;
    }
    return (
      <PreguntaJugador
        pregunta={preguntaPersonal.pregunta}
        eleccion={eleccion}
        ocultar={ocultar5050}
        onResponder={responder}
        powerUp={{
          fiftyDisp: fiftyDisp && eleccion === null,
          doubleDisp: doubleDisp && eleccion === null,
          doubleArmado,
          onUse: usarPower
        }}
        encabezado={`Tu libro: ${preguntaPersonal.libroSimbolo}`}
      />
    );
  }

  // ---- REVEAL DE LA RONDA ----
  if (partida.fase === "roundReveal") {
    return <RevealJugador miResultado={miResultado} miPuntos={yo?.puntos ?? 0} historial={historialPersonal} />;
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
          <p className="text-center text-xs text-proyector-textoSuave">
            Ronda {partida.rondaIndice + 1} de {partida.totalRondas}
          </p>
        </div>
      </Pantalla>
    );
  }

  // ---- FIN: PASAPORTE PERSONAL ----
  if (partida.fase === "ended") {
    const puesto = top.findIndex((j) => j.id === miId);
    const correctos = Object.values(historialPersonal).filter((v) => v === "correcto").length;
    const incorrectos = Object.values(historialPersonal).filter((v) => v === "incorrecto").length;
    return (
      <main className="min-h-screen p-4 bg-proyector-fondo">
        <div className="max-w-md mx-auto space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 border-4 border-amber-300 p-6 text-center">
            <h1 className="text-2xl font-extrabold">🎉 ¡Bien hecho{yo ? `, ${yo.nombre}` : ""}!</h1>
            <p className="text-sm text-proyector-textoSuave mt-1">Tu pasaporte de libros</p>
            <p className="text-4xl font-extrabold mt-3">
              {puesto >= 0 ? `#${puesto + 1}` : "—"}
            </p>
            <p className="text-2xl font-bold">{(yo?.puntos ?? 0).toLocaleString("es")} pts</p>
            <p className="mt-2 text-sm">
              <span className="text-emerald-700 font-bold">✓ {correctos}</span>{" "}
              <span className="text-red-700 font-bold ml-2">✗ {incorrectos}</span>
            </p>
          </div>

          <PeriodicTable
            libros={libros}
            categorias={categorias}
            historial={historialPersonal}
            tamano="md"
          />

          <button
            onClick={() => router.replace("/")}
            className="mt-2 w-full rounded-xl border-2 border-proyector-acento text-proyector-acento py-3 font-bold"
          >
            Volver al inicio
          </button>
        </div>
      </main>
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
          <p className="text-center text-sm font-bold text-blue-700 bg-blue-50 rounded-full py-1 px-3">
            {encabezado}
          </p>
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
  miPuntos,
  historial
}: {
  miResultado: ReturnType<typeof useGame.getState>["miResultadoUltimo"];
  miPuntos: number;
  historial: ReturnType<typeof useGame.getState>["historialPersonal"];
}) {
  const correcta = miResultado?.correcta;
  const sinResponder = miResultado === null || miResultado?.elegida === null;
  const libroSimbolo = miResultado?.libroSimbolo ?? null;
  return (
    <main className="min-h-screen p-4 bg-proyector-fondo">
      <div className="max-w-md mx-auto space-y-4">
        <div
          className={`rounded-2xl p-6 text-center animate-fade-in ${
            sinResponder
              ? "bg-proyector-borde/40"
              : correcta
              ? "bg-emerald-100 border-4 border-emerald-500"
              : "bg-red-100 border-4 border-red-500 animate-shake"
          }`}
        >
          <p className="text-6xl">{sinResponder ? "⌛" : correcta ? "✅" : "❌"}</p>
          <h2 className="text-3xl font-extrabold mt-2">
            {sinResponder ? "Sin respuesta" : correcta ? "¡Correcto!" : "Incorrecto"}
          </h2>
          {libroSimbolo && (
            <p className="text-sm text-proyector-textoSuave mt-1">
              Libro: <span className="font-mono font-bold">{libroSimbolo}</span>
              {miResultado?.multiplicadorDificultad && miResultado.multiplicadorDificultad > 1 && (
                <span className="ml-1">· bote ×{miResultado.multiplicadorDificultad}</span>
              )}
            </p>
          )}
          {miResultado && miResultado.puntosObtenidos > 0 && (
            <p className="text-xl font-bold text-emerald-800 mt-2">
              +{miResultado.puntosObtenidos.toLocaleString("es")} pts
              {miResultado.doubleAplicado && <span className="ml-1 text-amber-700">×2</span>}
            </p>
          )}
          <p className="mt-4 text-proyector-textoSuave">
            Tus puntos: <span className="font-bold text-proyector-texto">{miPuntos.toLocaleString("es")}</span>
          </p>
        </div>

        {/* Vista compacta del propio pasaporte parcial */}
        <div className="bg-proyector-panel rounded-xl p-3 border border-proyector-borde">
          <p className="text-xs uppercase tracking-widest text-proyector-textoSuave mb-2">Tu pasaporte</p>
          <PeriodicTable libros={libros} categorias={categorias} historial={historial} tamano="sm" />
        </div>
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
