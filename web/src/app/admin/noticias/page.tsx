"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon, Clock } from 'lucide-react';
import ImagenLightbox from '@/components/ui/ImagenLightbox';
import { useModal } from '@/components/ui/Modal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

const TIPOS = ['COMUNICADO', 'NOTICIA', 'ANUNCIO', 'ALERTA'];

const defaultForm = {
  tituloNoticia: '',
  contenidoNoticia: '',
  tipoNoticia: 'COMUNICADO',
  urlImagenNoticia: '',
  programada: false,
  fechaProgramada: '',
  horaProgramada: '',
};

// Bolivia es UTC-4 todo el año (sin horario de verano), así que se puede
// convertir a mano sin depender del huso horario del navegador.
function fechaHoraBoliviaAISO(fecha: string, hora: string) {
  return `${fecha}T${hora}:00-04:00`;
}
function isoAFechaBolivia(iso: string) {
  const d = new Date(new Date(iso).getTime() - 4 * 3600_000);
  return {
    fecha: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
    hora: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
}

export default function NoticiasPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [uploading, setUploading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/noticias`);
      setNoticias(await res.json());
    } catch { setNoticias([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const openCreate = () => {
    const user = JSON.parse(localStorage.getItem('adminUser') || localStorage.getItem('tecnicoUser') || '{}');
    setForm({ ...defaultForm });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (n: any) => {
    const programada = n.estadoPublicacion === 'PROGRAMADA';
    const { fecha, hora } = programada ? isoAFechaBolivia(n.fechaHoraPublicacion) : { fecha: '', hora: '' };
    setForm({
      tituloNoticia: n.tituloNoticia,
      contenidoNoticia: n.contenidoNoticia,
      tipoNoticia: n.tipoNoticia,
      urlImagenNoticia: n.urlImagenNoticia || '',
      programada,
      fechaProgramada: fecha,
      horaProgramada: hora,
    });
    setEditId(n.id);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setForm((f) => ({ ...f, urlImagenNoticia: data.url }));
    } catch { showError('Error', 'No se pudo subir la imagen.'); }
    finally { setUploading(false); }
  };

  const handleSave = async (estadoDeseado: 'BORRADOR' | 'PUBLICAR') => {
    if (!form.tituloNoticia || !form.contenidoNoticia) {
      showError('Campos requeridos', 'Completa el título y el contenido.');
      return;
    }
    let estadoPublicacion: 'BORRADOR' | 'PROGRAMADA' | 'PUBLICADO';
    let fechaHoraPublicacion: string | undefined;
    if (estadoDeseado === 'BORRADOR') {
      estadoPublicacion = 'BORRADOR';
    } else if (form.programada) {
      if (!form.fechaProgramada || !form.horaProgramada) {
        showError('Falta la fecha', 'Indica la fecha y hora de publicación programada.');
        return;
      }
      fechaHoraPublicacion = fechaHoraBoliviaAISO(form.fechaProgramada, form.horaProgramada);
      if (new Date(fechaHoraPublicacion).getTime() <= Date.now()) {
        showError('Fecha inválida', 'La fecha y hora programada debe ser futura.');
        return;
      }
      estadoPublicacion = 'PROGRAMADA';
    } else {
      estadoPublicacion = 'PUBLICADO';
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('adminUser') || localStorage.getItem('tecnicoUser') || '{}');
      const payload = {
        tituloNoticia: form.tituloNoticia,
        contenidoNoticia: form.contenidoNoticia,
        tipoNoticia: form.tipoNoticia,
        urlImagenNoticia: form.urlImagenNoticia,
        estadoPublicacion,
        ...(fechaHoraPublicacion ? { fechaHoraPublicacion } : {}),
        usuario_id: user.id || 1,
      };
      const url = editId ? `${API}/admin/noticias/${editId}` : `${API}/admin/noticias`;
      const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'No se pudo guardar.');
      showSuccess(
        editId ? 'Comunicado actualizado' : 'Comunicado guardado',
        estadoPublicacion === 'BORRADOR' ? 'Se guardó como borrador.' : estadoPublicacion === 'PROGRAMADA' ? 'Se publicará automáticamente en la fecha y hora indicadas.' : 'El comunicado ya está publicado.',
      );
      setShowForm(false);
      fetch_();
    } catch (e: any) { showError('Error', e.message || 'No se pudo guardar.'); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const handleDelete = (id: number, titulo: string) => {
    showConfirm(`¿Eliminar "${titulo}"?`, 'Esta acción no se puede deshacer.', async () => {
      try {
        await fetch(`${API}/admin/noticias/${id}`, { method: 'DELETE' });
        showSuccess('Eliminado', 'El comunicado fue eliminado.');
        fetch_();
      } catch { showError('Error', 'No se pudo eliminar.'); }
    });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const badgeTipo = (tipo: string) => {
    const map: Record<string, string> = {
      COMUNICADO: 'bg-blue-100 text-blue-700',
      NOTICIA: 'bg-green-100 text-green-700',
      ANUNCIO: 'bg-purple-100 text-purple-700',
      ALERTA: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[tipo] || 'bg-gray-100 text-gray-600'}`}>{tipo}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {ModalComponent}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Noticias y Comunicados</h1>
          <p className="text-sm text-gray-500 mt-1">Los comunicados se mostrarán como notificaciones dentro de la plataforma de participantes.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#367d2e] transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo comunicado
        </button>
      </div>

      {/* Cards de noticias */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-5 h-40">
              <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-200 rounded mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : noticias.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400 text-sm">No hay comunicados publicados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {noticias.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {n.urlImagenNoticia && (
                <div className="h-36 overflow-hidden">
                  <ImagenLightbox src={n.urlImagenNoticia} className="w-full h-full" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {badgeTipo(n.tipoNoticia)}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    n.estadoPublicacion === 'PUBLICADO' ? 'bg-green-100 text-green-700' :
                    n.estadoPublicacion === 'PROGRAMADA' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {n.estadoPublicacion === 'PROGRAMADA' && <Clock className="w-2.5 h-2.5" />}
                    {n.estadoPublicacion === 'PUBLICADO' ? 'Publicado' : n.estadoPublicacion === 'PROGRAMADA' ? 'Programada' : 'Borrador'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{n.tituloNoticia}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{n.contenidoNoticia}</p>
                {n.estadoPublicacion === 'PROGRAMADA' && (
                  <p className="text-[10px] text-amber-600 font-semibold mb-2">
                    Se publica el {new Date(n.fechaHoraPublicacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    {new Date(n.fechaCreacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(n)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#449D3A] hover:bg-green-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(n.id, n.tituloNoticia)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar comunicado' : 'Nuevo comunicado'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título *</label>
                <input value={form.tituloNoticia} onChange={(e) => set('tituloNoticia', e.target.value)}
                  placeholder="Ej: Bienvenidos a la Rueda de Negocios 2024"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contenido del comunicado *</label>
                <textarea value={form.contenidoNoticia} onChange={(e) => set('contenidoNoticia', e.target.value)}
                  rows={5} placeholder="Escribe el mensaje detallado aquí..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] resize-none" />
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Imagen del anuncio (Opcional)</label>
                {form.urlImagenNoticia ? (
                  <div className="relative">
                    <img src={form.urlImagenNoticia} alt="" className="w-full h-32 object-contain rounded-lg border border-gray-200" />
                    <button onClick={() => set('urlImagenNoticia', '')}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#449D3A] transition-colors">
                    {uploading ? (
                      <div className="animate-spin w-8 h-8 border-2 border-[#449D3A] border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-[#449D3A] font-semibold">Subir un archivo</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF hasta 10MB</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo</label>
                <select value={form.tipoNoticia} onChange={(e) => set('tipoNoticia', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] bg-white">
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.programada}
                    onChange={(e) => setForm((f) => ({ ...f, programada: e.target.checked }))}
                    className="rounded text-[#449D3A] focus:ring-[#449D3A]" />
                  <span className="text-sm font-semibold text-gray-700">Noticia programada</span>
                </label>
                {form.programada && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha (Bolivia)</label>
                      <input type="date" value={form.fechaProgramada} onChange={(e) => set('fechaProgramada', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Hora (Bolivia)</label>
                      <input type="time" value={form.horaProgramada} onChange={(e) => set('horaProgramada', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                    </div>
                    <p className="col-span-2 text-xs text-gray-400">Se publicará sola en esa fecha y hora; hasta entonces queda como "Programada".</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleSave('BORRADOR')} disabled={saving}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Guardar como borrador
              </button>
              <button onClick={() => handleSave('PUBLICAR')} disabled={saving}
                className="px-6 py-2.5 bg-[#449D3A] text-white font-semibold rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : form.programada ? 'Programar publicación' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
