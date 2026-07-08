"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3334";

export interface Notif {
  id: string;
  evento: string;
  mensaje: string;
  titulo?: string;
  timestamp: number;
}

export function useNotificaciones(eeId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const addNotif = useCallback((evento: string, payload: any) => {
    const notif: Notif = {
      id: `${Date.now()}-${Math.random()}`,
      evento,
      mensaje: payload.mensaje ?? evento,
      titulo: payload.titulo,
      timestamp: Date.now(),
    };
    setNotifs((prev) => [notif, ...prev].slice(0, 20));
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    }, 6000);
  }, []);

  useEffect(() => {
    if (!eeId) return;

    const socket = io(`${SOCKET_URL}/notificaciones`, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("unirse", { eeId });
    });

    const EVENTOS = [
      "pago:aprobado", "pago:rechazado",
      "pago-adicional:aprobado", "pago-adicional:rechazado",
      "solicitud:aceptada", "solicitud:rechazada",
      "comunicado:nuevo",
    ];

    EVENTOS.forEach((ev) => {
      socket.on(ev, (payload: any) => addNotif(ev, payload));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eeId, addNotif]);

  const dismiss = useCallback((id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifs, dismiss };
}
