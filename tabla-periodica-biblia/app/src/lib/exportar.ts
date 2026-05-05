import type { ResumenSesion } from "./socketEvents";

export function descargarResumen(resumen: ResumenSesion): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(resumen, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fecha = new Date(resumen.inicioMs).toISOString().slice(0, 16).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `partida-${resumen.code}-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
