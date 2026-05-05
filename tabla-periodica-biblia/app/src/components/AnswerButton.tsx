"use client";

import clsx from "clsx";

type Estado = "idle" | "elegida" | "correcta" | "incorrecta" | "oculta" | "deshabilitada";

const COLORES: Record<number, string> = {
  0: "bg-respuesta-a hover:brightness-110",
  1: "bg-respuesta-b hover:brightness-110",
  2: "bg-respuesta-c hover:brightness-110",
  3: "bg-respuesta-d hover:brightness-110"
};

const LETRAS = ["A", "B", "C", "D"];

export function AnswerButton({
  indice,
  texto,
  estado = "idle",
  onClick
}: {
  indice: 0 | 1 | 2 | 3;
  texto: string;
  estado?: Estado;
  onClick?: () => void;
}) {
  const oculto = estado === "oculta";
  const elegida = estado === "elegida";
  const correcta = estado === "correcta";
  const incorrecta = estado === "incorrecta";
  const deshabilitada = estado === "deshabilitada" || oculto;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={`Opción ${LETRAS[indice]}: ${texto}`}
      className={clsx(
        "relative rounded-2xl px-4 py-6 md:py-10 text-white text-left shadow-lg transition-all",
        "focus:outline-none focus:ring-4 focus:ring-blue-300",
        "min-h-[90px]",
        COLORES[indice],
        oculto && "opacity-20 grayscale pointer-events-none",
        elegida && "ring-4 ring-white ring-offset-2 ring-offset-proyector-fondo scale-[1.02]",
        correcta && "ring-4 ring-emerald-400 ring-offset-2 ring-offset-proyector-fondo",
        incorrecta && "opacity-60",
        !deshabilitada && "active:scale-95"
      )}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white/25 text-2xl md:text-3xl font-black flex-shrink-0">
          {LETRAS[indice]}
        </span>
        <span className="text-lg md:text-2xl font-bold leading-tight">{texto}</span>
      </div>
      {correcta && (
        <span className="absolute top-2 right-3 text-2xl">✓</span>
      )}
      {incorrecta && elegida && (
        <span className="absolute top-2 right-3 text-2xl">✗</span>
      )}
    </button>
  );
}
