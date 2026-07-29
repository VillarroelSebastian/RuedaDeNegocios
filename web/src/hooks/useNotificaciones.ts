"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

// Socket.IO se conecta al ORIGEN del backend (sin el prefijo /api que usa el
// proxy en producción): la ruta /socket.io/ la enruta Nginx directamente.
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334").replace(/\/api\/?$/, "");

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
      "solicitud:nueva", "solicitud:aceptada", "solicitud:rechazada", "solicitud:editada",
      "reunion:reprogramada", "reunion:recordatorio",
      "reunion:cambio-solicitado", "reunion:cambio-aceptado", "reunion:cambio-rechazado",
      "reunion:calificar", "mensaje:staff",
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
