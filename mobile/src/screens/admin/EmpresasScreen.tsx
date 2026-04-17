import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { Search, Building2, Users, Eye, ChevronRight } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const badgePago = (estado: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETADO: { bg: '#dcfce7', text: '#166534', label: 'Pagado' },
    PENDIENTE: { bg: '#ffedd5', text: '#9a3412', label: 'Pendiente' },
    OBSERVADO: { bg: '#fef9c3', text: '#854d0e', label: 'Observado' },
    SIN_REGISTRO: { bg: '#f3f4f6', text: '#6b7280', label: 'Sin registro' },
  };
  const b = map[estado] || map.SIN_REGISTRO;
  return (
    <View style={{ backgroundColor: b.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: b.text, fontSize: 10, fontWeight: '700' }}>{b.label}</Text>
    </View>
  );
};

export default function EmpresasScreen({ navigation }: any) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchEmpresas = useCallback(async (p = 1, s = search) => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit), ...(s && { search: s }) });
      const res = await fetch(`${API_URL}/admin/empresas?${params}`);
      const data = await res.json();
      if (p === 1) setEmpresas(data.data || []);
      else setEmpresas((prev) => [...prev, ...(data.data || [])]);
      setTotal(data.total || 0);
      setPage(p);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { setLoading(true); fetchEmpresas(1, search); }, [search]);

  const onRefresh = () => { setRefreshing(true); fetchEmpresas(1, search); };

  const handleDelete = (id: number, nombre: string) => {
    Alert.alert('Eliminar empresa', `¿Desactivar a "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_URL}/admin/empresas/${id}`, { method: 'DELETE' });
          fetchEmpresas(1, search);
        }
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Empresas</Text>
        <Text className="text-sm text-gray-500 mt-1">Empresas registradas en el evento</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mt-3">
          <Search color="#9ca3af" size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar empresa..."
            className="flex-1 ml-2 py-2.5 text-sm text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {loading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        >
          <View className="px-4 pt-3 pb-2">
            <Text className="text-sm text-gray-500">{total} empresa(s)</Text>
          </View>

          {empresas.map((emp) => (
            <View key={emp.id} className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <View className="flex-row items-start gap-3">
                <View className="w-12 h-12 rounded-xl bg-green-50 items-center justify-center shrink-0">
                  <Building2 color={GREEN} size={22} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-sm">{emp.nombre}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{emp.rubro} · {emp.ciudad}</Text>
                  <View className="flex-row items-center gap-3 mt-2">
                    {badgePago(emp.estadoVerificacionPago)}
                    <View className="flex-row items-center gap-1">
                      <Users color="#9ca3af" size={12} />
                      <Text className="text-xs text-gray-400">{emp.numeroParticipantes} part.</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                {emp.empresaEventoId && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PagoDetail', { id: emp.empresaEventoId })}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 bg-green-50 rounded-xl"
                  >
                    <Eye color={GREEN} size={14} />
                    <Text className="text-xs font-semibold" style={{ color: GREEN }}>Ver pago</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(emp.id, emp.nombre)}
                  className="px-4 py-2 bg-red-50 rounded-xl"
                >
                  <Text className="text-xs font-semibold text-red-600">Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {empresas.length < total && (
            <TouchableOpacity
              onPress={() => fetchEmpresas(page + 1)}
              className="mx-4 my-3 py-3 bg-white border border-gray-200 rounded-xl items-center"
            >
              <Text className="text-sm font-semibold text-gray-600">Cargar más</Text>
            </TouchableOpacity>
          )}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
