"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, AlertCircle, AlertTriangle, Monitor, Users, X, Table2, CheckCircle2,
} from "lucide-react";
import { fechaEvento, horaEvento, partesFechaEvento } from "@/lib/fechaEvento";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const POLL_MS = 5000; // tabla polling cada 5 s

// ── Mesa picker con polling ─────────────────────────────────────────────────

interface MesaPickerProps {
  inicio: string;
  fin: string;
  value: number | null;
  onChange: (id: number | null) => void;
  onUnavailable?: () => void;
}

function MesaPicker({ inicio, fin, value, onChange, onUnavailable }: MesaPickerProps) {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const prevIds = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMesas = async () => {
    try {
      const r = await fetch(`${API}/empresa/mesas-disponibles?inicio=${inicio}&fin=${fin}`);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      setMesas(arr);

      const newIds = new Set(arr.map((m: any) => m.id));
      // Si la mesa seleccionada ya no está disponible, limpiar selección
      if (value && prevIds.current.size > 0 && !newIds.has(value)) {
        onChange(null);
        onUnavailable?.();
      }
      prevIds.current = newIds;
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    fetchMesas();
    intervalRef.current = setInterval(fetchMesas, POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [inicio, fin]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
      <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
      Verificando mesas...
    </div>
  );

  if (mesas.length === 0) return (
    <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
      No hay mesas disponibles en ese horario. Elige otro horario.
    </p>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {mesas.map((m: any) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
            value === m.id
              ? "border-[#449D3A] bg-green-50 text-[#449D3A]"
              : "border-gray-200 text-gray-600 hover:border-green-300"
          }`}
        >
          <Table2 className="w-3 h-3" />
          Mesa {m.numeroMesa}
        </button>
      ))}
    </div>
  );
}

// ── Modal nueva solicitud ───────────────────────────────────────────────────

function fmtTime(iso: string) {
  return horaEvento(iso);
}
function fmtOnlyDate(iso: string) {
  return fechaEvento(iso, { weekday: "short", day: "2-digit", month: "short" });
}

export function NuevaSolicitudModal({ ctx, receptoraId, receptoraNombre, onClose, onCreada, solicitud }: {
  ctx: any; receptoraId: number; receptoraNombre: string; onClose: () => void; onCreada: () => void; solicitud?: any;
}) {
  const [tipo, setTipo] = useState<"PRESENCIAL" | "VIRTUAL">(solicitud?.tipo ?? "PRESENCIAL");
  const [horarios, setHorarios] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState<number>(0);
  const [pausaMin, setPausaMin] = useState<number>(0);
  const [horario, setHorario] = useState<any>(null);
  const [fechaSelec, setFechaSelec] = useState<string>("");
  const [mesa, setMesa] = useState<number | null>(null);
  const [mesaInvalida, setMesaInvalida] = useState(false);
  const [mensaje, setMensaje] = useState(solicitud?.mensaje ?? "");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fecha ISO (YYYY-MM-DD, en horario local) del slot — usada para agrupar horarios por día.
  const fechaISO = (iso: string) => {
    return partesFechaEvento(iso).dateKey;
  };

  const fechasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => fechaISO(h.inicio)))].sort(),
    [horarios]
  );
  const horariosDelDia = useMemo(() =>
    fechaSelec ? horarios.filter((h: any) => fechaISO(h.inicio) === fechaSelec) : [],
    [horarios, fechaSelec]
  );
  useEffect(() => {
    setHorario(null);
    setMesa(null);
    setMesaInvalida(false);
  }, [fechaSelec]);

  // Al cambiar de hora, auto-seleccionar el primer minuto válido para esa hora
  // (nunca dejar un minuto que no exista en minutosParaHora).
  // Al cambiar de fecha, reiniciar hora/minutos y auto-seleccionar la primera hora disponible.
  useEffect(() => {
    if (!ctx) return;
    // La receptora puede venir por id directo o, al editar, deducirse del id de la
    // solicitud (evita depender de que la lista traiga receptoraEeId).
    const tieneReceptora = !!receptoraId && !Number.isNaN(Number(receptoraId));
    if (!ctx.empresaeventoId || (!tieneReceptora && !solicitud?.id)) {
      setHorarios([]); setCargando(false);
      setErr("No se pudo identificar la empresa. Recarga la página e intenta de nuevo.");
      return;
    }
    setCargando(true); setErr(null);
    setHorario(null); setFechaSelec(""); setMesa(null); setMesaInvalida(false);
    const params = new URLSearchParams({ eeId: String(ctx.empresaeventoId) });
    if (tieneReceptora) params.set("eeReceptoraId", String(receptoraId));
    if (solicitud?.id) params.set("solicitudId", String(solicitud.id));
    fetch(`${API}/empresa/horarios?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const disponibles: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        const agenda: any[] = Array.isArray(data?.agenda)
          ? data.agenda
          : disponibles.map((h: any) => ({ ...h, disponible: true, estado: "DISPONIBLE" }));
        setHorarios(agenda);
        setDuracionMin(data?.duracionMinutos ?? 0);
        setPausaMin(data?.tiempoEntreReuniones ?? 0);
        const fechas = [...new Set(agenda.map((h: any) => fechaISO(h.inicio)))].sort();
        const hoy = fechaISO(new Date().toISOString());
        const fechaActual = solicitud?.inicio ? fechaISO(solicitud.inicio) : "";
        setFechaSelec(fechas.includes(fechaActual) ? fechaActual : (fechas.find((f) => f >= hoy) ?? fechas[0] ?? ""));
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, receptoraId, solicitud?.id]);

  const handleSubmit = async () => {
    setErr(null);
    if (!horario) { setErr("Selecciona un horario disponible."); return; }
    if (tipo === "PRESENCIAL" && !mesa) { setErr("Selecciona una mesa."); return; }
    setEnviando(true);
    try {
      const res = await fetch(solicitud ? `${API}/empresa/solicitudes/${solicitud.id}/editar` : `${API}/empresa/solicitudes`, {
        method: solicitud ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eeId: ctx.empresaeventoId, eeReceptoraId: receptoraId, euId: ctx.empresaUsuarioId,
          tipo, inicio: horario.inicio, fin: horario.fin,
          mesaId: tipo === "PRESENCIAL" ? mesa : undefined,
          mensaje,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al crear la solicitud");
      onCreada();
    } catch (e: any) { setErr(e.message); }
    finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-gray-900">{solicitud ? "Editar solicitud pendiente" : "Nueva solicitud de reunión"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Con: <span className="font-bold text-gray-700">{receptoraNombre}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Tipo */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Modalidad</label>
            <div className="grid grid-cols-2 gap-3">
              {(["PRESENCIAL", "VIRTUAL"] as const).map((t) => (
                <button key={t} onClick={() => { setTipo(t); setHorario(null); setMesa(null); }}
                  className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    tipo === t ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {t === "PRESENCIAL" ? <Users className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  {t === "PRESENCIAL" ? "Presencial" : "Virtual"}
                </button>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hora de inicio</label>
              {duracionMin > 0 && (
                <span className="text-xs text-[#449D3A] font-semibold bg-green-50 px-2 py-0.5 rounded-lg">
                  Duración: {duracionMin} min
                </span>
              )}
            </div>

            {cargando ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />Buscando horarios disponibles...
              </div>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                No hay horarios disponibles entre estas dos empresas.
              </p>
            ) : (
              <>
                {/* Fecha */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Fecha</label>
                  <select
                    value={fechaSelec}
                    onChange={(e) => setFechaSelec(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white"
                  >
                    {fechasDisponibles.map((f) => (
                      <option key={f} value={f}>
                        {fechaEvento(`${f}T12:00:00-04:00`, { weekday: "long", day: "2-digit", month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hour + Minutes pickers — ambos restringidos a combinaciones realmente disponibles */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Agenda de {receptoraNombre}</label>
                    <span className="text-[10px] text-gray-400">Pausa entre citas: {pausaMin} min</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {horariosDelDia.map((slot: any) => {
                      const seleccionado = horario?.inicio === slot.inicio;
                      const estado = slot.estado === "PENDIENTE" ? "Pendiente"
                        : slot.estado === "OCUPADO" ? "Ocupado"
                        : slot.estado === "PASADO" ? "Ya pasó"
                        : slot.disponible ? "Disponible" : "No disponible";
                      return (
                        <button key={slot.inicio} type="button" disabled={!slot.disponible}
                          onClick={() => { setHorario(slot); setMesa(null); setMesaInvalida(false); }}
                          className={`rounded-xl border px-2.5 py-3 text-left transition-colors ${
                            seleccionado ? "border-green-600 bg-green-100 ring-2 ring-green-500/20"
                            : slot.disponible ? "border-green-200 bg-green-50 hover:border-green-500"
                            : "cursor-not-allowed border-red-100 bg-red-50 opacity-75"
                          }`}>
                          <span className={`block text-sm font-extrabold ${slot.disponible ? "text-green-800" : "text-red-700"}`}>
                            {fmtTime(slot.inicio)} â€“ {fmtTime(slot.fin)}
                          </span>
                          <span className={`mt-1 block text-[10px] font-bold ${slot.disponible ? "text-green-600" : "text-red-500"}`}>{estado}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confirmation */}
                {horario && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-2.5 text-xs text-green-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Horario disponible confirmado: {fmtOnlyDate(horario.inicio)} a las {fmtTime(horario.inicio)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mesa con polling */}
          {tipo === "PRESENCIAL" && horario && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mesa</label>
                <span className="text-[10px] text-gray-400">Actualización automática cada 5 s</span>
              </div>
              {mesaInvalida && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-xl p-3 text-xs mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  La mesa que habías elegido ya no está disponible. Selecciona otra.
                </div>
              )}
              <MesaPicker
                inicio={horario.inicio} fin={horario.fin}
                value={mesa} onChange={setMesa}
                onUnavailable={() => setMesaInvalida(true)}
              />
            </div>
          )}

          {/* Enlace virtual */}
          {tipo === "VIRTUAL" && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Enlace de reunión virtual</label>
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
                El equipo técnico recibirá un aviso para agregar el enlace y lo verás en tu agenda cuando esté listo.
              </p>
            </div>
          )}

          {/* Mensaje */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Mensaje (opcional)</label>
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3}
              placeholder="Describe el objetivo de la reunión..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none" />
          </div>

          {err && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSubmit}
              disabled={enviando || !horario || (tipo === "PRESENCIAL" && !mesa)}
              className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {enviando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar solicitud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
