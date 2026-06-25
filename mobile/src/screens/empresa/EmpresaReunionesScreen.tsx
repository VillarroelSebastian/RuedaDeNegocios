import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, Clock, MapPin, Video, ExternalLink, AlertCircle } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PROGRAMADA: { bg: '#dbeafe', text: '#1e40af', label: 'Programada' },
  FINALIZADA: { bg: '#dcfce7', text: '#166534', label: 'Finalizada' },
  CANCELADA:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelada'  },
};

export default function EmpresaReunionesScreen({ navigation }: any) {
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,     setError]     = useState('');

  const user = userStore.get();

  const fetchData = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones?eeId=${eeId}`);
      if (!res.ok) throw new Error('Error cargando reuniones');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Mis reuniones</Text>
        <Text style={s.headerSub}>{items.length} reunión{items.length !== 1 ? 'es' : ''}</Text>
      </View>

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
            <Text style={s.emptyText}>No tienes reuniones confirmadas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.estado] ?? { bg: '#f1f5f9', text: '#475569', label: item.estado };
          const isVirtual = item.tipo === 'VIRTUAL';
          return (
            <View style={s.card}>
              {/* Status + modality badges */}
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: isVirtual ? '#eff6ff' : '#f0fdf4' }]}>
                  {isVirtual
                    ? <Video size={11} color="#2563eb" style={{ marginRight: 3 }} />
                    : <MapPin size={11} color={GREEN} style={{ marginRight: 3 }} />}
                  <Text style={[s.badgeText, { color: isVirtual ? '#2563eb' : GREEN }]}>
                    {item.tipo ?? '—'}
                  </Text>
                </View>
              </View>

              {/* Counterpart */}
              <Text style={s.counterpart}>{item.contraparte?.nombre ?? '—'}</Text>

              {/* Time */}
              <View style={s.metaRow}>
                <CalendarDays size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={s.metaText}>{fmtDate(item.inicio)}</Text>
                <Clock size={13} color="#94a3b8" style={{ marginLeft: 10, marginRight: 4 }} />
                <Text style={s.metaText}>{fmtTime(item.inicio)} – {fmtTime(item.fin)}</Text>
              </View>

              {/* Table or link */}
              {!isVirtual && item.mesa?.numeroMesa && (
                <View style={s.metaRow}>
                  <MapPin size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                  <Text style={s.metaText}>Mesa {item.mesa.numeroMesa}</Text>
                </View>
              )}
              {isVirtual && item.enlace && (
                <TouchableOpacity
                  style={s.linkRow}
                  onPress={() => Linking.openURL(item.enlace).catch(() => {})}
                >
                  <ExternalLink size={13} color="#2563eb" style={{ marginRight: 4 }} />
                  <Text style={s.linkText} numberOfLines={1}>{item.enlace}</Text>
                </TouchableOpacity>
              )}

              {/* Result exists */}
              {item.miResultado && (
                <View style={s.resultRow}>
                  <Text style={s.resultText}>★ {item.miResultado.calificacion}/5</Text>
                  {item.miResultado.rangoAcuerdo && (
                    <Text style={s.resultSub}> · {item.miResultado.rangoAcuerdo}</Text>
                  )}
                </View>
              )}

              {/* Evaluate button if finalizada and no result */}
              {item.estado === 'FINALIZADA' && !item.miResultado && (
                <TouchableOpacity
                  style={s.evalBtn}
                  onPress={() => navigation.navigate('Resultados', { reunionId: item.id, contraparte: item.contraparte?.nombre })}
                  activeOpacity={0.8}
                >
                  <Text style={s.evalBtnText}>Registrar resultado</Text>
                </TouchableOpacity>
              )}
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
  header: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
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
  badge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  counterpart: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText:    { fontSize: 12, color: '#64748b' },
  linkRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  linkText:    { fontSize: 12, color: '#2563eb', textDecorationLine: 'underline', flex: 1 },
  resultRow:   { flexDirection: 'row', marginTop: 8 },
  resultText:  { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
  resultSub:   { fontSize: 12, color: '#64748b' },
  evalBtn: {
    marginTop: 12, backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  evalBtnText: { color: GREEN, fontSize: 13, fontWeight: '700' },
});
