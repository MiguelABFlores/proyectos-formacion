import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { GameManager, partidaPublica, type ServerCallbacks } from "./gameManager";

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
  setInterval(() => manager.limpiarAntiguas(), 5 * 60 * 1000);

  io.on("connection", (socket) => {
    /**
     * Construye los callbacks que el manager invoca cuando ocurren eventos
     * de juego — cada uno emite por sockets al room correspondiente.
     */
    const callbacksFor = (code: string): ServerCallbacks => ({
      estado: (partida) => io.to(partida.code).emit("partida:estado", partidaPublica(partida)),
      rondaSeleccion: (rondaIndice, totalRondas) =>
        io.to(code).emit("partida:rondaSeleccion", { rondaIndice, totalRondas }),
      preguntaPersonal: (jugadorId, pregunta, libroSimbolo) =>
        io.to(jugadorId).emit("jugador:preguntaPersonal", { pregunta, libroSimbolo }),
      resultadoRondaIndividual: (jugadorId, respuesta, historial) => {
        io.to(jugadorId).emit("jugador:resultadoRonda", { respuesta, historial });
        // También emitimos el resultado simple por compat con el reveal del jugador
        io.to(jugadorId).emit("jugador:resultado", respuesta);
      },
      resumenRonda: (rondaIndice, resumenes) =>
        io.to(code).emit("partida:resumenRonda", { rondaIndice, resumenes }),
      leaderboard: (top) => io.to(code).emit("partida:leaderboard", { top }),
      fin: (top, resumen, historiales) =>
        io.to(code).emit("partida:fin", { top, resumen, historiales })
    });

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
      manager.avanzar(code, callbacksFor(code));
    });

    socket.on("host:terminar", ({ code }) => {
      const partida = manager.getPorCode(code);
      if (!partida || partida.hostId !== socket.id) return;
      manager.terminar(code, callbacksFor(code));
    });

    // ------- Jugador -------
    socket.on("jugador:unirse", ({ code, nombre }, cb) => {
      const res = manager.unirJugador(code, socket.id, nombre);
      if (!res.ok) return cb({ ok: false, error: res.error });
      socket.join(code);
      const j = res.partida.jugadores.get(socket.id)!;
      cb({
        ok: true,
        jugador: {
          id: j.id,
          nombre: j.nombre,
          puntos: j.puntos,
          rachaActual: j.rachaActual,
          conectado: true,
          librosJugados: 0
        }
      });
      io.to(code).emit("partida:estado", partidaPublica(res.partida));
    });

    socket.on("jugador:elegirLibro", ({ simbolo }, cb) => {
      const res = manager.elegirLibro(socket.id, simbolo);
      cb(res);
      if (res.ok) {
        const partida = manager.getPorJugador(socket.id);
        if (partida) {
          // Refresca el estado para que el host vea progreso de elecciones
          io.to(partida.code).emit("partida:estado", partidaPublica(partida));
        }
      }
    });

    socket.on("jugador:responder", ({ opcion }) => {
      const partida = manager.getPorJugador(socket.id);
      if (!partida) return;
      manager.responder(socket.id, opcion, callbacksFor(partida.code));
    });

    socket.on("jugador:powerUp", ({ power }, cb) => {
      const res = manager.activarPowerUp(socket.id, power);
      cb(res);
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
