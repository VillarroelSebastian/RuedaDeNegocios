"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, AlertCircle, AlertTriangle, Monitor, Users, X, Table2, CheckCircle2,
} from "lucide-react";

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
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtOnlyDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short" });
}

export function NuevaSolicitudModal({ ctx, receptoraId, receptoraNombre, onClose, onCreada, solicitud }: {
  ctx: any; receptoraId: number; receptoraNombre: string; onClose: () => void; onCreada: () => void; solicitud?: any;
}) {
  const [tipo, setTipo] = useState<"PRESENCIAL" | "VIRTUAL">(solicitud?.tipo ?? "PRESENCIAL");
  const [horarios, setHorarios] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState<number>(0);
  const [horario, setHorario] = useState<any>(null);
  const [fechaSelec, setFechaSelec] = useState<string>("");
  const [horaSelec, setHoraSelec] = useState<string>("");
  const [minutosStr, setMinutosStr] = useState<string>("");
  const [mesa, setMesa] = useState<number | null>(null);
  const [mesaInvalida, setMesaInvalida] = useState(false);
  const [enlace, setEnlace] = useState(solicitud?.enlace ?? "");
  const [mensaje, setMensaje] = useState(solicitud?.mensaje ?? "");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Fecha ISO (YYYY-MM-DD, en horario local) del slot — usada para agrupar horarios por día.
  const fechaISO = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const fechasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => fechaISO(h.inicio)))].sort(),
    [horarios]
  );
  const horariosDelDia = useMemo(() =>
    fechaSelec ? horarios.filter((h: any) => fechaISO(h.inicio) === fechaSelec) : [],
    [horarios, fechaSelec]
  );
  const horasDisponibles = useMemo(() =>
    [...new Set(horariosDelDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a, b) => a - b),
    [horariosDelDia]
  );
  const minutosParaHora = useMemo(() => {
    if (horaSelec === "") return [];
    return horariosDelDia
      .filter((h: any) => new Date(h.inicio).getHours() === parseInt(horaSelec))
      .map((h: any) => new Date(h.inicio).getMinutes())
      .sort((a, b) => a - b);
  }, [horariosDelDia, horaSelec]);
  const horarioMatch = useMemo(() => {
    if (horaSelec === "" || minutosStr === "") return null;
    const mins = parseInt(minutosStr);
    return horariosDelDia.find((h: any) => {
      const d = new Date(h.inicio);
      return d.getHours() === parseInt(horaSelec) && d.getMinutes() === mins;
    }) ?? null;
  }, [horariosDelDia, horaSelec, minutosStr]);

  useEffect(() => {
    setHorario(horarioMatch);
    if (!horarioMatch) { setMesa(null); setMesaInvalida(false); }
  }, [horarioMatch]);

  // Al cambiar de hora, auto-seleccionar el primer minuto válido para esa hora
  // (nunca dejar un minuto que no exista en minutosParaHora).
  useEffect(() => {
    setMinutosStr(minutosParaHora.length > 0 ? String(minutosParaHora[0]).padStart(2, "0") : "");
  }, [horaSelec, minutosParaHora]);

  // Al cambiar de fecha, reiniciar hora/minutos y auto-seleccionar la primera hora disponible.
  useEffect(() => {
    setHoraSelec("");
    if (horasDisponibles.length > 0) {
      const cur = fechaSelec === fechaISO(new Date().toISOString()) ? new Date().getHours() : 0;
      const auto = horasDisponibles.find((h) => h >= cur) ?? horasDisponibles[0];
      setHoraSelec(String(auto));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSelec]);

  useEffect(() => {
    if (!ctx) return;
    setCargando(true);
    setHorario(null); setFechaSelec(""); setHoraSelec(""); setMinutosStr(""); setMesa(null); setMesaInvalida(false);
    fetch(`${API}/empresa/horarios?eeId=${ctx.empresaeventoId}&eeReceptoraId=${receptoraId}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setDuracionMin(data?.duracionMinutos ?? 0);
        const fechas = [...new Set(hrs.map((h: any) => fechaISO(h.inicio)))].sort();
        const hoy = fechaISO(new Date().toISOString());
        const fechaActual = solicitud?.inicio ? fechaISO(solicitud.inicio) : "";
        setFechaSelec(fechas.includes(fechaActual) ? fechaActual : (fechas.find((f) => f >= hoy) ?? fechas[0] ?? ""));
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
  }, [ctx, receptoraId]);

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
          enlace: tipo === "VIRTUAL" ? enlace : undefined, mensaje,
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
                        {new Date(f + "T00:00:00").toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hour + Minutes pickers — ambos restringidos a combinaciones realmente disponibles */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Hora</label>
                    <select
                      value={horaSelec}
                      onChange={(e) => setHoraSelec(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white"
                    >
                      <option value="">-- Hora --</option>
                      {horasDisponibles.map((h) => (
                        <option key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Minutos</label>
                    <select
                      value={minutosStr}
                      onChange={(e) => setMinutosStr(e.target.value)}
                      disabled={!horaSelec || minutosParaHora.length === 0}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] disabled:opacity-40 disabled:bg-gray-50 bg-white"
                    >
                      {minutosParaHora.map((m) => (
                        <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
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
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Enlace de reunión (opcional)</label>
              <input type="url" value={enlace} onChange={(e) => setEnlace(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
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
