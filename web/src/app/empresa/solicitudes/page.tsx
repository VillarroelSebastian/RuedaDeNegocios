"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  Monitor, Users, Calendar, X, Table2, Ban,
} from "lucide-react";

const API = "http://localhost:3334";
const POLL_MS = 5000; // tabla polling cada 5 s

function estadoBadge(estado: string) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    PENDIENTE: { cls: "bg-amber-100 text-amber-700",   Icon: Clock,        label: "Pendiente"  },
    ACEPTADA:  { cls: "bg-green-100 text-green-700",   Icon: CheckCircle2, label: "Aceptada"   },
    RECHAZADA: { cls: "bg-red-100 text-red-700",       Icon: XCircle,      label: "Rechazada"  },
    CANCELADA: { cls: "bg-gray-100 text-gray-500",     Icon: Ban,          label: "Cancelada"  },
  };
  const { cls, Icon, label } = map[estado] ?? map.PENDIENTE;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function formatDT(dt: string) {
  return new Date(dt).toLocaleString("es-BO", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

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

function NuevaSolicitudModal({ ctx, receptoraId, receptoraNombre, onClose, onCreada }: {
  ctx: any; receptoraId: number; receptoraNombre: string; onClose: () => void; onCreada: () => void;
}) {
  const [tipo, setTipo] = useState<"PRESENCIAL" | "VIRTUAL">("PRESENCIAL");
  const [franjas, setFranjas] = useState<any[]>([]);
  const [franja, setFranja] = useState<any>(null);
  const [mesa, setMesa] = useState<number | null>(null);
  const [mesaInvalida, setMesaInvalida] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargandoFranjas, setCargandoFranjas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ctx) return;
    setCargandoFranjas(true);
    setFranja(null); setMesa(null); setMesaInvalida(false);
    fetch(`${API}/empresa/horarios?eeId=${ctx.empresaeventoId}&eeReceptoraId=${receptoraId}`)
      .then((r) => r.json())
      .then((data) => setFranjas(Array.isArray(data) ? data : []))
      .catch(() => setFranjas([]))
      .finally(() => setCargandoFranjas(false));
  }, [ctx, receptoraId]);

  const handleSubmit = async () => {
    setErr(null);
    if (!franja) { setErr("Selecciona un horario disponible."); return; }
    if (tipo === "PRESENCIAL" && !mesa) { setErr("Selecciona una mesa."); return; }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/empresa/solicitudes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eeId: ctx.empresaeventoId, eeReceptoraId: receptoraId, euId: ctx.empresaUsuarioId,
          tipo, inicio: franja.inicio, fin: franja.fin,
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

  const disponibles = franjas.filter((f) => f.disponible);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-gray-900">Nueva solicitud de reunión</h2>
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
                <button key={t} onClick={() => { setTipo(t); setFranja(null); setMesa(null); }}
                  className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    tipo === t ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {t === "PRESENCIAL" ? <Users className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  {t === "PRESENCIAL" ? "Presencial" : "Virtual"}
                </button>
              ))}
            </div>
          </div>

          {/* Franja horaria */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Horario disponible</label>
            {cargandoFranjas ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />Cargando...
              </div>
            ) : disponibles.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                No hay horarios disponibles entre estas dos empresas.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {disponibles.map((f: any, i: number) => (
                  <button key={i} onClick={() => { setFranja(f); setMesa(null); setMesaInvalida(false); }}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      franja?.inicio === f.inicio ? "border-[#449D3A] bg-green-50 text-[#449D3A]" : "border-gray-200 text-gray-600 hover:border-green-300"
                    }`}>
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatDT(f.inicio)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mesa con polling */}
          {tipo === "PRESENCIAL" && franja && (
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
                inicio={franja.inicio} fin={franja.fin}
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
              disabled={enviando || !franja || (tipo === "PRESENCIAL" && !mesa)}
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

// ── Rechazar Modal ──────────────────────────────────────────────────────────

function RechazarModal({ sol, eeId, onClose, onOk }: { sol: any; eeId: number; onClose: () => void; onOk: () => void }) {
  const [motivo, setMotivo] = useState(""); const [loading, setLoading] = useState(false); const [err, setErr] = useState<string | null>(null);
  const ok = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${sol.id}/rechazar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, motivo }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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

// ── Aceptar Modal ───────────────────────────────────────────────────────────

function AceptarModal({ sol, eeId, onClose, onOk }: { sol: any; eeId: number; onClose: () => void; onOk: () => void }) {
  const [mesa, setMesa] = useState<number | null>(null);
  const [mesaInvalida, setMesaInvalida] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ok = async () => {
    if (sol.tipo === "PRESENCIAL" && !mesa) { setErr("Selecciona una mesa."); return; }
    setEnviando(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${sol.id}/aceptar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, mesaId: mesa }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message); } finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-extrabold text-gray-900">Aceptar solicitud</h3>
        <p className="text-sm text-gray-500">De <span className="font-bold">{sol.solicitante?.nombre}</span> — {formatDT(sol.inicio)}</p>

        {sol.tipo === "PRESENCIAL" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selecciona una mesa</label>
              <span className="text-[10px] text-gray-400">Actualización cada 5 s</span>
            </div>
            {mesaInvalida && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-xl p-2 text-xs mb-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                La mesa seleccionada ya no está disponible.
              </div>
            )}
            <MesaPicker
              inicio={sol.inicio} fin={sol.fin}
              value={mesa} onChange={setMesa}
              onUnavailable={() => { setMesa(null); setMesaInvalida(true); }}
            />
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={ok} disabled={enviando || (sol.tipo === "PRESENCIAL" && !mesa)}
            className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
            {enviando ? "Aceptando..." : "Confirmar reunión"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contenido principal ─────────────────────────────────────────────────────

function SolicitudesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ctx, setCtx] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"enviadas" | "recibidas">("enviadas");
  const [modalNueva, setModalNueva] = useState<{ id: number; nombre: string } | null>(null);
  const [modalRechazar, setModalRechazar] = useState<any | null>(null);
  const [modalAceptar, setModalAceptar] = useState<any | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarSolicitudes = (eeId: number) =>
    fetch(`${API}/empresa/solicitudes?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setSolicitudes(Array.isArray(d) ? d : []));

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => { setCtx(c); return cargarSolicitudes(c.empresaeventoId); })
      .catch(() => setError("No se pudo cargar las solicitudes."))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const nueva = searchParams.get("nueva");
    const rid = searchParams.get("receptoraId");
    const rnom = searchParams.get("receptoraNombre");
    if (nueva === "1" && rid && rnom) {
      setModalNueva({ id: Number(rid), nombre: decodeURIComponent(rnom) });
      setTab("enviadas");
    }
  }, [searchParams]);

  const recargar = () => { if (ctx) cargarSolicitudes(ctx.empresaeventoId).catch(() => {}); };

  const handleCancelar = async (solId: number) => {
    if (!ctx) return;
    setCancelando(solId);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${solId}/cancelar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId: ctx.empresaeventoId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? "Error al cancelar");
      setMensajeExito("Solicitud cancelada correctamente.");
      setTimeout(() => setMensajeExito(null), 4000);
      recargar();
    } catch (e: any) { alert(e.message); }
    finally { setCancelando(null); }
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

  const enviadas  = solicitudes.filter((s) => s.esMiSolicitud);
  const recibidas = solicitudes.filter((s) => !s.esMiSolicitud);
  const lista     = tab === "enviadas" ? enviadas : recibidas;

  return (
    <>
      {modalNueva && ctx && (
        <NuevaSolicitudModal ctx={ctx} receptoraId={modalNueva.id} receptoraNombre={modalNueva.nombre}
          onClose={() => setModalNueva(null)}
          onCreada={() => { setModalNueva(null); setMensajeExito("Solicitud enviada correctamente."); setTimeout(() => setMensajeExito(null), 4000); recargar(); }} />
      )}
      {modalRechazar && ctx && (
        <RechazarModal sol={modalRechazar} eeId={ctx.empresaeventoId}
          onClose={() => setModalRechazar(null)}
          onOk={() => { setModalRechazar(null); setMensajeExito("Solicitud rechazada."); setTimeout(() => setMensajeExito(null), 4000); recargar(); }} />
      )}
      {modalAceptar && ctx && (
        <AceptarModal sol={modalAceptar} eeId={ctx.empresaeventoId}
          onClose={() => setModalAceptar(null)}
          onOk={() => { setModalAceptar(null); setMensajeExito("¡Reunión confirmada!"); setTimeout(() => setMensajeExito(null), 4000); recargar(); }} />
      )}

      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900">Solicitudes de reunión</h1>
          <button onClick={() => router.push("/empresa/empresas")}
            className="flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Send className="w-4 h-4" />
            Nueva solicitud
          </button>
        </div>

        {mensajeExito && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{mensajeExito}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
          {(["enviadas", "recibidas"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "enviadas" ? `Enviadas (${enviadas.length})` : `Recibidas (${recibidas.length})`}
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{tab === "enviadas" ? "No has enviado solicitudes aún." : "No has recibido solicitudes."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((sol: any) => (
              <div key={sol.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Advertencia de conflicto */}
                {sol.tieneConflicto && (
                  <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-5 py-2 text-xs font-bold text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Conflicto: hay otra solicitud pendiente para el mismo horario. Solo puedes aceptar una.
                  </div>
                )}
                <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {estadoBadge(sol.estado)}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sol.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                        {sol.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                      </span>
                      {sol.reunion?.mesa?.numeroMesa && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Table2 className="w-3 h-3" />Mesa {sol.reunion.mesa.numeroMesa}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">
                      {tab === "enviadas" ? `→ ${sol.receptora?.nombre ?? "Empresa"}` : `← ${sol.solicitante?.nombre ?? "Empresa"}`}
                    </p>
                    {sol.inicio && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />{formatDT(sol.inicio)}
                      </p>
                    )}
                    {sol.mensaje && <p className="text-xs text-gray-400 mt-1.5 italic line-clamp-2">"{sol.mensaje}"</p>}
                    {sol.motivo && <p className="text-xs text-red-500 mt-1.5">Motivo: {sol.motivo}</p>}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 shrink-0">
                    {/* Recibida PENDIENTE: aceptar/rechazar */}
                    {tab === "recibidas" && sol.estado === "PENDIENTE" && (
                      <>
                        <button onClick={() => setModalAceptar(sol)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold rounded-xl transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />Aceptar
                        </button>
                        <button onClick={() => setModalRechazar(sol)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold rounded-xl transition-colors">
                          <XCircle className="w-3.5 h-3.5" />Rechazar
                        </button>
                      </>
                    )}
                    {/* Enviada PENDIENTE: cancelar */}
                    {tab === "enviadas" && sol.estado === "PENDIENTE" && (
                      <button onClick={() => handleCancelar(sol.id)} disabled={cancelando === sol.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors disabled:opacity-50">
                        <Ban className="w-3.5 h-3.5" />
                        {cancelando === sol.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function SolicitudesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" /></div>}>
      <SolicitudesContent />
    </Suspense>
  );
}
