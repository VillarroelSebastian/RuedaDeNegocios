"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ChevronDown, User, LogOut, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = 'http://localhost:3334';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  enlace: string;
  leida: boolean;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('adminUser');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotificaciones = async () => {
    try {
      const res = await fetch(`${API}/admin/notificaciones`);
      const data = await res.json();
      setNotificaciones(data.notificaciones || []);
      setTotalNoLeidas(data.totalNoLeidas || 0);
    } catch {}
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`${API}/admin/empresas?search=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSearchResults(data.data || []);
      setShowSearch(true);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    router.push('/auth/login');
  };

  const tipoColor = (tipo: string) => {
    if (tipo === 'pago_pendiente') return 'bg-orange-100 text-orange-600';
    if (tipo === 'pago_observado') return 'bg-yellow-100 text-yellow-600';
    return 'bg-green-100 text-green-600';
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex-1 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Rueda de Negocios del Beni</h1>
      </div>

      <div className="flex items-center space-x-4 flex-1 justify-end shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative max-w-sm w-full hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A] sm:text-sm transition-colors"
            placeholder="Buscar empresa..."
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {searchResults.map((emp) => (
                <Link
                  key={emp.id}
                  href={`/admin/empresas`}
                  onClick={() => { setShowSearch(false); setSearch(''); }}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3 shrink-0">
                    <span className="text-xs font-bold text-green-700">{emp.nombre.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{emp.nombre}</p>
                    <p className="text-xs text-gray-500">{emp.rubro} · {emp.ciudad}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
          >
            <Bell className="h-5 w-5" />
            {totalNoLeidas > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-900">Notificaciones</h3>
                {totalNoLeidas > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalNoLeidas}</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notificaciones.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Sin notificaciones</p>
                ) : (
                  notificaciones.map((n) => (
                    <Link
                      key={n.id}
                      href={n.enlace}
                      onClick={() => setShowNotif(false)}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-orange-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${tipoColor(n.tipo).split(' ')[0]}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{n.titulo}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.fecha).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <Link href="/admin/pagos" onClick={() => setShowNotif(false)} className="text-xs font-semibold text-[#449D3A] hover:underline">
                  Ver todos los pagos pendientes →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="flex items-center gap-2 rounded-xl hover:bg-gray-50 p-1 transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-[#E5D7B5] flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
              {user?.urlFotoPerfil ? (
                <img src={user.urlFotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {user && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 truncate">{user.nombres} {user.apellidoPaterno}</p>
                  <p className="text-xs text-gray-500 truncate">{user.correo}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#449D3A] bg-green-50 px-2 py-0.5 rounded-full uppercase">
                    {user.rolEvento}
                  </span>
                </div>
              )}
              <Link
                href="/admin/configuracion"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                Mi perfil
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
