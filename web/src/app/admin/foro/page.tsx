"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { UserPlus, Plus, Pencil, Trash2, X, Mail, Phone, Package, Eye, Clock, CheckCircle, AlertCircle, XCircle, CreditCard, Users } from "lucide-react";
import { useModal } from "@/components/ui/Modal";
import ImagenLightbox from "@/components/ui/ImagenLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Paquete = { id: number; nombre: string; costo: number; urlQR?: string | null };
type ForoUsuario = {
  id: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string;
  empresa_usuario: {
    id: number;
    cargo: string | null;
    empresaevento: { id: number; estadoHabilitacionAcceso: string; paquete: { nombre: string } | null };
  }[];
};

const formVacio = { nombres: "", apellidoPaterno: "", apellidoMaterno: "", correo: "", telefono: "", cargo: "", paquete_id: "" };

const PAGO_TABS = [
  { value: '', label: 'Todos', icon: CreditCard },
  { value: 'PENDIENTE', label: 'Pendientes', icon: Clock },
  { value: 'COMPLETADO', label: 'Aprobados', icon: CheckCircle },
  { value: 'OBSERVADO', label: 'Observados', icon: AlertCircle },
  { value: 'RECHAZADO', label: 'Rechazados', icon: XCircle },
];

function badgeEstadoPago(estado: string) {
  const map: Record<string, { cls: string; label: string }> = {
    COMPLETADO: { cls: 'bg-green-100 text-green-700', label: 'Aprobado' },
    PENDIENTE: { cls: 'bg-orange-100 text-orange-700', label: 'Pendiente' },
    OBSERVADO: { cls: 'bg-yellow-100 text-yellow-700', label: 'Observado' },
    RECHAZADO: { cls: 'bg-red-100 text-red-700', label: 'Rechazado' },
  };
  const b = map[estado] || { cls: 'bg-gray-100 text-gray-600', label: estado };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${b.cls}`}>{b.label}</span>;
}

/* ─── Pagos de foro: reutiliza admin/pagos/[id] para aprobar/observar/rechazar ─── */
function PagosForoPanel({ paquetes }: { paquetes: Paquete[] }) {
  const [pagos, setPagos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('PENDIENTE');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo: 'FORO', limit: '50', ...(tab && { estado: tab }) });
      const res = await fetch(`${API}/admin/pagos?${params}`);
      const data = await res.json();
      setPagos(data.data || []);
      setTotal(data.total || 0);
    } catch { setPagos([]); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { cargar(); }, [cargar]);

  const paquete = paquetes[0];

  return (
    <div>
      {/* Precio y QR de pago: se configuran en Admin > Paquetes (tipo Foro) */}
      {paquete ? (
        <div className="mb-5 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
          {paquete.urlQR && (
            <ImagenLightbox src={paquete.urlQR} alt="QR de pago" className="w-20 h-20 rounded-lg border border-gray-200 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{paquete.nombre} — Bs. {Number(paquete.costo)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {paquete.urlQR ? 'Este es el QR de pago que ven quienes se registran como Foro.' : 'Este paquete todavía no tiene un QR de pago cargado.'}
            </p>
          </div>
          <Link href="/admin/paquetes" className="shrink-0 text-sm font-bold text-[#449D3A] hover:underline">
            {paquete.urlQR ? 'Editar precio / QR →' : 'Subir QR de pago →'}
          </Link>
        </div>
      ) : (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
          <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Todavía no configuraste el precio ni el QR de pago para Foro.</p>
            <p className="text-xs text-amber-700 mt-0.5">Quienes se registren no verán ningún costo ni QR hasta que crees un paquete de tipo Foro.</p>
          </div>
          <Link href="/admin/paquetes" className="shrink-0 text-sm font-bold text-amber-800 hover:underline">
            Crear paquete de Foro →
          </Link>
        </div>
      )}

      <div className="mb-5 max-w-full">
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          {PAGO_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`flex min-w-[100px] flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando...</p>
      ) : pagos.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No hay pagos en esta categoría</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Persona</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Institución</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha envío</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagos.map((pago) => {
                  const persona = pago.empresa_usuario?.[0]?.usuario;
                  return (
                    <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <p className="text-sm font-semibold text-gray-900">{persona ? `${persona.nombres} ${persona.apellidoPaterno}` : '—'}</p>
                        <p className="text-[11px] text-gray-400">{persona?.correo}</p>
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-600">{pago.empresa?.nombre}</td>
                      <td className="py-4 px-5 text-sm font-semibold text-gray-900">
                        {pago.montoPagado ? `${Number(pago.montoPagado).toLocaleString('es-BO')} BOB` : '—'}
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-500">
                        {pago.fechaHoraEnvioComprobante ? new Date(pago.fechaHoraEnvioComprobante).toLocaleDateString('es-BO') : '—'}
                      </td>
                      <td className="py-4 px-5">{badgeEstadoPago(pago.estadoVerificacionPago)}</td>
                      <td className="py-4 px-5">
                        <Link href={`/admin/pagos/${pago.id}`}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#449D3A] border border-[#449D3A] hover:bg-green-50 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Verificar
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">{total} registro(s)</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForoPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();

  const [vista, setVista] = useState<'usuarios' | 'pagos'>('pagos');
  const [lista, setLista] = useState<ForoUsuario[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(formVacio);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch(`${API}/admin/foro-usuarios`),
        fetch(`${API}/admin/paquetes?tipo=FORO`),
      ]);
      setLista(uRes.ok ? await uRes.json() : []);
      setPaquetes(pRes.ok ? await pRes.json() : []);
    } catch {
      showError("Sin conexión", "No se pudo cargar la lista de usuarios de foro.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => { setEditandoId(null); setForm(formVacio); setAbierto(true); };

  const abrirEdicion = (u: ForoUsuario) => {
    setEditandoId(u.id);
    setForm({
      nombres: u.nombres, apellidoPaterno: u.apellidoPaterno, apellidoMaterno: u.apellidoMaterno ?? "",
      correo: u.correo, telefono: u.telefono, cargo: u.empresa_usuario[0]?.cargo ?? "", paquete_id: "",
    });
    setAbierto(true);
  };

  const guardar = async () => {
    if (!form.nombres.trim() || !form.apellidoPaterno.trim()) return showError("Falta un dato", "Escribe el nombre y el apellido.");
    if (!editandoId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) return showError("Falta un dato", "Escribe un correo válido.");
    if (!form.telefono.trim()) return showError("Falta un dato", "Escribe un teléfono.");

    setGuardando(true);
    try {
      const url = editandoId ? `${API}/admin/foro-usuarios/${editandoId}` : `${API}/admin/foro-usuarios`;
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");
      setAbierto(false);
      await cargar();
      if (!editandoId) {
        showSuccess("Usuario de foro creado",
          data.correoEnviado
            ? `Se envió la contraseña temporal a ${data.correo}.`
            : `El usuario se creó, pero no se pudo enviar el correo a ${data.correo}. Comparte el acceso manualmente.`);
      } else {
        showSuccess("Usuario actualizado", "Los datos se guardaron correctamente.");
      }
    } catch (e: any) {
      showError("No se pudo guardar", e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (u: ForoUsuario) =>
    showConfirm("Quitar del evento", `¿Quitar a "${u.nombres} ${u.apellidoPaterno}" del foro de este evento?`, async () => {
      try {
        const res = await fetch(`${API}/admin/foro-usuarios/${u.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo eliminar.");
        await cargar();
        showSuccess("Usuario quitado", `"${u.nombres} ${u.apellidoPaterno}" ya no tiene acceso al evento.`);
      } catch (e: any) {
        showError("No se pudo eliminar", e.message);
      }
    });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <ModalComponent />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-[#449D3A]" /> Foro · Personal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifica los pagos de las inscripciones de foro, o crea usuarios directamente sin pasar por pago.
          </p>
        </div>
        {vista === 'usuarios' && (
          <button onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Nuevo usuario de foro
          </button>
        )}
      </div>

      <div className="mb-6 max-w-md">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <button onClick={() => setVista('pagos')}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              vista === 'pagos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <CreditCard className="w-4 h-4" /> Verificar pagos
          </button>
          <button onClick={() => setVista('usuarios')}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              vista === 'usuarios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Users className="w-4 h-4" /> Alta directa
          </button>
        </div>
      </div>

      {vista === 'pagos' ? <PagosForoPanel paquetes={paquetes} /> : loading ? (
        <p className="text-center text-gray-400 py-12">Cargando...</p>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
          <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Todavía no hay usuarios de foro</p>
          <p className="text-sm text-gray-400 mt-1">Crea el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {lista.map((u) => {
            const eu = u.empresa_usuario[0];
            return (
              <div key={u.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-gray-900">{u.nombres} {u.apellidoPaterno}</h3>
                    {eu?.cargo && <p className="text-xs text-[#449D3A] font-semibold mt-0.5">{eu.cargo}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirEdicion(u)} title="Editar"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(u)} title="Quitar"
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {u.correo}</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {u.telefono}</span>
                  {eu?.empresaevento.paquete && (
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-gray-400" /> {eu.empresaevento.paquete.nombre}</span>
                  )}
                </div>

                <span className={`inline-flex items-center self-start gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-3 ${
                  eu?.empresaevento.estadoHabilitacionAcceso === 'HABILITADO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {eu?.empresaevento.estadoHabilitacionAcceso === 'HABILITADO' ? 'Habilitado' : 'No habilitado'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-gray-900">{editandoId ? "Editar usuario de foro" : "Nuevo usuario de foro"}</h2>
              <button onClick={() => setAbierto(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombres <span className="text-red-500">*</span></label>
                  <input value={form.nombres} maxLength={105}
                    onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Apellido paterno <span className="text-red-500">*</span></label>
                  <input value={form.apellidoPaterno} maxLength={65}
                    onChange={(e) => setForm({ ...form, apellidoPaterno: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Apellido materno</label>
                  <input value={form.apellidoMaterno} maxLength={65}
                    onChange={(e) => setForm({ ...form, apellidoMaterno: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Cargo</label>
                  <input value={form.cargo} maxLength={100}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Correo <span className="text-red-500">*</span>{editandoId && <span className="text-gray-400 font-normal"> (no se puede cambiar)</span>}
                </label>
                <input value={form.correo} type="email" disabled={!!editandoId} maxLength={105}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A] disabled:bg-gray-50 disabled:text-gray-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono <span className="text-red-500">*</span></label>
                <input value={form.telefono} maxLength={45}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
              </div>

              {!editandoId && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Paquete (opcional)</label>
                  <select value={form.paquete_id} onChange={(e) => setForm({ ...form, paquete_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A] bg-white">
                    <option value="">Sin paquete</option>
                    {paquetes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — Bs. {Number(p.costo)}</option>)}
                  </select>
                  {paquetes.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      No hay paquetes de tipo Foro creados todavía. Puedes crear el usuario sin paquete.
                    </p>
                  )}
                </div>
              )}

              {!editandoId && (
                <p className="text-xs text-gray-400">
                  Se genera una contraseña temporal y se envía por correo. El acceso queda habilitado de inmediato, sin pasar por verificación de pago.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setAbierto(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="px-5 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold disabled:opacity-60">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
