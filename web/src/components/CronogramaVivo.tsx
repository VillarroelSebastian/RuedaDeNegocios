"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Radio, Clock, MapPin, User, CheckCircle2, Circle, Play, Square } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// Cada cuánto se vuelve a pedir el cronograma. El evento dura dos días y el
// staff cambia el estado a mano, así que 15 s da sensación de tiempo real sin
// castigar al servidor.
const REFRESCO_MS = 15000;

export type ActividadVivo = {
  id: number;
  nombreActividad: string;
  descripcionActividad: string;
  tipoActividad: string;
  nombreSalaEspacio: string;
  fechaActividad: string;
  horaInicioActividad: string;
  horaFinActividad: string;
  nombreCompletoPilaExpositor: string | null;
  organizacionDelExpositor: string | null;
  estadoEnVivo: "PENDIENTE" | "EN_VIVO" | "FINALIZADA";
  notaEnVivo: string | null;
};

export function hora(iso: string) {
  if (!iso) return "";
  // Las horas vienen como Time de Postgres; se muestra tal cual sin desfase local.
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fechaLarga(iso: string) {
  if (!iso) return "";
  const [y, mo, d] = iso.substring(0, 10).split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
}

/** Carga el cronograma y lo mantiene fresco por sondeo. */
export function useCronogramaVivo() {
  const [actividades, setActividades] = useState<ActividadVivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/public/cronograma-vivo`);
      if (!res.ok) return;
      const data = await res.json();
      if (!vivo.current) return;
      setActividades(Array.isArray(data.actividades) ? data.actividades : []);
      setActualizado(new Date());
    } catch {
      // Sin conexión: se conserva lo último que se mostró.
    } finally {
      if (vivo.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => { vivo.current = false; clearInterval(id); };
  }, [cargar]);

  return { actividades, cargando, actualizado, recargar: cargar, setActividades };
}

/** Punto rojo pulsante que marca que algo está ocurriendo ahora. */
export function PuntoEnVivo({ texto = "EN VIVO" }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      {texto}
    </span>
  );
}

const ESTILO_ESTADO: Record<string, string> = {
  EN_VIVO:    "border-red-300 bg-red-50",
  FINALIZADA: "border-gray-200 bg-gray-50 opacity-70",
  PENDIENTE:  "border-gray-200 bg-white",
};

/**
 * Cronograma en vivo. Si `staff` es true muestra los botones para cambiar el
 * estado (admin y técnicos); si no, es solo lectura para participantes.
 */
export default function CronogramaVivo({
  staff = false,
  onError,
}: {
  staff?: boolean;
  onError?: (mensaje: string) => void;
}) {
  const { actividades, cargando, actualizado, setActividades } = useCronogramaVivo();
  const [cambiando, setCambiando] = useState<number | null>(null);

  const cambiarEstado = async (id: number, estadoEnVivo: string) => {
    setCambiando(id);
    try {
      const res = await fetch(`${API}/staff/cronograma-vivo/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoEnVivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar.");
      setActividades(data.actividades ?? []);
    } catch (e: any) {
      onError?.(e.message);
    } finally {
      setCambiando(null);
    }
  };

  if (cargando) return <p className="text-center text-gray-400 py-10">Cargando cronograma…</p>;

  if (actividades.length === 0) {
    return (
      <div className="text-center py-14 bg-white border border-dashed border-gray-300 rounded-2xl">
        <Radio className="w-11 h-11 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Todavía no hay actividades programadas</p>
        <p className="text-sm text-gray-400 mt-1">Aparecerán aquí en cuanto se carguen.</p>
      </div>
    );
  }

  const enVivo = actividades.filter((a) => a.estadoEnVivo === "EN_VIVO");
  // Se agrupa por día para que la agenda se lea como un programa.
  const porDia = actividades.reduce<Record<string, ActividadVivo[]>>((acc, a) => {
    const dia = a.fechaActividad.substring(0, 10);
    (acc[dia] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div>
      {/* Lo que está pasando ahora */}
      <div className={`rounded-2xl border-2 p-5 mb-6 ${enVivo.length ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
        <div className="flex items-center gap-2 mb-3">
          {enVivo.length > 0 ? <PuntoEnVivo texto="AHORA" /> : (
            <span className="inline-flex items-center gap-1.5 bg-gray-300 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
              <Circle className="w-2 h-2 fill-current" /> SIN ACTIVIDAD
            </span>
          )}
          <p className="text-sm font-bold text-gray-700">Lo que está pasando en el momento</p>
        </div>
        {enVivo.length > 0 ? (
          <div className="space-y-2">
            {enVivo.map((a) => (
              <div key={a.id}>
                <p className="font-extrabold text-gray-900">{a.nombreActividad}</p>
                <p className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{hora(a.horaInicioActividad)} – {hora(a.horaFinActividad)}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{a.nombreSalaEspacio}</span>
                </p>
                {a.notaEnVivo && <p className="text-sm text-red-700 font-semibold mt-1">⚠ {a.notaEnVivo}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            En este momento no hay ninguna actividad en curso.
          </p>
        )}
        {actualizado && (
          <p className="text-[11px] text-gray-400 mt-3">
            Actualizado {actualizado.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} · se refresca solo
          </p>
        )}
      </div>

      {/* Agenda completa */}
      {Object.entries(porDia).map(([dia, acts]) => (
        <div key={dia} className="mb-6">
          <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3 capitalize">
            {fechaLarga(dia)}
          </h3>
          <div className="space-y-2.5">
            {acts.map((a) => (
              <div key={a.id} className={`rounded-xl border-2 p-4 transition-colors ${ESTILO_ESTADO[a.estadoEnVivo]}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="sm:w-32 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">{hora(a.horaInicioActividad)}</p>
                    <p className="text-xs text-gray-400">{hora(a.horaFinActividad)}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-bold ${a.estadoEnVivo === "FINALIZADA" ? "text-gray-500 line-through" : "text-gray-900"}`}>
                        {a.nombreActividad}
                      </p>
                      {a.estadoEnVivo === "EN_VIVO" && <PuntoEnVivo />}
                      {a.estadoEnVivo === "FINALIZADA" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
                          <CheckCircle2 className="w-3 h-3" /> FINALIZADA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{a.nombreSalaEspacio}</span>
                      {a.nombreCompletoPilaExpositor && (
                        <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{a.nombreCompletoPilaExpositor}</span>
                      )}
                    </p>
                    {a.notaEnVivo && <p className="text-xs text-red-600 font-semibold mt-1.5">⚠ {a.notaEnVivo}</p>}
                  </div>

                  {staff && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => cambiarEstado(a.id, "EN_VIVO")}
                        disabled={cambiando === a.id || a.estadoEnVivo === "EN_VIVO"}
                        title="Marcar en vivo"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-30">
                        <Play className="w-3 h-3" /> Vivo
                      </button>
                      <button onClick={() => cambiarEstado(a.id, "FINALIZADA")}
                        disabled={cambiando === a.id || a.estadoEnVivo === "FINALIZADA"}
                        title="Marcar finalizada"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-30">
                        <Square className="w-3 h-3" /> Fin
                      </button>
                      <button onClick={() => cambiarEstado(a.id, "PENDIENTE")}
                        disabled={cambiando === a.id || a.estadoEnVivo === "PENDIENTE"}
                        title="Volver a pendiente"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30">
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
