"use client";

import clsx from "clsx";

export function PowerUpBar({
  fiftyDisponible,
  doubleDisponible,
  doubleArmado,
  onUse
}: {
  fiftyDisponible: boolean;
  doubleDisponible: boolean;
  doubleArmado: boolean;
  onUse: (p: "fiftyFifty" | "double") => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => fiftyDisponible && onUse("fiftyFifty")}
        disabled={!fiftyDisponible}
        className={clsx(
          "flex-1 rounded-xl px-3 py-3 font-bold border-2 transition",
          fiftyDisponible
            ? "border-proyector-acento text-proyector-acento bg-white hover:bg-proyector-acento hover:text-white active:scale-95"
            : "border-proyector-borde text-proyector-textoSuave bg-proyector-borde/30 cursor-not-allowed"
        )}
      >
        50 / 50
        <span className="block text-[10px] font-normal opacity-80">Quita 2 incorrectas</span>
      </button>
      <button
        type="button"
        onClick={() => doubleDisponible && onUse("double")}
        disabled={!doubleDisponible}
        className={clsx(
          "flex-1 rounded-xl px-3 py-3 font-bold border-2 transition",
          doubleArmado && "ring-4 ring-amber-400 bg-amber-100",
          doubleDisponible
            ? "border-amber-500 text-amber-700 bg-white hover:bg-amber-500 hover:text-white active:scale-95"
            : "border-proyector-borde text-proyector-textoSuave bg-proyector-borde/30 cursor-not-allowed"
        )}
      >
        x2 puntos
        <span className="block text-[10px] font-normal opacity-80">
          {doubleArmado ? "Activado para esta pregunta" : "Doble en la siguiente"}
        </span>
      </button>
    </div>
  );
}
