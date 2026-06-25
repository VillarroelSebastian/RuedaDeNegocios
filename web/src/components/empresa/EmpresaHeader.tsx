"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ChevronDown } from 'lucide-react';

export default function EmpresaHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('empresaUser');
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
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

  const initials = user
    ? `${(user.nombres ?? '?')[0]}${(user.apellidoPaterno ?? '')[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Rueda de Negocios — Panel Empresa</h1>

      <div ref={profileRef} className="relative ml-auto">
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
