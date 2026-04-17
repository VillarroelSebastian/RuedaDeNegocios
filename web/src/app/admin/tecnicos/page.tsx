"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, User, X, Upload, Eye, EyeOff } from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const defaultForm = {
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  correo: '',
  telefono: '',
  contrasenia: '',
  urlFotoPerfil: '',
};

export default function TecnicosPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/tecnicos`);
      setTecnicos(await res.json());
    } catch { setTecnicos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openCreate = () => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); };
  const openEdit = (t: any) => {
    setForm({ nombres: t.nombres, apellidoPaterno: t.apellidoPaterno, apellidoMaterno: t.apellidoMaterno || '', correo: t.correo, telefono: t.telefono, contrasenia: '', urlFotoPerfil: t.urlFotoPerfil || '' });
    setEditId(t.id);
    setShowForm(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setForm((f) => ({ ...f, urlFotoPerfil: data.url }));
    } catch { showError('Error', 'No se pudo subir la foto.'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.nombres || !form.apellidoPaterno || !form.correo || !form.telefono) {
      showError('Campos requeridos', 'Completa nombre, apellido, correo y teléfono.');
      return;
    }
    if (!editId && !form.contrasenia) {
      showError('Contraseña requerida', 'Ingresa una contraseña para el nuevo técnico.');
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API}/admin/tecnicos/${editId}` : `${API}/admin/tecnicos`;
      await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      showSuccess(editId ? 'Técnico actualizado' : 'Técnico creado', 'Los datos se guardaron correctamente.');
      setShowForm(false);
      fetch_();
    } catch (e: any) {
      showError('Error', e.message || 'No se pudo guardar.');
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number, nombre: string) => {
    showConfirm(`¿Eliminar a "${nombre}"?`, 'El técnico no podrá acceder al sistema.', async () => {
      try {
        await fetch(`${API}/admin/tecnicos/${id}`, { method: 'DELETE' });
        showSuccess('Eliminado', 'El técnico fue desactivado.');
        fetch_();
      } catch { showError('Error', 'No se pudo eliminar.'); }
    });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ModalComponent />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Técnicos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los técnicos del evento. Puedes crear sus credenciales de acceso al sistema.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#367d2e] transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Agregar técnico
        </button>
      </div>

      {/* Grid de técnicos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-5 h-28" />)}
        </div>
      ) : tecnicos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No hay técnicos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                {t.urlFotoPerfil
                  ? <img src={t.urlFotoPerfil} alt="" className="w-full h-full object-cover" />
                  : <User className="w-6 h-6 text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{t.nombres} {t.apellidoPaterno}</p>
                <p className="text-xs text-gray-500 truncate">{t.correo}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.telefono}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full uppercase">
                  {t.rolEvento}
                </span>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => openEdit(t)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#449D3A] hover:bg-green-50 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(t.id, `${t.nombres} ${t.apellidoPaterno}`)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar técnico' : 'Nuevo técnico'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {form.urlFotoPerfil
                    ? <img src={form.urlFotoPerfil} alt="" className="w-full h-full object-cover" />
                    : <User className="w-8 h-8 text-gray-400" />
                  }
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#449D3A] hover:underline">
                  {uploading ? 'Subiendo...' : <><Upload className="w-4 h-4" /> Subir foto</>}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombres *</label>
                  <input value={form.nombres} onChange={(e) => set('nombres', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apellido paterno *</label>
                  <input value={form.apellidoPaterno} onChange={(e) => set('apellidoPaterno', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apellido materno</label>
                  <input value={form.apellidoMaterno} onChange={(e) => set('apellidoMaterno', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono *</label>
                  <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico *</label>
                  <input type="email" value={form.correo} onChange={(e) => set('correo', e.target.value)}
                    disabled={!!editId}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] disabled:bg-gray-50 disabled:text-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {editId ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.contrasenia} onChange={(e) => set('contrasenia', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-[#449D3A] text-white font-semibold rounded-xl hover:bg-[#367d2e] disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
