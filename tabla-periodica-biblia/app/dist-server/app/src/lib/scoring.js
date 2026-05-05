"use strict";
/**
 * Cálculo puro de puntuación. Sin efectos secundarios — fácil de testear.
 *
 * Reglas:
 *  - Respuesta incorrecta: 0 puntos.
 *  - Respuesta correcta: base = max(200, 1000 - floor(msTomados / 15)).
 *  - Multiplicador por racha: 1, 2, 3, 4+ → x1.0, x1.2, x1.5, x2.0.
 *  - Power-up "doble" activado: x2 al total final.
 *  - Si excede el tiempo límite, se trata como incorrecta.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PENALIZACION_POR_MS = exports.PUNTOS_BASE_MIN = exports.PUNTOS_BASE_MAX = void 0;
exports.multiplicadorRacha = multiplicadorRacha;
exports.puntosBaseDeRapidez = puntosBaseDeRapidez;
exports.calcularPuntos = calcularPuntos;
exports.PUNTOS_BASE_MAX = 1000;
exports.PUNTOS_BASE_MIN = 200;
exports.PENALIZACION_POR_MS = 1 / 15;
function multiplicadorRacha(rachaPrevia) {
    // rachaPrevia es la racha *antes* de esta respuesta (0 si la anterior fue incorrecta)
    if (rachaPrevia <= 0)
        return 1.0;
    if (rachaPrevia === 1)
        return 1.2;
    if (rachaPrevia === 2)
        return 1.5;
    return 2.0;
}
function puntosBaseDeRapidez(msTomados, tiempoLimiteMs) {
    if (msTomados >= tiempoLimiteMs)
        return 0;
    const calculado = exports.PUNTOS_BASE_MAX - Math.floor(msTomados * exports.PENALIZACION_POR_MS);
    return Math.max(exports.PUNTOS_BASE_MIN, calculado);
}
function calcularPuntos(input) {
    if (!input.correcta || input.msTomados >= input.tiempoLimiteMs) {
        return { puntos: 0, base: 0, multiplicadorRacha: 1, multiplicadorDouble: 1 };
    }
    const base = puntosBaseDeRapidez(input.msTomados, input.tiempoLimiteMs);
    const multRacha = multiplicadorRacha(input.rachaPrevia);
    const multDouble = input.doubleActivo ? 2 : 1;
    const puntos = Math.round(base * multRacha * multDouble);
    return { puntos, base, multiplicadorRacha: multRacha, multiplicadorDouble: multDouble };
}
