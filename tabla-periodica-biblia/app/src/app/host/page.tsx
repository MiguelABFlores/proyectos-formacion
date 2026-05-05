"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

export default function HostCrear() {
  const socket = useSocket();
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modoFormacion, setModoFormacion] = useState(true);
  const [numPreguntas, setNumPreguntas] = useState(8);

  // Auto-conexión: si ya teníamos un code en sessionStorage, redirigir.
  useEffect(() => {
    const guardado = typeof window !== "undefined" ? sessionStorage.getItem("hostCode") : null;
    if (guardado && socket) {
      socket.emit("host:reconectar", { code: guardado }, (res: { ok: boolean }) => {
        if (res.ok) router.replace(`/host/${guardado}`);
      });
    }
  }, [socket, router]);

  function crear() {
    if (!socket) return;
    setCreando(true);
    setError(null);
    socket.emit("host:crear", { modoFormacion, numPreguntas }, (res) => {
      setCreando(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      sessionStorage.setItem("hostCode", res.code);
      router.push(`/host/${res.code}`);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-proyector-fondo">
      <div className="max-w-lg w-full bg-proyector-panel rounded-2xl shadow-lg p-8 border border-proyector-borde space-y-6">
        <header>
          <h1 className="text-3xl font-extrabold text-proyector-texto">Crear partida</h1>
          <p className="text-proyector-textoSuave">Configura la sesión antes de empezar.</p>
        </header>

        <label className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-proyector-borde cursor-pointer hover:bg-proyector-fondo">
          <div>
            <div className="font-bold">Modo formación</div>
            <div className="text-sm text-proyector-textoSuave">Muestra una breve reflexión tras cada pregunta.</div>
          </div>
          <input
            type="checkbox"
            checked={modoFormacion}
            onChange={(e) => setModoFormacion(e.target.checked)}
            className="w-6 h-6 accent-proyector-acento"
          />
        </label>

        <div className="p-4 rounded-xl border-2 border-proyector-borde">
          <label className="block font-bold mb-2">Número de preguntas: <span className="text-proyector-acento">{numPreguntas}</span></label>
          <input
            type="range"
            min={4}
            max={15}
            value={numPreguntas}
            onChange={(e) => setNumPreguntas(parseInt(e.target.value, 10))}
            className="w-full accent-proyector-acento"
          />
          <p className="text-xs text-proyector-textoSuave mt-1">Sin contar la ronda final.</p>
        </div>

        {error && <p className="text-red-700 text-sm font-semibold">{error}</p>}

        <button
          type="button"
          onClick={crear}
          disabled={creando || !socket}
          className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold disabled:opacity-50 hover:brightness-110"
        >
          {creando ? "Creando…" : "Crear partida"}
        </button>
      </div>
    </main>
  );
}
