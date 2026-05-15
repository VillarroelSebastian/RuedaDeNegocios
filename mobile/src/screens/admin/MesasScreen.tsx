import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Plus, X, Clock, Users, Armchair, Timer, Pencil, Check } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

const ESTADO_MESA: Record<string, { label: string; color: string; bg: string }> = {
  LIBRE:      { label: 'Libre',      color: '#166534', bg: '#dcfce7' },
  PROGRAMADA: { label: 'Programada', color: '#1e40af', bg: '#dbeafe' },
  EN_USO:     { label: 'En uso',     color: '#9a3412', bg: '#ffedd5' },
  EN_ESPERA:  { label: 'En espera',  color: '#92400e', bg: '#fef3c7' },
  FINALIZADA: { label: 'Finalizada', color: '#6b7280', bg: '#f3f4f6' },
};

const GRID_COLORS: Record<string, string> = {
  LIBRE:      GREEN,
  PROGRAMADA: '#3b82f6',
  EN_USO:     '#f97316',
  EN_ESPERA:  '#d97706',
  FINALIZADA: '#9ca3af',
};

type FiltroEstado = 'TODAS' | 'LIBRE' | 'PROGRAMADA' | 'EN_USO' | 'EN_ESPERA' | 'FINALIZADA';

export default function MesasScreen() {
  const { show, modal } = useModal();
  const [mesas,        setMesas]        = useState<any[]>([]);
  const [eventoConfig, setEventoConfig] = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filtro,       setFiltro]       = useState<FiltroEstado>('TODAS');
  const [showGenerar,  setShowGenerar]  = useState(false);
  const [cantidad,     setCantidad]     = useState('10');
  const [capacidad,    setCapacidad]    = useState('4');
  const [generating,   setGenerating]   = useState(false);
  const [editTiempo,   setEditTiempo]   = useState(false);
  const [tiempoVal,    setTiempoVal]    = useState('');

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/admin/mesas`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMesas(data);
      } else {
        setMesas(data.mesas ?? []);
        if (data.eventoConfig) {
          setEventoConfig(data.eventoConfig);
          setCantidad(String(data.eventoConfig.cantidadTotalMesasEvento ?? 10));
          setCapacidad(String(data.eventoConfig.capacidadPersonasPorMesa ?? 4));
          setTiempoVal(String(data.eventoConfig.tiempoEntreReuniones ?? 15));
        }
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, []);

  const toggleMesa = async (mesa: any) => {
    const nuevoEstado = mesa.estaActivo === 1 ? 0 : 1;
    show({
      type: 'confirm',
      title: `¿${nuevoEstado === 1 ? 'Activar' : 'Desactivar'} Mesa ${mesa.numeroMesa}?`,
      message: `La mesa quedará ${nuevoEstado === 1 ? 'activa' : 'inactiva'}.`,
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/admin/mesas/${mesa.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estaActivo: nuevoEstado }),
          });
          setMesas((prev) => prev.map((m) => m.id === mesa.id ? { ...m, estaActivo: nuevoEstado } : m));
        } catch { show({ type: 'error', title: 'Error', message: 'No se pudo cambiar el estado.' }); }
      },
    });
  };

  const handleSaveTiempo = async () => {
    const val = Number(tiempoVal);
    if (!val || val < 1 || val > 120) {
      show({ type: 'warning', title: 'Error', message: 'El tiempo debe estar entre 1 y 120 minutos.' });
      return;
    }
    try {
      await fetch(`${API_URL}/admin/evento/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiempoEntreReuniones: val }),
      });
      setEventoConfig((prev: any) => ({ ...prev, tiempoEntreReuniones: val }));
      setEditTiempo(false);
      show({ type: 'success', title: 'Guardado', message: `Tiempo de limpieza actualizado a ${val} min.` });
      fetchMesas();
    } catch { show({ type: 'error', title: 'Error', message: 'No se pudo guardar el tiempo.' }); }
  };

  const handleGenerar = async () => {
    if (!cantidad || Number(cantidad) <= 0) {
      show({ type: 'warning', title: 'Error', message: 'Ingresa una cantidad válida.' });
      return;
    }
    setGenerating(true);
    try {
      const res  = await fetch(`${API_URL}/admin/mesas/generar`, {
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

  const mesasFiltradas = mesas.filter((m) =>
    filtro === 'TODAS' || m.estadoMesa === filtro
  );

  const counts = {
    total:      mesas.length,
    libre:      mesas.filter((m) => m.estadoMesa === 'LIBRE').length,
    programada: mesas.filter((m) => m.estadoMesa === 'PROGRAMADA').length,
    enUso:      mesas.filter((m) => m.estadoMesa === 'EN_USO').length,
    enEspera:   mesas.filter((m) => m.estadoMesa === 'EN_ESPERA').length,
    finalizada: mesas.filter((m) => m.estadoMesa === 'FINALIZADA').length,
  };

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'TODAS',      label: `Todas (${counts.total})` },
    { key: 'LIBRE',      label: `Libres (${counts.libre})` },
    { key: 'EN_USO',     label: `En uso (${counts.enUso})` },
    { key: 'EN_ESPERA',  label: `En espera (${counts.enEspera})` },
    { key: 'PROGRAMADA', label: `Program. (${counts.programada})` },
    { key: 'FINALIZADA', label: `Finalizadas (${counts.finalizada})` },
  ];

  return (
    <>
    {modal}
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Gestión de Mesas</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Toca una mesa para activar/desactivar</Text>
          </View>
          <TouchableOpacity onPress={() => setShowGenerar(true)}
            style={{ backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 }}>
            <Plus color="white" size={15} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Generar</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
            {FILTROS.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setFiltro(f.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                  backgroundColor: filtro === f.key ? GREEN : '#fff',
                  borderColor: filtro === f.key ? GREEN : '#e5e7eb' }}>
                <Text style={{ fontSize: 11, fontWeight: '600',
                  color: filtro === f.key ? '#fff' : '#6b7280' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchMesas(); }}
              tintColor={GREEN} />
          }>
          {/* Config del evento */}
          {eventoConfig && (
            <View style={{ margin: 16, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
              borderRadius: 16, padding: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase',
                letterSpacing: 0.5, marginBottom: 10 }}>Configuración del evento</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Clock color="#3b82f6" size={13} />
                  <View>
                    <Text style={{ fontSize: 9, color: '#60a5fa', fontWeight: '600' }}>Reunión</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a' }}>{eventoConfig.duracionReunion} min</Text>
                  </View>
                </View>
                {/* Editable tiempo de limpieza */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Timer color="#3b82f6" size={13} />
                  <View>
                    <Text style={{ fontSize: 9, color: '#60a5fa', fontWeight: '600' }}>Limpieza</Text>
                    {editTiempo ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TextInput value={tiempoVal} onChangeText={setTiempoVal} keyboardType="numeric"
                          style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a', borderWidth: 1,
                            borderColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, width: 40 }} />
                        <Text style={{ fontSize: 10, color: '#3b82f6' }}>min</Text>
                        <TouchableOpacity onPress={handleSaveTiempo}>
                          <Check color="#16a34a" size={14} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditTiempo(false)}>
                          <X color="#9ca3af" size={14} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a' }}>{eventoConfig.tiempoEntreReuniones} min</Text>
                        <TouchableOpacity onPress={() => { setTiempoVal(String(eventoConfig.tiempoEntreReuniones)); setEditTiempo(true); }}>
                          <Pencil color="#60a5fa" size={11} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Armchair color="#3b82f6" size={13} />
                  <View>
                    <Text style={{ fontSize: 9, color: '#60a5fa', fontWeight: '600' }}>Mesas plan.</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a' }}>{eventoConfig.cantidadTotalMesasEvento}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Users color="#3b82f6" size={13} />
                  <View>
                    <Text style={{ fontSize: 9, color: '#60a5fa', fontWeight: '600' }}>Cap./mesa</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e3a8a' }}>{eventoConfig.capacidadPersonasPorMesa} p.</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Stats */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 4 }}>
              {[
                { label: 'Total', value: counts.total, color: '#374151', bg: '#f9fafb' },
                { label: 'Libres', value: counts.libre, color: GREEN, bg: '#f0fdf4' },
                { label: 'En uso', value: counts.enUso, color: '#ea580c', bg: '#fff7ed' },
                { label: 'En espera', value: counts.enEspera, color: '#d97706', bg: '#fffbeb' },
                { label: 'Programadas', value: counts.programada, color: '#2563eb', bg: '#eff6ff' },
              ].map((s) => (
                <View key={s.label} style={{ backgroundColor: s.bg, borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 70 }}>
                  <Text style={{ color: s.color, fontSize: 22, fontWeight: '800' }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Leyenda */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 4 }}>
              {Object.entries(ESTADO_MESA).map(([k, v]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRID_COLORS[k] ?? '#9ca3af' }} />
                  <Text style={{ fontSize: 10, color: '#6b7280' }}>{v.label}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#6b7280' }} />
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Inactiva</Text>
              </View>
            </View>
          </ScrollView>

          {/* Grid */}
          {mesasFiltradas.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>No hay mesas con ese filtro.</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {mesasFiltradas.map((m) => {
                  const estadoColor = m.estaActivo === 1
                    ? (GRID_COLORS[m.estadoMesa] ?? GREEN)
                    : '#9ca3af';
                  const estadoLabel = ESTADO_MESA[m.estadoMesa]?.label ?? 'Libre';
                  return (
                    <TouchableOpacity key={m.id} onPress={() => toggleMesa(m)}
                      style={{ backgroundColor: estadoColor, width: '17%', aspectRatio: 1,
                        borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                        {String(m.numeroMesa).padStart(2, '0')}
                      </Text>
                      {m.estaActivo === 1 && (
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 7, fontWeight: '600', textAlign: 'center' }}
                          numberOfLines={1}>
                          {estadoLabel}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Modal generar */}
      <Modal visible={showGenerar} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Generar mesas</Text>
              <TouchableOpacity onPress={() => setShowGenerar(false)}>
                <X color="#9ca3af" size={22} />
              </TouchableOpacity>
            </View>
            {eventoConfig && (
              <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  El evento tiene planificadas{' '}
                  <Text style={{ fontWeight: '700', color: '#374151' }}>{eventoConfig.cantidadTotalMesasEvento} mesas</Text>
                  {' '}con{' '}
                  <Text style={{ fontWeight: '700', color: '#374151' }}>{eventoConfig.capacidadPersonasPorMesa} personas/mesa</Text>.
                </Text>
              </View>
            )}
            <View style={{ gap: 14, marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Cantidad de mesas *</Text>
                <TextInput value={cantidad} onChangeText={setCantidad} keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' }} />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Capacidad por mesa (personas) *</Text>
                <TextInput value={capacidad} onChangeText={setCapacidad} keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowGenerar(false)}
                style={{ flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#6b7280' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGenerar} disabled={generating}
                style={{ flex: 1, paddingVertical: 14, backgroundColor: generating ? '#9ca3af' : GREEN, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{generating ? 'Generando...' : 'Generar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}
