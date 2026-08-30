"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, Newspaper, Building2,
  Send, Users, Star, User, Briefcase, Clock, X, Sparkles, MessageSquare,
  Radio, Images, Package,
} from 'lucide-react';

const allMenuItems = [
  { name: 'Dashboard',      icon: LayoutDashboard, href: '/empresa/dashboard',     soloEncargado: false },
  { name: 'Eventos',        icon: CalendarDays,    href: '/empresa/eventos',       soloEncargado: false },
  { name: 'Comunicados',    icon: Newspaper,       href: '/empresa/comunicados',   soloEncargado: false },
  { name: 'Mis Reuniones',  icon: Users,           href: '/empresa/reuniones',     soloEncargado: false },
  { name: 'Empresas',       icon: Building2,       href: '/empresa/empresas',      soloEncargado: false },
  { name: 'Mensajes',       icon: MessageSquare,   href: '/empresa/mensajes',      soloEncargado: false },
  { name: 'Oportunidades',  icon: Sparkles,        href: '/empresa/oportunidades', soloEncargado: false },
  { name: 'Cronograma en Vivo', icon: Radio,       href: '/empresa/cronograma-vivo', soloEncargado: false },
  { name: 'Galería',        icon: Images,          href: '/empresa/galeria',       soloEncargado: false },
  { name: 'Solicitudes',    icon: Send,            href: '/empresa/solicitudes',   soloEncargado: true  },
  { name: 'Mis Horarios',   icon: Clock,           href: '/empresa/horarios',      soloEncargado: true  },
  { name: 'Resultados',     icon: Star,            href: '/empresa/resultados',    soloEncargado: true  },
  { name: 'Mi Paquete',     icon: Package,         href: '/empresa/mi-paquete',    soloEncargado: false },
  { name: 'Mi Perfil',      icon: User,            href: '/empresa/perfil',        soloEncargado: false },
];

interface EmpresaSidebarProps {
  esEncargado?: boolean;
  eeId?: number | null;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function EmpresaSidebar({ esEncargado = false, eeId = null, mobileOpen = false, onClose }: EmpresaSidebarProps) {
  const pathname = usePathname();
  const [foto, setFoto] = useState<string>('');
  const [nombre, setNombre] = useState<string>('');
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);

  useEffect(() => {
    if (!eeId) return;
    const cargar = () => fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334'}/empresa/mensajes/conversaciones?eeId=${eeId}`)
      .then((r) => r.json())
      .then((data) => setMensajesNoLeidos(Array.isArray(data) ? data.reduce((n, c) => n + Number(c.noLeidos ?? 0), 0) : 0))
      .catch(() => {});
    cargar();
    const timer = window.setInterval(cargar, 15000);
    return () => window.clearInterval(timer);
  }, [eeId, pathname]);

  useEffect(() => {
    const leer = () => {
      try {
        const raw = localStorage.getItem('empresaUser');
        if (raw) {
          const u = JSON.parse(raw);
          setFoto(u.urlFotoPerfil || '');
          setNombre(`${u.nombres ?? ''} ${u.apellidoPaterno ?? ''}`.trim());
        }
      } catch {}
    };
    leer();
    window.addEventListener('profileUpdated', leer);
    return () => window.removeEventListener('profileUpdated', leer);
  }, []);

  return (
    <>
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-40 transition-transform duration-200 md:translate-x-0 md:z-20 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-3 p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      <Link href="/empresa/perfil" aria-label="Abrir mi perfil" className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100 shrink-0">
        {foto ? (
          <img src={foto} alt="Tu foto de perfil" className="w-9 h-9 rounded-full object-contain border border-gray-200 shrink-0" />
        ) : (
          <div className="w-8 h-8 bg-[#449D3A] rounded-lg flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900 leading-tight truncate">{nombre || 'Panel Empresa'}</p>
          <p className="text-[10px] text-gray-400">{esEncargado ? 'Encargado' : 'Participante'}</p>
        </div>
      </Link>

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
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-green-50 text-[#449D3A] border-r-2 border-[#449D3A]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#449D3A]' : 'text-gray-400'}`} />
              <span className="flex-1">{item.name}</span>
              {item.href === '/empresa/mensajes' && mensajesNoLeidos > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {mensajesNoLeidos > 99 ? '99+' : mensajesNoLeidos}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">Rueda de Negocios del Beni</p>
        </div>
      </aside>
    </>
  );
}
