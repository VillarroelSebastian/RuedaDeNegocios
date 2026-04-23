import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Plus, X, Clock, Users, Armchair, Timer } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

export default function MesasScreen() {
  const { show, modal } = useModal();
  const [mesas, setMesas] = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGenerar, setShowGenerar] = useState(false);
  const [cantidad, setCantidad] = useState('10');
  const [capacidad, setCapacidad] = useState('4');
  const [generating, setGenerating] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/mesas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMesas(data);
      } else {
        setMesas(data.mesas ?? []);
        if (data.eventoConfig) {
          setEventoConfig(data.eventoConfig);
          setCantidad(String(data.eventoConfig.cantidadTotalMesasEvento ?? 10));
          setCapacidad(String(data.eventoConfig.capacidadPersonasPorMesa ?? 4));
        }
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, []);

  const toggleMesa = async (mesa: any) => {
    const nuevoEstado = mesa.estaActivo === 1 ? 0 : 1;
    try {
      await fetch(`${API_URL}/admin/mesas/${mesa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estaActivo: nuevoEstado }),
      });
      setMesas((prev) => prev.map((m) => m.id === mesa.id ? { ...m, estaActivo: nuevoEstado } : m));
    } catch { show({ type: 'error', title: 'Error', message: 'No se pudo cambiar el estado.' }); }
  };

  const handleGenerar = async () => {
    if (!cantidad || Number(cantidad) <= 0) {
      show({ type: 'warning', title: 'Error', message: 'Ingresa una cantidad válida.' });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/admin/mesas/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: Number(cantidad), capacidadPersonas: Number(capacidad) }),
      });
      const data = await res.json();
      show({ type: 'success', title: '¡Listo!', message: data.mensaje || 'Mesas generadas correctamente.' });
      setShowGenerar(false);
      fetchMesas();
    } catch { show({ type: 'error', title: 'Error', message: 'No se pudieron generar las mesas.' }); }
    finally { setGenerating(false); }
  };

  const activas = mesas.filter((m) => m.estaActivo === 1).length;
  const inactivas = mesas.filter((m) => m.estaActivo !== 1).length;

  return (
    <>
    {modal}
    <View className="flex-1 bg-[#F9FAFB]">
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Gestión de Mesas</Text>
            <Text className="text-sm text-gray-500 mt-1">Toca una mesa para activar/desactivar</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowGenerar(true)}
            style={{ backgroundColor: GREEN }}
            className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl"
          >
            <Plus color="white" size={16} />
            <Text className="text-white font-semibold text-sm">Generar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchMesas(); }}
              tintColor={GREEN}
            />
          }
        >
          {/* Config del evento */}
          {eventoConfig && (
            <View className="mx-4 mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <Text className="text-[10px] font-bold text-blue-600 uppercase mb-2">Configuración del evento</Text>
              <View className="flex-row flex-wrap gap-3">
                {[
                  { Icon: Clock, label: 'Reunión', value: `${eventoConfig.duracionReunion} min` },
                  { Icon: Timer, label: 'Pausa', value: `${eventoConfig.tiempoEntreReuniones} min` },
                  { Icon: Armchair, label: 'Mesas plan.', value: eventoConfig.cantidadTotalMesasEvento },
                  { Icon: Users, label: 'Cap./mesa', value: `${eventoConfig.capacidadPersonasPorMesa} p.` },
                ].map(({ Icon, label, value }) => (
                  <View key={label} className="flex-row items-center gap-1.5">
                    <Icon color="#3b82f6" size={13} />
                    <View>
                      <Text className="text-[9px] text-blue-400 font-semibold">{label}</Text>
                      <Text className="text-xs font-bold text-blue-900">{value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-3 px-4 pt-4">
            {[
              { label: 'Total', value: mesas.length, color: '#1f2937' },
              { label: 'Activas', value: activas, color: GREEN },
              { label: 'Inactivas', value: inactivas, color: '#9ca3af' },
            ].map((s) => (
              <View key={s.label} className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 items-center shadow-sm">
                <Text style={{ color: s.color }} className="text-2xl font-bold">{s.value}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Leyenda */}
          <View className="flex-row gap-4 px-4 pt-4 pb-2">
            <View className="flex-row items-center gap-1.5">
              <View style={{ backgroundColor: GREEN }} className="w-4 h-4 rounded" />
              <Text className="text-xs text-gray-600">Activa</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-4 h-4 rounded bg-gray-200" />
              <Text className="text-xs text-gray-600">Inactiva</Text>
            </View>
          </View>

          {/* Grid */}
          {mesas.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-gray-400 text-sm">No hay mesas. Genera mesas para comenzar.</Text>
            </View>
          ) : (
            <View className="px-4 pb-4">
              <View className="flex-row flex-wrap gap-2">
                {mesas.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => toggleMesa(m)}
                    style={{ backgroundColor: m.estaActivo === 1 ? GREEN : '#e5e7eb', width: '17%', aspectRatio: 1 }}
                    className="rounded-xl items-center justify-center"
                  >
                    <Text style={{ color: m.estaActivo === 1 ? 'white' : '#9ca3af', fontSize: 11, fontWeight: '700' }}>
                      {String(m.numeroMesa).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Modal generar */}
      <Modal visible={showGenerar} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">Generar mesas</Text>
              <TouchableOpacity onPress={() => setShowGenerar(false)}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>

            {eventoConfig && (
              <View className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                <Text className="text-xs text-gray-500">
                  El evento tiene planificadas{' '}
                  <Text className="font-bold text-gray-700">{eventoConfig.cantidadTotalMesasEvento} mesas</Text>
                  {' '}con{' '}
                  <Text className="font-bold text-gray-700">{eventoConfig.capacidadPersonasPorMesa} personas/mesa</Text>.
                  Los valores están pre-llenados.
                </Text>
              </View>
            )}

            <View className="space-y-4 mb-6">
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Cantidad de mesas *</Text>
                <TextInput
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="numeric"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
              </View>
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">Capacidad por mesa (personas) *</Text>
                <TextInput
                  value={capacidad}
                  onChangeText={setCapacidad}
                  keyboardType="numeric"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowGenerar(false)}
                className="flex-1 py-3.5 border border-gray-200 rounded-2xl items-center">
                <Text className="font-semibold text-gray-600">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGenerar} disabled={generating}
                style={{ backgroundColor: generating ? '#9ca3af' : GREEN }}
                className="flex-1 py-3.5 rounded-2xl items-center">
                <Text className="text-white font-semibold">{generating ? 'Generando...' : 'Generar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}
