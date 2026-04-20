import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Armchair, Calendar, Clock } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const estadoColors: Record<string, { bg: string; text: string; dot: string }> = {
  FINALIZADA: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  EN_CURSO:   { bg: '#ffedd5', text: '#c2410c', dot: '#f97316' },
  PROGRAMADA: { bg: '#dbeafe', text: '#1d4ed8', dot: '#60a5fa' },
};

export default function AgendaScreen() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/mesas/agenda`);
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAgenda(); }, []);

  const mesasConReuniones = mesas.filter((m) => m.reunion?.length > 0);
  const totalReuniones = mesas.reduce((sum, m) => sum + (m.reunion?.length || 0), 0);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#F9FAFB]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgenda(); }} tintColor={GREEN} />}
    >
      <View className="px-4 py-4">

        {/* Summary cards */}
        <View className="flex-row gap-3 mb-5">
          {[
            { label: 'Total mesas', value: mesas.length, color: '#1f2937' },
            { label: 'Con reuniones', value: mesasConReuniones.length, color: GREEN },
            { label: 'Reuniones', value: totalReuniones, color: '#2563eb' },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm items-center">
              <Text className="text-[10px] font-bold text-gray-500 uppercase mb-1">{s.label}</Text>
              <Text style={{ color: s.color }} className="text-2xl font-bold">{s.value}</Text>
            </View>
          ))}
        </View>

        {mesas.length === 0 ? (
          <View className="bg-white rounded-xl border border-gray-100 p-12 items-center">
            <Armchair color="#d1d5db" size={40} />
            <Text className="text-gray-400 text-sm mt-3 text-center">No hay mesas configuradas para el evento</Text>
          </View>
        ) : (
          mesas.map((mesa) => (
            <View key={mesa.id} className="bg-white rounded-xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
              {/* Mesa header */}
              <View className="flex-row items-center gap-3 p-4 border-b border-gray-50">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: mesa.estaActivo === 1 ? GREEN : '#e5e7eb' }}
                >
                  <Text style={{ color: mesa.estaActivo === 1 ? '#fff' : '#9ca3af', fontWeight: '700', fontSize: 13 }}>
                    {String(mesa.numeroMesa).padStart(2, '0')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-sm">Mesa {mesa.numeroMesa}</Text>
                  <Text className="text-xs text-gray-400">
                    {mesa.reunion?.length || 0} reunión(es) · {mesa.capacidadPersonas} personas
                  </Text>
                </View>
                <View
                  className="px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: mesa.estaActivo === 1 ? '#dcfce7' : '#f3f4f6' }}
                >
                  <Text style={{ color: mesa.estaActivo === 1 ? '#15803d' : '#9ca3af', fontSize: 11, fontWeight: '700' }}>
                    {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                  </Text>
                </View>
              </View>

              {/* Reuniones */}
              {mesa.reunion && mesa.reunion.length > 0 ? (
                mesa.reunion.map((r: any, idx: number) => {
                  const c = estadoColors[r.estadoReunion] ?? estadoColors.PROGRAMADA;
                  return (
                    <View
                      key={r.id}
                      className="px-4 py-3 flex-row items-center gap-3"
                      style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#f9fafb' }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.dot }} />
                      <View className="flex-row items-center gap-1">
                        <Calendar color="#9ca3af" size={12} />
                        <Text className="text-xs text-gray-500">{fmtDate(r.fechaHoraInicioReunion)}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Clock color="#9ca3af" size={12} />
                        <Text className="text-xs text-gray-500">
                          {fmtTime(r.fechaHoraInicioReunion)}–{fmtTime(r.fechaHoraFinReunion)}
                        </Text>
                      </View>
                      <View className="ml-auto px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg }}>
                        <Text style={{ color: c.text, fontSize: 9, fontWeight: '700' }}>
                          {r.estadoReunion}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text className="px-4 py-3 text-xs text-gray-400 italic">Sin reuniones programadas</Text>
              )}
            </View>
          ))
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
