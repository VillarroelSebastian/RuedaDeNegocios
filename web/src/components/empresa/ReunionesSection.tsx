"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Users, Calendar, MapPin, Monitor, Table2,
  CheckCircle2, Clock, AlertCircle, Star, ArrowRight, Edit2, X,
  ChevronRight, AlertTriangle, ExternalLink, RefreshCw,
  XCircle, Ban, Send, Inbox,
} from "lucide-react";
import { fechaEvento, horaEvento, partesFechaEvento } from "@/lib/fechaEvento";
import CambiosPanel from "@/components/empresa/CambiosPanel";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

function fmtDate(dt: string) {
  return fechaEvento(dt, { weekday: "long", day: "2-digit", month: "long" });
}
function fmtTime(dt: string) {
  return horaEvento(dt);
}
function fmtOnlyDate(dt: string) {
  return fechaEvento(dt, { weekday: "short", day: "2-digit", month: "short" });
}

function estadoBadge(estado: string, small = false) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    PROGRAMADA:   { cls: "bg-blue-100 text-blue-700",     Icon: Clock,         label: "Programada" },
    REPROGRAMADA: { cls: "bg-amber-100 text-amber-700",   Icon: Clock,         label: "Reprogramada" },
    EN_CURSO:     { cls: "bg-green-100 text-green-700",   Icon: Users,         label: "En curso" },
    FINALIZADA:   { cls: "bg-gray-100 text-gray-600",     Icon: CheckCircle2,  label: "Finalizada" },
    CANCELADA:    { cls: "bg-red-100 text-red-600",       Icon: AlertCircle,   label: "Cancelada" },
  };
  const { cls, Icon, label } = map[estado] ?? map.PROGRAMADA;
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-full ${cls} ${small ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}>
      <Icon className={small ? "w-2.5 h-2.5" : "w-3 h-3"} />{label}
    </span>
  );
}

// ── Cambiar Horario Modal ─────────────────────────────────────────────────────

function CambiarHorarioModal({ reunion, eeId, onClose, onOk }: {
  reunion: any; eeId: number; onClose: () => void; onOk: () => void;
}) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState(0);
  const [fechaSelec, setFechaSelec] = useState<string>("");
  const [horaSelec, setHoraSelec] = useState<string>("");
  const [minutosStr, setMinutosStr] = useState("00");
  const [tipoReunion, setTipoReunion] = useState(reunion?.tipo ?? "PRESENCIAL");
  const [mensaje, setMensaje] = useState(reunion?.mensaje ?? "");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Guard sincrónico: evita que un doble clic en "Enviar propuesta" dispare
  // la petición dos veces antes de que `guardando` se re-renderice.
  const guardandoRef = useRef(false);
  // Mesas libres en el nuevo horario (solo presencial). null = que el sistema
  // conserve la mesa actual si sigue libre o asigne otra.
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesaSelec, setMesaSelec] = useState<number | null>(null);

  const fechasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => partesFechaEvento(h.inicio).dateKey))],
    [horarios]
  );
  const horariosDelDia = useMemo(() =>
    horarios.filter((h: any) => partesFechaEvento(h.inicio).dateKey === fechaSelec),
    [horarios, fechaSelec]
  );
  const horasDisponibles = useMemo(() =>
    [...new Set(horariosDelDia.map((h: any) => partesFechaEvento(h.inicio).hour))].sort((a, b) => a - b),
    [horariosDelDia]
  );
  const minutosParaHora = useMemo(() => {
    if (!horaSelec) return [];
    return horariosDelDia
      .filter((h: any) => partesFechaEvento(h.inicio).hour === parseInt(horaSelec))
      .map((h: any) => partesFechaEvento(h.inicio).minute)
      .sort((a, b) => a - b);
  }, [horariosDelDia, horaSelec]);
  const seleccionado = useMemo(() => {
    if (!horaSelec) return null;
    const mins = parseInt(minutosStr) || 0;
    return horariosDelDia.find((h: any) => {
      const p = partesFechaEvento(h.inicio);
      return p.hour === parseInt(horaSelec) && p.minute === mins;
    }) ?? null;
  }, [horariosDelDia, horaSelec, minutosStr]);
  const minutosInvalidos = horaSelec !== "" && minutosStr !== "" && !seleccionado;

  useEffect(() => {
    if (!reunion) return;
    const eeReceptoraId = reunion.solicitanteEeId === eeId ? reunion.receptoraEeId : reunion.solicitanteEeId;
    fetch(`${API}/empresa/horarios?eeId=${eeId}&eeReceptoraId=${eeReceptoraId}&excludeReunionId=${reunion.id}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setAgenda(Array.isArray(data?.agenda) ? data.agenda : hrs.map((h: any) => ({ ...h, disponible: true, estado: 'DISPONIBLE' })));
        setDuracionMin(data?.duracionMinutos ?? 0);
        const primerSlot = hrs[0];
        if (primerSlot) {
          const partes = partesFechaEvento(primerSlot.inicio);
          setFechaSelec(partes.dateKey);
          setHoraSelec(String(partes.hour));
          const primerMinuto = hrs.find((h: any) => partesFechaEvento(h.inicio).dateKey === partes.dateKey && partesFechaEvento(h.inicio).hour === partes.hour);
          setMinutosStr(primerMinuto ? String(partesFechaEvento(primerMinuto.inicio).minute).padStart(2, "0") : "00");
        }
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
  }, [reunion, eeId]);

  useEffect(() => {
    setMesaSelec(null);
    if (tipoReunion !== "PRESENCIAL" || !seleccionado?.inicio || !seleccionado?.fin) { setMesas([]); return; }
    let vigente = true;
    fetch(`${API}/empresa/mesas-disponibles?inicio=${encodeURIComponent(seleccionado.inicio)}&fin=${encodeURIComponent(seleccionado.fin)}`)
      .then((r) => r.json())
      .then((d) => { if (vigente) setMesas(Array.isArray(d) ? d : []); })
      .catch(() => { if (vigente) setMesas([]); });
    return () => { vigente = false; };
  }, [tipoReunion, seleccionado?.inicio, seleccionado?.fin]);

  const handleGuardar = async () => {
    if (!seleccionado) { setErr("Selecciona un horario válido."); return; }
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/${reunion.id}/cambiar-horario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, inicio: seleccionado.inicio, tipoReunion, mensaje, ...(tipoReunion === "PRESENCIAL" && mesaSelec ? { mesaId: mesaSelec } : {}) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message || "Error al cambiar el horario."); }
    finally { guardandoRef.current = false; setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Proponer cambios</h3>
            <p className="text-xs text-gray-400 mt-0.5">Reunión con {reunion?.contraparte?.nombre}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <p className="font-bold mb-0.5">Horario actual</p>
            <p>{fmtDate(reunion?.inicio)} · {fmtTime(reunion?.inicio)} – {fmtTime(reunion?.fin)}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Modalidad propuesta</label>
            <div className="grid grid-cols-2 gap-2">
              {["PRESENCIAL", "VIRTUAL"].map((tipo) => (
                <button key={tipo} type="button" onClick={() => setTipoReunion(tipo)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${tipoReunion === tipo ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600"}`}>
                  {tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Mensaje / detalle del cambio</label>
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={500} rows={3}
              placeholder="Explica a la otra empresa qué deseas cambiar..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#449D3A] focus:outline-none" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nuevo horario</label>
              {duracionMin > 0 && (
                <span className="text-xs text-[#449D3A] font-semibold bg-green-50 px-2 py-0.5 rounded-lg">
                  Duración: {duracionMin} min
                </span>
              )}
            </div>

            {cargando ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />Buscando horarios...
              </div>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                No hay otros horarios disponibles para ambas empresas.
              </p>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fecha</label>
                  <select value={fechaSelec} onChange={(e) => {
                    const nuevaFecha = e.target.value;
                    setFechaSelec(nuevaFecha);
                    const primerSlot = horarios.find((h: any) => partesFechaEvento(h.inicio).dateKey === nuevaFecha);
                    if (primerSlot) {
                      const partes = partesFechaEvento(primerSlot.inicio);
                      setHoraSelec(String(partes.hour));
                      setMinutosStr(String(partes.minute).padStart(2, "0"));
                    }
                  }} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white">
                    {fechasDisponibles.map((fecha) => {
                      const ejemplo = horarios.find((h: any) => partesFechaEvento(h.inicio).dateKey === fecha);
                      return <option key={fecha} value={fecha}>{ejemplo ? fmtDate(ejemplo.inicio) : fecha}</option>;
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {agenda.filter((slot: any) => partesFechaEvento(slot.inicio).dateKey === fechaSelec).map((slot: any, index: number) => {
                    const disponible = slot.disponible !== false;
                    const activo = seleccionado?.inicio === slot.inicio;
                    const etiquetas: Record<string, string> = { DISPONIBLE: 'Disponible', PENDIENTE: 'Pendiente', OCUPADO: 'Ocupado', NO_DISPONIBLE: 'No disponible', PASADO: 'Finalizado' };
                    return <button key={`${slot.inicio}-${index}`} type="button" disabled={!disponible}
                      onClick={() => { const p = partesFechaEvento(slot.inicio); setHoraSelec(String(p.hour)); setMinutosStr(String(p.minute).padStart(2, '0')); }}
                      className={`rounded-xl border p-3 text-left transition ${disponible ? (activo ? 'border-green-600 bg-green-100 ring-2 ring-green-200' : 'border-green-200 bg-green-50 hover:border-green-500') : 'cursor-not-allowed border-red-200 bg-red-50 opacity-80'}`}>
                      <span className={`block text-sm font-extrabold ${disponible ? 'text-green-800' : 'text-red-800'}`}>{fmtTime(slot.inicio)} – {fmtTime(slot.fin)}</span>
                      <span className={`mt-1 block text-[10px] font-bold ${disponible ? 'text-green-700' : 'text-red-700'}`}>{etiquetas[slot.estado] || (disponible ? 'Disponible' : 'No disponible')}</span>
                    </button>;
                  })}
                </div>
                <div className="hidden grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Hora</label>
                    <select value={horaSelec} onChange={(e) => {
                      const nuevaHora = e.target.value;
                      setHoraSelec(nuevaHora);
                      const primera = horariosDelDia.find((h: any) => partesFechaEvento(h.inicio).hour === Number(nuevaHora));
                      setMinutosStr(primera ? String(partesFechaEvento(primera.inicio).minute).padStart(2, "0") : "");
                    }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white">
                      <option value="">-- Hora --</option>
                      {horasDisponibles.map((h) => (
                        <option key={h} value={String(h)}>{String(h).padStart(2,"0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Minutos</label>
                    <input type="number" min={0} max={59} value={minutosStr}
                      onChange={(e) => setMinutosStr(e.target.value)}
                      disabled={!horaSelec}
                      placeholder="00"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 disabled:opacity-40 ${
                        minutosInvalidos ? "border-amber-300 bg-amber-50" : "border-gray-200"
                      }`} />
                  </div>
                </div>
                {minutosInvalidos && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>La empresa no tiene disponibilidad a las {horaSelec}:{minutosStr.padStart(2,"0")}. Prueba con otro horario.</span>
                  </div>
                )}
                {seleccionado && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-2.5 text-xs text-green-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Disponible: {fmtOnlyDate(seleccionado.inicio)} a las {fmtTime(seleccionado.inicio)}
                  </div>
                )}
              </>
            )}
          </div>

          {tipoReunion === "PRESENCIAL" && seleccionado && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Mesa</label>
              <p className="text-[11px] text-gray-400 mb-2">
                {reunion?.mesa?.numeroMesa ? `Mesa actual: ${reunion.mesa.numeroMesa}. ` : ""}Elige una mesa libre en el nuevo horario o deja que el sistema asigne la mejor.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button type="button" onClick={() => setMesaSelec(null)}
                  className={`col-span-4 rounded-xl border px-3 py-2 text-xs font-bold ${mesaSelec === null ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600"}`}>
                  Automática (recomendada)
                </button>
                {mesas.map((m: any) => (
                  <button key={m.id} type="button" onClick={() => setMesaSelec(m.id)}
                    className={`rounded-xl border px-2 py-2 text-xs font-bold ${mesaSelec === m.id ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600 hover:border-green-300"}`}>
                    Mesa {m.numeroMesa}
                  </button>
                ))}
              </div>
              {mesas.length === 0 && <p className="mt-2 text-[11px] text-amber-600">No hay mesas libres en ese horario.</p>}
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={guardando || !seleccionado}
              className="flex-1 py-2.5 rounded-xl bg-[#449D3A] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {guardando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enviar propuesta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetalleReunionModal({ reunion, eeId, esEncargado, onClose, onCambiarHorario, onRefresh }: {
  reunion: any; eeId: number; esEncargado: boolean;
  onClose: () => void; onCambiarHorario: () => void; onRefresh: () => void;
}) {
  const [reloj, setReloj] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setReloj(Date.now()), 15_000); return () => window.clearInterval(timer); }, []);
  const ahora = new Date(reloj);
  const minutosRestantes = Math.max(0, Math.ceil((new Date(reunion.fin).getTime() - reloj) / 60_000));
  const esProgramada = (reunion.estado === "PROGRAMADA" || reunion.estado === "REPROGRAMADA") && new Date(reunion.fin) > ahora;
  const esFinalizada = reunion.estado === "FINALIZADA" || new Date(reunion.fin) <= ahora;
  // Gestionar la reunión (iniciar, finalizar, cancelar, proponer cambios,
  // registrar evaluación) es tarea exclusiva del encargado de la empresa; un
  // participante solo puede ver el detalle de sus próximas reuniones.
  const puedeFinalizarEncargado = esEncargado && reunion.estado === "EN_CURSO";
  const puedeIniciar = esEncargado && ["PROGRAMADA", "REPROGRAMADA"].includes(reunion.estado);
  const otraPidioIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor !== eeId;
  const yoPediIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor === eeId;
  const [finalizando, setFinalizando] = useState(false);
  const [errFin, setErrFin] = useState<string | null>(null);
  const [confirmandoFin, setConfirmandoFin] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [msgIni, setMsgIni] = useState<string | null>(null);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [cancelandoReunion, setCancelandoReunion] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  // Guards sincrónicos: evitan que un doble clic dispare la petición real dos
  // veces antes de que el estado de carga se re-renderice.
  const iniciandoRef = useRef(false);
  const finalizandoRef = useRef(false);
  const cancelandoReunionRef = useRef(false);

  const handleIniciar = async () => {
    if (iniciandoRef.current) return;
    iniciandoRef.current = true;
    setIniciando(true); setMsgIni(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/${reunion.id}/iniciar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      if (d.iniciada) { onRefresh(); }
      else { setMsgIni("Le avisamos a la otra empresa. La reunión iniciará cuando ambas confirmen."); setIniciando(false); onRefresh(); }
    } catch (e: any) { setMsgIni(e.message || "Error al iniciar"); setIniciando(false); }
    finally { iniciandoRef.current = false; }
  };

  const handleFinalizar = async () => {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
    setConfirmandoFin(false);
    setFinalizando(true); setErrFin(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/${reunion.id}/finalizar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onRefresh();
    } catch (e: any) { setErrFin(e.message || "Error al finalizar"); setFinalizando(false); }
    finally { finalizandoRef.current = false; }
  };

  const handleCancelarReunion = async () => {
    if (cancelandoReunionRef.current) return;
    cancelandoReunionRef.current = true;
    setCancelandoReunion(true); setErrFin(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/${reunion.id}/cancelar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, motivo: motivoCancelacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo cancelar la reunión.");
      onRefresh();
    } catch (e: any) {
      setErrFin(e.message || "No se pudo cancelar la reunión.");
      setCancelandoReunion(false);
    } finally {
      cancelandoReunionRef.current = false;
    }
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-semibold text-gray-800 flex-1">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Detalles de la reunión</h3>
            <p className="text-xs text-gray-400 mt-0.5">Con {reunion.contraparte?.nombre}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {estadoBadge(reunion.estado)}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              reunion.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
            }`}>
              {reunion.tipo === "PRESENCIAL" ? <><MapPin className="w-3 h-3 inline mr-1" />Presencial</> : <><Monitor className="w-3 h-3 inline mr-1" />Virtual</>}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              reunion.yoSolicite ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
            }`}>
              {reunion.yoSolicite ? "Tú la solicitaste" : "Te la solicitaron"}
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl px-4 py-1 mb-4">
            <Row label="Empresa" value={reunion.contraparte?.nombre ?? "—"} />
            {reunion.contraparte?.rubro && <Row label="Rubro" value={reunion.contraparte.rubro} />}
            <Row label="Fecha" value={fmtDate(reunion.inicio)} />
            <Row label="Horario" value={`${fmtTime(reunion.inicio)} – ${fmtTime(reunion.fin)}`} />
            {reunion.mesa && <Row label="Mesa" value={`Mesa ${reunion.mesa.numeroMesa}`} />}
            {reunion.enlace && (
              <Row label="Enlace" value={
                <a href={reunion.enlace} target="_blank" rel="noopener noreferrer"
                  className="text-[#449D3A] font-bold flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" />Unirse a la reunión
                </a>
              } />
            )}
            {reunion.tipo === "VIRTUAL" && reunion.enlaceConfigurado && !reunion.enlace && (
              <Row label="Enlace" value={<span className="font-normal text-gray-500">Disponible cuando la reunión esté en curso</span>} />
            )}
            {reunion.mensaje && <Row label="Mensaje" value={<em className="text-gray-600 font-normal">{reunion.mensaje}</em>} />}
          </div>

          {reunion.tipo === "VIRTUAL" && !reunion.enlaceConfigurado && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Esta reunión todavía no tiene enlace. Puedes esperar a que el equipo técnico lo agregue; al intentar iniciar se les enviará una alerta urgente.</span>
            </div>
          )}
          {reunion.estado === "EN_CURSO" && <div className={`mb-4 rounded-xl border p-3 text-center ${minutosRestantes <= 2 ? 'border-red-200 bg-red-50 text-red-800' : minutosRestantes <= 5 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}><p className="text-sm font-bold">{minutosRestantes > 0 ? `Quedan aproximadamente ${minutosRestantes} minuto(s)` : 'El tiempo programado terminó'}</p><p className="mt-1 text-xs">Al concluir, finaliza la reunión y registra la evaluación.</p></div>}

          {/* Result */}
          {reunion.miResultado && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Mi evaluación</p>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-amber-900">{reunion.miResultado.calificacionReunion}/5</span>
                {reunion.miResultado.rangoAcuerdoComercial && (
                  <span className="text-xs text-amber-700">· {reunion.miResultado.rangoAcuerdoComercial}</span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {puedeIniciar && (
              <>
                {msgIni && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-sm font-semibold text-blue-800">{msgIni}</p>}
                {yoPediIniciar ? (
                  <div className="w-full text-center text-sm font-semibold text-[#449D3A] bg-green-50 rounded-xl py-2.5">
                    Esperando que la otra empresa confirme el inicio…
                  </div>
                ) : (
                  <button onClick={handleIniciar} disabled={iniciando}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
                    {otraPidioIniciar ? "Confirmar inicio (la otra empresa quiere iniciar)" : "Iniciar reunión"}
                  </button>
                )}
              </>
            )}
            {esEncargado && esProgramada && (
              <button onClick={onCambiarHorario}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" />
                Solicitar cambios
              </button>
            )}
            {esEncargado && esProgramada && (confirmandoCancelacion ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm text-red-800 font-semibold">La otra empresa y el equipo técnico verán esta cancelación.</p>
                <textarea value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)} maxLength={300} rows={2}
                  placeholder="Motivo de la cancelación (opcional)"
                  className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setConfirmandoCancelacion(false)} disabled={cancelandoReunion}
                    className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-600">Volver</button>
                  <button onClick={handleCancelarReunion} disabled={cancelandoReunion}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50">
                    {cancelandoReunion ? "Cancelando..." : "Confirmar cancelación"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmandoCancelacion(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-700 hover:bg-red-100">
                <AlertCircle className="w-4 h-4" />Cancelar reunión
              </button>
            ))}
            {puedeFinalizarEncargado && (
              <>
                {errFin && <p className="text-xs text-red-600 text-center">{errFin}</p>}
                {confirmandoFin ? (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-orange-800 font-semibold">¿Finalizar esta reunión? Esta acción no se puede deshacer.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmandoFin(false)}
                        className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                        Cancelar
                      </button>
                      <button onClick={handleFinalizar} disabled={finalizando}
                        className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50">
                        {finalizando
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          : "Confirmar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmandoFin(true)} disabled={finalizando}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar reunión
                  </button>
                )}
              </>
            )}
            {esEncargado && esFinalizada && !reunion.miResultado && (
              <Link href={`/empresa/resultados?reunionId=${reunion.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#449D3A] text-white text-sm font-bold hover:bg-[#3a8531]">
                <Star className="w-4 h-4" />
                Registrar evaluación
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border-2 border-gray-300 bg-white text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-100">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Solicitudes pendientes ───────────────────────────────────────────────────
// Reemplaza las antiguas pestañas "Enviadas"/"Recibidas": una solicitud
// pendiente se ve y se gestiona (aceptar/rechazar/editar/cancelar) desde
// esta misma sección de reuniones. Solo llegan aquí solicitudes PENDIENTE:
// una vez aceptada ya existe como reunión (y se ve como tal), y una
// rechazada/cancelada ya no tiene ninguna acción pendiente.

function estadoBadgeSolicitud() {
  return (
    <span className="inline-flex items-center gap-1 font-bold rounded-full bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5">
      <Clock className="w-2.5 h-2.5" />Pendiente
    </span>
  );
}

function RechazarModal({ sol, eeId, onClose, onOk }: { sol: any; eeId: number; onClose: () => void; onOk: () => void }) {
  const [motivo, setMotivo] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const ok = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${sol.id}/rechazar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, motivo }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message); } finally { loadingRef.current = false; setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-extrabold text-gray-900">Rechazar solicitud</h3>
        <p className="text-sm text-gray-500">De <span className="font-bold">{sol.solicitante?.nombre}</span></p>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
          placeholder="Motivo del rechazo (opcional)..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none" />
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={ok} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50">
            {loading ? "Rechazando..." : "Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AceptarModal({ sol, eeId, onClose, onOk }: { sol: any; eeId: number; onClose: () => void; onOk: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const enviandoRef = useRef(false);

  const ok = async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${sol.id}/aceptar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message); } finally { enviandoRef.current = false; setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Aceptar solicitud de reunión</h3>
            <p className="text-xs text-gray-400 mt-0.5">Revisa los detalles antes de confirmar</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#449D3A] shrink-0" />
              <span className="text-xs text-gray-500 w-24 shrink-0">Empresa</span>
              <span className="text-sm font-bold text-gray-900">{sol.solicitante?.nombre ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#449D3A] shrink-0" />
              <span className="text-xs text-gray-500 w-24 shrink-0">Fecha y hora</span>
              <span className="text-sm font-semibold text-gray-900">{fmtDate(sol.inicio)} · {fmtTime(sol.inicio)}</span>
            </div>
            <div className="flex items-center gap-2">
              {sol.tipo === "PRESENCIAL"
                ? <Users className="w-4 h-4 text-blue-500 shrink-0" />
                : <Monitor className="w-4 h-4 text-purple-500 shrink-0" />}
              <span className="text-xs text-gray-500 w-24 shrink-0">Modalidad</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sol.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                {sol.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
              </span>
            </div>
            {sol.mensaje && (
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-500 w-24 shrink-0 pt-0.5">Mensaje</span>
                <p className="text-xs text-gray-700 italic">"{sol.mensaje}"</p>
              </div>
            )}
          </div>

          {sol.tipo === "PRESENCIAL" && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-xl p-3 text-xs">
              <Table2 className="w-4 h-4 shrink-0" />
              {sol.mesa?.numeroMesa
                ? <>Mesa elegida por el solicitante: <strong>Mesa {sol.mesa.numeroMesa}</strong></>
                : "Se asignará automáticamente la primera mesa disponible para ese horario."}
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={ok} disabled={enviando}
              className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {enviando ? "Confirmando..." : "Confirmar reunión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleSolicitudModal({ sol, eeId, onClose, onAceptar, onRechazar, onCancelar, onEditar }: {
  sol: any; eeId: number;
  onClose: () => void; onAceptar: () => void; onRechazar: () => void; onCancelar: () => void; onEditar: () => void;
}) {
  const esEnviada = !!sol.esMiSolicitud;
  const empresa = esEnviada ? sol.receptora : sol.solicitante;

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm font-semibold text-gray-800 flex-1">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Detalle de solicitud</h3>
            <p className="text-xs text-gray-400 mt-0.5">{esEnviada ? "Solicitud enviada" : "Solicitud recibida"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {estadoBadgeSolicitud()}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sol.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {sol.tipo === "PRESENCIAL" ? <><Users className="w-3 h-3 inline mr-1" />Presencial</> : <><Monitor className="w-3 h-3 inline mr-1" />Virtual</>}
            </span>
          </div>

          {sol.tieneConflicto && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Hay otra solicitud pendiente para el mismo horario. Solo puedes aceptar una.
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl px-4 py-1">
            <Row label="Empresa">
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#449D3A]/10 flex items-center justify-center text-xs font-bold text-[#449D3A] shrink-0">
                  {(empresa?.nombre ?? "E")[0].toUpperCase()}
                </span>
                {empresa?.nombre ?? "—"}
              </span>
            </Row>
            <Row label="Fecha y hora">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {fmtDate(sol.inicio)} · {fmtTime(sol.inicio)}
              </span>
            </Row>
            {sol.tipo === "PRESENCIAL" && sol.mesa?.numeroMesa && (
              <Row label="Mesa elegida">
                <span className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  Mesa {sol.mesa.numeroMesa}
                </span>
              </Row>
            )}
            {sol.mensaje && <Row label="Mensaje"><em className="text-gray-600 font-normal">"{sol.mensaje}"</em></Row>}
          </div>

          <div className="space-y-2 pt-1">
            {!esEnviada ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onAceptar}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors">
                  <CheckCircle2 className="w-4 h-4" />Aceptar
                </button>
                <button onClick={onRechazar}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                  <XCircle className="w-4 h-4" />Rechazar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onEditar}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#449D3A]/30 bg-green-50 hover:bg-green-100 text-[#449D3A] text-sm font-bold transition-colors">
                  <Edit2 className="w-4 h-4" />Editar
                </button>
                <button onClick={onCancelar}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-600 transition-colors">
                  <Ban className="w-4 h-4" />Cancelar
                </button>
              </div>
            )}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold text-gray-800 shadow-sm transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function ReunionesSection({ embedded = false, onEditarSolicitud }: { embedded?: boolean; onEditarSolicitud?: (sol: any) => void } = {}) {
  const [reuniones, setReuniones] = useState<any[]>([]);
  // Solicitudes aún pendientes (recibidas y enviadas): ya no tienen tabs
  // propias, se gestionan en esta misma lista junto a las reuniones.
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eeId, setEeId] = useState<number | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "enviadas" | "proximas" | "finalizadas" | "cambios">("todas");
  // Propuestas de cambio de horario/modalidad (recibidas, enviadas e historial).
  const [cambios, setCambios] = useState<any[]>([]);
  const [detalleModal, setDetalleModal] = useState<any>(null);
  const [cambiarModal, setCambiarModal] = useState<any>(null);
  const [detalleSolicitud, setDetalleSolicitud] = useState<any>(null);
  const [modalAceptar, setModalAceptar] = useState<any>(null);
  const [modalRechazar, setModalRechazar] = useState<any>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const cancelandoRef = useRef(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const deepLinkProcesadoRef = useRef(false);

  const cargarReuniones = useCallback((id: number) => {
    fetch(`${API}/empresa/reuniones?eeId=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setReuniones(lista);
        const reunionId = Number(new URLSearchParams(window.location.search).get("reunionId"));
        if (!deepLinkProcesadoRef.current && Number.isFinite(reunionId) && reunionId > 0) {
          deepLinkProcesadoRef.current = true;
          const solicitada = lista.find((r: any) => r.id === reunionId);
          if (solicitada) setDetalleModal(solicitada);
        }
      })
      .catch(() => setError("No se pudo cargar las reuniones."))
      .finally(() => setLoading(false));
  }, []);

  const cargarCambios = useCallback((id: number) => {
    fetch(`${API}/empresa/reuniones/cambios?eeId=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCambios(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const cargarSolicitudes = useCallback((id: number) => {
    fetch(`${API}/empresa/solicitudes?eeId=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setSolicitudes(lista.filter((s: any) => s.estado === "PENDIENTE"));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { setError("Sesión no encontrada."); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { setError("Sesión inválida."); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        setEeId(ctx.empresaeventoId);
        setEsEncargado(!!ctx.esResponsable);
        cargarReuniones(ctx.empresaeventoId);
        if (ctx.esResponsable) { cargarSolicitudes(ctx.empresaeventoId); cargarCambios(ctx.empresaeventoId); }
        const filtroInicial = new URLSearchParams(window.location.search).get("filtro");
        if (filtroInicial === "pendientes" || filtroInicial === "enviadas" || filtroInicial === "proximas" || filtroInicial === "finalizadas" || (filtroInicial === "cambios" && ctx.esResponsable)) {
          setFiltro(filtroInicial);
        }
      })
      .catch(() => setError("No se pudo cargar el contexto."));
  }, [cargarReuniones, cargarSolicitudes, cargarCambios]);

  useEffect(() => {
    if (!eeId) return;
    const refrescar = () => { cargarReuniones(eeId); if (esEncargado) { cargarSolicitudes(eeId); cargarCambios(eeId); } };
    const alNotificar = (event: Event) => {
      const tipo = (event as CustomEvent)?.detail?.evento ?? "";
      if (tipo.startsWith("reunion") || tipo.startsWith("solicitud")) refrescar();
    };
    const alVolver = () => { if (document.visibilityState === "visible") refrescar(); };
    const iv = window.setInterval(refrescar, 15_000);
    window.addEventListener("rueda:notificacion", alNotificar);
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("rueda:notificacion", alNotificar);
      window.removeEventListener("focus", refrescar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [eeId, esEncargado, cargarReuniones, cargarSolicitudes, cargarCambios]);

  const handleCancelarSolicitud = async (solId: number) => {
    if (!eeId || cancelandoRef.current) return;
    cancelandoRef.current = true;
    setCancelando(solId);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${solId}/cancelar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? "Error al cancelar");
      setDetalleSolicitud(null);
      setToastMsg("Solicitud cancelada correctamente.");
      setTimeout(() => setToastMsg(null), 4000);
      cargarSolicitudes(eeId);
    } catch (e: any) { setError(e.message); }
    finally { cancelandoRef.current = false; setCancelando(null); }
  };

  const cambiosPorResponder = cambios.filter((c) => c.estado === "PENDIENTE" && c.direccion === "recibida").length;
  const recibidasPendientes = solicitudes.filter((s) => !s.esMiSolicitud);
  const enviadasPendientes = solicitudes.filter((s) => s.esMiSolicitud);
  // Contador de cada subopción, para llevar el control de un vistazo.
  const reunionTerminada = (r: any) => r.estado === "FINALIZADA" || new Date(r.fin) <= new Date();
  const nFinalizadas = reuniones.filter(reunionTerminada).length;
  const nVigentes = reuniones.length - nFinalizadas;
  const conteos: Record<string, number> = {
    todas: recibidasPendientes.length + enviadasPendientes.length + reuniones.length,
    pendientes: recibidasPendientes.length,
    enviadas: enviadasPendientes.length,
    proximas: nVigentes,
    cambios: cambios.filter((c) => c.estado === "PENDIENTE").length,
    finalizadas: nFinalizadas,
  };

  // La lista se agrupa igual que en móvil: primero las solicitudes recibidas
  // que esperan mi respuesta (como una bandeja de entrada, sin importar
  // fecha), luego lo vigente (reuniones + solicitudes enviadas) ordenado por
  // fecha con cabecera por día, y al final todo lo finalizado.
  const ahora = new Date();
  const itemsAgrupados = useMemo(() => {
    const esFinalizada = (r: any) => r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
    const vigentes = reuniones.filter((r) => !esFinalizada(r));
    const finalizadas = reuniones.filter(esFinalizada)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

    const salida: any[] = [];

    if ((filtro === "todas" || filtro === "pendientes") && recibidasPendientes.length > 0) {
      salida.push({ __cabecera: true, id: "cab-pendientes", titulo: "Pendientes por aceptar", destacada: true });
      salida.push(...recibidasPendientes.map((s) => ({ ...s, __tipo: "solicitud" })));
    }

    if (filtro === "todas" || filtro === "proximas" || filtro === "enviadas") {
      const vigentesFiltradas = filtro === "enviadas" ? [] : vigentes.map((r) => ({ ...r, __tipo: "reunion" }));
      const enviadasFiltradas = filtro === "proximas" ? [] : enviadasPendientes.map((s) => ({ ...s, __tipo: "solicitud" }));
      const combinadas = [...vigentesFiltradas, ...enviadasFiltradas]
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
      let diaActual = "";
      for (const r of combinadas) {
        const dia = fmtOnlyDate(r.inicio);
        if (dia !== diaActual) {
          diaActual = dia;
          salida.push({ __cabecera: true, id: `dia-${dia}`, titulo: fmtDate(r.inicio) });
        }
        salida.push(r);
      }
    }

    if ((filtro === "todas" || filtro === "finalizadas") && finalizadas.length > 0) {
      salida.push({ __cabecera: true, id: "dia-finalizadas", titulo: `Finalizadas (${finalizadas.length})`, apagada: true });
      salida.push(...finalizadas.map((r) => ({ ...r, __tipo: "reunion" })));
    }
    return salida;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniones, recibidasPendientes, enviadasPendientes, filtro]);

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
    <>
      {detalleModal && eeId && (
        <DetalleReunionModal
          reunion={detalleModal}
          eeId={eeId}
          esEncargado={esEncargado}
          onClose={() => setDetalleModal(null)}
          onCambiarHorario={() => { setCambiarModal(detalleModal); setDetalleModal(null); }}
          onRefresh={() => { setDetalleModal(null); if (eeId) { setLoading(true); cargarReuniones(eeId); } }}
        />
      )}
      {cambiarModal && eeId && (
        <CambiarHorarioModal
          reunion={cambiarModal}
          eeId={eeId}
          onClose={() => setCambiarModal(null)}
          onOk={() => { setCambiarModal(null); if (eeId) { setLoading(true); cargarReuniones(eeId); if (esEncargado) { cargarSolicitudes(eeId); cargarCambios(eeId); } setFiltro("cambios"); setToastMsg("Solicitud de cambio enviada. Te avisaremos cuando la otra empresa responda."); setTimeout(() => setToastMsg(null), 5000); } }}
        />
      )}
      {detalleSolicitud && eeId && (
        <DetalleSolicitudModal
          sol={detalleSolicitud}
          eeId={eeId}
          onClose={() => setDetalleSolicitud(null)}
          onAceptar={() => setModalAceptar(detalleSolicitud)}
          onRechazar={() => setModalRechazar(detalleSolicitud)}
          onCancelar={() => handleCancelarSolicitud(detalleSolicitud.id)}
          onEditar={() => { setDetalleSolicitud(null); onEditarSolicitud?.(detalleSolicitud); }}
        />
      )}
      {modalAceptar && eeId && (
        <AceptarModal sol={modalAceptar} eeId={eeId}
          onClose={() => setModalAceptar(null)}
          onOk={() => { setModalAceptar(null); setDetalleSolicitud(null); setToastMsg("¡Reunión confirmada!"); setTimeout(() => setToastMsg(null), 4000); cargarSolicitudes(eeId); cargarReuniones(eeId); }} />
      )}
      {modalRechazar && eeId && (
        <RechazarModal sol={modalRechazar} eeId={eeId}
          onClose={() => setModalRechazar(null)}
          onOk={() => { setModalRechazar(null); setDetalleSolicitud(null); setToastMsg("Solicitud rechazada."); setTimeout(() => setToastMsg(null), 4000); cargarSolicitudes(eeId); }} />
      )}

      <div className={embedded ? "space-y-5" : "p-4 sm:p-6 space-y-5"}>
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Mis reuniones</h1>
              <p className="text-sm text-gray-400 mt-0.5">{reuniones.length} reuniones confirmadas</p>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="flex items-center gap-2 rounded-xl p-3 text-sm bg-green-50 text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{toastMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {embedded && <p className="text-sm text-gray-400">{reuniones.length} reuniones confirmadas</p>}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button onClick={() => { if (eeId) { cargarReuniones(eeId); if (esEncargado) { cargarSolicitudes(eeId); cargarCambios(eeId); } } }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
            <div className="flex max-w-full overflow-x-auto bg-gray-100 rounded-xl p-1">
              {(esEncargado
                ? (["todas", "pendientes", "enviadas", "proximas", "cambios", "finalizadas"] as const)
                : (["todas", "proximas", "finalizadas"] as const)
              ).map((f) => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filtro === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {f === "todas" ? "Todas"
                    : f === "pendientes" ? "Pendientes"
                    : f === "enviadas" ? "Enviadas"
                    : f === "cambios" ? "Cambios"
                    : f === "proximas" ? "Próximas" : "Finalizadas"}
                  {(() => {
                    // Rojo cuando hay algo que responder (pendientes recibidas / cambios por responder).
                    const urgente = (f === "pendientes" && conteos.pendientes > 0) || (f === "cambios" && cambiosPorResponder > 0);
                    return (
                      <span className={`ml-1.5 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-[10px] font-bold ${
                        urgente ? "bg-red-500 text-white" : filtro === f ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-500"
                      }`}>{conteos[f] ?? 0}</span>
                    );
                  })()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {esEncargado && filtro !== "cambios" && cambiosPorResponder > 0 && (
          <button onClick={() => setFiltro("cambios")}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left hover:bg-amber-100/60">
            <span className="text-sm font-extrabold text-amber-900">
              Tienes {cambiosPorResponder} solicitud{cambiosPorResponder > 1 ? "es" : ""} de cambio por responder
            </span>
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">Ver cambios</span>
          </button>
        )}

        {esEncargado && filtro === "cambios" && eeId ? (
          <CambiosPanel eeId={eeId} cambios={cambios}
            onActualizado={() => { cargarCambios(eeId); cargarReuniones(eeId); window.dispatchEvent(new CustomEvent("rueda:notificacion", { detail: { evento: "reunion:cambio" } })); }}
            onMensaje={(m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 5000); }}
            onReintentar={(reunionId) => { const r = reuniones.find((x) => x.id === reunionId); if (r) setCambiarModal(r); }} />
        ) : null}
        {filtro === "cambios" && esEncargado ? null : itemsAgrupados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-4">
              {filtro === "pendientes" ? "No tienes solicitudes pendientes por aceptar." :
               filtro === "enviadas" ? "No tienes solicitudes enviadas pendientes." :
               filtro === "proximas" ? "No tienes reuniones próximas." :
               filtro === "finalizadas" ? "No tienes reuniones finalizadas." :
               "No tienes reuniones confirmadas aún."}
            </p>
            {esEncargado && (
              <Link href="/empresa/empresas" className="text-sm text-[#449D3A] font-bold hover:underline">
                  Ver empresas y solicitar reunión →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {itemsAgrupados.map((item: any) => {
              if (item.__cabecera) {
                return (
                  <p key={item.id} className={`text-sm font-extrabold capitalize pt-2 ${item.apagada ? "text-gray-400" : item.destacada ? "text-amber-700" : "text-gray-900"}`}>
                    {item.titulo}
                  </p>
                );
              }
              if (item.__tipo === "solicitud") {
                const esEnviada = !!item.esMiSolicitud;
                const empresaSol = esEnviada ? item.receptora : item.solicitante;
                return (
                  <button
                    key={`sol-${item.id}`}
                    onClick={() => setDetalleSolicitud(item)}
                    className="w-full bg-amber-50/60 rounded-2xl border border-amber-200 shadow-sm overflow-hidden text-left hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {estadoBadgeSolicitud()}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            }`}>
                              {item.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${esEnviada ? "bg-indigo-50 text-indigo-600" : "bg-amber-100 text-amber-700"}`}>
                              {esEnviada ? <Send className="w-2.5 h-2.5" /> : <Inbox className="w-2.5 h-2.5" />}
                              {esEnviada ? "Enviada" : "Recibida"}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm truncate">{empresaSol?.nombre ?? "Empresa"}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(item.inicio)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(item.inicio)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!esEnviada ? (
                            <>
                              <button onClick={() => setModalRechazar(item)} className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-colors" title="Rechazar">
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => setModalAceptar(item)} className="p-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 transition-colors" title="Aceptar">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => onEditarSolicitud?.(item)} className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-[#449D3A] transition-colors" title="Editar">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleCancelarSolicitud(item.id)} disabled={cancelando === item.id}
                                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors disabled:opacity-50" title="Cancelar">
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }

              const r = item;
              const esFinalizada = r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
              return (
                <button
                  key={r.id}
                  onClick={() => setDetalleModal(r)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#449D3A]/30 transition-all active:scale-[0.99]"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {estadoBadge(r.estado, true)}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          }`}>
                            {r.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                          </span>
                          {r.mesa && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Table2 className="w-3 h-3" />Mesa {r.mesa.numeroMesa}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.yoSolicite ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                          }`}>
                            {r.yoSolicite ? "Tú la solicitaste" : "Te la solicitaron"}
                          </span>
                        </div>

                        <p className="font-bold text-gray-900 text-sm truncate">
                          {r.contraparte?.nombre ?? "Empresa"}
                        </p>
                        {r.contraparte?.rubro && (
                          <p className="text-xs text-gray-400 truncate">{r.contraparte.rubro}</p>
                        )}

                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />{fmtDate(r.inicio)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{fmtTime(r.inicio)} – {fmtTime(r.fin)}
                          </span>
                        </div>

                        {r.miResultado && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-[10px] font-bold text-amber-600">{r.miResultado.calificacionReunion}/5</span>
                          </div>
                        )}
                        {esFinalizada && !r.miResultado && (
                          <span className="inline-block mt-2 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full">
                            Pendiente de evaluación
                          </span>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
