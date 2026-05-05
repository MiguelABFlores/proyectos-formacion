import { z } from "zod";
import categoriasJson from "@content/categorias.json";
import librosJson from "@content/libros.json";
import preguntasJson from "@content/preguntas.json";
import type { Categoria, Libro, Pregunta } from "@/types/game";

const categoriaSchema = z.object({
  id: z.enum([
    "pentateuco",
    "historicos_at",
    "sapienciales",
    "profeticos",
    "evangelios",
    "hechos",
    "cartas",
    "apocaliptico"
  ]),
  nombre: z.string(),
  testamento: z.enum(["AT", "NT"]),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  colorTexto: z.string().regex(/^#[0-9A-F]{6}$/i),
  descripcion: z.string()
});

const libroSchema = z.object({
  numero: z.number().int().min(1).max(73),
  simbolo: z.string().min(1).max(4),
  nombre: z.string(),
  categoria: categoriaSchema.shape.id,
  testamento: z.enum(["AT", "NT"]),
  dificultad: z.union([z.literal(1), z.literal(2), z.literal(3)])
});

const preguntaSchema = z.object({
  id: z.string(),
  tipo: z.enum(["identificacion", "relacion", "aplicacion", "tabla"]),
  dificultad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tiempoSegundos: z.number().int().min(5).max(120),
  enunciado: z.string(),
  opciones: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correcta: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  reflexion: z.string().optional()
});

let cache: { categorias: Categoria[]; libros: Libro[]; preguntas: Pregunta[]; preguntasPorLibro: Record<string, string[]> } | null = null;

export function cargarContenido() {
  if (cache) return cache;
  const categorias = z.array(categoriaSchema).parse((categoriasJson as { categorias: Categoria[] }).categorias);
  const libros = z.array(libroSchema).parse((librosJson as { libros: Libro[] }).libros);
  const preguntas = z.array(preguntaSchema).parse((preguntasJson as { preguntas: Pregunta[] }).preguntas);
  const preguntasPorLibroRaw = (preguntasJson as { preguntasPorLibro?: Record<string, unknown> }).preguntasPorLibro ?? {};
  const preguntasPorLibro: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(preguntasPorLibroRaw)) {
    if (Array.isArray(v) && v.every(x => typeof x === "string")) {
      preguntasPorLibro[k] = v as string[];
    }
  }
  cache = { categorias, libros, preguntas, preguntasPorLibro };
  return cache;
}

/**
 * Selecciona una pregunta para la ronda final dada la dificultad del libro elegido.
 * Si el libro tiene preguntas mapeadas explícitamente, prefiere esas.
 */
export function preguntaParaLibro(simbolo: string, dificultad: 1 | 2 | 3, yaUsadas: Set<string> = new Set()): Pregunta | null {
  const { preguntas, preguntasPorLibro } = cargarContenido();
  const idsMapeados = preguntasPorLibro[simbolo] ?? [];
  for (const id of idsMapeados) {
    if (!yaUsadas.has(id)) {
      const p = preguntas.find(p => p.id === id);
      if (p) return p;
    }
  }
  const candidatas = preguntas.filter(p => p.dificultad === dificultad && !yaUsadas.has(p.id));
  if (candidatas.length === 0) return null;
  return candidatas[Math.floor(Math.random() * candidatas.length)];
}
