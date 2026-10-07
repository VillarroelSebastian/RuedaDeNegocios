"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Clock, LogOut, Search, User, UserCircle, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import NotificationBell from '@/components/NotificationBell';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

export default function TecnicoHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  // Guard sincrónico: evita que un doble clic en la campanita dispare la
  // petición de marcar notificaciones como vistas dos veces.
  const marcandoVistasRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('tecnicoUser');
    if (stored) setUser(JSON.parse(stored));
    const onUpdate = () => { const s = localStorage.getItem('tecnicoUser'); if (s) setUser(JSON.parse(s)); };
    window.addEventListener('profileUpdated', onUpdate);
    return () => window.removeEventListener('profileUpdated', onUpdate);
  }, []);

  const cargarNotificaciones = async () => {
    try {
      const res = await fetch(`${API}/tecnico/notificaciones-reuniones`);
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.notificaciones ?? []);
        setNoLeidas(data.noLeidas ?? 0);
      }
    } catch {}
  };

  const marcarVistas = async () => {
    if (marcandoVistasRef.current) return;
    marcandoVistasRef.current = true;
    setNoLeidas(0);
    try { await fetch(`${API}/tecnico/notificaciones-reuniones/marcar-vistas`, { method: 'PUT' }); } catch {}
    finally { marcandoVistasRef.current = false; }
  };

  const cargarMensajesNoLeidos = async () => {
    try {
      const res = await fetch(`${API}/staff/mensajes/no-leidos`);
      if (res.ok) setMensajesNoLeidos((await res.json()).count || 0);
    } catch {}
  };

  useEffect(() => {
    void cargarNotificaciones();
    void cargarMensajesNoLeidos();
    const intervalo = window.setInterval(() => { void cargarNotificaciones(); void cargarMensajesNoLeidos(); }, 15_000);
    const alVolver = () => { if (document.visibilityState === 'visible') { void cargarNotificaciones(); void cargarMensajesNoLeidos(); } };
    window.addEventListener('focus', cargarNotificaciones);
    document.addEventListener('visibilitychange', alVolver);
    return () => { window.clearInterval(intervalo); window.removeEventListener('focus', cargarNotificaciones); document.removeEventListener('visibilitychange', alVolver); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = async (valor: string) => {
    setSearch(valor);
    if (valor.trim().length < 2) { setResultados([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`${API}/tecnico/empresas?search=${encodeURIComponent(valor)}&limit=5`);
      const data = await res.json();
      setResultados(data.data ?? []); setShowSearch(true);
    } catch {}
  };

  const handleLogout = async () => {
    await import("@/lib/push").then(m=>m.desactivarPush()).catch(()=>{});
    localStorage.removeItem('adminUser'); localStorage.removeItem('tecnicoUser'); localStorage.removeItem('empresaUser');
    router.push('/auth/login');
  };

  return <header className="sticky top-0 z-10 flex h-16 w-full items-center border-b border-gray-200 bg-white pl-16 pr-4 lg:px-6">
    <h1 className="hidden shrink-0 text-xl font-bold text-gray-800 lg:block">Rueda de Negocios del Beni</h1>
    <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
      <div ref={searchRef} className="relative hidden w-48 md:block lg:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => void buscar(e.target.value)} placeholder="Buscar empresa…" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#449D3A] focus:bg-white" />
        {showSearch && <div className="absolute top-full mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
          {resultados.length === 0 ? <p className="p-4 text-xs text-gray-400">Sin resultados</p> : resultados.map((empresa) => <button key={empresa.id} onClick={() => { setShowSearch(false); setSearch(''); router.push(`/tecnico/empresas?empresaId=${empresa.id}&eeId=${empresa.empresaEventoId}`); }} className="block w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50">
            <p className="truncate text-sm font-bold text-gray-900">{empresa.nombre}</p><p className="truncate text-xs text-gray-500">{empresa.rubro} · {empresa.ciudad}</p>
          </button>)}
        </div>}
      </div>

      <Link href="/tecnico/mensajes" aria-label="Abrir mensajes" title="Mensajes" className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-50">
        <MessageSquare className="h-5 w-5" />
        {mensajesNoLeidos > 0 && <span className="absolute -right-0.5 -top-0.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
      </Link>

      <NotificationBell storageKey="tecnicoUser" />

      <div ref={profileRef} className="relative">
        <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }} className="flex items-center gap-2 rounded-xl p-1 hover:bg-gray-50">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-green-100 shadow-sm ring-1 ring-gray-200">{user?.urlFotoPerfil ? <img src={user.urlFotoPerfil} alt="Perfil" className="h-full w-full object-contain" /> : <User className="h-5 w-5 text-green-700" />}</div>
        </button>
        {showProfile && <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
          {user && <div className="border-b border-gray-100 px-4 py-3"><p className="truncate text-sm font-bold">{user.nombres} {user.apellidoPaterno}</p><p className="truncate text-xs text-gray-500">{user.correo}</p><span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">Técnico</span></div>}
          <button onClick={() => { setShowProfile(false); router.push('/tecnico/perfil'); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"><UserCircle className="h-4 w-4" />Mi perfil</button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Cerrar sesión</button>
        </div>}
      </div>
    </div>
  </header>;
}
