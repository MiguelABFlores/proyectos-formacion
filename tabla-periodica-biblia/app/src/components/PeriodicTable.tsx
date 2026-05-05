"use client";

import { useMemo } from "react";
import type { Categoria, Libro } from "@/types/game";
import { ElementTile } from "./ElementTile";

/**
 * Tabla periódica organizada por categoría: cada fila es una categoría,
 * y los elementos se ordenan por número atómico.
 * Diseñado para verse bien en proyector y celular.
 */
export function PeriodicTable({
  libros,
  categorias,
  elegidoMio,
  tomados = {},
  onElegir
}: {
  libros: Libro[];
  categorias: Categoria[];
  elegidoMio?: string;
  tomados?: Record<string, string>;
  onElegir?: (simbolo: string) => void;
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

  const tomadasInversa = useMemo(() => {
    // simbolo → jugadorId que ya lo tomó
    return new Set(Object.values(tomados));
  }, [tomados]);

  return (
    <div className="space-y-2">
      {categorias.map((cat) => {
        const libs = porCategoria.get(cat.id) ?? [];
        if (libs.length === 0) return null;
        return (
          <div key={cat.id} className="grid gap-1 grid-cols-[120px_1fr] items-center">
            <div className="text-xs md:text-sm font-bold pr-2 text-right">
              <div style={{ color: cat.color }}>{cat.nombre}</div>
              <div className="text-[10px] text-proyector-textoSuave font-normal">{cat.testamento}</div>
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}
            >
              {libs.map((libro) => {
                const tomada = tomadasInversa.has(libro.simbolo) && libro.simbolo !== elegidoMio;
                const esMia = libro.simbolo === elegidoMio;
                const estado = esMia ? "elegido" : tomada ? "tomado" : "disponible";
                return (
                  <ElementTile
                    key={libro.numero}
                    libro={libro}
                    categoria={cat}
                    estado={estado}
                    onClick={onElegir ? () => onElegir(libro.simbolo) : undefined}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 text-xs text-proyector-textoSuave pt-2">
        <span><span className="text-amber-600">★</span> dificultad 1 (poco bote)</span>
        <span><span className="text-amber-600">★★</span> dificultad 2</span>
        <span><span className="text-amber-600">★★★</span> dificultad 3 (gran bote)</span>
      </div>
    </div>
  );
}
