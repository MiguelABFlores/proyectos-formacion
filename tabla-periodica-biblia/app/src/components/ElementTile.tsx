"use client";

import clsx from "clsx";
import type { Categoria, Libro } from "@/types/game";

export function ElementTile({
  libro,
  categoria,
  estado = "disponible",
  onClick
}: {
  libro: Libro;
  categoria: Categoria | undefined;
  estado?: "disponible" | "elegido" | "tomado" | "deshabilitado";
  onClick?: () => void;
}) {
  const color = categoria?.color ?? "#9CA3AF";
  const colorTexto = categoria?.colorTexto ?? "#1F2937";
  const interactivo = estado === "disponible" && !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactivo}
      title={`${libro.nombre} · ${categoria?.nombre ?? "?"} · dificultad ${libro.dificultad}`}
      className={clsx(
        "relative aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 p-1 transition-all border",
        "shadow-sm",
        interactivo && "hover:scale-110 hover:z-10 hover:shadow-lg active:scale-95",
        estado === "elegido" && "ring-4 ring-blue-600 scale-110 z-10",
        estado === "tomado" && "opacity-30 saturate-50 cursor-not-allowed",
        estado === "deshabilitado" && "opacity-50 cursor-not-allowed"
      )}
      style={{ backgroundColor: color, color: colorTexto, borderColor: "rgba(0,0,0,0.15)" }}
    >
      <span className="text-[9px] md:text-[10px] font-bold opacity-80 leading-none">
        {libro.numero}
      </span>
      <span className="text-base md:text-xl font-black leading-none">
        {libro.simbolo}
      </span>
      <span className="text-[7px] md:text-[8px] font-medium leading-none opacity-90 truncate w-full text-center px-0.5">
        {libro.nombre.length > 9 ? libro.nombre.slice(0, 8) + "…" : libro.nombre}
      </span>
      {[1, 2, 3].includes(libro.dificultad) && (
        <span className="absolute top-0.5 right-0.5 text-[8px] font-bold opacity-70">
          {"★".repeat(libro.dificultad)}
        </span>
      )}
    </button>
  );
}
