import { describe, it, expect, beforeEach } from "vitest";
import {
  crearPartida,
  nuevoJugador,
  nuevaRonda,
  elegirLibroEnRonda,
  aplicarRespuestaRonda,
  aplicarTimeoutsRonda,
  actualizarHistorialesPostRonda,
  activarPowerUp,
  leaderboard,
  librosDisponiblesParaJugador,
  type PartidaInterna
} from "./gameEngine";
import type { Libro, Pregunta } from "@/types/game";

function preg(id: string, correcta: 0 | 1 | 2 | 3 = 0, dificultad: 1 | 2 | 3 = 1): Pregunta {
  return {
    id,
    tipo: "identificacion",
    dificultad,
    tiempoSegundos: 20,
    enunciado: `Pregunta ${id}`,
    opciones: ["A", "B", "C", "D"],
    correcta
  };
}

function libro(simbolo: string, dificultad: 1 | 2 | 3 = 1, numero = 1): Libro {
  return {
    numero,
    simbolo,
    nombre: `Libro ${simbolo}`,
    categoria: "pentateuco",
    testamento: "AT",
    dificultad
  };
}

const LIBROS = [
  libro("Gn", 1, 1),
  libro("Ex", 2, 2),
  libro("Lv", 3, 3),
  libro("Nm", 1, 4)
];

describe("gameEngine — flujo de tabla periódica", () => {
  let partida: PartidaInterna;
  beforeEach(() => {
    partida = crearPartida("ABC123", "host-1", 3);
    partida.jugadores.set("p1", nuevoJugador("p1", "Ana"));
    partida.jugadores.set("p2", nuevoJugador("p2", "Beto"));
  });

  describe("nuevaRonda", () => {
    it("incrementa el índice y limpia estado transitorio", () => {
      partida.librosElegidosRonda.set("p1", "Gn");
      partida.respuestasRonda.set("p1", { elegida: 0, ms: 100 });
      nuevaRonda(partida);
      expect(partida.rondaIndice).toBe(0);
      expect(partida.fase).toBe("roundSelection");
      expect(partida.librosElegidosRonda.size).toBe(0);
      expect(partida.respuestasRonda.size).toBe(0);
    });
  });

  describe("librosDisponiblesParaJugador", () => {
    it("excluye los libros del historial del jugador", () => {
      const jugador = partida.jugadores.get("p1")!;
      jugador.historial = { Gn: "correcto", Ex: "incorrecto" };
      const disponibles = librosDisponiblesParaJugador(jugador, LIBROS);
      expect(disponibles.map(l => l.simbolo)).toEqual(["Lv", "Nm"]);
    });
  });

  describe("elegirLibroEnRonda", () => {
    beforeEach(() => nuevaRonda(partida));

    it("solo permite elegir en fase roundSelection", () => {
      partida.fase = "lobby";
      const r = elegirLibroEnRonda(partida, "p1", "Gn", LIBROS);
      expect(r.ok).toBe(false);
    });

    it("rechaza un libro que el jugador ya tiene en su historial", () => {
      partida.jugadores.get("p1")!.historial = { Gn: "correcto" };
      const r = elegirLibroEnRonda(partida, "p1", "Gn", LIBROS);
      expect(r.ok).toBe(false);
    });

    it("permite que dos jugadores elijan el mismo libro en la misma ronda", () => {
      expect(elegirLibroEnRonda(partida, "p1", "Gn", LIBROS).ok).toBe(true);
      expect(elegirLibroEnRonda(partida, "p2", "Gn", LIBROS).ok).toBe(true);
    });
  });

  describe("aplicarRespuestaRonda", () => {
    beforeEach(() => {
      nuevaRonda(partida);
      elegirLibroEnRonda(partida, "p1", "Ex", LIBROS); // dificultad 2
      partida.preguntasAsignadasRonda.set("p1", preg("q-ex", 1, 2));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
    });

    it("respuesta correcta da puntos × dificultad del libro elegido", () => {
      const r = aplicarRespuestaRonda(partida, "p1", 1, 1000, LIBROS); // 0 ms
      expect(r).not.toBeNull();
      expect(r!.correcta).toBe(true);
      expect(r!.puntosObtenidos).toBe(2000); // 1000 × dificultad 2
      expect(r!.libroSimbolo).toBe("Ex");
      expect(r!.multiplicadorDificultad).toBe(2);
    });

    it("respuesta incorrecta resetea racha", () => {
      partida.jugadores.get("p1")!.rachaActual = 3;
      const r = aplicarRespuestaRonda(partida, "p1", 0, 1100, LIBROS);
      expect(r!.correcta).toBe(false);
      expect(r!.puntosObtenidos).toBe(0);
      expect(partida.jugadores.get("p1")!.rachaActual).toBe(0);
    });

    it("no permite responder dos veces", () => {
      aplicarRespuestaRonda(partida, "p1", 1, 1000, LIBROS);
      expect(aplicarRespuestaRonda(partida, "p1", 0, 1100, LIBROS)).toBeNull();
    });
  });

  describe("aplicarTimeoutsRonda + actualizarHistorialesPostRonda", () => {
    it("marca el libro como incorrecto en el historial si el jugador no respondió", () => {
      nuevaRonda(partida);
      elegirLibroEnRonda(partida, "p1", "Gn", LIBROS);
      partida.preguntasAsignadasRonda.set("p1", preg("q-gn", 0, 1));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
      const afectados = aplicarTimeoutsRonda(partida);
      actualizarHistorialesPostRonda(partida);
      expect(afectados).toContain("p1");
      expect(partida.jugadores.get("p1")!.historial.Gn).toBe("incorrecto");
    });

    it("acertar marca el libro como correcto en el historial", () => {
      nuevaRonda(partida);
      elegirLibroEnRonda(partida, "p1", "Lv", LIBROS); // dificultad 3
      partida.preguntasAsignadasRonda.set("p1", preg("q-lv", 2, 3));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
      aplicarRespuestaRonda(partida, "p1", 2, 1500, LIBROS);
      actualizarHistorialesPostRonda(partida);
      expect(partida.jugadores.get("p1")!.historial.Lv).toBe("correcto");
    });

    it("ignora a jugadores que no eligieron libro", () => {
      nuevaRonda(partida);
      // p1 eligió, p2 no
      elegirLibroEnRonda(partida, "p1", "Gn", LIBROS);
      partida.preguntasAsignadasRonda.set("p1", preg("q-gn", 0, 1));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
      aplicarRespuestaRonda(partida, "p1", 0, 1100, LIBROS);
      actualizarHistorialesPostRonda(partida);
      expect(Object.keys(partida.jugadores.get("p2")!.historial)).toHaveLength(0);
    });
  });

  describe("power-ups", () => {
    it("double duplica puntos en la siguiente respuesta", () => {
      partida.fase = "lobby";
      activarPowerUp(partida, "p1", "double");
      nuevaRonda(partida);
      elegirLibroEnRonda(partida, "p1", "Gn", LIBROS); // dificultad 1
      partida.preguntasAsignadasRonda.set("p1", preg("q-gn", 0, 1));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
      const r = aplicarRespuestaRonda(partida, "p1", 0, 1000, LIBROS);
      // base 1000 × dificultad 1 × double 2 = 2000
      expect(r!.puntosObtenidos).toBe(2000);
      expect(r!.doubleAplicado).toBe(true);
    });

    it("fiftyFifty solo se puede usar antes de responder en roundQuestion", () => {
      partida.fase = "lobby";
      expect(activarPowerUp(partida, "p1", "fiftyFifty")).toBe(false);
      nuevaRonda(partida);
      elegirLibroEnRonda(partida, "p1", "Gn", LIBROS);
      partida.preguntasAsignadasRonda.set("p1", preg("q-gn", 0, 1));
      partida.fase = "roundQuestion";
      partida.rondaInicioMs = 1000;
      expect(activarPowerUp(partida, "p1", "fiftyFifty")).toBe(true);
      aplicarRespuestaRonda(partida, "p1", 0, 1000, LIBROS);
      expect(activarPowerUp(partida, "p1", "fiftyFifty")).toBe(false); // ya consumido
    });
  });

  it("leaderboard ordena por puntos descendente", () => {
    partida.jugadores.get("p1")!.puntos = 100;
    partida.jugadores.get("p2")!.puntos = 500;
    const top = leaderboard(partida);
    expect(top.map(j => j.id)).toEqual(["p2", "p1"]);
  });
});
