"use client";

import type { JugadorPublico } from "@/types/game";
import clsx from "clsx";

const PODIO = ["🥇", "🥈", "🥉"];

export function Leaderboard({ jugadores, destacarId }: { jugadores: JugadorPublico[]; destacarId?: string }) {
  if (jugadores.length === 0) {
    return <p className="text-center text-proyector-textoSuave">Aún no hay puntajes</p>;
  }
  return (
    <ol className="space-y-2">
      {jugadores.map((j, i) => {
        const destacado = destacarId === j.id;
        return (
          <li
            key={j.id}
            className={clsx(
              "flex items-center gap-4 px-4 py-3 rounded-xl bg-proyector-panel border-2 animate-fade-in",
              destacado ? "border-proyector-acento bg-blue-50" : "border-proyector-borde"
            )}
          >
            <span className="w-10 text-2xl font-extrabold text-center">
              {PODIO[i] ?? `#${i + 1}`}
            </span>
            <span className="flex-1 text-lg font-bold truncate">
              {j.nombre}
              {!j.conectado && <span className="ml-2 text-xs text-proyector-textoSuave">(desconectado)</span>}
            </span>
            {j.rachaActual >= 2 && (
              <span className="text-orange-600 font-bold text-sm">🔥 x{j.rachaActual}</span>
            )}
            <span className="text-2xl font-extrabold tabular-nums">{j.puntos.toLocaleString("es")}</span>
          </li>
        );
      })}
    </ol>
  );
}
