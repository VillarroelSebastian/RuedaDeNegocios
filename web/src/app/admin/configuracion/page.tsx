"use client";
import React, { useState, useEffect } from 'react';
import { User, Lock, Camera, Save, LogOut, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

export default function ConfiguracionPage() {
  const router = useRouter();
  const { showSuccess, showError, ModalComponent } = useModal();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', urlFotoPerfil: '' });
  const [passForm, setPassForm] = useState({ contraseniaActual: '', nuevaContrasenia: '', confirmar: '' });
  const [showPass, setShowPass] = useState({ actual: false, nueva: false, conf: false });
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'perfil' | 'seguridad'>('perfil');

  useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (!stored) { router.push('/auth/login'); return; }
    const u = JSON.parse(stored);
    setUser(u);
    setForm({ nombres: u.nombres || '', apellidoPaterno: u.apellidoPaterno || '', apellidoMaterno: u.apellidoMaterno || '', telefono: u.telefono || '', urlFotoPerfil: u.urlFotoPerfil || '' });
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      setForm((f) => ({ ...f, urlFotoPerfil: data.url }));
    } catch { showError('Error', 'No se pudo subir la imagen.'); }
    finally { setUploading(false); }
  };

  const handleSavePerfil = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      const newUser = { ...user, ...updated };
      localStorage.setItem('adminUser', JSON.stringify(newUser));
      setUser(newUser);
      showSuccess('Perfil actualizado', 'Los cambios se guardaron correctamente.');
    } catch { showError('Error', 'No se pudo actualizar el perfil.'); }
    finally { setSaving(false); }
  };

  const handleSavePassword = async () => {
    if (!user) return;
    if (!passForm.contraseniaActual || !passForm.nuevaContrasenia) {
      showError('Campos requeridos', 'Ingresa la contraseña actual y la nueva.');
      return;
    }
    if (passForm.nuevaContrasenia !== passForm.confirmar) {
      showError('Las contraseñas no coinciden', 'La nueva contraseña y su confirmación deben ser iguales.');
      return;
    }
    if (passForm.nuevaContrasenia.length < 6) {
      showError('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSavingPass(true);
    try {
      await fetch(`${API}/admin/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, contraseniaActual: passForm.contraseniaActual, nuevaContrasenia: passForm.nuevaContrasenia }),
      });
      showSuccess('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
      setPassForm({ contraseniaActual: '', nuevaContrasenia: '', confirmar: '' });
    } catch (e: any) {
      showError('Error', e.message || 'Contraseña actual incorrecta.');
    } finally { setSavingPass(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    router.push('/auth/login');
  };

  const setP = (k: string, v: string) => setPassForm((f) => ({ ...f, [k]: v }));
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <ModalComponent />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu perfil y seguridad de la cuenta.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(['perfil', 'seguridad'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'perfil' ? 'Mi perfil' : 'Seguridad'}
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {/* Foto */}
          <div className="p-6 border-b border-gray-100 flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {form.urlFotoPerfil
                  ? <img src={form.urlFotoPerfil} alt="Foto de perfil" className="w-full h-full object-cover" />
                  : <User className="w-10 h-10 text-gray-400" />
                }
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#449D3A] rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-[#367d2e] transition-colors">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.nombres} {user?.apellidoPaterno}</p>
              <p className="text-sm text-gray-500">{user?.correo}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full uppercase">
                {user?.rolEvento}
              </span>
              {uploading && <p className="text-xs text-[#449D3A] mt-1">Subiendo imagen...</p>}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombres</label>
                <input value={form.nombres} onChange={(e) => setF('nombres', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apellido paterno</label>
                <input value={form.apellidoPaterno} onChange={(e) => setF('apellidoPaterno', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Apellido materno</label>
                <input value={form.apellidoMaterno} onChange={(e) => setF('apellidoMaterno', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teléfono</label>
                <input value={form.telefono} onChange={(e) => setF('telefono', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input value={user?.correo || ''} disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">El correo no se puede modificar.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSavePerfil} disabled={saving}
                className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors shadow-sm">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Cambiar contraseña</h2>
              <p className="text-sm text-gray-500">Usa una contraseña de al menos 6 caracteres.</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Contraseña actual', key: 'contraseniaActual', showKey: 'actual' },
              { label: 'Nueva contraseña', key: 'nuevaContrasenia', showKey: 'nueva' },
              { label: 'Confirmar nueva contraseña', key: 'confirmar', showKey: 'conf' },
            ].map(({ label, key, showKey }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={showPass[showKey as keyof typeof showPass] ? 'text' : 'password'}
                    value={passForm[key as keyof typeof passForm]}
                    onChange={(e) => setP(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]"
                  />
                  <button type="button"
                    onClick={() => setShowPass((p) => ({ ...p, [showKey]: !p[showKey as keyof typeof p] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass[showKey as keyof typeof showPass] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button onClick={handleSavePassword} disabled={savingPass}
                className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors shadow-sm">
                <Save className="w-4 h-4" />
                {savingPass ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-red-600 mb-3">Zona peligrosa</h3>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
