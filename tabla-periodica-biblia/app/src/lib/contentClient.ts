// Versión cliente de los datos de contenido: imports estáticos que webpack
// puede resolver mediante el alias @content definido en next.config.js.
// NO usar fs ni process.cwd() aquí — este archivo va al bundle del browser.
import librosJson from "@content/libros.json";
import categoriasJson from "@content/categorias.json";
import type { Libro, Categoria } from "@/types/game";

export const libros: Libro[] = (librosJson as { libros: Libro[] }).libros;
export const categorias: Categoria[] = (categoriasJson as { categorias: Categoria[] }).categorias;
