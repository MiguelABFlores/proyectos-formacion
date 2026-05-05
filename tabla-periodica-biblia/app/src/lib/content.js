"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargarContenido = cargarContenido;
exports.preguntaParaLibro = preguntaParaLibro;
const zod_1 = require("zod");
const categorias_json_1 = __importDefault(require("@content/categorias.json"));
const libros_json_1 = __importDefault(require("@content/libros.json"));
const preguntas_json_1 = __importDefault(require("@content/preguntas.json"));
const categoriaSchema = zod_1.z.object({
    id: zod_1.z.enum([
        "pentateuco",
        "historicos_at",
        "sapienciales",
        "profeticos",
        "evangelios",
        "hechos",
        "cartas",
        "apocaliptico"
    ]),
    nombre: zod_1.z.string(),
    testamento: zod_1.z.enum(["AT", "NT"]),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i),
    colorTexto: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i),
    descripcion: zod_1.z.string()
});
const libroSchema = zod_1.z.object({
    numero: zod_1.z.number().int().min(1).max(73),
    simbolo: zod_1.z.string().min(1).max(4),
    nombre: zod_1.z.string(),
    categoria: categoriaSchema.shape.id,
    testamento: zod_1.z.enum(["AT", "NT"]),
    dificultad: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)])
});
const preguntaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tipo: zod_1.z.enum(["identificacion", "relacion", "aplicacion", "tabla"]),
    dificultad: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]),
    tiempoSegundos: zod_1.z.number().int().min(5).max(120),
    enunciado: zod_1.z.string(),
    opciones: zod_1.z.tuple([zod_1.z.string(), zod_1.z.string(), zod_1.z.string(), zod_1.z.string()]),
    correcta: zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3)]),
    reflexion: zod_1.z.string().optional()
});
let cache = null;
function cargarContenido() {
    if (cache)
        return cache;
    const categorias = zod_1.z.array(categoriaSchema).parse(categorias_json_1.default.categorias);
    const libros = zod_1.z.array(libroSchema).parse(libros_json_1.default.libros);
    const preguntas = zod_1.z.array(preguntaSchema).parse(preguntas_json_1.default.preguntas);
    const preguntasPorLibroRaw = preguntas_json_1.default.preguntasPorLibro ?? {};
    const preguntasPorLibro = {};
    for (const [k, v] of Object.entries(preguntasPorLibroRaw)) {
        if (Array.isArray(v) && v.every(x => typeof x === "string")) {
            preguntasPorLibro[k] = v;
        }
    }
    cache = { categorias, libros, preguntas, preguntasPorLibro };
    return cache;
}
/**
 * Selecciona una pregunta para la ronda final dada la dificultad del libro elegido.
 * Si el libro tiene preguntas mapeadas explícitamente, prefiere esas.
 */
function preguntaParaLibro(simbolo, dificultad, yaUsadas = new Set()) {
    const { preguntas, preguntasPorLibro } = cargarContenido();
    const idsMapeados = preguntasPorLibro[simbolo] ?? [];
    for (const id of idsMapeados) {
        if (!yaUsadas.has(id)) {
            const p = preguntas.find(p => p.id === id);
            if (p)
                return p;
        }
    }
    const candidatas = preguntas.filter(p => p.dificultad === dificultad && !yaUsadas.has(p.id));
    if (candidatas.length === 0)
        return null;
    return candidatas[Math.floor(Math.random() * candidatas.length)];
}
