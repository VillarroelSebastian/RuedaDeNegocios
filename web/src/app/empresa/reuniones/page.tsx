"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Calendar, MapPin, Monitor, Table2,
  CheckCircle2, Clock, AlertCircle, Star, ArrowRight, Edit2, X,
  ChevronRight, AlertTriangle, ExternalLink,
} from "lucide-react";

const API = "http://localhost:3334";

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long" });
}
function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtOnlyDate(dt: string) {
  return new Date(dt).toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short" });
}

function estadoBadge(estado: string, small = false) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    PROGRAMADA: { cls: "bg-blue-100 text-blue-700",   Icon: Clock,         label: "Programada" },
    EN_CURSO:   { cls: "bg-green-100 text-green-700", Icon: Users,         label: "En curso" },
    FINALIZADA: { cls: "bg-gray-100 text-gray-600",   Icon: CheckCircle2,  label: "Finalizada" },
    CANCELADA:  { cls: "bg-red-100 text-red-600",     Icon: AlertCircle,   label: "Cancelada" },
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
  const [duracionMin, setDuracionMin] = useState(0);
  const [horaSelec, setHoraSelec] = useState<string>("");
  const [minutosStr, setMinutosStr] = useState("00");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const horasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => new Date(h.inicio).getHours()))].sort((a, b) => a - b),
    [horarios]
  );
  const minutosParaHora = useMemo(() => {
    if (!horaSelec) return [];
    return horarios
      .filter((h: any) => new Date(h.inicio).getHours() === parseInt(horaSelec))
      .map((h: any) => new Date(h.inicio).getMinutes())
      .sort((a, b) => a - b);
  }, [horarios, horaSelec]);
  const seleccionado = useMemo(() => {
    if (!horaSelec) return null;
    const mins = parseInt(minutosStr) || 0;
    return horarios.find((h: any) => {
      const d = new Date(h.inicio);
      return d.getHours() === parseInt(horaSelec) && d.getMinutes() === mins;
    }) ?? null;
  }, [horarios, horaSelec, minutosStr]);
  const minutosInvalidos = horaSelec !== "" && minutosStr !== "" && !seleccionado;

  useEffect(() => {
    if (!reunion) return;
    const eeReceptoraId = reunion.solicitanteEeId === eeId ? reunion.receptoraEeId : reunion.solicitanteEeId;
    fetch(`${API}/empresa/horarios?eeId=${eeId}&eeReceptoraId=${eeReceptoraId}&excludeReunionId=${reunion.id}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setDuracionMin(data?.duracionMinutos ?? 0);
        const available = [...new Set(hrs.map((h: any) => new Date(h.inicio).getHours()))].sort((a, b) => a - b) as number[];
        const cur = new Date().getHours();
        const auto = available.find((h) => h >= cur) ?? available[0];
        if (auto !== undefined) { setHoraSelec(String(auto)); setMinutosStr("00"); }
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
  }, [reunion, eeId]);

  const handleGuardar = async () => {
    if (!seleccionado) { setErr("Selecciona un horario válido."); return; }
    setGuardando(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/reuniones/${reunion.id}/cambiar-horario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, inicio: seleccionado.inicio }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message || "Error al cambiar el horario."); }
    finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Cambiar horario</h3>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Hora</label>
                    <select value={horaSelec} onChange={(e) => { setHoraSelec(e.target.value); setMinutosStr("00"); }}
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
              Confirmar cambio
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
  const ahora = new Date();
  const esProgramada = reunion.estado === "PROGRAMADA" && new Date(reunion.fin) > ahora;
  const esFinalizada = reunion.estado === "FINALIZADA" || new Date(reunion.fin) <= ahora;
  const puedeFinalizarEncargado = esEncargado && (reunion.estado === "PROGRAMADA" || reunion.estado === "EN_CURSO");
  const [finalizando, setFinalizando] = useState(false);
  const [errFin, setErrFin] = useState<string | null>(null);
  const [confirmandoFin, setConfirmandoFin] = useState(false);

  const handleFinalizar = async () => {
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
            {reunion.mensaje && <Row label="Mensaje" value={<em className="text-gray-600 font-normal">{reunion.mensaje}</em>} />}
          </div>

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
            {esEncargado && esProgramada && (
              <button onClick={onCambiarHorario}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" />
                Cambiar horario
              </button>
            )}
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
            {esFinalizada && !reunion.miResultado && (
              <Link href={`/empresa/resultados?reunionId=${reunion.id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#449D3A] text-white text-sm font-bold hover:bg-[#3a8531]">
                <Star className="w-4 h-4" />
                Registrar evaluación
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReunionesPage() {
  const router = useRouter();
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eeId, setEeId] = useState<number | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);
  const [filtro, setFiltro] = useState<"todas" | "proximas" | "finalizadas">("todas");
  const [detalleModal, setDetalleModal] = useState<any>(null);
  const [cambiarModal, setCambiarModal] = useState<any>(null);

  const cargarReuniones = useCallback((id: number) => {
    fetch(`${API}/empresa/reuniones?eeId=${id}`)
      .then((r) => r.json())
      .then((data) => setReuniones(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar las reuniones."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        setEeId(ctx.empresaeventoId);
        setEsEncargado(!!ctx.esResponsable);
        cargarReuniones(ctx.empresaeventoId);
      })
      .catch(() => setError("No se pudo cargar el contexto."));
  }, [router, cargarReuniones]);

  const ahora = new Date();
  const filtradas = reuniones.filter((r) => {
    if (filtro === "proximas") return new Date(r.fin) > ahora && r.estado !== "CANCELADA";
    if (filtro === "finalizadas") return r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
    return true;
  });

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
          onOk={() => { setCambiarModal(null); if (eeId) { setLoading(true); cargarReuniones(eeId); } }}
        />
      )}

      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Mis reuniones</h1>
            <p className="text-sm text-gray-400 mt-0.5">{reuniones.length} reuniones confirmadas</p>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(["todas", "proximas", "finalizadas"] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filtro === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}>
                {f === "todas" ? "Todas" : f === "proximas" ? "Próximas" : "Finalizadas"}
              </button>
            ))}
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-4">
              {filtro === "proximas" ? "No tienes reuniones próximas." :
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
          <div className="space-y-4">
            {filtradas.map((r: any) => {
              const esFinalizada = r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
              const esProgramada = r.estado === "PROGRAMADA" && new Date(r.fin) > ahora;
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
                        </div>

                        <p className="font-bold text-gray-900 text-sm truncate">{r.contraparte?.nombre ?? "Empresa"}</p>
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
