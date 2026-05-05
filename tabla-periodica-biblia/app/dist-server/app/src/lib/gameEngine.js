"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearPartida = crearPartida;
exports.nuevoJugador = nuevoJugador;
exports.preguntaActual = preguntaActual;
exports.preguntaPublica = preguntaPublica;
exports.jugadorPublico = jugadorPublico;
exports.partidaPublica = partidaPublica;
exports.aplicarRespuesta = aplicarRespuesta;
exports.aplicarTimeoutsPregunta = aplicarTimeoutsPregunta;
exports.activarPowerUp = activarPowerUp;
exports.indicesParaFiftyFifty = indicesParaFiftyFifty;
exports.distribucionRespuestas = distribucionRespuestas;
exports.leaderboard = leaderboard;
const scoring_1 = require("./scoring");
function crearPartida(code, hostId, preguntas, modoFormacion = false) {
    return {
        code,
        hostId,
        fase: "lobby",
        modoFormacion,
        creadaEn: Date.now(),
        preguntas,
        preguntaIndice: -1,
        preguntaInicioMs: 0,
        respuestasActual: new Map(),
        libroFinalPorJugador: new Map(),
        preguntaFinalPorJugador: new Map(),
        preguntasFinalUsadas: new Set(),
        jugadores: new Map(),
        desconectados: new Set()
    };
}
function nuevoJugador(id, nombre) {
    return {
        id,
        nombre,
        puntos: 0,
        rachaActual: 0,
        mejorRacha: 0,
        powerUpsDisponibles: { fiftyFifty: true, double: true },
        doubleArmadoParaSiguiente: false,
        respuestas: []
    };
}
function preguntaActual(p) {
    if (p.preguntaIndice < 0 || p.preguntaIndice >= p.preguntas.length)
        return null;
    return p.preguntas[p.preguntaIndice];
}
function preguntaPublica(pregunta, inicioMs, modoFormacion) {
    return {
        id: pregunta.id,
        tipo: pregunta.tipo,
        enunciado: pregunta.enunciado,
        opciones: pregunta.opciones,
        tiempoSegundos: pregunta.tiempoSegundos,
        inicioMs,
        reflexion: modoFormacion ? pregunta.reflexion : undefined
    };
}
function jugadorPublico(j, conectado) {
    return {
        id: j.id,
        nombre: j.nombre,
        puntos: j.puntos,
        rachaActual: j.rachaActual,
        conectado
    };
}
function partidaPublica(p) {
    const preg = preguntaActual(p);
    return {
        code: p.code,
        fase: p.fase,
        modoFormacion: p.modoFormacion,
        preguntaIndice: p.preguntaIndice,
        totalPreguntas: p.preguntas.length,
        preguntaActual: preg && (p.fase === "question" || p.fase === "reveal")
            ? preguntaPublica(preg, p.preguntaInicioMs, p.modoFormacion)
            : null,
        jugadores: [...p.jugadores.values()].map(j => jugadorPublico(j, !p.desconectados.has(j.id)))
    };
}
/**
 * Aplica la respuesta de un jugador a la pregunta actual y devuelve la entrada del historial.
 * Idempotente: si el jugador ya respondió esta pregunta, devuelve null.
 */
function aplicarRespuesta(partida, jugadorId, opcion, ahoraMs) {
    const pregunta = preguntaActual(partida);
    const jugador = partida.jugadores.get(jugadorId);
    if (!pregunta || !jugador)
        return null;
    if (partida.fase !== "question")
        return null;
    if (partida.respuestasActual.has(jugadorId))
        return null;
    const tiempoLimiteMs = pregunta.tiempoSegundos * 1000;
    const msTomados = Math.max(0, ahoraMs - partida.preguntaInicioMs);
    const correcta = opcion === pregunta.correcta;
    const doubleActivo = jugador.doubleArmadoParaSiguiente;
    const { puntos } = (0, scoring_1.calcularPuntos)({
        correcta,
        msTomados,
        tiempoLimiteMs,
        rachaPrevia: jugador.rachaActual,
        doubleActivo
    });
    jugador.puntos += puntos;
    if (correcta) {
        jugador.rachaActual += 1;
        jugador.mejorRacha = Math.max(jugador.mejorRacha, jugador.rachaActual);
    }
    else {
        jugador.rachaActual = 0;
    }
    // El "double" se consume tras esta pregunta, sea correcta o no
    jugador.doubleArmadoParaSiguiente = false;
    const entrada = {
        preguntaId: pregunta.id,
        elegida: opcion,
        correcta,
        msTomados,
        puntosObtenidos: puntos,
        rachaTras: jugador.rachaActual,
        doubleAplicado: doubleActivo && correcta
    };
    jugador.respuestas.push(entrada);
    partida.respuestasActual.set(jugadorId, { elegida: opcion, ms: msTomados });
    return entrada;
}
/**
 * Marca como "no respondido" (timeout) a quienes no respondieron al cerrar la pregunta.
 * Su racha vuelve a 0. Devuelve la lista de jugadores afectados.
 */
function aplicarTimeoutsPregunta(partida) {
    const pregunta = preguntaActual(partida);
    if (!pregunta)
        return [];
    const afectados = [];
    for (const jugador of partida.jugadores.values()) {
        if (partida.respuestasActual.has(jugador.id))
            continue;
        jugador.rachaActual = 0;
        jugador.doubleArmadoParaSiguiente = false;
        jugador.respuestas.push({
            preguntaId: pregunta.id,
            elegida: null,
            correcta: false,
            msTomados: pregunta.tiempoSegundos * 1000,
            puntosObtenidos: 0,
            rachaTras: 0,
            doubleAplicado: false
        });
        afectados.push(jugador.id);
    }
    return afectados;
}
/**
 * Consume un power-up. Devuelve true si se pudo activar.
 *  - fiftyFifty: solo válido si está la pregunta abierta y el jugador no respondió aún.
 *  - double: válido en lobby, leaderboard o question (si no respondió aún) — se consume al responder.
 */
function activarPowerUp(partida, jugadorId, power) {
    const jugador = partida.jugadores.get(jugadorId);
    if (!jugador)
        return false;
    if (!jugador.powerUpsDisponibles[power])
        return false;
    if (power === "fiftyFifty") {
        if (partida.fase !== "question")
            return false;
        if (partida.respuestasActual.has(jugadorId))
            return false;
        jugador.powerUpsDisponibles.fiftyFifty = false;
        return true;
    }
    // double
    if (partida.fase === "question" && partida.respuestasActual.has(jugadorId))
        return false;
    jugador.powerUpsDisponibles.double = false;
    jugador.doubleArmadoParaSiguiente = true;
    return true;
}
/** Devuelve los 2 índices a ocultar para el power-up 50/50 (las 2 incorrectas más obvias). */
function indicesParaFiftyFifty(pregunta) {
    const incorrectas = [0, 1, 2, 3].filter(i => i !== pregunta.correcta);
    // Elige 2 al azar para variedad
    const barajadas = [...incorrectas].sort(() => Math.random() - 0.5);
    return [barajadas[0], barajadas[1]];
}
/** % de jugadores que eligieron cada opción (incluye 'noRespondio'). */
function distribucionRespuestas(partida) {
    const por = [0, 0, 0, 0];
    let respondieron = 0;
    for (const r of partida.respuestasActual.values()) {
        if (r.elegida >= 0 && r.elegida <= 3) {
            por[r.elegida] += 1;
            respondieron += 1;
        }
    }
    const total = partida.jugadores.size;
    return { porOpcion: por, noRespondio: total - respondieron, totalJugadores: total };
}
/** Top N jugadores ordenados por puntos descendente. */
function leaderboard(partida, top = 10) {
    return [...partida.jugadores.values()]
        .sort((a, b) => b.puntos - a.puntos)
        .slice(0, top)
        .map(j => jugadorPublico(j, !partida.desconectados.has(j.id)));
}
