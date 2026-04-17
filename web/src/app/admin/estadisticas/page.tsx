"use client";
import React, { useState, useEffect } from 'react';
import { Building2, Users, CalendarCheck, Handshake, Shield, Clock, Armchair, CalendarDays, RefreshCw } from 'lucide-react';

const API = 'http://localhost:3334';

export default function EstadisticasPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/estadisticas`);
      setStats(await res.json());
    } catch { setStats(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">No se pudieron cargar las estadísticas.</p>
        <button onClick={fetchStats} className="mt-3 text-[#449D3A] font-semibold text-sm">Reintentar</button>
      </div>
    );
  }

  const kpiCards = [
    { label: 'EMPRESAS REGISTRADAS', value: stats.kpis.empresasRegistradas, icon: Building2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'PARTICIPANTES TOTALES', value: stats.kpis.participantesTotales, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'REUNIONES PROGRAMADAS', value: stats.kpis.reunionesProgramadas, icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'REUNIONES REALIZADAS', value: stats.kpis.reunionesRealizadas, icon: Handshake, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'PAGOS VERIFICADOS', value: stats.kpis.pagosVerificados, icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'PAGOS PENDIENTES', value: stats.kpis.pagosPendientes, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'MESAS HABILITADAS', value: stats.kpis.mesasHabilitadas, icon: Armchair, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'EVENTOS INTERNOS', value: stats.kpis.eventosInternos, icon: CalendarDays, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  const { reunionesPorEstado, pagosPorEstado } = stats;
  const maxReuniones = Math.max(reunionesPorEstado.programadas, reunionesPorEstado.enCurso, reunionesPorEstado.finalizadas, 1);

  const reunionesBarras = [
    { label: 'Programadas', value: reunionesPorEstado.programadas, color: 'bg-blue-400' },
    { label: 'En curso', value: reunionesPorEstado.enCurso, color: 'bg-orange-400' },
    { label: 'Finalizadas', value: reunionesPorEstado.finalizadas, color: 'bg-[#449D3A]' },
  ];

  // Donut chart manual
  const total = pagosPorEstado.total || 1;
  const segmentos = [
    { label: 'Verificados', value: pagosPorEstado.verificados, pct: pagosPorEstado.porcentajeVerificados, color: '#449D3A' },
    { label: 'Pendientes', value: pagosPorEstado.pendientes, pct: pagosPorEstado.porcentajePendientes, color: '#fb923c' },
    { label: 'Observados', value: pagosPorEstado.observados, pct: pagosPorEstado.porcentajeObservados, color: '#fbbf24' },
  ];

  const getDonutPath = () => {
    const cx = 60, cy = 60, r = 45, innerR = 28;
    let paths: React.ReactNode[] = [];
    let startAngle = -90;
    segmentos.forEach((s, i) => {
      const angle = (s.value / total) * 360;
      const endAngle = startAngle + angle;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));
      const ix1 = cx + innerR * Math.cos(toRad(startAngle));
      const iy1 = cy + innerR * Math.sin(toRad(startAngle));
      const ix2 = cx + innerR * Math.cos(toRad(endAngle));
      const iy2 = cy + innerR * Math.sin(toRad(endAngle));
      const large = angle > 180 ? 1 : 0;
      if (angle > 0) {
        paths.push(
          <path key={i} fill={s.color}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`}
          />
        );
      }
      startAngle = endAngle;
    });
    return paths;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas del evento</h1>
          <p className="text-sm text-gray-500 mt-1">Consulta un resumen general del estado y actividad de la Rueda de Negocios del Beni.</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* KPI cards 4x2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{k.label}</p>
              <p className="text-3xl font-bold text-gray-900">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reuniones por estado */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">Reuniones por estado</h2>
          <div className="space-y-4">
            {reunionesBarras.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{b.label}</span>
                  <span className="font-bold text-gray-900">{b.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${b.color} transition-all duration-700`}
                    style={{ width: `${(b.value / maxReuniones) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagos por estado — donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">Pagos por estado</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-[120px] h-[120px] shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                {getDonutPath()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{pagosPorEstado.total}</span>
                <span className="text-[9px] text-gray-400 uppercase font-bold">Total</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              {segmentos.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-gray-600">{s.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 text-sm">{s.value}</span>
                    <span className="text-xs text-gray-400 ml-1">({s.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disponibilidad de mesas */}
      {stats.mesas && stats.mesas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Disponibilidad de Mesas</h2>
            <p className="text-xs text-gray-400">Estado actual de la infraestructura del recinto</p>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2 mb-4">
            {stats.mesas.map((m: any) => (
              <div
                key={m.id}
                title={`Mesa ${m.numero} — ${m.activa ? 'Activa' : 'Inactiva'}`}
                className={`h-10 rounded-lg flex items-center justify-center text-xs font-bold ${m.activa ? 'bg-[#449D3A] text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {String(m.numero).padStart(2, '0')}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-[#449D3A]" />
              <span className="text-gray-600">{stats.mesasActivas} Mesas activas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-200" />
              <span className="text-gray-600">{stats.mesasInhabilitadas} Mesas inhabilitadas</span>
            </div>
          </div>
        </div>
      )}

      {/* Empresas por rubro */}
      {stats.empresasPorRubro && stats.empresasPorRubro.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-900 mb-5">Empresas por sector (Top 5)</h2>
          <div className="space-y-3">
            {stats.empresasPorRubro.map((r: any) => {
              const maxR = stats.empresasPorRubro[0].count;
              return (
                <div key={r.rubro}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{r.rubro}</span>
                    <span className="font-bold text-gray-900">{r.count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#449D3A] rounded-full" style={{ width: `${(r.count / maxR) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
