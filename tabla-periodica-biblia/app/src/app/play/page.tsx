"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { esRoomCodeValido } from "@/lib/roomCode";

function PlayJoinInner() {
  const socket = useSocket();
  const router = useRouter();
  const search = useSearchParams();
  const codeInicial = (search.get("code") ?? "").toUpperCase();

  const [code, setCode] = useState(codeInicial);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const guardado = sessionStorage.getItem("playNombre");
    if (guardado) setNombre(guardado);
  }, []);

  function unirme(e: React.FormEvent) {
    e.preventDefault();
    if (!socket) return;
    setError(null);
    if (!esRoomCodeValido(code)) {
      setError("Código inválido (6 caracteres)");
      return;
    }
    if (!nombre.trim()) {
      setError("Pon tu nombre");
      return;
    }
    setEnviando(true);
    socket.emit("jugador:unirse", { code, nombre }, (res) => {
      setEnviando(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      sessionStorage.setItem("playNombre", nombre);
      sessionStorage.setItem("playCode", code);
      router.push(`/play/${code}`);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-proyector-fondo">
      <form onSubmit={unirme} className="max-w-md w-full bg-proyector-panel rounded-2xl shadow-lg p-8 border border-proyector-borde space-y-5">
        <header>
          <h1 className="text-3xl font-extrabold">Unirme a la partida</h1>
          <p className="text-proyector-textoSuave">Pide a tu formador el código de la sala.</p>
        </header>
        <div>
          <label className="block text-sm font-bold mb-1">Código de sala</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            inputMode="text"
            autoComplete="off"
            className="w-full rounded-lg border-2 border-proyector-borde bg-white px-4 py-3 text-2xl font-mono tracking-widest text-center uppercase focus:border-proyector-acento focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Tu nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 24))}
            placeholder="Cómo te llamamos"
            className="w-full rounded-lg border-2 border-proyector-borde bg-white px-4 py-3 text-lg focus:border-proyector-acento focus:outline-none"
          />
        </div>
        {error && <p className="text-red-700 text-sm font-semibold">{error}</p>}
        <button
          type="submit"
          disabled={enviando || !socket}
          className="w-full rounded-xl bg-proyector-acento text-white py-4 text-lg font-bold disabled:opacity-50 hover:brightness-110"
        >
          {enviando ? "Conectando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function PlayJoin() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-proyector-fondo"><p>Cargando…</p></main>}>
      <PlayJoinInner />
    </Suspense>
  );
}
