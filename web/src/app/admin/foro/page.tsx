"use client";

import React, { useEffect, useState, useCallback } from "react";
import { UserPlus, Plus, Pencil, Trash2, X, Mail, Phone, Package } from "lucide-react";
import { useModal } from "@/components/ui/Modal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Paquete = { id: number; nombre: string; costo: number };
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

export default function ForoPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();

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
            Alta directa de inscripciones individuales de foro: se crea el acceso ya habilitado, sin pasar por pago.
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="inline-flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nuevo usuario de foro
        </button>
      </div>

      {loading ? (
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
