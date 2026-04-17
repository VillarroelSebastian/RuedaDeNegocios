import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { CreditCard, ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'COMPLETADO', label: 'Completados' },
  { value: 'OBSERVADO', label: 'Observados' },
];

export default function PagosScreen({ navigation }: any) {
  const [tab, setTab] = useState('');
  const [pagos, setPagos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPagos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '30', ...(tab && { estado: tab }) });
      const res = await fetch(`${API_URL}/admin/pagos?${params}`);
      const data = await res.json();
      setPagos(data.data || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); fetchPagos(); }, [fetchPagos]);

  const badgeEstado = (estado: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      COMPLETADO: { bg: '#dcfce7', text: '#166534', label: 'Pagado' },
      PENDIENTE: { bg: '#ffedd5', text: '#9a3412', label: 'Pendiente' },
      OBSERVADO: { bg: '#fef9c3', text: '#854d0e', label: 'Observado' },
      RECHAZADO: { bg: '#fee2e2', text: '#991b1b', label: 'Rechazado' },
    };
    const b = map[estado] || { bg: '#f3f4f6', text: '#6b7280', label: estado };
    return (
      <View style={{ backgroundColor: b.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
        <Text style={{ color: b.text, fontSize: 10, fontWeight: '700' }}>{b.label}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Pagos</Text>
        <Text className="text-sm text-gray-500 mt-1">Verifica y aprueba comprobantes de pago</Text>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mx-4 px-4">
          <View className="flex-row gap-2">
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setTab(t.value)}
                style={{ backgroundColor: tab === t.value ? GREEN : '#f3f4f6', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
              >
                <Text style={{ color: tab === t.value ? 'white' : '#6b7280', fontSize: 13, fontWeight: '600' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPagos(); }} tintColor={GREEN} />}
        >
          <View className="px-4 pt-3 pb-2">
            <Text className="text-sm text-gray-500">{total} registro(s)</Text>
          </View>

          {pagos.length === 0 ? (
            <View className="flex-1 items-center py-16">
              <CreditCard color="#d1d5db" size={40} />
              <Text className="text-gray-400 text-sm mt-3">No hay pagos en esta categoría</Text>
            </View>
          ) : (
            pagos.map((pago) => (
              <TouchableOpacity
                key={pago.id}
                onPress={() => navigation.navigate('PagoDetail', { id: pago.id })}
                className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 text-sm">{pago.empresa?.nombre}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{pago.empresa?.ciudad?.nombre} · {pago.empresa?.rubro}</Text>
                  </View>
                  {badgeEstado(pago.estadoVerificacionPago)}
                </View>
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <View>
                    <Text className="text-xs text-gray-400">Participantes: {pago.numeroParticipantes}</Text>
                    {pago.montoPagado && (
                      <Text className="text-sm font-bold text-gray-900 mt-0.5">{Number(pago.montoPagado).toLocaleString()} BOB</Text>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs font-semibold" style={{ color: GREEN }}>Verificar</Text>
                    <ChevronRight color={GREEN} size={14} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
