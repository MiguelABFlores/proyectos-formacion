"use client";

import type { PreguntaPublica } from "@/types/game";

const ETIQUETA: Record<string, string> = {
  identificacion: "Identificación",
  relacion: "Relación",
  aplicacion: "Aplicación",
  tabla: "Ronda final"
};

export function QuestionCard({
  pregunta,
  indice,
  total
}: {
  pregunta: PreguntaPublica;
  indice?: number;
  total?: number;
}) {
  return (
    <div className="bg-proyector-panel rounded-2xl shadow-lg p-6 md:p-10 border border-proyector-borde">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs md:text-sm uppercase tracking-wider text-proyector-acento font-bold">
          {ETIQUETA[pregunta.tipo] ?? pregunta.tipo}
        </span>
        {typeof indice === "number" && typeof total === "number" && (
          <span className="text-sm font-semibold text-proyector-textoSuave">
            {indice + 1} / {total}
          </span>
        )}
      </div>
      <h2 className="text-proyector-pregunta text-proyector-texto leading-tight">
        {pregunta.enunciado}
      </h2>
    </div>
  );
}
