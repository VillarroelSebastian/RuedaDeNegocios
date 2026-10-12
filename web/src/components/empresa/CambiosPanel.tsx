"use client";

import React, { useRef, useState } from "react";
import { ArrowRight, Ban, CalendarDays, CheckCircle2, Clock, History, Inbox, Loader2, Send, XCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

const fmtDia = (iso: string) => new Date(iso).toLocaleDateString("es-BO", { weekday: "short", day: "numeric", month: "short", timeZone: "America/La_Paz" });
const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" });
const fmtTipo = (t: string) => (t === "VIRTUAL" ? "Virtual" : "Presencial");

const ESTADO: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDIENTE: { label: "Esperando respuesta", cls: "bg-amber-100 text-amber-800", icon: <Clock className="w-3 h-3" /> },
  ACEPTADA:  { label: "Aceptado", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  RECHAZADA: { label: "Rechazado", cls: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" /> },
  CANCELADA: { label: "Cancelado", cls: "bg-gray-100 text-gray-600", icon: <Ban className="w-3 h-3" /> },
  VENCIDA:   { label: "Vencido", cls: "bg-gray-100 text-gray-500", icon: <History className="w-3 h-3" /> },
};

function Tarjeta({ c, ocupado, onAceptar, onRechazar, onCancelar, onReintentar }: {
  c: any; ocupado: boolean; onAceptar: () => void; onRechazar: () => void; onCancelar: () => void; onReintentar: () => void;
}) {
  const est = ESTADO[c.estado] ?? ESTADO.PENDIENTE;
  const recibida = c.direccion === "recibida";
  const cambiaModalidad = c.actual.tipo !== c.propuesto.tipo;
  const cambiaMesa = c.propuesto.tipo === "PRESENCIAL" && c.actual.tipo === "PRESENCIAL" && c.actual.mesa !== c.propuesto.mesa;
  // El estado define qué significan los dos bloques: la reunión se modifica al aceptar,
  // por eso en el historial el primero es el "antes" y el segundo el "ahora".
  const aplicado = c.estado === "ACEPTADA";
  const etiquetaActual = c.estado === "PENDIENTE" ? "Actual" : aplicado ? "Antes" : "Se mantiene";
  const etiquetaPropuesto = c.estado === "PENDIENTE" ? "Propuesto" : aplicado ? "Ahora" : "Propuesto (no se aplicó)";
  const lugar = (x: any) => `${fmtTipo(x.tipo)}${x.tipo === "PRESENCIAL" && x.mesa ? ` · Mesa ${x.mesa}` : ""}`;
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${c.estado === "PENDIENTE" && recibida ? "border-amber-300 bg-amber-50/50" : "border-gray-100"}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${est.cls}`}>{est.icon}{est.label}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${recibida ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-600"}`}>
          {recibida ? <Inbox className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}{recibida ? "Recibida" : "Enviada por ti"}
        </span>
      </div>
      <p className="text-sm font-extrabold text-gray-900 truncate">{c.contraparte?.nombre ?? "Empresa"}</p>
      <p className="text-xs text-gray-400">{recibida ? `${c.proponente} propone cambiar la reunión` : "Propusiste cambiar la reunión"}</p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{etiquetaActual}</p>
          <p className="flex items-center gap-1 font-semibold text-gray-700"><CalendarDays className="w-3.5 h-3.5" />{fmtDia(c.actual.inicio)} · {fmtHora(c.actual.inicio)}</p>
          <p className="text-gray-500 mt-0.5">{lugar(c.actual)}</p>
        </div>
        <ArrowRight className="hidden sm:block w-4 h-4 text-[#449D3A]" />
        <div className={`rounded-xl p-3 ${aplicado || c.estado === "PENDIENTE" ? "bg-green-50" : "bg-gray-50"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${aplicado || c.estado === "PENDIENTE" ? "text-green-700" : "text-gray-400"}`}>{etiquetaPropuesto}</p>
          <p className="flex items-center gap-1 font-semibold text-gray-900"><CalendarDays className="w-3.5 h-3.5" />{fmtDia(c.propuesto.inicio)} · {fmtHora(c.propuesto.inicio)}</p>
          <p className="text-gray-600 mt-0.5">{lugar(c.propuesto)}{cambiaModalidad ? " (cambia la modalidad)" : cambiaMesa ? " (cambia la mesa)" : ""}</p>
        </div>
      </div>

      {c.mensaje && <p className="mt-3 text-xs text-gray-600">“{c.mensaje}”</p>}
      {c.estado === "RECHAZADA" && c.motivoRechazo && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <b>Motivo del rechazo:</b> {c.motivoRechazo}
        </div>
      )}
      {c.estado === "ACEPTADA" && (
        <p className="mt-3 text-xs font-semibold text-green-700">La reunión ya quedó en el nuevo horario.</p>
      )}
      {c.estado === "VENCIDA" && (
        <p className="mt-3 text-xs text-gray-500">No se respondió a tiempo: la reunión sigue con su horario original.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">
          {c.fechaRespuesta ? `Respondido el ${fmtDia(c.fechaRespuesta)} ${fmtHora(c.fechaRespuesta)}` : `Enviado el ${fmtDia(c.fechaCreacion)} ${fmtHora(c.fechaCreacion)}`}
        </p>
        <div className="flex gap-2">
          {c.estado === "PENDIENTE" && recibida && (
            <>
              <button onClick={onRechazar} disabled={ocupado}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Rechazar</button>
              <button onClick={onAceptar} disabled={ocupado}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#449D3A] px-4 py-2 text-xs font-bold text-white hover:bg-[#3a8531] disabled:opacity-50">
                {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Aceptar cambio
              </button>
            </>
          )}
          {c.estado === "PENDIENTE" && !recibida && (
            <button onClick={onCancelar} disabled={ocupado}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar solicitud</button>
          )}
          {c.puedeReintentar && (
            <button onClick={onReintentar}
              className="rounded-xl border border-[#449D3A] bg-white px-4 py-2 text-xs font-bold text-[#449D3A] hover:bg-green-50">Proponer otro horario</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Pestaña "Cambios" de Reuniones: propuestas de cambio de horario/modalidad
// recibidas (por responder), enviadas (en espera) e historial con su resultado.
export default function CambiosPanel({ eeId, cambios, onActualizado, onMensaje, onReintentar }: {
  eeId: number; cambios: any[]; onActualizado: () => void; onMensaje: (m: string) => void; onReintentar: (reunionId: number) => void;
}) {
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const ocupadoRef = useRef(false);
  const [rechazando, setRechazando] = useState<any>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const llamar = async (c: any, ruta: string, body: any, exito: string) => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setOcupadoId(c.id);
    setError(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/cambios/${c.id}/${ruta}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eeId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? "No se pudo completar la acción");
      setRechazando(null); setMotivo("");
      onMensaje(exito);
      onActualizado();
    } catch (e: any) {
      setError(e.message);
    } finally {
      ocupadoRef.current = false;
      setOcupadoId(null);
    }
  };

  const porResponder = cambios.filter((c) => c.estado === "PENDIENTE" && c.direccion === "recibida");
  const enEspera = cambios.filter((c) => c.estado === "PENDIENTE" && c.direccion === "enviada");
  const historial = cambios.filter((c) => c.estado !== "PENDIENTE");

  const render = (c: any) => (
    <Tarjeta key={c.id} c={c} ocupado={ocupadoId === c.id}
      onAceptar={() => llamar(c, "responder", { aceptar: true }, "Cambio aceptado: la agenda ya se actualizó y se avisó a la otra empresa.")}
      onRechazar={() => { setRechazando(c); setMotivo(""); setError(null); }}
      onCancelar={() => llamar(c, "cancelar", {}, "Solicitud de cambio cancelada; se avisó a la otra empresa.")}
      onReintentar={() => onReintentar(c.reunionId)} />
  );

  return (
    <div className="space-y-5">
      {error && !rechazando && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {rechazando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 space-y-3">
            <h3 className="text-lg font-extrabold text-gray-900">Rechazar cambio</h3>
            <p className="text-sm text-gray-500">
              Cuéntale a {rechazando.contraparte?.nombre ?? "la otra empresa"} por qué no te sirve el nuevo horario. La reunión se mantiene como estaba y podrá proponerte otro.
            </p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={500} autoFocus
              placeholder="Ej.: A esa hora ya tengo otra reunión; prefiero por la tarde."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setRechazando(null); setError(null); }} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Volver</button>
              <button disabled={motivo.trim().length < 3 || ocupadoId === rechazando.id}
                onClick={() => llamar(rechazando, "responder", { aceptar: false, motivo: motivo.trim() }, "Cambio rechazado; se avisó a la otra empresa con tu motivo.")}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Rechazar cambio</button>
            </div>
          </div>
        </div>
      )}

      {cambios.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aún no hay solicitudes de cambio.</p>
          <p className="mt-1 text-xs">Para pedir un cambio de horario o modalidad, abre una reunión confirmada y elige “Solicitar cambios”.</p>
        </div>
      ) : (
        <>
          {porResponder.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold text-amber-700">Por responder ({porResponder.length})</h3>
              {porResponder.map(render)}
            </section>
          )}
          {enEspera.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-900">Enviadas · esperando respuesta ({enEspera.length})</h3>
              {enEspera.map(render)}
            </section>
          )}
          {historial.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-400">Historial ({historial.length})</h3>
              {historial.map(render)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
