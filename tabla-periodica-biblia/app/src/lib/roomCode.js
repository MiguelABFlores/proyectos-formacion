"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nuevoRoomCode = nuevoRoomCode;
exports.esRoomCodeValido = esRoomCodeValido;
const nanoid_1 = require("nanoid");
// Sin caracteres ambiguos (0/O, 1/I/L) — más fácil de leer en proyector y dictar.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generar = (0, nanoid_1.customAlphabet)(ALPHABET, 6);
function nuevoRoomCode() {
    return generar();
}
function esRoomCodeValido(input) {
    if (input.length !== 6)
        return false;
    return [...input].every(c => ALPHABET.includes(c));
}
