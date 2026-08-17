"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Armchair,
  CalendarDays,
  CalendarCheck,
  Newspaper,
  Users,
  BarChart3,
  Settings,
  Star,
  PlusCircle,
  Menu,
  X,
  FileText,
  Package,
  Handshake,
  Images,
  Radio,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { name: 'Eventos', icon: CalendarCheck, href: '/admin/eventos' },
  { name: 'Empresas', icon: Building2, href: '/admin/empresas' },
  { name: 'Paquetes', icon: Package, href: '/admin/paquetes' },
  { name: 'Auspiciadores', icon: Handshake, href: '/admin/auspiciadores' },
  { name: 'Pagos Iniciales', icon: CreditCard, href: '/admin/pagos' },
  { name: 'Pagos Adicionales', icon: PlusCircle, href: '/admin/pagos-adicionales' },
  { name: 'Mesas', icon: Armchair, href: '/admin/mesas' },
  { name: 'Agenda de Mesas', icon: CalendarDays, href: '/admin/agenda' },
  { name: 'Control de Reuniones', icon: CalendarCheck, href: '/admin/reuniones' },
  { name: 'Actividades', icon: Star, href: '/admin/actividades' },
  { name: 'Cronograma en Vivo', icon: Radio, href: '/admin/cronograma-vivo' },
  { name: 'Galería', icon: Images, href: '/admin/galeria' },
  { name: 'Noticias', icon: Newspaper, href: '/admin/noticias' },
  { name: 'Técnicos', icon: Users, href: '/admin/tecnicos' },
  { name: 'Estadísticas', icon: BarChart3, href: '/admin/estadisticas' },
  { name: 'Reportes', icon: FileText, href: '/admin/reportes' },
  { name: 'Configuración', icon: Settings, href: '/admin/configuracion' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cerrar el drawer al navegar
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
          <Image
            src="/assets/iconos/logo.png"
            alt="Rueda de Negocios del Beni"
            fill
            sizes="176px"
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#449D3A] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          © 2026 Rueda de Negocios del Beni
        </p>
      </div>
      </aside>
    </>
  );
}
