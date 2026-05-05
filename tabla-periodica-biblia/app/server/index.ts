import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { GameManager, partidaPublica, type AvanzarCallbacks } from "./gameManager";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const manager = new GameManager();
  // Limpieza periódica de partidas viejas
  setInterval(() => manager.limpiarAntiguas(), 5 * 60 * 1000);

  io.on("connection", (socket) => {
    const callbacks: AvanzarCallbacks = {
      estado: (partida) => {
        io.to(partida.code).emit("partida:estado", partidaPublica(partida));
      },
      pregunta: (pregunta, indice, total) => {
        const partida = manager.getPorCode([...socket.rooms].find(r => r !== socket.id) ?? "");
        const code = partida?.code;
        if (code) io.to(code).emit("partida:pregunta", { pregunta, indice, total });
      },
      reveal: (data) => {
        // Lo emite el manager directamente al room — usamos un truco: reveal pasa el code en el closure.
        // Pero como aquí no tenemos el code, lo recuperamos por jugador o host. Sustituido por broadcastEnPartida.
      },
      leaderboard: () => undefined,
      resultadoIndividual: () => undefined,
      rondaFinalLobby: () => undefined,
      preguntaFinal: () => undefined,
      fin: () => undefined
    };
    // El callback simple anterior tenía bug: lo sobreescribimos con uno por-evento que conoce el code:
    const conCode = (code: string): AvanzarCallbacks => ({
      estado: (partida) => io.to(partida.code).emit("partida:estado", partidaPublica(partida)),
      pregunta: (pregunta, indice, total) => io.to(code).emit("partida:pregunta", { pregunta, indice, total }),
      reveal: (data) => io.to(code).emit("partida:reveal", data),
      leaderboard: (top) => io.to(code).emit("partida:leaderboard", { top }),
      resultadoIndividual: (jugadorId, r) => io.to(jugadorId).emit("jugador:resultado", r),
      rondaFinalLobby: (libros, elegidos) => io.to(code).emit("partida:rondaFinalLobby", { libros, elegidos }),
      preguntaFinal: (jugadorId, pregunta, libroSimbolo) => io.to(jugadorId).emit("jugador:preguntaFinal", { pregunta, libroSimbolo }),
      fin: (top, resumen) => io.to(code).emit("partida:fin", { top, resumen })
    });
    void callbacks; // (silencia el linter; se conserva por si se quiere logging genérico)

    // ------- Host -------
    socket.on("host:crear", (payload, cb) => {
      try {
        const partida = manager.crear(socket.id, payload || {});
        socket.join(partida.code);
        cb({ ok: true, code: partida.code });
        io.to(partida.code).emit("partida:estado", partidaPublica(partida));
      } catch (e) {
        cb({ ok: false, error: (e as Error).message });
      }
    });

    socket.on("host:reconectar", ({ code }, cb) => {
      const partida = manager.reasignarHost(socket.id, code);
      if (!partida) return cb({ ok: false, error: "Partida no encontrada" });
      socket.join(code);
      cb({ ok: true });
      io.to(code).emit("partida:estado", partidaPublica(partida));
    });

    socket.on("host:siguiente", ({ code }) => {
      const partida = manager.getPorCode(code);
      if (!partida || partida.hostId !== socket.id) return;
      manager.avanzar(code, conCode(code));
    });

    socket.on("host:rondaFinal", ({ code }) => {
      const partida = manager.getPorCode(code);
      if (!partida || partida.hostId !== socket.id) return;
      manager.iniciarRondaFinal(code, conCode(code));
    });

    socket.on("host:terminar", ({ code }) => {
      const partida = manager.getPorCode(code);
      if (!partida || partida.hostId !== socket.id) return;
      manager.terminar(code, conCode(code));
    });

    // ------- Jugador -------
    socket.on("jugador:unirse", ({ code, nombre }, cb) => {
      const res = manager.unirJugador(code, socket.id, nombre);
      if (!res.ok) return cb({ ok: false, error: res.error });
      socket.join(code);
      const j = res.partida.jugadores.get(socket.id)!;
      cb({ ok: true, jugador: { id: j.id, nombre: j.nombre, puntos: j.puntos, rachaActual: j.rachaActual, conectado: true } });
      io.to(code).emit("partida:estado", partidaPublica(res.partida));
    });

    socket.on("jugador:responder", ({ opcion }) => {
      manager.responder(socket.id, opcion, conCode(manager.getPorJugador(socket.id)?.code ?? ""));
    });

    socket.on("jugador:powerUp", ({ power }, cb) => {
      const res = manager.activarPowerUp(socket.id, power);
      cb(res);
    });

    socket.on("jugador:elegirLibro", ({ simbolo }, cb) => {
      const res = manager.elegirLibroFinal(socket.id, simbolo);
      cb(res);
      if (res.ok) {
        const partida = manager.getPorJugador(socket.id);
        if (partida) {
          io.to(partida.code).emit("partida:rondaFinalLobby", {
            libros: [], // el cliente ya tiene la lista
            elegidos: Object.fromEntries(partida.libroFinalPorJugador)
          });
        }
      }
    });

    socket.on("disconnect", () => {
      const partida = manager.salirJugador(socket.id);
      if (partida) {
        io.to(partida.code).emit("partida:estado", partidaPublica(partida));
      }
    });
  });

  httpServer.once("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("HTTP server error:", err);
    process.exit(1);
  });

  httpServer.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`▶ Tabla Periódica de la Biblia listo en http://${hostname}:${port}`);
  });
});
