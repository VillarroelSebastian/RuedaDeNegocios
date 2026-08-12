"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Package, Plus, Pencil, Trash2, X, Check, Users, Building2, Upload, QrCode } from "lucide-react";
import { useModal } from "@/components/ui/Modal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type Paquete = {
  id: number;
  nombre: string;
  objetivo: string | null;
  descripcion: string | null;
  contenido: string | null;
  costo: number;
  credencialesIncluidas: number;
  urlQR: string | null;
  orden: number;
  _count?: { empresaevento: number; auspiciador: number };
};

const formVacio = {
  nombre: "", objetivo: "", descripcion: "", contenido: "",
  costo: "", credencialesIncluidas: "2", urlQR: "", orden: "0",
};

export default function PaquetesPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const fileRef = useRef<HTMLInputElement>(null);

  const [lista, setLista] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [form, setForm] = useState(formVacio);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/paquetes`);
      setLista(res.ok ? await res.json() : []);
    } catch {
      showError("Sin conexión", "No se pudieron cargar los paquetes.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...formVacio, orden: String(lista.length + 1) });
    setAbierto(true);
  };

  const abrirEdicion = (p: Paquete) => {
    setEditandoId(p.id);
    setForm({
      nombre: p.nombre,
      objetivo: p.objetivo ?? "",
      descripcion: p.descripcion ?? "",
      contenido: p.contenido ?? "",
      costo: String(Number(p.costo)),
      credencialesIncluidas: String(p.credencialesIncluidas),
      urlQR: p.urlQR ?? "",
      orden: String(p.orden),
    });
    setAbierto(true);
  };

  // El QR de pago se sube como archivo; nunca se pide una URL escrita a mano.
  const subirQR = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.message || "No se pudo subir la imagen.");
      setForm((f) => ({ ...f, urlQR: data.url }));
    } catch (e: any) {
      showError("Error al subir", e.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return showError("Falta un dato", "Escribe el nombre del paquete.");
    if (!(Number(form.costo) >= 0)) return showError("Falta un dato", "Indica el costo del paquete.");
    if (!(Number(form.credencialesIncluidas) >= 1))
      return showError("Falta un dato", "El paquete debe incluir al menos 1 credencial.");

    setGuardando(true);
    try {
      const url = editandoId ? `${API}/admin/paquetes/${editandoId}` : `${API}/admin/paquetes`;
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          costo: Number(form.costo),
          credencialesIncluidas: Number(form.credencialesIncluidas),
          orden: Number(form.orden) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");
      setAbierto(false);
      await cargar();
      showSuccess(editandoId ? "Paquete actualizado" : "Paquete creado",
        `"${form.nombre}" quedó disponible en el formulario de inscripción.`);
    } catch (e: any) {
      showError("No se pudo guardar", e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (p: Paquete) =>
    showConfirm("Eliminar paquete", `¿Quitar "${p.nombre}" del formulario de inscripción?`, async () => {
      try {
        const res = await fetch(`${API}/admin/paquetes/${p.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "No se pudo eliminar.");
        await cargar();
        showSuccess("Paquete eliminado", `"${p.nombre}" ya no aparece en el registro.`);
      } catch (e: any) {
        showError("No se pudo eliminar", e.message);
      }
    });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ModalComponent />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#449D3A]" /> Paquetes de inscripción
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Definen el costo, las credenciales incluidas y el QR de pago del formulario de registro.
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="inline-flex items-center justify-center gap-2 bg-[#449D3A] hover:bg-[#367d2e] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nuevo paquete
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando paquetes…</p>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Todavía no hay paquetes</p>
          <p className="text-sm text-gray-400 mt-1">
            Sin paquetes, el registro usa el monto base del evento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {lista.map((p) => {
            const beneficios = String(p.contenido ?? "").split("\n").filter(Boolean);
            const usos = (p._count?.empresaevento ?? 0) + (p._count?.auspiciador ?? 0);
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-gray-900">{p.nombre}</h3>
                    {p.objetivo && <p className="text-xs text-[#449D3A] font-semibold mt-0.5">{p.objetivo}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirEdicion(p)} title="Editar"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(p)} title="Eliminar"
                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-3xl font-extrabold text-gray-900 mt-3">Bs. {Number(p.costo)}</p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                    <Users className="w-3 h-3" /> {p.credencialesIncluidas} credencial{p.credencialesIncluidas > 1 ? "es" : ""}
                  </span>
                  {usos > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                      <Building2 className="w-3 h-3" /> {usos} inscrito{usos > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${p.urlQR ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
                    <QrCode className="w-3 h-3" /> {p.urlQR ? "QR cargado" : "sin QR"}
                  </span>
                </div>

                {p.descripcion && <p className="text-sm text-gray-500 mt-3">{p.descripcion}</p>}

                {beneficios.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 flex-1">
                    {beneficios.map((b, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-gray-600 leading-snug">
                        <Check className="w-3 h-3 text-[#449D3A] flex-shrink-0 mt-0.5" strokeWidth={3} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-gray-900">{editandoId ? "Editar paquete" : "Nuevo paquete"}</h2>
              <button onClick={() => setAbierto(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input value={form.nombre} maxLength={105}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]"
                    placeholder="Paquete Iténez" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Objetivo</label>
                  <input value={form.objetivo} maxLength={205}
                    onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]"
                    placeholder="Presencia Empresarial" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Costo (Bs.) <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={0} value={form.costo}
                    onChange={(e) => setForm({ ...form, costo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]"
                    placeholder="150" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Credenciales <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={1} value={form.credencialesIncluidas}
                    onChange={(e) => setForm({ ...form, credencialesIncluidas: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Orden</label>
                  <input type="number" min={0} value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#449D3A]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Descripción</label>
                <textarea value={form.descripcion} maxLength={505} rows={2}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#449D3A]"
                  placeholder="Ideal para empresas que…" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Contenido (un beneficio por línea)</label>
                <textarea value={form.contenido} rows={6}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none font-mono text-xs focus:outline-none focus:border-[#449D3A]"
                  placeholder={"Mesa de negocios\nParticipación en el Foro\nCertificado de participación"} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">QR de pago del paquete</label>
                <div className="flex items-center gap-3">
                  {form.urlQR && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={form.urlQR} alt="QR de pago"
                      className="w-20 h-20 object-contain border border-gray-200 rounded-xl bg-white p-1" />
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirQR(f); }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={subiendo}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    <Upload className="w-4 h-4" />
                    {subiendo ? "Subiendo…" : form.urlQR ? "Cambiar QR" : "Subir QR"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setAbierto(false)} disabled={guardando}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 bg-[#449D3A] hover:bg-[#367d2e] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear paquete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
