"use client";
import React from 'react';
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
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { name: 'Eventos', icon: CalendarCheck, href: '/admin/eventos' },
  { name: 'Empresas', icon: Building2, href: '/admin/empresas' },
  { name: 'Pagos', icon: CreditCard, href: '/admin/pagos' },
  { name: 'Mesas', icon: Armchair, href: '/admin/mesas' },
  { name: 'Agenda de Mesas', icon: CalendarDays, href: '/admin/agenda' },
  { name: 'Actividades', icon: Star, href: '/admin/actividades' },
  { name: 'Noticias', icon: Newspaper, href: '/admin/noticias' },
  { name: 'Técnicos', icon: Users, href: '/admin/tecnicos' },
  { name: 'Estadísticas', icon: BarChart3, href: '/admin/estadisticas' },
  { name: 'Configuración', icon: Settings, href: '/admin/configuracion' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
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
          © 2024 Rueda de Negocios del Beni
        </p>
      </div>
    </aside>
  );
}
