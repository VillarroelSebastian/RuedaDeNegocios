import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Building2, Users, CalendarCheck, Handshake, Shield, Clock, Armchair, CalendarDays } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

export default function EstadisticasScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/estadisticas`);
      setStats(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-[#F9FAFB]"><ActivityIndicator color={GREEN} size="large" /></View>;
  }

  if (!stats) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-400">No se pudieron cargar las estadísticas</Text>
        <TouchableOpacity onPress={fetchStats} className="mt-3">
          <Text style={{ color: GREEN }} className="font-semibold">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const kpiCards = [
    { label: 'Empresas', value: stats.kpis.empresasRegistradas, icon: Building2, color: GREEN },
    { label: 'Participantes', value: stats.kpis.participantesTotales, icon: Users, color: '#2563eb' },
    { label: 'Reuniones', value: stats.kpis.reunionesProgramadas, icon: CalendarCheck, color: '#7c3aed' },
    { label: 'Realizadas', value: stats.kpis.reunionesRealizadas, icon: Handshake, color: '#7c3aed' },
    { label: 'P. Verificados', value: stats.kpis.pagosVerificados, icon: Shield, color: '#059669' },
    { label: 'P. Pendientes', value: stats.kpis.pagosPendientes, icon: Clock, color: '#ea580c' },
    { label: 'Mesas', value: stats.kpis.mesasHabilitadas, icon: Armchair, color: '#db2777' },
    { label: 'Eventos', value: stats.kpis.eventosInternos, icon: CalendarDays, color: '#0891b2' },
  ];

  const { reunionesPorEstado, pagosPorEstado } = stats;
  const maxR = Math.max(reunionesPorEstado.programadas, reunionesPorEstado.enCurso, reunionesPorEstado.finalizadas, 1);

  return (
    <ScrollView
      className="flex-1 bg-[#F9FAFB]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={GREEN} />}
    >
      <View className="p-4 space-y-4">
        {/* KPI Grid */}
        <View>
          <Text className="font-bold text-gray-900 mb-3">Estadísticas del evento</Text>
          <View className="flex-row flex-wrap gap-2">
            {kpiCards.map((k) => {
              const Icon = k.icon;
              return (
                <View key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 w-[47.5%]">
                  <Icon color={k.color} size={22} />
                  <Text className="text-2xl font-bold text-gray-900 mt-2">{k.value}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5 uppercase font-semibold">{k.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reuniones por estado */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <Text className="font-bold text-gray-900 mb-4">Reuniones por estado</Text>
          {[
            { label: 'Programadas', value: reunionesPorEstado.programadas, color: '#60a5fa' },
            { label: 'En curso', value: reunionesPorEstado.enCurso, color: '#fb923c' },
            { label: 'Finalizadas', value: reunionesPorEstado.finalizadas, color: GREEN },
          ].map((b) => (
            <View key={b.label} className="mb-3">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-sm text-gray-600">{b.label}</Text>
                <Text className="text-sm font-bold text-gray-900">{b.value}</Text>
              </View>
              <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <View style={{ width: `${(b.value / maxR) * 100}%`, backgroundColor: b.color, height: '100%', borderRadius: 999 }} />
              </View>
            </View>
          ))}
        </View>

        {/* Pagos por estado */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <Text className="font-bold text-gray-900 mb-4">Pagos por estado</Text>
          {[
            { label: 'Verificados', value: pagosPorEstado.verificados, pct: pagosPorEstado.porcentajeVerificados, color: GREEN },
            { label: 'Pendientes', value: pagosPorEstado.pendientes, pct: pagosPorEstado.porcentajePendientes, color: '#fb923c' },
            { label: 'Observados', value: pagosPorEstado.observados, pct: pagosPorEstado.porcentajeObservados, color: '#fbbf24' },
          ].map((s) => (
            <View key={s.label} className="flex-row items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <View className="flex-row items-center gap-2">
                <View style={{ backgroundColor: s.color, width: 10, height: 10, borderRadius: 999 }} />
                <Text className="text-sm text-gray-600">{s.label}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-bold text-gray-900">{s.value}</Text>
                <Text className="text-xs text-gray-400">({s.pct}%)</Text>
              </View>
            </View>
          ))}
          <View className="flex-row justify-between pt-3">
            <Text className="text-sm font-bold text-gray-900">Total</Text>
            <Text className="text-sm font-bold text-gray-900">{pagosPorEstado.total}</Text>
          </View>
        </View>

        {/* Mesas grid */}
        {stats.mesas && stats.mesas.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <Text className="font-bold text-gray-900 mb-3">Disponibilidad de Mesas</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {stats.mesas.map((m: any) => (
                <View key={m.id}
                  style={{ backgroundColor: m.activa ? GREEN : '#e5e7eb', width: '13.5%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: m.activa ? 'white' : '#9ca3af', fontSize: 10, fontWeight: '700' }}>
                    {String(m.numero).padStart(2, '0')}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row gap-4 mt-3">
              <View className="flex-row items-center gap-1.5">
                <View style={{ backgroundColor: GREEN }} className="w-3 h-3 rounded" />
                <Text className="text-xs text-gray-500">{stats.mesasActivas} activas</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-3 h-3 rounded bg-gray-200" />
                <Text className="text-xs text-gray-500">{stats.mesasInhabilitadas} inactivas</Text>
              </View>
            </View>
          </View>
        )}

        {/* Empresas por rubro */}
        {stats.empresasPorRubro && stats.empresasPorRubro.length > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <Text className="font-bold text-gray-900 mb-4">Empresas por sector</Text>
            {stats.empresasPorRubro.map((r: any) => {
              const maxR2 = stats.empresasPorRubro[0].count;
              return (
                <View key={r.rubro} className="mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-sm text-gray-600" numberOfLines={1}>{r.rubro}</Text>
                    <Text className="text-sm font-bold text-gray-900">{r.count}</Text>
                  </View>
                  <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <View style={{ width: `${(r.count / maxR2) * 100}%`, backgroundColor: GREEN, height: '100%', borderRadius: 999 }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
