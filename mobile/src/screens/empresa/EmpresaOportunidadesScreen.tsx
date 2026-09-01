import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Building2, ChevronLeft, ChevronRight, MapPin, Search, Send, Sparkles, CheckCircle2 } from 'lucide-react-native';
import ImagenLightbox from '../../components/ImagenLightbox';
import { API_URL, userStore } from '../../utils/userStore';
import { paisConBandera } from '../../utils/pais';

const GREEN = '#449D3A';

export default function EmpresaOportunidadesScreen() {
  const navigation = useNavigation<any>();
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [rubro, setRubro] = useState('TODOS');
  const [orden, setOrden] = useState<'RELEVANCIA' | 'ALFABETICO'>('RELEVANCIA');
  const [pagina, setPagina] = useState(1);
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

  const rubros = useMemo(() => [...new Set(oportunidades.map((item) => item.rubro).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')), [oportunidades]);
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return oportunidades.filter((item) => {
      const texto = [item.nombre, item.codigo, item.rubro, item.ciudad, item.pais, ...(item.motivos || [])].filter(Boolean).join(' ').toLocaleLowerCase('es');
      return (!q || texto.includes(q)) && (rubro === 'TODOS' || item.rubro === rubro);
    }).sort((a, b) => orden === 'ALFABETICO' ? a.nombre.localeCompare(b.nombre, 'es') : b.motivos.length - a.motivos.length);
  }, [busqueda, oportunidades, orden, rubro]);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / 8));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * 8, paginaActual * 8);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <View style={s.header}>
        <Sparkles size={20} color={GREEN} />
        <View style={{ marginLeft: 8 }}>
          <Text style={s.headerTitle}>Oportunidades</Text>
          <Text style={s.headerSub}>Mejores empresas afines a tu perfil</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(item) => String(item.empresaeventoId)}
          contentContainerStyle={s.list}
          ListHeaderComponent={oportunidades.length ? <View style={s.filters}>
            <View style={s.search}><Search size={17} color="#9ca3af" /><TextInput value={busqueda} onChangeText={(value) => { setBusqueda(value); setPagina(1); }} placeholder="Empresa, código, rubro o coincidencia" style={{ flex: 1, height: 42, fontSize: 13 }} /></View>
            <FlatList horizontal data={['TODOS', ...rubros]} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }} renderItem={({ item }) => <TouchableOpacity onPress={() => { setRubro(item); setPagina(1); }} style={[s.chip, rubro === item && s.chipActive]}><Text style={[s.chipText, rubro === item && s.chipTextActive]}>{item === 'TODOS' ? 'Todos los rubros' : item}</Text></TouchableOpacity>} />
            <View style={{ flexDirection: 'row', gap: 8 }}>{(['RELEVANCIA', 'ALFABETICO'] as const).map((item) => <TouchableOpacity key={item} onPress={() => { setOrden(item); setPagina(1); }} style={[s.orderBtn, orden === item && s.orderActive]}><Text style={[s.orderText, orden === item && { color: '#166534' }]}>{item === 'RELEVANCIA' ? 'Más relevantes' : 'Alfabéticamente'}</Text></TouchableOpacity>)}</View>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{filtradas.length} resultado(s) · Página {paginaActual} de {totalPaginas}</Text>
          </View> : null}
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
          ListFooterComponent={totalPaginas > 1 ? <View style={s.pagination}><TouchableOpacity disabled={paginaActual === 1} onPress={() => setPagina((p) => Math.max(1, p - 1))} style={{ opacity: paginaActual === 1 ? 0.35 : 1 }}><ChevronLeft size={22} color="#374151" /></TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280' }}>{paginaActual} / {totalPaginas}</Text><TouchableOpacity disabled={paginaActual === totalPaginas} onPress={() => setPagina((p) => Math.min(totalPaginas, p + 1))} style={{ opacity: paginaActual === totalPaginas ? 0.35 : 1 }}><ChevronRight size={22} color="#374151" /></TouchableOpacity></View> : null}
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
  filters: { gap: 10, marginBottom: 4, borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 10 },
  chip: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: GREEN },
  chipText: { fontSize: 11, fontWeight: '700', color: '#4b5563' },
  chipTextActive: { color: '#fff' },
  orderBtn: { flex: 1, borderRadius: 10, padding: 8, backgroundColor: '#f3f4f6' },
  orderActive: { backgroundColor: '#dcfce7' },
  orderText: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#6b7280' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, paddingVertical: 12 },
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
