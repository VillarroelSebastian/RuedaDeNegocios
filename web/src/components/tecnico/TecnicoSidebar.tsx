"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Armchair, Video, Search, Newspaper,
  UserCircle, LogOut, Shield, Menu, X, CalendarPlus, Radio, QrCode, Images,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard',        icon: LayoutDashboard, href: '/tecnico/dashboard' },
  { name: 'Agendar reunión',  icon: CalendarPlus,    href: '/tecnico/agendar' },
  { name: 'Mesas',            icon: Armchair,        href: '/tecnico/mesas' },
  { name: 'Virtuales',        icon: Video,           href: '/tecnico/virtuales' },
  { name: 'Buscador',         icon: Search,          href: '/tecnico/buscar' },
  { name: 'Cronograma en Vivo', icon: Radio,         href: '/tecnico/cronograma-vivo' },
  { name: 'Galería del evento', icon: Images,        href: '/tecnico/galeria' },
  { name: 'Asistencia QR',    icon: QrCode,          href: '/tecnico/asistencia' },
  { name: 'Noticias',         icon: Newspaper,       href: '/tecnico/noticias' },
  { name: 'Mi Perfil',        icon: UserCircle,      href: '/tecnico/perfil' },
];

export default function TecnicoSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cerrar el drawer al navegar
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
    <>
      {/* Botón hamburguesa (solo móvil) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-30 p-2 bg-white border border-gray-200 rounded-xl shadow-sm"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-40 transition-transform duration-200 md:translate-x-0 md:z-20 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-4 right-3 p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
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
          {user?.urlFotoPerfil
            ? <img src={user.urlFotoPerfil} alt="Tu foto de perfil" className="w-7 h-7 rounded-full object-contain border border-green-200 shrink-0" />
            : <Shield className="w-4 h-4 text-green-700 shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-bold text-green-700">Panel Técnico</p>
            {user && <p className="text-[10px] text-green-600 truncate">{user.nombres} {user.apellidoPaterno}</p>}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">Menú principal</p>
        {menuItems.filter((item) => user?.rolEvento !== 'TECNICO_EVENTOS' || ['/tecnico/cronograma-vivo', '/tecnico/galeria', '/tecnico/perfil'].includes(item.href)).map((item) => {
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
    </>
  );
}
