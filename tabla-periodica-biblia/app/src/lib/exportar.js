"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descargarResumen = descargarResumen;
function descargarResumen(resumen) {
    if (typeof window === "undefined")
        return;
    const blob = new Blob([JSON.stringify(resumen, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fecha = new Date(resumen.inicioMs).toISOString().slice(0, 16).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `partida-${resumen.code}-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
