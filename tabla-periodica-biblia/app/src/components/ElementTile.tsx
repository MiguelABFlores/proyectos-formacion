"use client";

import clsx from "clsx";
import type { Categoria, Libro } from "@/types/game";

/**
 * Estados visuales de una celda:
 *  - disponible: clickable, color de la categoría
 *  - elegidoActual: marcada con ring azul (selección de la ronda en curso)
 *  - correcto: ya jugado y acertado en una ronda anterior, borde verde + ✓
 *  - incorrecto: ya jugado y fallado en una ronda anterior, borde rojo + ✗
 *  - tomado: en la ronda actual lo tomó alguien más (modo excluyente — no lo usamos
 *    ahora pero se mantiene el tipo para flexibilidad)
 *  - deshabilitado: visualmente atenuado, no clickable
 */
export type EstadoTile =
  | "disponible"
  | "elegidoActual"
  | "correcto"
  | "incorrecto"
  | "tomado"
  | "deshabilitado";

export function ElementTile({
  libro,
  categoria,
  estado = "disponible",
  onClick,
  tamano = "md"
}: {
  libro: Libro;
  categoria: Categoria | undefined;
  estado?: EstadoTile;
  onClick?: () => void;
  /** sm = compacto (host); md = grande (jugador en celular). */
  tamano?: "sm" | "md" | "lg";
}) {
  const color = categoria?.color ?? "#9CA3AF";
  const colorTexto = categoria?.colorTexto ?? "#1F2937";
  const interactivo = estado === "disponible" && !!onClick;
  const yaJugado = estado === "correcto" || estado === "incorrecto";

  // Tamaños base por size — se controlan con min-h y font sizes,
  // la grid ya garantiza el aspect-square.
  const sizeStyles =
    tamano === "lg"
      ? "min-h-[88px]"
      : tamano === "md"
      ? "min-h-[68px]"
      : "min-h-[52px]";

  const sizeNumero = tamano === "lg" ? "text-xs" : tamano === "md" ? "text-[11px]" : "text-[10px]";
  const sizeSimbolo = tamano === "lg" ? "text-3xl" : tamano === "md" ? "text-2xl" : "text-xl";
  const sizeNombre = tamano === "lg" ? "text-[10px]" : tamano === "md" ? "text-[9px]" : "text-[8px]";
  const maxNombre = tamano === "lg" ? 11 : 9;

  return (
    <button
      type="button"
      onClick={interactivo ? onClick : undefined}
      disabled={!interactivo}
      title={`${libro.nombre} · ${categoria?.nombre ?? "?"} · dificultad ${libro.dificultad}${
        estado === "correcto" ? " · acertaste antes" : estado === "incorrecto" ? " · fallaste antes" : ""
      }`}
      className={clsx(
        "relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 p-1.5 transition-all",
        sizeStyles,
        // Bordes según estado
        estado === "disponible" && "border border-black/15 shadow-sm",
        estado === "elegidoActual" && "border-4 border-blue-600 shadow-lg z-10 scale-105",
        estado === "correcto" && "border-4 border-emerald-600 shadow-md",
        estado === "incorrecto" && "border-4 border-red-600 shadow-md",
        estado === "tomado" && "border border-black/15 opacity-25 saturate-0 cursor-not-allowed",
        estado === "deshabilitado" && "border border-black/15 opacity-50 cursor-not-allowed",
        // Hover solo si es clickable
        interactivo && "hover:scale-110 hover:z-10 hover:shadow-lg active:scale-95 cursor-pointer"
      )}
      style={{ backgroundColor: color, color: colorTexto }}
    >
      <span className={clsx("font-bold opacity-80 leading-none", sizeNumero)}>
        {libro.numero}
      </span>
      <span className={clsx("font-black leading-none", sizeSimbolo)}>{libro.simbolo}</span>
      <span
        className={clsx("font-medium leading-none opacity-90 truncate w-full text-center px-0.5", sizeNombre)}
      >
        {libro.nombre.length > maxNombre ? libro.nombre.slice(0, maxNombre - 1) + "…" : libro.nombre}
      </span>
      {[1, 2, 3].includes(libro.dificultad) && !yaJugado && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold opacity-70">
          {"★".repeat(libro.dificultad)}
        </span>
      )}
      {/* Marcador grande de estado pasado */}
      {estado === "correcto" && (
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-base font-black shadow-md">
          ✓
        </span>
      )}
      {estado === "incorrecto" && (
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-base font-black shadow-md">
          ✗
        </span>
      )}
    </button>
  );
}
