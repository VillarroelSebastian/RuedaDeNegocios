"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, X, Eye, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

const API = "http://localhost:3334";

function estadoBadge(estado: string) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDIENTE:  { cls: "bg-amber-100 text-amber-700",  label: "Pendiente" },
    COMPLETADO: { cls: "bg-green-100 text-green-700",  label: "Aprobado" },
    RECHAZADO:  { cls: "bg-red-100 text-red-700",      label: "Rechazado" },
    OBSERVADO:  { cls: "bg-orange-100 text-orange-700",label: "Observado" },
  };
  const { cls, label } = map[estado] ?? map.PENDIENTE;
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default function PagosAdicionalesAdminPage() {
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mensajeErr, setMensajeErr] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [modalObs, setModalObs] = useState<{ id: number } | null>(null);
  const [observacion, setObservacion] = useState("");
  const [modalAprobar, setModalAprobar] = useState<number | null>(null);
  const [modalRechazar, setModalRechazar] = useState<{ id: number } | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const url = filtro ? `${API}/admin/pagos-adicionales?estado=${filtro}` : `${API}/admin/pagos-adicionales`;
      const r = await fetch(url);
      const d = await r.json();
      setPagos(Array.isArray(d) ? d : []);
    } catch {
      setMensajeErr("No se pudo cargar los pagos adicionales.");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const confirmarAprobar = async () => {
    if (!modalAprobar) return;
    const id = modalAprobar;
    setModalAprobar(null);
    setProcesando(id);
    try {
      const res = await fetch(`${API}/admin/pagos-adicionales/${id}/aprobar`, { method: "PUT" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setMensaje(`Pago aprobado. Nuevos cupos totales: ${d.nuevoTotalSlots}`);
      setTimeout(() => setMensaje(null), 4000);
      cargar();
    } catch (e: any) { setMensajeErr(e.message); setTimeout(() => setMensajeErr(null), 5000); }
    finally { setProcesando(null); }
  };

  const confirmarRechazar = async () => {
    if (!modalRechazar) return;
    const id = modalRechazar.id;
    const motivo = motivoRechazo.trim() || undefined;
    setModalRechazar(null); setMotivoRechazo("");
    setProcesando(id);
    try {
      const res = await fetch(`${API}/admin/pagos-adicionales/${id}/rechazar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      if (!res.ok) throw new Error("Error al rechazar");
      setMensaje("Pago rechazado.");
      setTimeout(() => setMensaje(null), 3000);
      cargar();
    } catch (e: any) { setMensajeErr(e.message); setTimeout(() => setMensajeErr(null), 5000); }
    finally { setProcesando(null); }
  };

  const observar = async () => {
    if (!modalObs) return;
    if (!observacion.trim()) { setMensajeErr("La observacion es requerida"); return; }
    setProcesando(modalObs.id);
    try {
      const res = await fetch(`${API}/admin/pagos-adicionales/${modalObs.id}/observar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacion }),
      });
      if (!res.ok) throw new Error("Error al observar");
      setMensaje("Observacion registrada.");
      setTimeout(() => setMensaje(null), 3000);
      setModalObs(null);
      setObservacion("");
      cargar();
    } catch (e: any) { setMensajeErr(e.message); setTimeout(() => setMensajeErr(null), 5000); }
    finally { setProcesando(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Modal confirmar aprobar */}
      {modalAprobar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900">Aprobar pago adicional</h3>
                <p className="text-sm text-gray-500">Se incrementarán los cupos de la empresa.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalAprobar(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarAprobar} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal rechazar con motivo */}
      {modalRechazar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-extrabold text-gray-900">Rechazar pago adicional</h3>
            <p className="text-sm text-gray-500">Indica el motivo del rechazo (opcional).</p>
            <textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3} placeholder="Motivo del rechazo..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setModalRechazar(null); setMotivoRechazo(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarRechazar} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">Rechazar</button>
            </div>
          </div>
        </div>
      )}
      {modalObs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-extrabold text-gray-900">Agregar observacion</h3>
            <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)}
              rows={4} placeholder="Describe el motivo de la observacion..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setModalObs(null); setObservacion(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={observar} disabled={!!procesando}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50">
                Guardar observacion
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Pagos Adicionales</h1>
          <p className="text-sm text-gray-500 mt-1">Solicitudes de cupos adicionales de las empresas</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl">
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      {mensaje && <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm"><CheckCircle2 className="w-4 h-4 shrink-0" />{mensaje}</div>}
      {mensajeErr && <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{mensajeErr}</div>}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["", "PENDIENTE", "COMPLETADO", "RECHAZADO", "OBSERVADO"].map((e) => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filtro === e ? 'bg-[#449D3A] text-white border-[#449D3A]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#449D3A]'}`}>
            {e || "Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" /></div>
      ) : pagos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-400">No hay pagos adicionales {filtro ? `con estado ${filtro}` : ""}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Empresa</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Cupos</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Monto</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagos.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{p.empresa?.nombre ?? `EE #${p.eeId}`}</p>
                      <p className="text-xs text-gray-400">{p.empresa?.rubro ?? ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">+{p.cantidadParticipantes}</span>
                      <span className="text-xs text-gray-400 ml-1">cupos</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {p.montoPago != null ? `Bs. ${Number(p.montoPago).toFixed(2)}` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {estadoBadge(p.estadoPago)}
                      {p.observacion && <p className="text-xs text-amber-600 mt-1 max-w-[200px] truncate">{p.observacion}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(p.fechaCreacion).toLocaleDateString("es-BO")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {p.urlComprobante && (
                          <a href={p.urlComprobante} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-[#449D3A] font-bold hover:underline">
                            <Eye className="w-3.5 h-3.5" />Ver
                          </a>
                        )}
                        {p.estadoPago === 'PENDIENTE' && (
                          <>
                            <button onClick={() => setModalAprobar(p.id)} disabled={procesando === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-bold disabled:opacity-50">
                              <Check className="w-3.5 h-3.5" />Aprobar
                            </button>
                            <button onClick={() => setModalObs({ id: p.id })} disabled={procesando === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold disabled:opacity-50">
                              <AlertCircle className="w-3.5 h-3.5" />Observar
                            </button>
                            <button onClick={() => setModalRechazar({ id: p.id })} disabled={procesando === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold disabled:opacity-50">
                              <X className="w-3.5 h-3.5" />Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
