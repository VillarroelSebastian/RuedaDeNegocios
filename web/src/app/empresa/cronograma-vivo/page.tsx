"use client";

import React, { useEffect, useState } from "react";
import { Radio, MapPin, CalendarDays, Clock } from "lucide-react";
import CronogramaVivo from "@/components/CronogramaVivo";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmpresaCronogramaVivoPage() {
  const [eeId, setEeId] = useState<number | null>(null);
  const [evento, setEvento] = useState<any>(null);

  useEffect(() => {
    let usuarioId: number | null = null;
    try { usuarioId = JSON.parse(localStorage.getItem('empresaUser') || 'null')?.id ?? null; } catch {}
    if (!usuarioId) return;
    fetch(`${API}/empresa/mi-empresa?usuarioId=${usuarioId}`)
      .then((r) => r.json()).then((ctx) => setEeId(ctx?.empresaeventoId ?? null)).catch(() => {});
    fetch(`${API}/empresa/evento`).then((r) => r.json()).then(setEvento).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {evento && (
        <div className="bg-gradient-to-r from-[#449D3A] to-emerald-500 rounded-2xl p-6 text-white">
          <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Cronograma en vivo · Edición {evento.edicion ?? ""}
          </p>
          <h1 className="text-2xl font-extrabold mb-2">{evento.nombre}</h1>
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
      <p className="text-sm text-gray-500">
        Sigue el programa del evento minuto a minuto. Se actualiza solo.
      </p>
      {/* Solo lectura: el staff es quien mueve los estados. */}
      <CronogramaVivo eeId={eeId} />
    </div>
  );
}
