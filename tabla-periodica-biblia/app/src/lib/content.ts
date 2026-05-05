import fs from "fs";
import path from "path";
import { z } from "zod";
import type { Categoria, Libro, Pregunta } from "@/types/game";

// contenidos/ vive un nivel arriba de app/; process.cwd() es app/ en dev y en Render.
const CONTENIDOS = path.join(process.cwd(), "..", "contenidos");

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

let cache: {
  categorias: Categoria[];
  libros: Libro[];
  preguntas: Pregunta[];
  preguntasPorLibro: Record<string, string[]>;
} | null = null;

function leerJson(nombre: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(CONTENIDOS, nombre), "utf8"));
}

export function cargarContenido() {
  if (cache) return cache;

  const categoriasRaw = leerJson("categorias.json") as { categorias: unknown[] };
  const librosRaw = leerJson("libros.json") as { libros: unknown[] };
  const preguntasRaw = leerJson("preguntas.json") as {
    preguntas: unknown[];
    preguntasPorLibro?: Record<string, unknown>;
  };

  const categorias = z.array(categoriaSchema).parse(categoriasRaw.categorias) as Categoria[];
  const libros = z.array(libroSchema).parse(librosRaw.libros) as Libro[];
  const preguntas = z.array(preguntaSchema).parse(preguntasRaw.preguntas) as Pregunta[];

  const preguntasPorLibro: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(preguntasRaw.preguntasPorLibro ?? {})) {
    if (Array.isArray(v) && v.every(x => typeof x === "string")) {
      preguntasPorLibro[k] = v as string[];
    }
  }

  cache = { categorias, libros, preguntas, preguntasPorLibro };
  return cache;
}

export function preguntaParaLibro(
  simbolo: string,
  dificultad: 1 | 2 | 3,
  yaUsadas: Set<string> = new Set()
): Pregunta | null {
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
