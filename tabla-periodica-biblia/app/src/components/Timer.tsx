"use client";

import { useEffect, useState } from "react";

export function Timer({ inicioMs, segundos }: { inicioMs: number; segundos: number }) {
  const [restante, setRestante] = useState(segundos);

  useEffect(() => {
    const tick = () => {
      const ms = inicioMs + segundos * 1000 - Date.now();
      setRestante(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [inicioMs, segundos]);

  const pct = (restante / segundos) * 100;
  const color =
    pct > 60 ? "bg-emerald-500" :
    pct > 30 ? "bg-amber-500" :
    "bg-red-600";

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-semibold text-proyector-textoSuave">Tiempo</span>
        <span className="text-2xl font-extrabold tabular-nums">{restante}s</span>
      </div>
      <div className="h-3 bg-proyector-borde rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-[width] duration-300 ease-linear`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
