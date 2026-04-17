"use client";
import React, { useState, useEffect } from 'react';
import { Building2, CreditCard, Handshake, Armchair, CalendarCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const ICONS_MAP: Record<string, any> = {
  '🏢': Building2,
  '💳': CreditCard,
  '🤝': Handshake,
  '🪑': Armchair,
  '📅': CalendarCheck,
};

const API = 'http://localhost:3334';

export default function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [pagosPendientes, setPagosPendientes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/dashboard/stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setActivities(data.recentActivity);
        setPagosPendientes(data.pagosPendientesCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 pb-1">Panel de Control</h1>
        <p className="text-sm text-gray-500">Resumen general de las actividades comerciales en el Beni.</p>
      </div>

      {/* Alerta pagos pendientes */}
      {pagosPendientes > 0 && (
        <Link href="/admin/pagos?estado=PENDIENTE">
          <div className="mb-6 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 hover:bg-orange-100 transition-colors cursor-pointer">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-800">
                Tienes {pagosPendientes} {pagosPendientes === 1 ? 'pago pendiente' : 'pagos pendientes'} de verificación
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Haz clic para revisar y aprobar los comprobantes de pago</p>
            </div>
            <span className="ml-auto text-orange-500 font-bold text-sm">Ver →</span>
          </div>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => {
          const IconComp = ICONS_MAP[stat.icon] || Building2;
          return (
            <div key={stat.name} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <IconComp className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  stat.change.includes('+') ? 'text-green-600 bg-green-50' :
                  stat.change.includes('-') ? 'text-red-600 bg-red-50' :
                  'text-gray-600 bg-gray-100'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">{stat.name}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900">Actividad Reciente</h2>
          <Link href="/admin/empresas" className="text-sm font-semibold text-[#449D3A] hover:text-[#367d2e]">
            Ver empresas →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 flex items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-3 ${activity.avatarBg}`}>
                      <span className="text-xs font-bold text-black/60">{activity.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{activity.user}</p>
                      <p className="text-[11px] text-gray-500">{activity.subtext}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{activity.action}</td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    {new Date(activity.time).toLocaleDateString('es-BO')}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      activity.status === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
                      activity.status === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">Sin actividad reciente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
