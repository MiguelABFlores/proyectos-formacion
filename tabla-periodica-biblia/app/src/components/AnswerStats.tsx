"use client";

const LETRAS = ["A", "B", "C", "D"];
const COLORES = ["bg-respuesta-a", "bg-respuesta-b", "bg-respuesta-c", "bg-respuesta-d"];

export function AnswerStats({
  porOpcion,
  noRespondio,
  totalJugadores,
  correcta
}: {
  porOpcion: [number, number, number, number];
  noRespondio: number;
  totalJugadores: number;
  correcta: 0 | 1 | 2 | 3;
}) {
  const total = totalJugadores || 1;
  return (
    <div className="space-y-2 w-full">
      {porOpcion.map((n, i) => {
        const pct = Math.round((n / total) * 100);
        const esCorrecta = i === correcta;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-8 text-lg font-bold">{LETRAS[i]}</span>
            <div className="flex-1 h-8 bg-proyector-borde rounded-lg overflow-hidden">
              <div
                className={`${COLORES[i]} h-full flex items-center justify-end pr-3 text-white font-bold transition-[width] duration-700 ease-out`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              >
                {n > 0 && <span className="text-sm">{pct}%</span>}
              </div>
            </div>
            <span className={`w-12 text-right font-semibold ${esCorrecta ? "text-emerald-700" : "text-proyector-textoSuave"}`}>
              {n}
              {esCorrecta && <span className="ml-1">✓</span>}
            </span>
          </div>
        );
      })}
      {noRespondio > 0 && (
        <p className="text-sm text-proyector-textoSuave pt-2">
          {noRespondio} {noRespondio === 1 ? "jugador no respondió" : "jugadores no respondieron"}
        </p>
      )}
    </div>
  );
}
