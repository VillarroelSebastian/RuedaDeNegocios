"use client";
import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TecnicoHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tecnicoUser');
    if (stored) setUser(JSON.parse(stored));

    const onUpdate = () => {
      const s = localStorage.getItem('tecnicoUser');
      if (s) setUser(JSON.parse(s));
    };
    window.addEventListener('profileUpdated', onUpdate);
    return () => window.removeEventListener('profileUpdated', onUpdate);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
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

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <h1 className="text-xl font-bold text-gray-800 hidden md:block">Rueda de Negocios del Beni</h1>

      <div ref={profileRef} className="relative ml-auto">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 rounded-xl hover:bg-gray-50 p-1 transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
            {user?.urlFotoPerfil ? (
              <img src={user.urlFotoPerfil} alt="Perfil" className="w-full h-full object-contain" />
            ) : (
              <User className="w-5 h-5 text-green-700" />
            )}
          </div>
        </button>

        {showProfile && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 truncate">{user.nombres} {user.apellidoPaterno}</p>
                <p className="text-xs text-gray-500 truncate">{user.correo}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full uppercase">
                  Técnico
                </span>
              </div>
            )}
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
