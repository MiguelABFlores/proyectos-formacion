import { customAlphabet } from "nanoid";

// Sin caracteres ambiguos (0/O, 1/I/L) — más fácil de leer en proyector y dictar.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generar = customAlphabet(ALPHABET, 6);

export function nuevoRoomCode(): string {
  return generar();
}

export function esRoomCodeValido(input: string): boolean {
  if (input.length !== 6) return false;
  return [...input].every(c => ALPHABET.includes(c));
}
