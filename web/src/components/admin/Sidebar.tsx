import React from 'react';
import Link from 'next/link';
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
  Settings 
} from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', active: true },
    { name: 'Eventos', icon: CalendarCheck, href: '/admin/eventos' },
    { name: 'Empresas', icon: Building2, href: '/admin/empresas' },
    { name: 'Pagos', icon: CreditCard, href: '/admin/pagos' },
    { name: 'Mesas', icon: Armchair, href: '/admin/mesas' },
    { name: 'Agenda de Mesas', icon: CalendarDays, href: '/admin/agenda' },
    { name: 'Noticias', icon: Newspaper, href: '/admin/noticias' },
    { name: 'Técnicos', icon: Users, href: '/admin/tecnicos' },
    { name: 'Estadísticas', icon: BarChart3, href: '/admin/estadisticas' },
    { name: 'Configuración', icon: Settings, href: '/admin/configuracion' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo Area */}
      <div className="flex items-center px-6 h-16 border-b border-gray-100">
        <div className="w-8 h-8 bg-[#449D3A] rounded flex items-center justify-center mr-3">
          <span className="text-white font-bold text-xs">RN</span>
        </div>
        <span className="text-lg font-bold text-gray-900">RN Beni</span>
      </div>

      {/* User Card */}
      <div className="p-4">
        <div className="bg-gray-50 rounded-xl p-3 flex items-center border border-gray-100">
          <div className="w-10 h-10 bg-[#88A89A] rounded-full flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-gray-900">Admin User</p>
            <p className="text-[10px] font-bold text-[#449D3A] tracking-wider">SUPER ADMIN</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-6 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              item.active 
                ? 'bg-[#449D3A] text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
