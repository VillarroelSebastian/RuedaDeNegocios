import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Building2, MapPin, Send, Sparkles, CheckCircle2 } from 'lucide-react-native';
import ImagenLightbox from '../../components/ImagenLightbox';
import { API_URL, userStore } from '../../utils/userStore';
import { paisConBandera } from '../../utils/pais';

const GREEN = '#449D3A';

export default function EmpresaOportunidadesScreen() {
  const navigation = useNavigation<any>();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = userStore.get();

  const cargar = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/empresa/oportunidades?eeId=${eeId}`);
      const data = res.ok ? await res.json() : [];
      setOportunidades(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.empresaeventoId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <View style={s.header}>
        <Sparkles size={20} color={GREEN} />
        <View style={{ marginLeft: 8 }}>
          <Text style={s.headerTitle}>Oportunidades</Text>
          <Text style={s.headerSub}>Empresas afines a tu perfil</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />
      ) : (
        <FlatList
          data={oportunidades}
          keyExtractor={(item) => String(item.empresaeventoId)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} colors={[GREEN]} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Sparkles size={40} color="#d1d5db" />
              <Text style={s.emptyText}>
                Aún no encontramos coincidencias. Completa la oferta, demanda y sectores de interés en tu perfil.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
                <Text style={s.emptyLink}>Ir a Mi Perfil →</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                {item.urlFotoPerfil ? (
                  <ImagenLightbox uri={item.urlFotoPerfil} style={s.cardAvatar} imgStyle={{ borderRadius: 12 }} />
                ) : (
                  <View style={s.cardAvatar}><Building2 size={20} color={GREEN} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName} numberOfLines={2}>{item.nombre}</Text>
                  {!!item.codigo && <Text style={s.codigoText}>{item.codigo}</Text>}
                  {!!item.rubro && <Text style={s.rubroText}>{item.rubro}</Text>}
                </View>
              </View>

              {item.motivos.map((m: string, i: number) => (
                <View key={i} style={s.motivoRow}>
                  <CheckCircle2 size={13} color={GREEN} />
                  <Text style={s.motivoText}>{m}</Text>
                </View>
              ))}

              {(item.ciudad || item.pais) && (
                <View style={s.metaRow}>
                  <MapPin size={11} color="#9ca3af" />
                  <Text style={s.metaText}>{[item.ciudad, paisConBandera(item.pais)].filter(Boolean).join(', ')}</Text>
                </View>
              )}

              {!!user?.esResponsable && (
                <TouchableOpacity style={s.solicitarBtn} onPress={() => navigation.navigate('Empresas')} activeOpacity={0.85}>
                  <Send size={14} color="#fff" />
                  <Text style={s.solicitarBtnText}>Solicitar reunión</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#9ca3af' },
  list: { padding: 16, gap: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 19 },
  emptyLink: { fontSize: 13, fontWeight: '800', color: GREEN },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#449D3A33' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  cardName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  codigoText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  rubroText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  motivoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  motivoText: { fontSize: 12, color: '#166534', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaText: { fontSize: 11, color: '#9ca3af' },
  solicitarBtn: { flexDirection: 'row', gap: 8, backgroundColor: GREEN, borderRadius: 12, height: 42, alignItems: 'center', justifyContent: 'center' },
  solicitarBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
