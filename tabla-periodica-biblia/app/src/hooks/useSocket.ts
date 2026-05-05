"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() solo debe llamarse en el cliente");
  }
  if (!_socket) {
    _socket = io({
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500
    });
  }
  return _socket;
}

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    setSocket(getSocket());
  }, []);
  return socket;
}
