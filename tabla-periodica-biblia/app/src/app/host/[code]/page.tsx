"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";
import { useGameWiring } from "@/hooks/useGameWiring";
import { QrJoin } from "@/components/QrJoin";
import { QuestionCard } from "@/components/QuestionCard";
import { Timer } from "@/components/Timer";
import { AnswerStats } from "@/components/AnswerStats";
import { Leaderboard } from "@/components/Leaderboard";
import { PeriodicTable } from "@/components/PeriodicTable";
import { descargarResumen } from "@/lib/exportar";
import { libros, categorias } from "@/lib/contentClient";
import type { Libro, Categoria } from "@/types/game";

export default function HostJuego({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const socket = useSocket();
  const router = useRouter();
  useGameWiring();

  const partida = useGame((s) => s.partida);
  const pregunta = useGame((s) => s.pregunta);
  const reveal = useGame((s) => s.reveal);
  const top = useGame((s) => s.top);
  const librosFinal = useGame((s) => s.librosFinal);
  const elegidosFinal = useGame((s) => s.elegidosFinal);
  const resumen = useGame((s) => s.resumen);


  useEffect(() => {
    if (!socket) return;
    socket.emit("host:reconectar", { code }, (res: { ok: boolean }) => {
      if (!res.ok) router.replace("/host");
    });
  }, [socket, code, router]);

  function siguiente() {
    socket?.emit("host:siguiente", { code });
  }
  function rondaFinal() {
    socket?.emit("host:rondaFinal", { code });
  }
  function terminar() {
    socket?.emit("host:terminar", { code });
  }

  if (!partida) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-proyector-fondo">
        <p className="text-proyector-textoSuave">Conectando…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-proyector-fondo p-4 md:p-8">
      <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <div>
          <p className="text-xs uppercase tracking-widest text-proyector-textoSuave">Tabla Periódica de la Biblia</p>
          <h1 className="text-2xl md:text-3xl font-extrabold">Sala <span className="text-proyector-acento font-mono">{partida.code}</span></h1>
        </div>
        <div className="flex gap-2">
          {partida.fase === "leaderboard" && partida.preguntaIndice + 1 >= partida.totalPreguntas && (
            <button onClick={rondaFinal} className="rounded-lg bg-pink-600 text-white px-4 py-2 font-bold hover:brightness-110">
              Iniciar ronda final →
            </button>
          )}
          {partida.fase !== "ended" && partida.fase !== "lobby" && (
            <button onClick={terminar} className="rounded-lg border-2 border-red-500 text-red-700 px-4 py-2 font-semibold hover:bg-red-50">
              Terminar
            </button>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto">
        {partida.fase === "lobby" && (
          <LobbyView code={partida.code} jugadores={partida.jugadores} onEmpezar={siguiente} />
        )}

        {partida.fase === "question" && pregunta && (
          <QuestionView pregunta={pregunta} indice={partida.preguntaIndice} total={partida.totalPreguntas} respondieron={partida.jugadores.length - (partida.jugadores.length - 0)} jugadoresTotal={partida.jugadores.length} />
        )}

        {partida.fase === "reveal" && pregunta && reveal && (
          <RevealView pregunta={pregunta} reveal={reveal} onSiguiente={siguiente} modoFormacion={partida.modoFormacion} />
        )}

        {partida.fase === "leaderboard" && (
          <LeaderboardView top={top} onSiguiente={siguiente} esUltima={partida.preguntaIndice + 1 >= partida.totalPreguntas} />
        )}

        {partida.fase === "finalRoundLobby" && (
          <FinalLobbyView libros={libros} categorias={categorias} elegidos={elegidosFinal} jugadores={partida.jugadores} onEmpezar={siguiente} />
        )}

        {partida.fase === "finalQuestion" && (
          <div className="bg-proyector-panel rounded-2xl shadow-lg p-10 text-center space-y-4 border border-proyector-borde">
            <h2 className="text-3xl font-extrabold">¡Ronda final en juego!</h2>
            <p className="text-lg text-proyector-textoSuave">Cada jugador está respondiendo la pregunta de su libro.</p>
            <div className="text-6xl">⏳</div>
            <button onClick={siguiente} className="mt-4 rounded-lg bg-proyector-acento text-white px-6 py-3 font-bold hover:brightness-110">
              Cerrar ronda final
            </button>
          </div>
        )}

        {partida.fase === "finalReveal" && (
          <FinalRevealView top={top} onTerminar={siguiente} />
        )}

        {partida.fase === "ended" && resumen && (
          <FinView top={top} onExport={() => descargarResumen(resumen)} onNueva={() => { sessionStorage.removeItem("hostCode"); router.replace("/host"); }} />
        )}
      </section>
    </main>
  );
}

function LobbyView({ code, jugadores, onEmpezar }: { code: string; jugadores: { id: string; nombre: string }[]; onEmpezar: () => void }) {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-proyector-panel rounded-2xl shadow-lg p-8 border border-proyector-borde text-center space-y-4">
        <p className="text-sm uppercase tracking-widest text-proyector-textoSuave">Únete con el código</p>
        <p className="text-proyector-codigo text-proyector-acento font-mono">{code}</p>
        <QrJoin code={code} />
        <p className="text-sm text-proyector-textoSuave">o escanea el código QR en tu celular</p>
      </div>
      <div className="bg-proyector-panel rounded-2xl shadow-lg p-8 border border-proyector-borde space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold">Jugadores</h2>
          <span className="text-proyector-textoSuave">{jugadores.length} / 30</span>
        </div>
        <ul className="grid grid-cols-2 gap-2 min-h-[200px]">
          {jugadores.map((j) => (
            <li key={j.id} className="rounded-lg bg-proyector-fondo px-3 py-2 font-semibold animate-fade-in">
              {j.nombre}
            </li>
          ))}
          {jugadores.length === 0 && (
            <li className="col-span-2 text-center text-proyector-textoSuave py-8">Esperando jugadores…</li>
          )}
        </ul>
        <button
          type="button"
          onClick={onEmpezar}
          disabled={jugadores.length === 0}
          className="w-full rounded-xl bg-proyector-acento text-white py-4 text-xl font-bold disabled:opacity-50 hover:brightness-110"
        >
          Empezar partida
        </button>
      </div>
    </div>
  );
}

function QuestionView({ pregunta, indice, total }: { pregunta: NonNullable<ReturnType<typeof useGame.getState>["pregunta"]>; indice: number; total: number; respondieron?: number; jugadoresTotal?: number }) {
  return (
    <div className="space-y-6">
      <Timer inicioMs={pregunta.inicioMs} segundos={pregunta.tiempoSegundos} />
      <QuestionCard pregunta={pregunta} indice={indice} total={total} />
      <div className="grid md:grid-cols-2 gap-4">
        {pregunta.opciones.map((op, i) => (
          <div key={i} className={`rounded-2xl p-6 text-white text-2xl font-bold ${["bg-respuesta-a", "bg-respuesta-b", "bg-respuesta-c", "bg-respuesta-d"][i]}`}>
            <span className="font-black mr-3">{["A", "B", "C", "D"][i]}</span>
            {op}
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealView({ pregunta, reveal, onSiguiente, modoFormacion }: { pregunta: NonNullable<ReturnType<typeof useGame.getState>["pregunta"]>; reveal: NonNullable<ReturnType<typeof useGame.getState>["reveal"]>; onSiguiente: () => void; modoFormacion: boolean }) {
  const correctaTexto = pregunta.opciones[reveal.correcta];
  return (
    <div className="space-y-6">
      <QuestionCard pregunta={pregunta} />
      <div className="bg-emerald-50 border-4 border-emerald-500 rounded-2xl p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-emerald-700 font-bold">Respuesta correcta</p>
        <p className="text-3xl md:text-4xl font-extrabold text-emerald-800 mt-2">
          {["A", "B", "C", "D"][reveal.correcta]}. {correctaTexto}
        </p>
      </div>
      <div className="bg-proyector-panel rounded-2xl shadow p-6 border border-proyector-borde">
        <h3 className="font-bold mb-3">Distribución de respuestas</h3>
        <AnswerStats {...reveal.distribucion} correcta={reveal.correcta} />
      </div>
      {modoFormacion && reveal.reflexion && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-2xl p-6">
          <p className="text-sm uppercase tracking-widest text-amber-700 font-bold mb-2">Para reflexionar</p>
          <p className="text-lg italic">{reveal.reflexion}</p>
        </div>
      )}
      <button onClick={onSiguiente} className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold hover:brightness-110">
        Ver leaderboard →
      </button>
    </div>
  );
}

function LeaderboardView({ top, onSiguiente, esUltima }: { top: { id: string; nombre: string; puntos: number; rachaActual: number; conectado: boolean }[]; onSiguiente: () => void; esUltima: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-extrabold text-center">Leaderboard</h2>
      <Leaderboard jugadores={top} />
      {!esUltima && (
        <button onClick={onSiguiente} className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold hover:brightness-110">
          Siguiente pregunta →
        </button>
      )}
      {esUltima && (
        <p className="text-center text-proyector-textoSuave">¡Listos para la ronda final! Pulsa el botón arriba a la derecha.</p>
      )}
    </div>
  );
}

function FinalLobbyView({ libros, categorias, elegidos, jugadores, onEmpezar }: { libros: Libro[]; categorias: Categoria[]; elegidos: Record<string, string>; jugadores: { id: string; nombre: string }[]; onEmpezar: () => void }) {
  const todosEligieron = jugadores.length > 0 && jugadores.every(j => elegidos[j.id]);
  const elegidosCount = Object.keys(elegidos).length;
  return (
    <div className="space-y-4">
      <div className="bg-pink-50 border-l-4 border-pink-500 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-pink-800">Ronda final — cada jugador elige su &ldquo;elemento de la suerte&rdquo;</p>
          <p className="text-sm text-pink-700">El bote depende de la dificultad del libro (1★ a 3★). Los puntos se duplican en esta ronda.</p>
        </div>
        <p className="text-pink-900 font-bold whitespace-nowrap">{elegidosCount} / {jugadores.length}</p>
      </div>
      <PeriodicTable libros={libros} categorias={categorias} tomados={elegidos} />
      <button
        onClick={onEmpezar}
        disabled={elegidosCount === 0}
        className="w-full rounded-xl bg-pink-600 text-white py-4 text-lg font-bold disabled:opacity-50 hover:brightness-110"
      >
        {todosEligieron ? "Lanzar ronda final →" : `Lanzar ya con ${elegidosCount} jugador${elegidosCount === 1 ? "" : "es"}`}
      </button>
    </div>
  );
}

function FinalRevealView({ top, onTerminar }: { top: { id: string; nombre: string; puntos: number; rachaActual: number; conectado: boolean }[]; onTerminar: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-extrabold text-center">Resultados de la ronda final</h2>
      <Leaderboard jugadores={top} />
      <button onClick={onTerminar} className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold hover:brightness-110">
        Mostrar ganadores →
      </button>
    </div>
  );
}

function FinView({ top, onExport, onNueva }: { top: { id: string; nombre: string; puntos: number; rachaActual: number; conectado: boolean }[]; onExport: () => void; onNueva: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-pink-50 border-4 border-amber-300 rounded-2xl p-8 text-center">
        <h2 className="text-4xl font-extrabold mb-2">🎉 ¡Fin de la partida!</h2>
        <p className="text-proyector-textoSuave">Felicidades a quienes participaron. Ya pueden conversar sobre lo aprendido.</p>
      </div>
      <Leaderboard jugadores={top} />
      <div className="grid sm:grid-cols-2 gap-3">
        <button onClick={onExport} className="rounded-xl bg-proyector-texto text-white py-3 font-bold hover:brightness-110">
          Descargar resumen (JSON)
        </button>
        <button onClick={onNueva} className="rounded-xl bg-proyector-acento text-white py-3 font-bold hover:brightness-110">
          Nueva partida
        </button>
      </div>
    </div>
  );
}
