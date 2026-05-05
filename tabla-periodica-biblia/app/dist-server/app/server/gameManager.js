"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partidaPublica = exports.GameManager = void 0;
const content_1 = require("../src/lib/content");
const gameEngine_1 = require("../src/lib/gameEngine");
Object.defineProperty(exports, "partidaPublica", { enumerable: true, get: function () { return gameEngine_1.partidaPublica; } });
const roomCode_1 = require("../src/lib/roomCode");
const PREGUNTAS_POR_PARTIDA_DEFAULT = 8;
/**
 * Selecciona N preguntas equilibrando dificultad (más fáciles primero).
 */
function seleccionarPreguntas(numero) {
    const { preguntas } = (0, content_1.cargarContenido)();
    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    const faciles = shuffle(preguntas.filter(p => p.dificultad === 1));
    const medias = shuffle(preguntas.filter(p => p.dificultad === 2));
    const dificiles = shuffle(preguntas.filter(p => p.dificultad === 3));
    const result = [];
    const tomarDe = (arr, n) => result.push(...arr.slice(0, n));
    // 40% fácil, 40% media, 20% difícil
    const nFacil = Math.max(1, Math.round(numero * 0.4));
    const nMedia = Math.max(1, Math.round(numero * 0.4));
    const nDificil = Math.max(1, numero - nFacil - nMedia);
    tomarDe(faciles, nFacil);
    tomarDe(medias, nMedia);
    tomarDe(dificiles, nDificil);
    // Si quedó corto (poco contenido), rellena con cualquiera
    while (result.length < numero) {
        const restantes = preguntas.filter(p => !result.find(r => r.id === p.id));
        if (restantes.length === 0)
            break;
        result.push(restantes[Math.floor(Math.random() * restantes.length)]);
    }
    return result.slice(0, numero);
}
class GameManager {
    partidas = new Map();
    /** sockId → code (para encontrar la partida del jugador rápidamente). */
    jugadorEnPartida = new Map();
    /** sockId → code (para hosts). */
    hostDePartida = new Map();
    /** Timers de cierre de pregunta por code. */
    timers = new Map();
    crear(hostId, opciones = {}) {
        let code = (0, roomCode_1.nuevoRoomCode)();
        while (this.partidas.has(code))
            code = (0, roomCode_1.nuevoRoomCode)();
        const num = opciones.numPreguntas ?? PREGUNTAS_POR_PARTIDA_DEFAULT;
        const preguntas = seleccionarPreguntas(num);
        const partida = (0, gameEngine_1.crearPartida)(code, hostId, preguntas, opciones.modoFormacion ?? false);
        this.partidas.set(code, partida);
        this.hostDePartida.set(hostId, code);
        return partida;
    }
    reasignarHost(hostId, code) {
        const partida = this.partidas.get(code);
        if (!partida)
            return null;
        this.hostDePartida.delete(partida.hostId);
        partida.hostId = hostId;
        this.hostDePartida.set(hostId, code);
        return partida;
    }
    getPorCode(code) {
        return this.partidas.get(code);
    }
    getPorJugador(jugadorId) {
        const code = this.jugadorEnPartida.get(jugadorId);
        return code ? this.partidas.get(code) : undefined;
    }
    getPorHost(hostId) {
        const code = this.hostDePartida.get(hostId);
        return code ? this.partidas.get(code) : undefined;
    }
    unirJugador(code, jugadorId, nombre) {
        const partida = this.partidas.get(code);
        if (!partida)
            return { ok: false, error: "Código no encontrado" };
        if (partida.fase !== "lobby")
            return { ok: false, error: "La partida ya empezó" };
        if (partida.jugadores.size >= 30)
            return { ok: false, error: "Sala llena (máx 30)" };
        const nombreLimpio = nombre.trim().slice(0, 24);
        if (!nombreLimpio)
            return { ok: false, error: "Nombre vacío" };
        const yaUsado = [...partida.jugadores.values()].some(j => j.nombre.toLowerCase() === nombreLimpio.toLowerCase());
        if (yaUsado)
            return { ok: false, error: "Ese nombre ya está en uso" };
        partida.jugadores.set(jugadorId, (0, gameEngine_1.nuevoJugador)(jugadorId, nombreLimpio));
        this.jugadorEnPartida.set(jugadorId, code);
        return { ok: true, partida };
    }
    salirJugador(jugadorId) {
        const partida = this.getPorJugador(jugadorId);
        if (!partida)
            return undefined;
        if (partida.fase === "lobby") {
            partida.jugadores.delete(jugadorId);
        }
        else {
            partida.desconectados.add(jugadorId);
        }
        this.jugadorEnPartida.delete(jugadorId);
        return partida;
    }
    /** Inicia o avanza el flujo del juego según la fase actual. */
    avanzar(code, callbacks) {
        const partida = this.partidas.get(code);
        if (!partida)
            return;
        const lanzarSiguientePregunta = () => {
            partida.preguntaIndice += 1;
            if (partida.preguntaIndice >= partida.preguntas.length) {
                // Se acabaron las preguntas regulares: ofrece ronda final
                partida.fase = "leaderboard";
                callbacks.estado(partida);
                callbacks.leaderboard((0, gameEngine_1.leaderboard)(partida));
                return;
            }
            const pregunta = (0, gameEngine_1.preguntaActual)(partida);
            partida.fase = "question";
            partida.preguntaInicioMs = Date.now();
            partida.respuestasActual.clear();
            callbacks.pregunta((0, gameEngine_1.preguntaPublica)(pregunta, partida.preguntaInicioMs, partida.modoFormacion), partida.preguntaIndice, partida.preguntas.length);
            callbacks.estado(partida);
            this.programarCierre(code, pregunta.tiempoSegundos * 1000, callbacks);
        };
        switch (partida.fase) {
            case "lobby":
            case "leaderboard":
                lanzarSiguientePregunta();
                return;
            case "question":
                // Forzar cierre temprano si el host pulsa "siguiente"
                this.cerrarPregunta(code, callbacks);
                return;
            case "reveal":
                // Tras revelar, pasamos a leaderboard y luego, en el próximo "siguiente", a la nueva pregunta.
                partida.fase = "leaderboard";
                callbacks.estado(partida);
                callbacks.leaderboard((0, gameEngine_1.leaderboard)(partida));
                return;
            case "finalRoundLobby":
                // Asignar pregunta a cada jugador y emitir
                this.asignarPreguntasFinales(partida, callbacks);
                partida.fase = "finalQuestion";
                partida.preguntaInicioMs = Date.now();
                callbacks.estado(partida);
                // Cierre tras 35s (más generoso para la final)
                this.programarCierreFinal(code, 35000, callbacks);
                return;
            case "finalQuestion":
                this.cerrarRondaFinal(code, callbacks);
                return;
            case "finalReveal":
                partida.fase = "ended";
                callbacks.estado(partida);
                callbacks.fin((0, gameEngine_1.leaderboard)(partida, 30), this.resumenSesion(partida));
                return;
            default:
                return;
        }
    }
    /** Llamado por el host para iniciar la ronda final. */
    iniciarRondaFinal(code, callbacks) {
        const partida = this.partidas.get(code);
        if (!partida)
            return;
        partida.fase = "finalRoundLobby";
        partida.libroFinalPorJugador.clear();
        callbacks.estado(partida);
        const { libros } = (0, content_1.cargarContenido)();
        callbacks.rondaFinalLobby(libros.map(l => ({ simbolo: l.simbolo, dificultad: l.dificultad })), {});
    }
    elegirLibroFinal(jugadorId, simbolo) {
        const partida = this.getPorJugador(jugadorId);
        if (!partida)
            return { ok: false, error: "No estás en una partida" };
        if (partida.fase !== "finalRoundLobby")
            return { ok: false, error: "No es el momento de elegir" };
        const yaElegido = [...partida.libroFinalPorJugador.values()].includes(simbolo);
        if (yaElegido)
            return { ok: false, error: "Ese libro ya lo eligió otro jugador" };
        const { libros } = (0, content_1.cargarContenido)();
        if (!libros.find(l => l.simbolo === simbolo))
            return { ok: false, error: "Libro inválido" };
        partida.libroFinalPorJugador.set(jugadorId, simbolo);
        const jugador = partida.jugadores.get(jugadorId);
        if (jugador)
            jugador.libroFinalSimbolo = simbolo;
        return { ok: true };
    }
    responder(jugadorId, opcion, callbacks) {
        const partida = this.getPorJugador(jugadorId);
        if (!partida)
            return;
        if (partida.fase === "question") {
            const r = (0, gameEngine_1.aplicarRespuesta)(partida, jugadorId, opcion, Date.now());
            if (r) {
                callbacks.resultadoIndividual(jugadorId, r);
                // Si todos respondieron, cerrar la pregunta antes
                if (partida.respuestasActual.size === partida.jugadores.size) {
                    this.cerrarPregunta(partida.code, callbacks);
                }
            }
            return;
        }
        if (partida.fase === "finalQuestion") {
            const pregunta = partida.preguntaFinalPorJugador.get(jugadorId);
            if (!pregunta)
                return;
            const yaRespondio = partida.jugadores.get(jugadorId)?.respuestas.find(r => r.preguntaId === pregunta.id);
            if (yaRespondio)
                return;
            const ahora = Date.now();
            const ms = Math.max(0, ahora - partida.preguntaInicioMs);
            const correcta = opcion === pregunta.correcta;
            const jugador = partida.jugadores.get(jugadorId);
            // En la final, los puntos son base × dificultad × 2 (apuesta), sin racha ni double
            const baseBase = correcta ? Math.max(200, 1000 - Math.floor(ms / 15)) : 0;
            const puntos = correcta ? baseBase * pregunta.dificultad * 2 : 0;
            jugador.puntos += puntos;
            jugador.respuestas.push({
                preguntaId: pregunta.id,
                elegida: opcion,
                correcta,
                msTomados: ms,
                puntosObtenidos: puntos,
                rachaTras: jugador.rachaActual,
                doubleAplicado: false
            });
            callbacks.resultadoIndividual(jugadorId, jugador.respuestas[jugador.respuestas.length - 1]);
            // Si todos respondieron, cerrar la final antes
            const todosRespondieron = [...partida.jugadores.values()].every(j => j.respuestas.find(r => r.preguntaId === partida.preguntaFinalPorJugador.get(j.id)?.id));
            if (todosRespondieron) {
                this.cerrarRondaFinal(partida.code, callbacks);
            }
        }
    }
    activarPowerUp(jugadorId, power) {
        const partida = this.getPorJugador(jugadorId);
        if (!partida)
            return { ok: false, error: "No estás en una partida" };
        const ok = (0, gameEngine_1.activarPowerUp)(partida, jugadorId, power);
        if (!ok)
            return { ok: false, error: "No se puede usar ahora" };
        if (power === "fiftyFifty") {
            const pregunta = (0, gameEngine_1.preguntaActual)(partida);
            if (!pregunta)
                return { ok: false, error: "Sin pregunta activa" };
            return { ok: true, ocultar: (0, gameEngine_1.indicesParaFiftyFifty)(pregunta) };
        }
        return { ok: true };
    }
    terminar(code, callbacks) {
        const partida = this.partidas.get(code);
        if (!partida)
            return;
        this.cancelarTimer(code);
        partida.fase = "ended";
        callbacks.estado(partida);
        callbacks.fin((0, gameEngine_1.leaderboard)(partida, 30), this.resumenSesion(partida));
    }
    /** Limpia partidas acabadas hace > 1h. Llamado periódicamente. */
    limpiarAntiguas() {
        const ahora = Date.now();
        const UNA_HORA = 60 * 60 * 1000;
        for (const [code, partida] of this.partidas) {
            if (partida.fase === "ended" && ahora - partida.creadaEn > UNA_HORA) {
                this.partidas.delete(code);
                this.cancelarTimer(code);
            }
        }
    }
    // ============= internos =============
    programarCierre(code, ms, callbacks) {
        this.cancelarTimer(code);
        const t = setTimeout(() => this.cerrarPregunta(code, callbacks), ms);
        this.timers.set(code, t);
    }
    programarCierreFinal(code, ms, callbacks) {
        this.cancelarTimer(code);
        const t = setTimeout(() => this.cerrarRondaFinal(code, callbacks), ms);
        this.timers.set(code, t);
    }
    cancelarTimer(code) {
        const t = this.timers.get(code);
        if (t) {
            clearTimeout(t);
            this.timers.delete(code);
        }
    }
    cerrarPregunta(code, callbacks) {
        const partida = this.partidas.get(code);
        if (!partida || partida.fase !== "question")
            return;
        this.cancelarTimer(code);
        (0, gameEngine_1.aplicarTimeoutsPregunta)(partida);
        const pregunta = (0, gameEngine_1.preguntaActual)(partida);
        if (!pregunta)
            return;
        partida.fase = "reveal";
        callbacks.reveal({
            preguntaId: pregunta.id,
            correcta: pregunta.correcta,
            distribucion: (0, gameEngine_1.distribucionRespuestas)(partida),
            reflexion: partida.modoFormacion ? pregunta.reflexion : undefined
        });
        callbacks.estado(partida);
    }
    asignarPreguntasFinales(partida, callbacks) {
        const usadas = new Set(partida.preguntas.map(p => p.id));
        for (const [jugadorId, simbolo] of partida.libroFinalPorJugador) {
            const { libros } = (0, content_1.cargarContenido)();
            const libro = libros.find(l => l.simbolo === simbolo);
            if (!libro)
                continue;
            const pregunta = (0, content_1.preguntaParaLibro)(simbolo, libro.dificultad, usadas);
            if (pregunta) {
                usadas.add(pregunta.id);
                partida.preguntaFinalPorJugador.set(jugadorId, pregunta);
                callbacks.preguntaFinal(jugadorId, (0, gameEngine_1.preguntaPublica)(pregunta, Date.now(), partida.modoFormacion), simbolo);
            }
        }
    }
    cerrarRondaFinal(code, callbacks) {
        const partida = this.partidas.get(code);
        if (!partida || partida.fase !== "finalQuestion")
            return;
        this.cancelarTimer(code);
        partida.fase = "finalReveal";
        callbacks.estado(partida);
        callbacks.leaderboard((0, gameEngine_1.leaderboard)(partida, 30));
    }
    resumenSesion(partida) {
        return {
            code: partida.code,
            inicioMs: partida.creadaEn,
            finMs: Date.now(),
            modoFormacion: partida.modoFormacion,
            jugadores: [...partida.jugadores.values()]
                .sort((a, b) => b.puntos - a.puntos)
                .map(j => ({
                nombre: j.nombre,
                puntosFinal: j.puntos,
                mejorRacha: j.mejorRacha,
                aciertos: j.respuestas.filter(r => r.correcta).length,
                fallos: j.respuestas.filter(r => !r.correcta && r.elegida !== null).length,
                sinResponder: j.respuestas.filter(r => r.elegida === null).length,
                libroFinal: j.libroFinalSimbolo
            })),
            preguntas: partida.preguntas.map(p => ({ id: p.id, enunciado: p.enunciado, correcta: p.correcta }))
        };
    }
}
exports.GameManager = GameManager;
