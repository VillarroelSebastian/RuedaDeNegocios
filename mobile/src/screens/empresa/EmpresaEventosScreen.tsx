import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  RefreshControl, StyleSheet, TouchableOpacity, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Clock, MapPin, AlertCircle, Bell, ExternalLink, Megaphone } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' });
}

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  CONFERENCIA:   { bg: '#dbeafe', text: '#1e40af' },
  TALLER:        { bg: '#dcfce7', text: '#166534' },
  NETWORKING:    { bg: '#f3e8ff', text: '#6b21a8' },
  INAUGURACION:  { bg: '#fef3c7', text: '#92400e' },
  CLAUSURA:      { bg: '#fce7f3', text: '#9d174d' },
};

export default function EmpresaEventosScreen() {
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,     setError]     = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const eeId = userStore.get()?.empresaeventoId ?? userStore.get()?.empresaEventoId;
      const res = await fetch(`${API_URL}/public/cronograma-vivo${eeId ? `?eeId=${eeId}` : ''}`);
      if (!res.ok) throw new Error('Error cargando actividades');
      const data = await res.json();
      setItems(Array.isArray(data?.actividades) ? data.actividades : []);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const suscribir = async (item: any) => {
    const eeId = userStore.get()?.empresaeventoId ?? userStore.get()?.empresaEventoId;
    if (!eeId) return;
    await fetch(`${API_URL}/empresa/cronograma-vivo/${item.id}/suscripcion`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eeId, suscrito: !item.suscrito }) });
    fetchData();
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <CalendarDays size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No hay actividades programadas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const colors = TIPO_COLORS[item.tipoActividad] ?? { bg: '#f1f5f9', text: '#475569' };
          return (
            <View style={s.card}>
              {!!item.urlImagenBannerActividad && <Image source={{ uri: item.urlImagenBannerActividad }} style={{ width: '100%', height: 150, resizeMode: 'contain', marginBottom: 12 }} />}
              <View style={s.cardHeader}>
                <View style={[s.tipoBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[s.tipoText, { color: colors.text }]}>{item.tipoActividad ?? 'ACTIVIDAD'}</Text>
                </View>
                <View style={[s.estadoBadge, { backgroundColor: item.estadoActividad === 'ACTIVA' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[s.estadoText, { color: item.estadoActividad === 'ACTIVA' ? '#166534' : '#475569' }]}>
                    {item.estadoActividad ?? '—'}
                  </Text>
                </View>
              </View>
              <Text style={s.cardTitle}>{item.nombreActividad}</Text>
              {!!item.descripcionActividad && (
                <Text style={s.cardDesc} numberOfLines={3}>{item.descripcionActividad}</Text>
              )}
              <View style={s.metaRow}>
                <CalendarDays size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={s.metaText}>{fmtDate(item.fechaActividad)}</Text>
              </View>
              {(item.horaInicioActividad || item.horaFinActividad) && (
                <View style={s.metaRow}>
                  <Clock size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                  <Text style={s.metaText}>
                    {item.horaInicioActividad?.slice(0, 5) ?? ''} – {item.horaFinActividad?.slice(0, 5) ?? ''}
                  </Text>
                </View>
              )}
              {!!item.nombreSalaEspacio && (
                <View style={s.metaRow}>
                  <MapPin size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                  <Text style={s.metaText}>{item.nombreSalaEspacio}</Text>
                </View>
              )}
              {!!item.nombreCompletoPilaExpositor && (
                <Text style={s.responsible}>Expositor: {item.nombreCompletoPilaExpositor}</Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {!!item.linkReunionVirtual && <TouchableOpacity onPress={() => Linking.openURL(item.linkReunionVirtual)} style={{ backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 6 }}><ExternalLink size={14} color="#fff"/><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Ver transmisión</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => suscribir(item)} style={{ backgroundColor: item.suscrito ? '#fef3c7' : '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', gap: 6 }}><Bell size={14} color={item.suscrito ? '#92400e' : '#475569'}/><Text style={{ color: item.suscrito ? '#92400e' : '#475569', fontSize: 12, fontWeight: '700' }}>{item.suscrito ? 'Suscrito' : 'Suscribirme'}</Text></TouchableOpacity>
              </View>
              {!!item.anuncios?.length && <View style={{ marginTop: 10, gap: 6 }}>{item.anuncios.map((a: any) => <View key={a.id} style={{ backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 6 }}><Megaphone size={14} color="#92400e"/><Text style={{ color: '#92400e', fontSize: 12, flex: 1 }}>{a.mensaje}</Text></View>)}</View>}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16, paddingBottom: 32 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tipoBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tipoText:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  estadoBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  estadoText:  { fontSize: 10, fontWeight: '700' },
  cardTitle:   { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6, lineHeight: 22 },
  cardDesc:    { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 10 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText:    { fontSize: 12, color: '#64748b' },
  responsible: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '600' },
});
