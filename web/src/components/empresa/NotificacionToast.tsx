"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Bell, X, Info } from "lucide-react";
import { createPortal } from "react-dom";
import { useNotificaciones, Notif } from "@/hooks/useNotificaciones";

function eventoIcon(evento: string) {
  if (evento.includes("aprobado")) return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />;
  if (evento.includes("rechazado")) return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (evento.includes("solicitud")) return <Bell className="w-4 h-4 text-blue-500 shrink-0" />;
  if (evento.includes("comunicado")) return <Info className="w-4 h-4 text-purple-500 shrink-0" />;
  return <Bell className="w-4 h-4 text-gray-500 shrink-0" />;
}

function eventoColor(evento: string) {
  if (evento.includes("aprobado")) return "border-green-200 bg-green-50";
  if (evento.includes("rechazado")) return "border-red-200 bg-red-50";
  if (evento.includes("solicitud")) return "border-blue-200 bg-blue-50";
  if (evento.includes("comunicado")) return "border-purple-200 bg-purple-50";
  return "border-gray-200 bg-white";
}

function Toast({ notif, onDismiss }: { notif: Notif; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-300 max-w-xs w-full ${eventoColor(notif.evento)} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      {eventoIcon(notif.evento)}
      <div className="flex-1 min-w-0">
        {notif.titulo && <p className="text-xs font-bold text-gray-800 truncate">{notif.titulo}</p>}
        <p className="text-xs text-gray-700 leading-relaxed">{notif.mensaje}</p>
      </div>
      <button
        onClick={() => onDismiss(notif.id)}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/10 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function NotificacionToast({ eeId }: { eeId: number | null }) {
  const { notifs, dismiss } = useNotificaciones(eeId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted || notifs.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col-reverse gap-2 max-h-[50vh] overflow-hidden pointer-events-none">
      {notifs.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notif={n} onDismiss={dismiss} />
        </div>
      ))}
    </div>,
    document.body
  );
}
