import Link from "next/link";

export default function Landing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-proyector-fondo">
      <div className="max-w-2xl w-full text-center space-y-10">
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-proyector-textoSuave">
            Formación católica juvenil
          </p>
          <h1 className="text-proyector-titulo text-proyector-texto">
            Tabla Periódica<br />
            <span className="text-proyector-acento">de la Biblia</span>
          </h1>
          <p className="text-lg md:text-xl text-proyector-textoSuave">
            Un juego para descubrir los libros de la Sagrada Escritura mientras juegas con tu grupo.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/host"
            className="block rounded-2xl bg-proyector-acento text-white px-8 py-6 text-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
          >
            Crear partida
            <span className="block text-sm font-normal opacity-90 mt-1">Para el formador / host</span>
          </Link>
          <Link
            href="/play"
            className="block rounded-2xl border-4 border-proyector-acento text-proyector-acento px-8 py-6 text-2xl font-bold hover:bg-proyector-acento/5 active:scale-95 transition-transform"
          >
            Unirme
            <span className="block text-sm font-normal opacity-90 mt-1">Como jugador, con código</span>
          </Link>
        </div>

        <footer className="text-xs text-proyector-textoSuave pt-8">
          Hecho con ❤️ para la formación juvenil. Código abierto.
        </footer>
      </div>
    </main>
  );
}
