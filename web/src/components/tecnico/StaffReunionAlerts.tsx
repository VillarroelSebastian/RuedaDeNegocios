"use client";

import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const SOCKET_URL = API.replace(/\/api\/?$/, "");

type StaffAlert = {
  id: string;
  titulo: string;
  mensaje: string;
  referenciaId: number;
  urgente: boolean;
};

export default function StaffReunionAlerts() {
  const [alerta, setAlerta] = useState<StaffAlert | null>(null);

  useEffect(() => {
    let token = "";
    try { token = JSON.parse(localStorage.getItem("tecnicoUser") || "null")?.token || ""; } catch {}
    if (!token) return;
    const socket = io(`${SOCKET_URL}/notificaciones`, { transports: ["websocket"], auth: { token } });
    const recibir = (payload: any) => {
      setAlerta({
        id: `${Date.now()}-${Math.random()}`,
        titulo: payload?.titulo ?? "Reunión virtual sin enlace",
        mensaje: payload?.mensaje ?? "Debes agregar el enlace antes de que comience la reunión.",
        referenciaId: Number(payload?.referenciaId),
        urgente: !!payload?.urgente,
      });
    };
    socket.on("staff:reunion-sin-enlace", recibir);
    socket.on("staff:reunion-sin-enlace-urgente", recibir);
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!alerta) return;
    const timer = window.setTimeout(() => setAlerta(null), alerta.urgente ? 15_000 : 10_000);
    return () => window.clearTimeout(timer);
  }, [alerta]);

  if (!alerta) return null;
  return (
    <div className={`fixed right-4 top-20 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-2xl border p-4 shadow-2xl ${alerta.urgente ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${alerta.urgente ? "text-red-600" : "text-amber-600"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-gray-900">{alerta.titulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-700">{alerta.mensaje}</p>
          {alerta.referenciaId > 0 && (
            <Link href={`/tecnico/virtuales/${alerta.referenciaId}`} onClick={() => setAlerta(null)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#449D3A]">
              Completar enlace <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <button onClick={() => setAlerta(null)} aria-label="Cerrar"><X className="h-4 w-4 text-gray-500" /></button>
      </div>
    </div>
  );
}
