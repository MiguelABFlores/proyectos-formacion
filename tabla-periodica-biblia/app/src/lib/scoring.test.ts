import { describe, it, expect } from "vitest";
import { calcularPuntos, multiplicadorRacha, puntosBaseDeRapidez, PUNTOS_BASE_MAX, PUNTOS_BASE_MIN } from "./scoring";

describe("multiplicadorRacha", () => {
  it("aplica x1 sin racha previa", () => {
    expect(multiplicadorRacha(0)).toBe(1.0);
  });
  it("escala por tramos", () => {
    expect(multiplicadorRacha(1)).toBe(1.2);
    expect(multiplicadorRacha(2)).toBe(1.5);
    expect(multiplicadorRacha(3)).toBe(2.0);
    expect(multiplicadorRacha(10)).toBe(2.0);
  });
});

describe("puntosBaseDeRapidez", () => {
  it("respuesta instantánea da el máximo", () => {
    expect(puntosBaseDeRapidez(0, 20000)).toBe(PUNTOS_BASE_MAX);
  });
  it("nunca baja del piso mientras quede tiempo", () => {
    expect(puntosBaseDeRapidez(19999, 20000)).toBe(PUNTOS_BASE_MIN);
  });
  it("excedido el tiempo, 0 puntos", () => {
    expect(puntosBaseDeRapidez(20000, 20000)).toBe(0);
    expect(puntosBaseDeRapidez(25000, 20000)).toBe(0);
  });
});

describe("calcularPuntos", () => {
  const limite = 20000;

  it("incorrecta da 0 puntos", () => {
    const r = calcularPuntos({ correcta: false, msTomados: 1000, tiempoLimiteMs: limite, rachaPrevia: 5, doubleActivo: true });
    expect(r.puntos).toBe(0);
  });

  it("correcta sin racha ni double da el base", () => {
    const r = calcularPuntos({ correcta: true, msTomados: 0, tiempoLimiteMs: limite, rachaPrevia: 0, doubleActivo: false });
    expect(r.puntos).toBe(PUNTOS_BASE_MAX);
    expect(r.multiplicadorRacha).toBe(1);
    expect(r.multiplicadorDouble).toBe(1);
  });

  it("racha de 3 aplica x2", () => {
    const r = calcularPuntos({ correcta: true, msTomados: 0, tiempoLimiteMs: limite, rachaPrevia: 3, doubleActivo: false });
    expect(r.puntos).toBe(2000);
  });

  it("double duplica el resultado final", () => {
    const r = calcularPuntos({ correcta: true, msTomados: 0, tiempoLimiteMs: limite, rachaPrevia: 0, doubleActivo: true });
    expect(r.puntos).toBe(2000);
  });

  it("racha + double se combinan", () => {
    const r = calcularPuntos({ correcta: true, msTomados: 0, tiempoLimiteMs: limite, rachaPrevia: 3, doubleActivo: true });
    // base 1000 * x2 racha * x2 double = 4000
    expect(r.puntos).toBe(4000);
  });

  it("respuesta tardía aún recibe el piso", () => {
    const r = calcularPuntos({ correcta: true, msTomados: limite - 1, tiempoLimiteMs: limite, rachaPrevia: 0, doubleActivo: false });
    expect(r.puntos).toBe(PUNTOS_BASE_MIN);
  });

  it("tiempo excedido = 0 aunque sea correcta", () => {
    const r = calcularPuntos({ correcta: true, msTomados: limite + 100, tiempoLimiteMs: limite, rachaPrevia: 5, doubleActivo: true });
    expect(r.puntos).toBe(0);
  });
});
