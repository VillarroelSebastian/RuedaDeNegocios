"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, Clock, MapPin, Tag, AlertCircle, Bell, BellOff } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-BO", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function formatHora(hora: string | null | undefined) {
  if (!hora) return "";
  return hora.substring(0, 5);
}

function estadoColor(estado: string) {
  const map: Record<string, string> = {
    PROGRAMADO: "bg-blue-100 text-blue-700",
    EN_CURSO:   "bg-green-100 text-green-700",
    FINALIZADO: "bg-gray-100 text-gray-500",
    CANCELADO:  "bg-red-100 text-red-600",
  };
  return map[estado] ?? "bg-gray-100 text-gray-500";
}

export default function EmpresaEventosPage() {
  const [evento, setEvento] = useState<any>(null);
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eeId, setEeId] = useState<number | null>(null);
  const [savingSubscription, setSavingSubscription] = useState<number | null>(null);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  useEffect(() => {
    let usuarioId: number | null = null;
    try { usuarioId = JSON.parse(localStorage.getItem("empresaUser") || "null")?.id ?? null; } catch {}
    if (!usuarioId) { setError("No se pudo identificar tu empresa."); setLoading(false); return; }
    fetch(`${API}/empresa/mi-empresa?usuarioId=${usuarioId}`)
      .then((r) => r.json())
      .then((ctx) => {
        if (!ctx?.empresaeventoId) throw new Error("Empresa no encontrada");
        setEeId(ctx.empresaeventoId);
        return Promise.all([
          fetch(`${API}/empresa/evento`).then((r) => r.json()),
          fetch(`${API}/public/cronograma-vivo?eeId=${ctx.empresaeventoId}`).then((r) => r.json()),
        ]);
      })
      .then(([ev, acts]) => {
        setEvento(ev);
        setActividades(Array.isArray(acts?.actividades) ? acts.actividades : []);
      })
      .catch(() => setError("No se pudo cargar la información del evento."))
      .finally(() => setLoading(false));
  }, []);

  const toggleSuscripcion = async (act: any) => {
    if (!eeId || savingSubscription) return;
    setSavingSubscription(act.id);
    try {
      const res = await fetch(`${API}/empresa/cronograma-vivo/${act.id}/suscripcion`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, suscrito: !act.suscrito }),
      });
      if (!res.ok) throw new Error();
      setActividades((prev) => prev.map((a) => a.id === act.id ? { ...a, suscrito: !a.suscrito } : a));
      setSubscriptionMessage(act.suscrito
        ? `Cancelaste el aviso de “${act.nombreActividad}”.`
        : `Aviso activado. Te notificaremos cuando inicie “${act.nombreActividad}”.`);
      setTimeout(() => setSubscriptionMessage(null), 5000);
    } catch { setSubscriptionMessage("No se pudo actualizar la suscripción. Intenta nuevamente."); }
    finally { setSavingSubscription(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Evento</h1>
      {subscriptionMessage && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {subscriptionMessage}
        </div>
      )}

      {/* Evento info */}
      {evento && (
        <div className="bg-gradient-to-r from-[#449D3A] to-emerald-500 rounded-2xl p-6 text-white">
          <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1">
            Edición {evento.edicion ?? ""}
          </p>
          <h2 className="text-2xl font-extrabold mb-2">{evento.nombre}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-green-100">
            {(evento.ciudadEvento || evento.paisEvento) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(", ")}
              </span>
            )}
            {evento.fechaInicioEvento && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {formatFecha(evento.fechaInicioEvento)} — {formatFecha(evento.fechaFinEvento)}
              </span>
            )}
            {evento.duracionReunion && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Reuniones de {evento.duracionReunion} min
              </span>
            )}
          </div>
          {evento.descripcion && (
            <p className="mt-4 text-green-50 text-sm leading-relaxed">{evento.descripcion}</p>
          )}
        </div>
      )}

      {/* Programa de actividades */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#449D3A]" />
          <h2 className="font-bold text-gray-900">Programa de actividades</h2>
          <span className="ml-auto text-xs text-gray-400">{actividades.length} actividades</span>
        </div>

        {actividades.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No hay actividades registradas para este evento.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {actividades.map((act: any) => (
              <div key={act.id} className="px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors">
                <div className="shrink-0 text-center w-14">
                  <p className="text-xs text-gray-400 font-medium">{formatFecha(act.fechaActividad).split(",")[0]}</p>
                  <p className="text-lg font-extrabold text-[#449D3A]">
                    {new Date(act.fechaActividad).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 text-sm">{act.nombreActividad}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${estadoColor(act.estadoActividad)}`}>
                      {act.estadoActividad ?? ""}
                    </span>
                    {act.tipoActividad && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                        <Tag className="w-2.5 h-2.5" />
                        {act.tipoActividad}
                      </span>
                    )}
                  </div>
                  {act.descripcionActividad && (
                    <p className="text-xs text-gray-500 mb-2">{act.descripcionActividad}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {act.horaInicioActividad && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatHora(act.horaInicioActividad)}
                        {act.horaFinActividad ? ` — ${formatHora(act.horaFinActividad)}` : ""}
                      </span>
                    )}
                    {act.lugarActividad && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {act.lugarActividad}
                      </span>
                    )}
                    {act.nombreResponsableActividad && (
                      <span>{act.nombreResponsableActividad}</span>
                    )}
                  </div>
                  <button onClick={() => toggleSuscripcion(act)} disabled={!eeId || savingSubscription === act.id}
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${act.suscrito ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {act.suscrito ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    {act.suscrito ? "Cancelar suscripción" : "Avisarme cuando inicie"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
