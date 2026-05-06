"use client";

import { useMemo } from "react";
import type { Categoria, HistorialPersonal, Libro } from "@/types/game";
import { ElementTile, type EstadoTile } from "./ElementTile";

/**
 * Tabla periódica organizada por categoría: cada fila es una categoría,
 * y los elementos se ordenan por número atómico.
 *
 * Cómo se calcula el estado de cada celda (en orden de prioridad):
 *  1. Si el simbolo está en `historial` → "correcto" o "incorrecto"
 *  2. Si es `elegidoMio` → "elegidoActual"
 *  3. Si es uno de los `tomados` (modo excluyente) → "tomado"
 *  4. Si hay `onElegir` → "disponible"
 *  5. Si no → "deshabilitado"
 */
export function PeriodicTable({
  libros,
  categorias,
  historial = {},
  elegidoMio,
  tomados = {},
  onElegir,
  tamano = "md"
}: {
  libros: Libro[];
  categorias: Categoria[];
  /** Historial personal del jugador (libros ya jugados en rondas previas). */
  historial?: HistorialPersonal;
  /** Símbolo del libro elegido en la ronda en curso (todavía sin revelar). */
  elegidoMio?: string;
  /** Para modo excluyente: simbolo → jugadorId que lo tomó. */
  tomados?: Record<string, string>;
  onElegir?: (simbolo: string) => void;
  tamano?: "sm" | "md" | "lg";
}) {
  const porCategoria = useMemo(() => {
    const map = new Map<string, Libro[]>();
    for (const cat of categorias) map.set(cat.id, []);
    for (const libro of libros) {
      const arr = map.get(libro.categoria);
      if (arr) arr.push(libro);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.numero - b.numero);
    return map;
  }, [libros, categorias]);

  const tomadasInversa = useMemo(() => new Set(Object.values(tomados)), [tomados]);

  const minColPx = tamano === "lg" ? 84 : tamano === "md" ? 64 : 48;
  const labelClasses = tamano === "lg" ? "text-sm md:text-base" : "text-xs md:text-sm";

  return (
    <div className="space-y-3">
      {categorias.map((cat) => {
        const libs = porCategoria.get(cat.id) ?? [];
        if (libs.length === 0) return null;
        return (
          <div
            key={cat.id}
            className="grid gap-2 items-center"
            style={{ gridTemplateColumns: "minmax(110px, 130px) 1fr" }}
          >
            <div className={`${labelClasses} font-bold pr-2 text-right`}>
              <div style={{ color: cat.color }}>{cat.nombre}</div>
              <div className="text-[10px] text-proyector-textoSuave font-normal">{cat.testamento}</div>
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColPx}px, 1fr))` }}
            >
              {libs.map((libro) => {
                const estadoHistorial = historial[libro.simbolo];
                let estado: EstadoTile;
                if (estadoHistorial === "correcto") estado = "correcto";
                else if (estadoHistorial === "incorrecto") estado = "incorrecto";
                else if (libro.simbolo === elegidoMio) estado = "elegidoActual";
                else if (tomadasInversa.has(libro.simbolo)) estado = "tomado";
                else if (onElegir) estado = "disponible";
                else estado = "deshabilitado";
                return (
                  <ElementTile
                    key={libro.numero}
                    libro={libro}
                    categoria={cat}
                    estado={estado}
                    onClick={onElegir ? () => onElegir(libro.simbolo) : undefined}
                    tamano={tamano}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-3 text-xs text-proyector-textoSuave pt-2">
        <span><span className="text-amber-600">★</span> dificultad 1 (×1 puntos)</span>
        <span><span className="text-amber-600">★★</span> dificultad 2 (×2 puntos)</span>
        <span><span className="text-amber-600">★★★</span> dificultad 3 (×3 puntos)</span>
        {Object.keys(historial).length > 0 && (
          <>
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" /> acertaste antes
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-600" /> fallaste antes
            </span>
          </>
        )}
      </div>
    </div>
  );
}
