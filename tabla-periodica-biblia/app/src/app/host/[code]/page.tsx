"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useGame } from "@/hooks/useGame";
import { useGameWiring } from "@/hooks/useGameWiring";
import { QrJoin } from "@/components/QrJoin";
import { Leaderboard } from "@/components/Leaderboard";
import { PeriodicTable } from "@/components/PeriodicTable";
import { descargarResumen } from "@/lib/exportar";
import { libros, categorias } from "@/lib/contentClient";
import type {
  HistorialPersonal,
  JugadorPublico,
  PartidaPublica,
  ResumenJugadorRonda
} from "@/types/game";

export default function HostJuego({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const socket = useSocket();
  const router = useRouter();
  useGameWiring();

  const partida = useGame((s) => s.partida);
  const top = useGame((s) => s.top);
  const resumenesRonda = useGame((s) => s.resumenesRonda);
  const resumen = useGame((s) => s.resumen);
  const historiales = useGame((s) => s.historiales);

  useEffect(() => {
    if (!socket) return;
    socket.emit("host:reconectar", { code }, (res: { ok: boolean }) => {
      if (!res.ok) router.replace("/host");
    });
  }, [socket, code, router]);

  function siguiente() {
    socket?.emit("host:siguiente", { code });
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
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Sala <span className="text-proyector-acento font-mono">{partida.code}</span>
            {partida.fase !== "lobby" && partida.fase !== "ended" && (
              <span className="ml-3 text-base text-proyector-textoSuave font-normal">
                Ronda {partida.rondaIndice + 1} / {partida.totalRondas}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          {partida.fase !== "ended" && partida.fase !== "lobby" && (
            <button
              onClick={terminar}
              className="rounded-lg border-2 border-red-500 text-red-700 px-4 py-2 font-semibold hover:bg-red-50"
            >
              Terminar
            </button>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto">
        {partida.fase === "lobby" && (
          <LobbyView code={partida.code} jugadores={partida.jugadores} onEmpezar={siguiente} />
        )}

        {partida.fase === "roundSelection" && (
          <RoundSelectionView partida={partida} onIniciarPreguntas={siguiente} />
        )}

        {partida.fase === "roundQuestion" && (
          <RoundQuestionView partida={partida} onCerrar={siguiente} />
        )}

        {partida.fase === "roundReveal" && (
          <RoundRevealView resumenes={resumenesRonda} onSiguiente={siguiente} />
        )}

        {partida.fase === "leaderboard" && (
          <LeaderboardView
            top={top}
            esUltima={partida.rondaIndice + 1 >= partida.totalRondas}
            onSiguiente={siguiente}
          />
        )}

        {partida.fase === "ended" && resumen && (
          <FinView
            top={top}
            historiales={historiales}
            jugadores={partida.jugadores}
            onExport={() => descargarResumen(resumen)}
            onNueva={() => {
              sessionStorage.removeItem("hostCode");
              router.replace("/host");
            }}
          />
        )}
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pantallas por fase
// ─────────────────────────────────────────────────────────────────────────

function LobbyView({
  code,
  jugadores,
  onEmpezar
}: {
  code: string;
  jugadores: { id: string; nombre: string }[];
  onEmpezar: () => void;
}) {
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

function RoundSelectionView({
  partida,
  onIniciarPreguntas
}: {
  partida: PartidaPublica;
  onIniciarPreguntas: () => void;
}) {
  // Para saber cuántos eligieron, usamos librosJugados como proxy "del round previo".
  // El backend incrementa librosJugados al cerrar la ronda, así que durante la elección
  // necesitamos otro indicador: contamos por la diferencia de partida.estado emitido tras
  // cada elección (en este punto solo sabemos cuántos están conectados).
  // Mostramos una vista simple: explicación + tabla "ejemplo" (sin onElegir) y botón.
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-blue-900 text-lg">
            Ronda {partida.rondaIndice + 1} — eligiendo libros
          </p>
          <p className="text-sm text-blue-800">
            Cada jugador está eligiendo un libro de su tabla periódica personal. Lanza la pregunta cuando
            la mayoría haya elegido (o espera a todos).
          </p>
        </div>
        <p className="text-blue-900 font-bold whitespace-nowrap text-2xl">
          {partida.jugadores.filter((j) => j.conectado).length} jugador{partida.jugadores.length === 1 ? "" : "es"}
        </p>
      </div>

      <PeriodicTable libros={libros} categorias={categorias} tamano="sm" />

      <button
        onClick={onIniciarPreguntas}
        className="w-full rounded-xl bg-blue-600 text-white py-4 text-lg font-bold hover:brightness-110"
      >
        Lanzar preguntas de la ronda →
      </button>
    </div>
  );
}

function RoundQuestionView({
  partida,
  onCerrar
}: {
  partida: PartidaPublica;
  onCerrar: () => void;
}) {
  return (
    <div className="bg-proyector-panel rounded-2xl shadow-lg p-10 text-center space-y-5 border border-proyector-borde">
      <p className="text-xs uppercase tracking-widest text-proyector-textoSuave">
        Ronda {partida.rondaIndice + 1} de {partida.totalRondas}
      </p>
      <h2 className="text-3xl font-extrabold">¡Todos respondiendo!</h2>
      <p className="text-lg text-proyector-textoSuave">
        Cada jugador está contestando la pregunta del libro que eligió.
      </p>
      <div className="text-7xl">⏳</div>
      <button
        onClick={onCerrar}
        className="mt-2 rounded-lg bg-proyector-acento text-white px-6 py-3 font-bold hover:brightness-110"
      >
        Cerrar ronda y revelar
      </button>
    </div>
  );
}

function RoundRevealView({
  resumenes,
  onSiguiente
}: {
  resumenes: ResumenJugadorRonda[];
  onSiguiente: () => void;
}) {
  const ordenado = [...resumenes].sort((a, b) => b.puntosObtenidos - a.puntosObtenidos);
  const aciertos = resumenes.filter((r) => r.correcta).length;
  const totalRespondieron = resumenes.filter((r) => r.respondio).length;

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-5">
        <h2 className="text-2xl font-extrabold text-emerald-900">Resultados de la ronda</h2>
        <p className="text-emerald-800">
          {aciertos} acert{aciertos === 1 ? "ó" : "aron"} de {totalRespondieron} que respondieron.
        </p>
      </div>

      <div className="bg-proyector-panel rounded-2xl shadow border border-proyector-borde overflow-hidden">
        <table className="w-full">
          <thead className="bg-proyector-fondo">
            <tr className="text-left">
              <th className="p-3">Jugador</th>
              <th className="p-3">Libro</th>
              <th className="p-3">Resultado</th>
              <th className="p-3 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {ordenado.map((r) => (
              <tr key={r.jugadorId} className="border-t border-proyector-borde">
                <td className="p-3 font-semibold">{r.nombre}</td>
                <td className="p-3 font-mono">{r.libroSimbolo ?? "—"}</td>
                <td className="p-3">
                  {!r.respondio ? (
                    <span className="text-proyector-textoSuave">⌛ sin responder</span>
                  ) : r.correcta ? (
                    <span className="text-emerald-700 font-bold">✓ correcto</span>
                  ) : (
                    <span className="text-red-700 font-bold">✗ falló</span>
                  )}
                </td>
                <td className="p-3 text-right font-bold">
                  {r.puntosObtenidos > 0 ? `+${r.puntosObtenidos.toLocaleString("es")}` : "—"}
                </td>
              </tr>
            ))}
            {resumenes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-proyector-textoSuave">
                  Nadie eligió libro en esta ronda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={onSiguiente}
        className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold hover:brightness-110"
      >
        Ver leaderboard →
      </button>
    </div>
  );
}

function LeaderboardView({
  top,
  esUltima,
  onSiguiente
}: {
  top: JugadorPublico[];
  esUltima: boolean;
  onSiguiente: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-extrabold text-center">Leaderboard</h2>
      <Leaderboard jugadores={top} />
      <button
        onClick={onSiguiente}
        className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold hover:brightness-110"
      >
        {esUltima ? "Ver pasaporte final →" : "Siguiente ronda →"}
      </button>
    </div>
  );
}

function FinView({
  top,
  historiales,
  jugadores,
  onExport,
  onNueva
}: {
  top: JugadorPublico[];
  historiales: Record<string, HistorialPersonal>;
  jugadores: JugadorPublico[];
  onExport: () => void;
  onNueva: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-50 to-pink-50 border-4 border-amber-300 rounded-2xl p-8 text-center">
        <h2 className="text-4xl font-extrabold mb-2">🎉 ¡Fin de la partida!</h2>
        <p className="text-proyector-textoSuave">
          Cada jugador completó su pasaporte personal con los libros que conquistó.
        </p>
      </div>

      <Leaderboard jugadores={top} />

      <h3 className="text-2xl font-extrabold mt-6">Pasaportes personales</h3>
      <div className="grid lg:grid-cols-2 gap-4">
        {[...top]
          .sort((a, b) => b.puntos - a.puntos)
          .map((jugador) => {
            const historial = historiales[jugador.id] ?? {};
            const correctos = Object.values(historial).filter((v) => v === "correcto").length;
            const incorrectos = Object.values(historial).filter((v) => v === "incorrecto").length;
            return (
              <div
                key={jugador.id}
                className="bg-proyector-panel rounded-2xl border border-proyector-borde p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xl font-extrabold">{jugador.nombre}</h4>
                  <p className="text-proyector-textoSuave text-sm">
                    <span className="text-emerald-700 font-bold">✓{correctos}</span>{" "}
                    <span className="text-red-700 font-bold">✗{incorrectos}</span>{" "}
                    · {jugador.puntos.toLocaleString("es")} pts
                  </p>
                </div>
                <PeriodicTable
                  libros={libros}
                  categorias={categorias}
                  historial={historial}
                  tamano="sm"
                />
              </div>
            );
          })}
        {jugadores.length === 0 && (
          <p className="text-center text-proyector-textoSuave col-span-2">No hubo jugadores.</p>
        )}
      </div>

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
