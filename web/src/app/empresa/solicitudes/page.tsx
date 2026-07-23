"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send, Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  Monitor, Users, Calendar, X, Table2, Ban,
} from "lucide-react";
import { NuevaSolicitudModal } from "@/components/empresa/NuevaSolicitudModal";
import { ModalExito } from "@/components/empresa/ModalExito";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
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

// ── Aceptar Modal ───────────────────────────────────────────────────────────

function AceptarModal({ sol, eeId, onClose, onOk }: { sol: any; eeId: number; onClose: () => void; onOk: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ok = async () => {
    setEnviando(true); setErr(null);
    try {
      const res = await fetch(`${API}/empresa/solicitudes/${sol.id}/aceptar`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) { setErr(e.message); } finally { setEnviando(false); }
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
          {/* Info de la reunión */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#449D3A] shrink-0" />
              <span className="text-xs text-gray-500 w-24 shrink-0">Empresa</span>
              <span className="text-sm font-bold text-gray-900">{sol.solicitante?.nombre ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#449D3A] shrink-0" />
              <span className="text-xs text-gray-500 w-24 shrink-0">Fecha y hora</span>
              <span className="text-sm font-semibold text-gray-900">{formatDT(sol.inicio)}</span>
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
            {sol.enlace && (
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs text-gray-500 w-24 shrink-0">Enlace</span>
                <a href={sol.enlace} target="_blank" rel="noreferrer" className="text-xs text-purple-600 font-semibold hover:underline truncate">{sol.enlace}</a>
              </div>
            )}
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

// ── Detalle Modal ────────────────────────────────────────────────────────────

const STATUS_LEFT: Record<string, string> = {
  PENDIENTE: "border-l-amber-400",
  ACEPTADA:  "border-l-[#449D3A]",
  RECHAZADA: "border-l-red-400",
  CANCELADA: "border-l-gray-300",
};

function DetalleSolicitudModal({ sol, tab, eeId, onClose, onAceptar, onRechazar, onCancelar }: {
  sol: any; tab: "enviadas" | "recibidas"; eeId: number;
  onClose: () => void; onAceptar: () => void; onRechazar: () => void; onCancelar: () => void;
}) {
  const empresa = tab === "enviadas" ? sol.receptora : sol.solicitante;
  const isPendiente = sol.estado === "PENDIENTE";

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-28 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm font-semibold text-gray-800 flex-1">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900">Detalle de solicitud</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {tab === "enviadas" ? "Solicitud enviada" : "Solicitud recibida"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {estadoBadge(sol.estado)}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sol.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {sol.tipo === "PRESENCIAL" ? <><Users className="w-3 h-3 inline mr-1" />Presencial</> : <><Monitor className="w-3 h-3 inline mr-1" />Virtual</>}
            </span>
          </div>

          {/* Conflict warning */}
          {sol.tieneConflicto && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Hay otra solicitud pendiente para el mismo horario. Solo puedes aceptar una.
            </div>
          )}

          {/* Info rows */}
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
                {formatDT(sol.inicio)}
              </span>
            </Row>
            {sol.reunion?.mesa?.numeroMesa && (
              <Row label="Mesa">
                <span className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  Mesa {sol.reunion.mesa.numeroMesa}
                </span>
              </Row>
            )}
            {sol.tipo === "PRESENCIAL" && sol.mesa?.numeroMesa && (
              <Row label="Mesa elegida">
                <span className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  Mesa {sol.mesa.numeroMesa}
                </span>
              </Row>
            )}
            {sol.enlace && (
              <Row label="Enlace">
                <a href={sol.enlace} target="_blank" rel="noreferrer"
                  className="text-[#449D3A] font-bold hover:underline flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />Unirse a la reunión
                </a>
              </Row>
            )}
            {sol.mensaje && (
              <Row label="Mensaje">
                <em className="text-gray-600 font-normal">"{sol.mensaje}"</em>
              </Row>
            )}
            {sol.motivo && (
              <Row label="Motivo de rechazo">
                <span className="text-red-600">{sol.motivo}</span>
              </Row>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {tab === "recibidas" && isPendiente && (
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
            )}
            {tab === "enviadas" && isPendiente && (
              <button onClick={onCancelar}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-bold text-gray-600 transition-colors">
                <Ban className="w-4 h-4" />Cancelar solicitud
              </button>
            )}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 text-sm font-bold text-gray-400 transition-colors">
              Cerrar
            </button>
          </div>
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
  const [modalDetalle, setModalDetalle] = useState<any | null>(null);
  const [modalRechazar, setModalRechazar] = useState<any | null>(null);
  const [modalAceptar, setModalAceptar] = useState<any | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const cargarSolicitudes = (eeId: number) =>
    fetch(`${API}/empresa/solicitudes?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setSolicitudes(Array.isArray(d) ? d : []));

  const toast = (tipo: "ok" | "err", msg: string) => {
    setToastMsg({ tipo, msg });
    setTimeout(() => setToastMsg(null), 4000);
  };

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
      setModalDetalle(null);
      toast("ok", "Solicitud cancelada correctamente.");
      recargar();
    } catch (e: any) { toast("err", e.message); }
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
          onCreada={() => {
            setModalNueva(null);
            setExitoMsg("Tu solicitud de reunión fue enviada correctamente. Te avisaremos cuando la empresa responda.");
            recargar();
          }} />
      )}
      {exitoMsg && (
        <ModalExito titulo="¡Solicitud enviada!" mensaje={exitoMsg} onClose={() => setExitoMsg(null)} />
      )}
      {modalRechazar && ctx && (
        <RechazarModal sol={modalRechazar} eeId={ctx.empresaeventoId}
          onClose={() => setModalRechazar(null)}
          onOk={() => { setModalRechazar(null); setModalDetalle(null); toast("ok", "Solicitud rechazada."); recargar(); }} />
      )}
      {modalAceptar && ctx && (
        <AceptarModal sol={modalAceptar} eeId={ctx.empresaeventoId}
          onClose={() => setModalAceptar(null)}
          onOk={() => { setModalAceptar(null); setModalDetalle(null); toast("ok", "¡Reunión confirmada!"); recargar(); }} />
      )}
      {modalDetalle && ctx && (
        <DetalleSolicitudModal
          sol={modalDetalle} tab={tab} eeId={ctx.empresaeventoId}
          onClose={() => setModalDetalle(null)}
          onAceptar={() => { setModalAceptar(modalDetalle); }}
          onRechazar={() => { setModalRechazar(modalDetalle); }}
          onCancelar={() => handleCancelar(modalDetalle.id)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Solicitudes de reunión</h1>
            <p className="text-sm text-gray-400 mt-0.5">{solicitudes.length} solicitudes en total</p>
          </div>
          <button onClick={() => router.push("/empresa/empresas")}
            className="flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Send className="w-4 h-4" />
            Nueva solicitud
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
            toastMsg.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {toastMsg.tipo === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toastMsg.msg}
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

        {/* List */}
        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">
              {tab === "enviadas" ? "No has enviado solicitudes aún." : "No has recibido solicitudes."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((sol: any) => {
              const empresa = tab === "enviadas" ? sol.receptora : sol.solicitante;
              const initial = (empresa?.nombre ?? "E")[0].toUpperCase();
              const leftCls = STATUS_LEFT[sol.estado] ?? "border-l-gray-200";

              return (
                <div
                  key={sol.id}
                  onClick={() => setModalDetalle(sol)}
                  className={`w-full bg-white rounded-2xl border border-gray-100 border-l-4 ${leftCls} shadow-sm overflow-hidden text-left hover:shadow-md transition-all active:scale-[0.995] group cursor-pointer`}
                >
                  {/* Conflict banner */}
                  {sol.tieneConflicto && (
                    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-5 py-2 text-xs font-bold text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Conflicto de horario — revisa antes de aceptar
                    </div>
                  )}

                  <div className="p-5 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-[#449D3A]/10 flex items-center justify-center shrink-0 font-bold text-[#449D3A] text-lg">
                      {initial}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {estadoBadge(sol.estado)}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sol.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                          {sol.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                        </span>
                        {(sol.reunion?.mesa?.numeroMesa || sol.mesa?.numeroMesa) && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Table2 className="w-2.5 h-2.5" />
                            Mesa {sol.reunion?.mesa?.numeroMesa ?? sol.mesa?.numeroMesa}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-gray-900 text-sm truncate">{empresa?.nombre ?? "Empresa"}</p>

                      {sol.inicio && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {formatDT(sol.inicio)}
                        </p>
                      )}

                      {sol.mensaje && (
                        <p className="text-xs text-gray-400 mt-1 italic truncate">"{sol.mensaje}"</p>
                      )}
                      {sol.motivo && (
                        <p className="text-xs text-red-400 mt-1 truncate">Motivo: {sol.motivo}</p>
                      )}
                    </div>

                    {/* Quick actions or chevron */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {tab === "recibidas" && sol.estado === "PENDIENTE" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setModalAceptar(sol); }}
                            className="p-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 transition-colors" title="Aceptar">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setModalRechazar(sol); }}
                            className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 transition-colors" title="Rechazar">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {tab === "enviadas" && sol.estado === "PENDIENTE" && (
                        <button onClick={(e) => { e.stopPropagation(); handleCancelar(sol.id); }}
                          disabled={cancelando === sol.id}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors disabled:opacity-50" title="Cancelar">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <svg className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
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
