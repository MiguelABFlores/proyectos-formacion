import { describe, it, expect, beforeEach } from "vitest";
import {
  crearPartida,
  nuevoJugador,
  aplicarRespuesta,
  aplicarTimeoutsPregunta,
  activarPowerUp,
  leaderboard,
  type PartidaInterna
} from "./gameEngine";
import type { Pregunta } from "@/types/game";

function preg(id: string, correcta: 0 | 1 | 2 | 3 = 0, tiempoSegundos = 20): Pregunta {
  return {
    id,
    tipo: "identificacion",
    dificultad: 1,
    tiempoSegundos,
    enunciado: `Pregunta ${id}`,
    opciones: ["A", "B", "C", "D"],
    correcta
  };
}

describe("gameEngine", () => {
  let partida: PartidaInterna;
  beforeEach(() => {
    partida = crearPartida("ABC123", "host-1", [preg("q1", 0), preg("q2", 1), preg("q3", 2)]);
    partida.jugadores.set("p1", nuevoJugador("p1", "Ana"));
    partida.jugadores.set("p2", nuevoJugador("p2", "Beto"));
  });

  it("aplicarRespuesta solo cuenta en fase question", () => {
    expect(aplicarRespuesta(partida, "p1", 0, 1000)).toBeNull();
  });

  it("respuesta correcta otorga puntos y avanza la racha", () => {
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    const r = aplicarRespuesta(partida, "p1", 0, 1100); // 100ms tomados
    expect(r).not.toBeNull();
    expect(r!.correcta).toBe(true);
    expect(r!.puntosObtenidos).toBeGreaterThan(0);
    expect(partida.jugadores.get("p1")!.rachaActual).toBe(1);
  });

  it("respuesta incorrecta resetea racha y otorga 0 puntos", () => {
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    partida.jugadores.get("p1")!.rachaActual = 3;
    const r = aplicarRespuesta(partida, "p1", 1, 1100);
    expect(r!.correcta).toBe(false);
    expect(r!.puntosObtenidos).toBe(0);
    expect(partida.jugadores.get("p1")!.rachaActual).toBe(0);
  });

  it("no permite responder dos veces la misma pregunta", () => {
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    aplicarRespuesta(partida, "p1", 0, 1100);
    expect(aplicarRespuesta(partida, "p1", 1, 1200)).toBeNull();
  });

  it("aplicarTimeoutsPregunta marca a los que no respondieron", () => {
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    partida.jugadores.get("p1")!.rachaActual = 5;
    aplicarRespuesta(partida, "p2", 0, 1100);
    const afectados = aplicarTimeoutsPregunta(partida);
    expect(afectados).toEqual(["p1"]);
    expect(partida.jugadores.get("p1")!.rachaActual).toBe(0);
    expect(partida.jugadores.get("p1")!.respuestas).toHaveLength(1);
    expect(partida.jugadores.get("p1")!.respuestas[0].elegida).toBeNull();
  });

  it("power-up double duplica los puntos de la siguiente respuesta correcta", () => {
    partida.fase = "lobby";
    expect(activarPowerUp(partida, "p1", "double")).toBe(true);
    expect(partida.jugadores.get("p1")!.powerUpsDisponibles.double).toBe(false);
    expect(partida.jugadores.get("p1")!.doubleArmadoParaSiguiente).toBe(true);

    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    const r = aplicarRespuesta(partida, "p1", 0, 1000); // 0 ms → 1000 base
    expect(r!.puntosObtenidos).toBe(2000);
    expect(r!.doubleAplicado).toBe(true);
  });

  it("double se consume incluso si la respuesta es incorrecta", () => {
    partida.fase = "lobby";
    activarPowerUp(partida, "p1", "double");
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    aplicarRespuesta(partida, "p1", 1, 1000); // incorrecta
    expect(partida.jugadores.get("p1")!.doubleArmadoParaSiguiente).toBe(false);
    expect(partida.jugadores.get("p1")!.powerUpsDisponibles.double).toBe(false);
  });

  it("fiftyFifty solo se puede usar antes de responder", () => {
    partida.fase = "question";
    partida.preguntaIndice = 0;
    partida.preguntaInicioMs = 1000;
    expect(activarPowerUp(partida, "p1", "fiftyFifty")).toBe(true);
    expect(partida.jugadores.get("p1")!.powerUpsDisponibles.fiftyFifty).toBe(false);
    aplicarRespuesta(partida, "p1", 0, 1100);
    // No queda otro 50/50 disponible
    expect(activarPowerUp(partida, "p1", "fiftyFifty")).toBe(false);
  });

  it("leaderboard ordena por puntos descendente", () => {
    partida.jugadores.get("p1")!.puntos = 100;
    partida.jugadores.get("p2")!.puntos = 500;
    const top = leaderboard(partida);
    expect(top.map(j => j.id)).toEqual(["p2", "p1"]);
  });
});
