"use client";
import React, { useState, useEffect } from 'react';
import { Building2, CreditCard, Handshake, Armchair, CalendarCheck } from 'lucide-react';

const ICONS_MAP: Record<string, any> = {
  '🏢': Building2,
  '💳': CreditCard,
  '🤝': Handshake,
  '🪑': Armchair,
  '📅': CalendarCheck, // Assuming future use
};

export default function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3334/admin/dashboard/stats');
        const data = await res.json();
        setStats(data.stats);
        setActivities(data.recentActivity);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto"><h1 className="text-2xl font-bold">Cargando tablero...</h1></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 pb-1">Panel de Control</h1>
        <p className="text-sm text-gray-500">Resumen general de las actividades comerciales en el Beni.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                {React.createElement(ICONS_MAP[stat.icon] || Building2, { className: `w-5 h-5 ${stat.color}` })}
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
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-900">Actividad Reciente</h2>
          <button className="text-sm font-semibold text-[#449D3A] hover:text-[#367d2e]">Ver todo</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Usuario / Empresa</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mesa</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</th>
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
                  <td className="py-4 px-6 text-sm font-medium text-gray-700">{activity.table}</td>
                  <td className="py-4 px-6 text-sm text-gray-500">{new Date(activity.time).toLocaleString('es-BO')}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
                      ${activity.status === 'COMPLETADO' ? 'bg-green-100 text-green-700' :
                        activity.status === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'}
                    `}>
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
