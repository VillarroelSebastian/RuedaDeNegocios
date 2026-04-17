"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, X } from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

const TIPOS = ['Seminario', 'Taller', 'Actividad', 'Conferencia', 'Panel'];
const ESTADOS = ['Activo', 'Inactivo'];

const badgeTipo = (tipo: string) => {
  const map: Record<string, string> = {
    Seminario: 'bg-purple-100 text-purple-700',
    Taller: 'bg-blue-100 text-blue-700',
    Actividad: 'bg-green-100 text-green-700',
    Conferencia: 'bg-orange-100 text-orange-700',
    Panel: 'bg-pink-100 text-pink-700',
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[tipo] || 'bg-gray-100 text-gray-600'}`}>{tipo}</span>;
};

const defaultForm = {
  tipoActividad: 'Seminario',
  nombreActividad: '',
  descripcionActividad: '',
  nombreSalaEspacio: '',
  capacidadPersonasSala: '',
  fechaActividad: '',
  horaInicioActividad: '',
  horaFinActividad: '',
  nombreCompletoPilaExpositor: '',
  organizacionDelExpositor: '',
  estadoActividad: 'Activo',
  urlImagenBannerActividad: '',
};

export default function ActividadesPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/actividades`);
      setActividades(await res.json());
    } catch { setActividades([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openCreate = () => { setForm({ ...defaultForm }); setEditId(null); setShowForm(true); };

  const openEdit = (a: any) => {
    setForm({
      tipoActividad: a.tipoActividad,
      nombreActividad: a.nombreActividad,
      descripcionActividad: a.descripcionActividad,
      nombreSalaEspacio: a.nombreSalaEspacio,
      capacidadPersonasSala: String(a.capacidadPersonasSala),
      fechaActividad: a.fechaActividad?.substring(0, 10) || '',
      horaInicioActividad: a.horaInicioActividad ? new Date(a.horaInicioActividad).toTimeString().substring(0, 5) : '',
      horaFinActividad: a.horaFinActividad ? new Date(a.horaFinActividad).toTimeString().substring(0, 5) : '',
      nombreCompletoPilaExpositor: a.nombreCompletoPilaExpositor || '',
      organizacionDelExpositor: a.organizacionDelExpositor || '',
      estadoActividad: a.estadoActividad,
      urlImagenBannerActividad: a.urlImagenBannerActividad || '',
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombreActividad || !form.fechaActividad || !form.horaInicioActividad || !form.horaFinActividad) {
      showError('Campos requeridos', 'Completa al menos nombre, fecha y horario.');
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API}/admin/actividades/${editId}` : `${API}/admin/actividades`;
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      showSuccess(editId ? 'Actividad actualizada' : 'Actividad creada', 'Los cambios se guardaron correctamente.');
      setShowForm(false);
      fetch_();
    } catch { showError('Error', 'No se pudo guardar la actividad.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number, nombre: string) => {
    showConfirm(`¿Eliminar "${nombre}"?`, 'Esta acción no se puede deshacer.', async () => {
      try {
        await fetch(`${API}/admin/actividades/${id}`, { method: 'DELETE' });
        showSuccess('Eliminada', 'La actividad fue eliminada.');
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
          <h1 className="text-2xl font-bold text-gray-900">Eventos del programa</h1>
          <p className="text-sm text-gray-500 mt-1">Administra seminarios, talleres y actividades dentro de la rueda de negocios.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#367d2e] transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Crear evento
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Evento</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sala</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Horario</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Capacidad</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => <td key={j} className="py-4 px-5"><div className="h-4 bg-gray-200 rounded" /></td>)}
                  </tr>
                ))
              ) : actividades.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No hay actividades registradas</td></tr>
              ) : (
                actividades.map((a) => {
                  const inicio = a.horaInicioActividad ? new Date(a.horaInicioActividad).toTimeString().substring(0, 5) : '';
                  const fin = a.horaFinActividad ? new Date(a.horaFinActividad).toTimeString().substring(0, 5) : '';
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50/50 transition-colors ${a.estadoActividad === 'Inactivo' ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-5">
                        <p className={`text-sm font-semibold ${a.estadoActividad === 'Inactivo' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{a.nombreActividad}</p>
                        <p className="text-[11px] text-gray-400">{a.descripcionActividad?.substring(0, 50)}</p>
                      </td>
                      <td className="py-4 px-5">{badgeTipo(a.tipoActividad)}</td>
                      <td className="py-4 px-5 text-sm text-gray-600">{a.nombreSalaEspacio}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {inicio} - {fin}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm text-gray-600">{a.capacidadPersonasSala}</td>
                      <td className="py-4 px-5">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold ${a.estadoActividad === 'Activo' ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${a.estadoActividad === 'Activo' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {a.estadoActividad}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#449D3A] hover:bg-green-50 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(a.id, a.nombreActividad)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-400">Mostrando {actividades.length} de {actividades.length} eventos</p>
        </div>
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar actividad' : 'Nueva actividad'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del evento *</label>
                  <input value={form.nombreActividad} onChange={(e) => set('nombreActividad', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo</label>
                  <select value={form.tipoActividad} onChange={(e) => set('tipoActividad', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] bg-white">
                    {TIPOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                  <select value={form.estadoActividad} onChange={(e) => set('estadoActividad', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] bg-white">
                    {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
                  <textarea value={form.descripcionActividad} onChange={(e) => set('descripcionActividad', e.target.value)}
                    rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sala / Espacio *</label>
                  <input value={form.nombreSalaEspacio} onChange={(e) => set('nombreSalaEspacio', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidad (personas)</label>
                  <input type="number" value={form.capacidadPersonasSala} onChange={(e) => set('capacidadPersonasSala', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fecha *</label>
                  <input type="date" value={form.fechaActividad} onChange={(e) => set('fechaActividad', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hora inicio *</label>
                    <input type="time" value={form.horaInicioActividad} onChange={(e) => set('horaInicioActividad', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hora fin *</label>
                    <input type="time" value={form.horaFinActividad} onChange={(e) => set('horaFinActividad', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expositor</label>
                  <input value={form.nombreCompletoPilaExpositor} onChange={(e) => set('nombreCompletoPilaExpositor', e.target.value)}
                    placeholder="Nombre completo del expositor"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organización del expositor</label>
                  <input value={form.organizacionDelExpositor} onChange={(e) => set('organizacionDelExpositor', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-[#449D3A] text-white font-semibold rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
