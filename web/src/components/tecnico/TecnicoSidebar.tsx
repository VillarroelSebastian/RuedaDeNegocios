"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Armchair, Video, Search, Newspaper,
  UserCircle, LogOut, Shield,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard',  icon: LayoutDashboard, href: '/tecnico/dashboard' },
  { name: 'Mesas',      icon: Armchair,        href: '/tecnico/mesas' },
  { name: 'Virtuales',  icon: Video,           href: '/tecnico/virtuales' },
  { name: 'Buscador',   icon: Search,          href: '/tecnico/buscar' },
  { name: 'Noticias',   icon: Newspaper,       href: '/tecnico/noticias' },
  { name: 'Mi Perfil',  icon: UserCircle,      href: '/tecnico/perfil' },
];

export default function TecnicoSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user, setUser] = useState<any>(null);

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

  const handleLogout = () => {
    localStorage.removeItem('tecnicoUser');
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="relative h-10 w-44">
          <Image src="/assets/iconos/logo.png" alt="Rueda de Negocios del Beni" fill sizes="176px"
            className="object-contain object-left" priority />
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4 text-green-700 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-green-700">Panel Técnico</p>
            {user && <p className="text-[10px] text-green-600 truncate">{user.nombres} {user.apellidoPaterno}</p>}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Menú principal</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-[#449D3A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100 shrink-0">
        <button onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
          Cerrar sesión
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-3">© 2026 Rueda de Negocios del Beni</p>
      </div>
    </aside>
  );
}
