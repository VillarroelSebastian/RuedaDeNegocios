"use client";
import React, { useState, useEffect } from 'react';
import { Building2, Users, CalendarCheck, Handshake, Shield, Clock, TrendingUp, CalendarDays, RefreshCw, Download, Printer, DollarSign, Star, Award } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

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

  const exportarResumen = () => {
    if (!stats) return;
    const filas = [
      ['Métrica', 'Valor'],
      ['Empresas registradas', stats.kpis.empresasRegistradas],
      ['Empresas con asistencia', stats.kpis.empresasAsistentes],
      ['Reuniones realizadas', stats.kpis.reunionesRealizadas],
      ['Promedio de calificación', stats.kpis.promedioCalificacion],
      ['Dinero generado aproximado (USD)', stats.kpis.totalGeneradoAprox],
      ['Índice de éxito', `${stats.kpis.indiceExito}%`],
      [],
      ['Empresa', 'Reuniones', 'Estrellas dadas', 'Dinero generado aproximado (USD)'],
      ...(stats.rankingEmpresas ?? []).map((e: any) => [e.nombre, e.reuniones, e.estrellasDadas, e.dineroGenerado]),
    ];
    const csv = filas.map((fila: any[]) => fila.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `estadisticas-evento-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    { label: 'ASISTENTES DEL DÍA', value: stats.kpis.asistentesHoy ?? 0, icon: CalendarCheck, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'REUNIONES PROGRAMADAS', value: stats.kpis.reunionesProgramadas, icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'REUNIONES REALIZADAS', value: stats.kpis.reunionesRealizadas, icon: Handshake, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'PAGOS VERIFICADOS', value: stats.kpis.pagosVerificados, icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'PAGOS PENDIENTES', value: stats.kpis.pagosPendientes, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'TASA DE ACUERDOS', value: `${stats.kpis.tasaAcuerdos ?? 0}%`, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'EVENTOS INTERNOS', value: stats.kpis.eventosInternos, icon: CalendarDays, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'ACUERDOS REGISTRADOS', value: stats.kpis.acuerdosRegistrados ?? 0, icon: Handshake, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'EMPRESAS QUE ASISTIERON', value: stats.kpis.empresasAsistentes ?? 0, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'CALIFICACIÓN PROMEDIO', value: `${Number(stats.kpis.promedioCalificacion ?? 0).toFixed(2)}/5`, icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'DINERO GENERADO APROX.', value: `$us ${Number(stats.kpis.totalGeneradoAprox ?? 0).toLocaleString('es-BO')}`, icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'ÍNDICE DE ÉXITO', value: `${stats.kpis.indiceExito ?? 0}%`, icon: Award, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const { reunionesPorEstado, pagosPorEstado } = stats;
  const maxReuniones = Math.max(
    reunionesPorEstado.programadas, reunionesPorEstado.enCurso, reunionesPorEstado.finalizadas,
    reunionesPorEstado.reprogramadas ?? 0, reunionesPorEstado.canceladas ?? 0, 1,
  );

  const reunionesBarras = [
    { label: 'Programadas', value: reunionesPorEstado.programadas, color: 'bg-blue-400' },
    { label: 'Reprogramadas', value: reunionesPorEstado.reprogramadas ?? 0, color: 'bg-amber-400' },
    { label: 'En curso', value: reunionesPorEstado.enCurso, color: 'bg-orange-400' },
    { label: 'Finalizadas', value: reunionesPorEstado.finalizadas, color: 'bg-[#449D3A]' },
    { label: 'Canceladas', value: reunionesPorEstado.canceladas ?? 0, color: 'bg-red-400' },
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
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={fetchStats} className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={exportarResumen} className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#367d2e]">
            <Download className="w-4 h-4" /> Descargar
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
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

      {/* Top empresas con más reuniones */}
      {stats.topEmpresas && stats.topEmpresas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
          <h2 className="font-bold text-gray-900 mb-5">Empresas con más reuniones (Top 5)</h2>
          <div className="space-y-3">
            {stats.topEmpresas.map((e: any, i: number) => {
              const maxT = stats.topEmpresas[0].total;
              return (
                <div key={e.nombre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      <span className="inline-block w-5 font-bold text-[#449D3A]">{i + 1}.</span>{e.nombre}
                    </span>
                    <span className="font-bold text-gray-900">{e.total} reunión(es)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(e.total / maxT) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(stats.rankingEmpresas ?? []).length > 0 && <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6"><h2 className="font-bold text-gray-900">Impacto por empresa</h2><p className="mt-1 text-xs text-gray-500">Orden inicial por reuniones; el reporte permite ordenar también por estrellas y monto.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-[10px] font-bold uppercase text-gray-500"><tr><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Reuniones</th><th className="px-5 py-3">Estrellas dadas</th><th className="px-5 py-3">Monto reportado aprox.</th></tr></thead><tbody className="divide-y divide-gray-50">
          {(stats.rankingEmpresas ?? []).slice(0, 10).map((empresa: any) => <tr key={empresa.empresaEventoId}><td className="px-5 py-3 font-semibold text-gray-800">{empresa.nombre}</td><td className="px-5 py-3">{empresa.reuniones}</td><td className="px-5 py-3">{empresa.estrellasDadas}</td><td className="px-5 py-3 font-semibold text-emerald-700">$us {Number(empresa.dineroGenerado).toLocaleString('es-BO')}</td></tr>)}
        </tbody></table></div>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-1">Asistencia empresarial</h2>
          <p className="text-xs text-gray-500 mb-5">Empresas registradas frente a empresas con al menos un ingreso por QR.</p>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center"
              style={{ background: `conic-gradient(#449D3A 0 ${(stats.asistencia.empresasAsistentes / Math.max(stats.asistencia.empresasRegistradas, 1)) * 100}%, #e5e7eb 0)` }}>
              <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold">{stats.asistencia.empresasAsistentes}</span>
                <span className="text-[10px] text-gray-400">ASISTIERON</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold text-gray-900">{stats.asistencia.empresasRegistradas}</span> registradas</p>
              <p><span className="font-bold text-green-700">{stats.asistencia.empresasAsistentes}</span> con asistencia</p>
              <p><span className="font-bold text-gray-500">{stats.asistencia.empresasSinAsistencia}</span> sin asistencia</p>
              <p className="text-xs text-gray-400">{stats.asistencia.registros} lecturas QR registradas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-1">Calificaciones de reuniones</h2>
          <p className="text-xs text-gray-500 mb-5">Distribución de todas las encuestas respondidas.</p>
          <div className="space-y-3">
            {(stats.calificaciones ?? []).map((item: any) => {
              const maximo = Math.max(...(stats.calificaciones ?? []).map((v: any) => v.total), 1);
              return <div key={item.estrella}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.estrella} estrella{item.estrella === 1 ? '' : 's'}</span><strong>{item.total}</strong></div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-yellow-400" style={{ width: `${(item.total / maximo) * 100}%` }} /></div>
              </div>;
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="shrink-0 text-center lg:w-48">
            <Award className="mx-auto h-9 w-9 text-violet-600" />
            <p className="mt-2 text-4xl font-extrabold text-violet-950">{stats.indiceExito.valor}%</p>
            <p className="text-xs font-bold uppercase text-violet-700">Índice de éxito</p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-violet-900">{stats.indiceExito.descripcion}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(stats.indiceExito.componentes).map(([clave, valor]: any) => (
                <div key={clave} className="rounded-lg bg-white p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">{clave.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xl font-extrabold text-violet-900">{valor}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
