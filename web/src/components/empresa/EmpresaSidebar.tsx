"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Newspaper, Building2,
  Send, Users, Star, User, Briefcase, Clock,
} from 'lucide-react';

const allMenuItems = [
  { name: 'Dashboard',     icon: LayoutDashboard, href: '/empresa/dashboard',    soloEncargado: false },
  { name: 'Eventos',       icon: CalendarDays,    href: '/empresa/eventos',      soloEncargado: false },
  { name: 'Comunicados',   icon: Newspaper,       href: '/empresa/comunicados',  soloEncargado: false },
  { name: 'Mis Reuniones', icon: Users,           href: '/empresa/reuniones',    soloEncargado: false },
  { name: 'Empresas',      icon: Building2,       href: '/empresa/empresas',     soloEncargado: true  },
  { name: 'Solicitudes',   icon: Send,            href: '/empresa/solicitudes',  soloEncargado: true  },
  { name: 'Mis Horarios',  icon: Clock,           href: '/empresa/horarios',     soloEncargado: true  },
  { name: 'Resultados',    icon: Star,            href: '/empresa/resultados',   soloEncargado: true  },
  { name: 'Mi Perfil',     icon: User,            href: '/empresa/perfil',       soloEncargado: false },
];

interface EmpresaSidebarProps {
  esEncargado?: boolean;
}

export default function EmpresaSidebar({ esEncargado = false }: EmpresaSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 bg-[#449D3A] rounded-lg flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 leading-tight">Panel Empresa</p>
          <p className="text-[10px] text-gray-400">{esEncargado ? 'Encargado' : 'Participante'}</p>
        </div>
      </div>

      {esEncargado && (
        <div className="px-4 py-2 border-b border-gray-100">
          <span className="text-[10px] font-bold text-[#449D3A] uppercase tracking-widest">Panel Encargado</span>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {allMenuItems.filter(item => esEncargado || !item.soloEncargado).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-green-50 text-[#449D3A] border-r-2 border-[#449D3A]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#449D3A]' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">Rueda de Negocios del Beni</p>
      </div>
    </aside>
  );
}
