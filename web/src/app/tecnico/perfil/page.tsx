"use client";
import React, { useState, useEffect } from 'react';
import { User, Lock, Camera, Save, LogOut, Mail, KeyRound, CheckCircle2, X, Eye, EyeOff, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

type ResetStep = 'idle' | 'sending' | 'code' | 'success';

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`;
}

function FeedbackModal({ visible, type, title, message, onClose }: {
  visible: boolean; type: 'success' | 'error'; title: string; message: string; onClose: () => void;
}) {
  if (!visible) return null;
  const isError = type === 'error';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl p-6 w-full max-w-sm border ${isError ? 'border-red-200' : 'border-green-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          {isError ? <AlertCircle className="w-6 h-6 text-red-500 shrink-0" /> : <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />}
          <h3 className="font-bold text-gray-900 flex-1">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 ml-9">{message}</p>
        <button onClick={onClose}
          className={`mt-4 w-full py-2 rounded-xl text-sm font-bold text-white transition-colors ${isError ? 'bg-red-500 hover:bg-red-600' : 'bg-[#449D3A] hover:bg-[#367d2e]'}`}>
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function TecnicoPerfilPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', urlFotoPerfil: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'perfil' | 'seguridad'>('perfil');
  const [feedback, setFeedback] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({ visible: false, type: 'success', title: '', message: '' });

  // ── Cambio de contraseña por email ────────────────────────────────────────
  const [resetStep, setResetStep] = useState<ResetStep>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const showSuccess = (title: string, message: string) => setFeedback({ visible: true, type: 'success', title, message });
  const showError = (title: string, message: string) => setFeedback({ visible: true, type: 'error', title, message });

  useEffect(() => {
    const stored = localStorage.getItem('tecnicoUser');
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
      localStorage.setItem('tecnicoUser', JSON.stringify(newUser));
      setUser(newUser);
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      showSuccess('Perfil actualizado', 'Los cambios se guardaron correctamente.');
    } catch { showError('Error', 'No se pudo actualizar el perfil.'); }
    finally { setSaving(false); }
  };

  const handleEnviarCodigo = async () => {
    if (!user?.correo) return;
    setResetStep('sending');
    try {
      await fetch(`${API}/auth/solicitar-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: user.correo }),
      });
      setResetStep('code');
      setCodigo(''); setNuevaPass(''); setConfirmar(''); setResetError('');
      setModalOpen(true);
    } catch {
      setResetStep('idle');
      showError('Error', 'No se pudo enviar el correo. Intenta de nuevo.');
    }
  };

  const handleConfirmarReset = async () => {
    setResetError('');
    if (codigo.length !== 6) { setResetError('Ingresa el código de 6 dígitos.'); return; }
    if (nuevaPass.length < 6) { setResetError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (nuevaPass !== confirmar) { setResetError('Las contraseñas no coinciden.'); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`${API}/auth/confirmar-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: user.correo, codigo, nuevaContrasenia: nuevaPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Código incorrecto o expirado.');
      setResetStep('success');
    } catch (e: any) {
      setResetError(e.message);
    } finally { setResetLoading(false); }
  };

  const closeResetModal = () => {
    setModalOpen(false);
    setResetStep('idle');
    setCodigo(''); setNuevaPass(''); setConfirmar(''); setResetError('');
  };

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogout = () => {
    localStorage.removeItem('tecnicoUser');
    router.push('/auth/login');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <FeedbackModal {...feedback} onClose={() => setFeedback((f) => ({ ...f, visible: false }))} />

      {/* ── Modal cambio de contraseña ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  {resetStep === 'success'
                    ? <CheckCircle2 className="w-5 h-5 text-[#449D3A]" />
                    : <KeyRound className="w-5 h-5 text-[#449D3A]" />}
                </div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {resetStep === 'success' ? '¡Contraseña actualizada!' : 'Cambiar contraseña'}
                </h3>
              </div>
              <button onClick={closeResetModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {resetStep === 'code' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Enviamos un código de verificación a{' '}
                    <span className="font-semibold text-gray-700">{maskEmail(user?.correo ?? '')}</span>.{' '}
                    Válido por <strong>15 minutos</strong>. Revisa también tu carpeta de spam.
                  </p>

                  {resetError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold text-center">
                      {resetError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código de 6 dígitos</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      placeholder="000000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[14px] focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={showNueva ? 'text' : 'password'}
                        value={nuevaPass}
                        onChange={(e) => setNuevaPass(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
                      />
                      <button type="button" onClick={() => setShowNueva(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar contraseña</label>
                    <div className="relative">
                      <input
                        type={showConf ? 'text' : 'password'}
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
                      />
                      <button type="button" onClick={() => setShowConf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmarReset}
                    disabled={resetLoading}
                    className="w-full bg-[#449D3A] text-white font-bold py-3 rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors"
                  >
                    {resetLoading ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>

                  <button
                    onClick={() => { closeResetModal(); setTimeout(handleEnviarCodigo, 100); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Reenviar código
                  </button>
                </div>
              )}

              {resetStep === 'success' && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-16 h-16 text-[#449D3A] mx-auto mb-4" />
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Tu contraseña fue cambiada correctamente. La próxima vez que inicies sesión usa tu nueva contraseña.
                  </p>
                  <button
                    onClick={closeResetModal}
                    className="w-full bg-[#449D3A] text-white font-bold py-3 rounded-xl hover:bg-[#367d2e] transition-colors"
                  >
                    Listo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu perfil y seguridad de la cuenta.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(['perfil', 'seguridad'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'perfil' ? 'Mi perfil' : 'Seguridad'}
          </button>
        ))}
      </div>

      {/* ── TAB PERFIL ─────────────────────────────────────────────────────── */}
      {tab === 'perfil' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {form.urlFotoPerfil
                  ? <img src={form.urlFotoPerfil} alt="Foto de perfil" className="w-full h-full object-contain" />
                  : <User className="w-10 h-10 text-gray-400" />}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#449D3A] rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-[#367d2e] transition-colors">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.nombres} {user?.apellidoPaterno}</p>
              <p className="text-sm text-gray-500">{user?.correo}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full uppercase">{user?.rolEvento ?? 'Técnico'}</span>
              {uploading && <p className="text-xs text-[#449D3A] mt-1">Subiendo imagen...</p>}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nombres', key: 'nombres' },
                { label: 'Apellido paterno', key: 'apellidoPaterno' },
                { label: 'Apellido materno', key: 'apellidoMaterno' },
                { label: 'Teléfono', key: 'telefono' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={(e) => setF(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
                <input value={user?.correo || ''} disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-400 mt-1">El correo no se puede modificar.</p>
              </div>
            </div>
            <div className="flex justify-stretch sm:justify-end pt-2">
              <button onClick={handleSavePerfil} disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#449D3A] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors shadow-sm">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB SEGURIDAD ──────────────────────────────────────────────────── */}
      {tab === 'seguridad' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#449D3A]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Cambiar contraseña</h2>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Por seguridad, verificamos tu identidad enviando un código a tu correo antes de permitir el cambio.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3.5 flex items-center gap-3 mb-6 border border-gray-100">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">Se enviará el código a</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{maskEmail(user?.correo ?? '')}</p>
              </div>
            </div>

            <button
              onClick={handleEnviarCodigo}
              disabled={resetStep === 'sending'}
              className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#367d2e] disabled:opacity-60 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              {resetStep === 'sending' ? 'Enviando código...' : 'Enviar código de verificación'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 text-base mb-1">Sesión</h2>
            <p className="text-sm text-gray-500 mb-4">Cierra tu sesión de forma segura en este dispositivo.</p>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
