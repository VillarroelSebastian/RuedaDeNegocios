import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Newspaper, AlertCircle } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function EmpresaComunicadosScreen() {
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/comunicados`);
      if (!res.ok) throw new Error('Error cargando comunicados');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

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
            <Newspaper size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No hay comunicados publicados</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = !!expanded[item.id];
          return (
            <TouchableOpacity style={s.card} onPress={() => toggle(item.id)} activeOpacity={0.8}>
              {item.urlImagen ? (
                <Image
                  source={{ uri: item.urlImagen }}
                  style={s.cardImg}
                  resizeMode="cover"
                  onError={() => {}}
                />
              ) : (
                <View style={s.cardImgPlaceholder}>
                  <Newspaper size={32} color="#d1d5db" />
                </View>
              )}
              <View style={s.cardBody}>
                <Text style={s.cardDate}>{fmtDate(item.fechaHoraPublicacion)}</Text>
                <Text style={s.cardTitle}>{item.titulo}</Text>
                {isOpen && (
                  <Text style={s.cardContent}>{item.contenido}</Text>
                )}
                <Text style={s.cardMore}>{isOpen ? 'Ver menos ▲' : 'Leer más ▼'}</Text>
              </View>
            </TouchableOpacity>
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
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardImg: { width: '100%', height: 160 },
  cardImgPlaceholder: {
    width: '100%', height: 100,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
  },
  cardBody:    { padding: 16 },
  cardDate:    { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: '600' },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, lineHeight: 22 },
  cardContent: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 8 },
  cardMore:    { fontSize: 12, color: GREEN, fontWeight: '700' },
});
