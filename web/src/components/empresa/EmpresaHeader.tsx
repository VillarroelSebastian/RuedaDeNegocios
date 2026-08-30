"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown, Bell, Menu, Clock, Newspaper, UserCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

function fmtNotifFecha(f: string) {
  return new Date(f).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Ruta destino según el tipo de notificación, para llevar directo a su sección.
function rutaDeNotif(notificacion: any): string {
  const t = notificacion?.tipo || '';
  if (t.startsWith('solicitud')) return '/empresa/solicitudes';
  if (t === 'reunion:calificar') return '/empresa/resultados';
  if (t.startsWith('reunion')) {
    const id = Number(notificacion?.referenciaId);
    return notificacion?.referenciaTipo === 'reunion' && Number.isFinite(id) && id > 0
      ? `/empresa/reuniones?reunionId=${id}`
      : '/empresa/reuniones';
  }
  if (t.startsWith('mensaje')) return '/empresa/mensajes';
  if (t.startsWith('pago')) return '/empresa/perfil';
  if (t.startsWith('comunicado')) return '/empresa/comunicados';
  return '/empresa/dashboard';
}

export default function EmpresaHeader({ onMenuClick, eeId }: { onMenuClick?: () => void; eeId?: number | null }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<any[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('empresaUser');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  // Historial de notificaciones persistentes (campanita)
  const cargarNotifs = useCallback(async () => {
    if (!eeId) return;
    try {
      const res = await fetch(`${API}/empresa/notificaciones?eeId=${eeId}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notificaciones ?? []);
      setUnread(data.noLeidas ?? 0);
    } catch {}
  }, [eeId]);

  useEffect(() => {
    cargarNotifs();
    const iv = setInterval(cargarNotifs, 15_000);
    const actualizar = () => cargarNotifs();
    const alVolver = () => { if (document.visibilityState === 'visible') cargarNotifs(); };
    window.addEventListener('rueda:notificacion', actualizar);
    window.addEventListener('focus', actualizar);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(iv);
      window.removeEventListener('rueda:notificacion', actualizar);
      window.removeEventListener('focus', actualizar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargarNotifs]);

  const abrirNotifs = async () => {
    const abriendo = !showNotifs;
    setShowNotifs(abriendo);
    if (abriendo) await cargarNotifs();
    if (abriendo && unread > 0 && eeId) {
      try {
        await fetch(`${API}/empresa/notificaciones/leidas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eeId }),
        });
        setUnread(0);
        setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
      } catch {}
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('tecnicoUser');
    localStorage.removeItem('empresaUser');
    router.push('/auth/login');
  };

  const abrirNotificacion = (notificacion: any) => {
    setShowNotifs(false);
    const destino = rutaDeNotif(notificacion);
    // La recarga garantiza que una notificación de reunión abra exactamente
    // su detalle aun si el usuario ya estaba en /empresa/reuniones.
    if (destino.includes('reunionId=')) window.location.assign(destino);
    else router.push(destino);
  };

  const initials = user
    ? `${(user.nombres ?? '?')[0]}${(user.apellidoPaterno ?? '')[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition-colors shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block truncate">Rueda de Negocios — Panel Empresa</h1>
      </div>
      <div className="flex-1" />

      {/* Bell con historial de notificaciones */}
      <div ref={notifsRef} className="relative mr-2">
        <button
          onClick={abrirNotifs}
          className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
          title="Notificaciones"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Notificaciones</p>
              <span className="text-[10px] text-gray-400">{notifs.length} recientes</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No tienes notificaciones aún.</p>
              ) : (
                notifs.map((n) => (
                  <button key={n.id} onClick={() => abrirNotificacion(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${n.leida ? '' : 'bg-green-50/50'}`}>
                    <p className="text-xs font-bold text-gray-800">{n.titulo}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.mensaje}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{fmtNotifFecha(n.fecha)}
                    </p>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setShowNotifs(false); router.push('/empresa/comunicados'); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#449D3A] hover:bg-green-50 transition-colors border-t border-gray-100"
            >
              <Newspaper className="w-3.5 h-3.5" />
              Ver comunicados del evento
            </button>
          </div>
        )}
      </div>

      <div ref={profileRef} className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 rounded-xl hover:bg-gray-50 px-2 py-1.5 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-[#449D3A] border border-green-200">
            {initials}
          </div>
          {user && (
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">
              {user.nombres} {user.apellidoPaterno}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 truncate">{user.nombres} {user.apellidoPaterno}</p>
                <p className="text-xs text-gray-500 truncate">{user.correo}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full uppercase">Empresa</span>
              </div>
            )}
            <button
              onClick={() => { setShowProfile(false); router.push('/empresa/perfil'); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserCircle className="w-4 h-4" />
              Mi perfil
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
