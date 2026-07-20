import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Search, Building2, Send, X, MapPin, Star, Filter, Mail, Phone, Globe, FileText, Hash,
} from 'lucide-react-native';
import ImagenLightbox from '../../components/ImagenLightbox';
import { API_URL, userStore } from '../../utils/userStore';
import { paisConBandera } from '../../utils/pais';

const GREEN = '#449D3A';

function afinidadInfo(afinidad: string | null) {
  if (afinidad === 'alta') return { label: 'Mismo rubro', color: GREEN, bg: '#f0fdf4' };
  if (afinidad === 'media') return { label: 'Rubro complementario', color: '#d97706', bg: '#fffbeb' };
  return null;
}

function PerfilModal({ empresa, esEncargado, onClose, navigation }: any) {
  if (!empresa) return null;
  const afin = afinidadInfo(empresa.afinidad);
  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>Perfil de empresa</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={pm.row}>
              {empresa.urlFotoPerfil ? (
                <ImagenLightbox uri={empresa.urlFotoPerfil} style={pm.avatar} />
              ) : (
                <View style={[pm.avatar, pm.avatarPlaceholder]}><Building2 size={26} color={GREEN} /></View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={pm.name}>{empresa.nombre}</Text>
                {!!empresa.codigo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Hash size={11} color="#9ca3af" />
                    <Text style={pm.codigo}>{empresa.codigo}</Text>
                  </View>
                )}
                {!!empresa.rubro && <Text style={pm.rubro}>{empresa.rubro}</Text>}
                {(empresa.ciudad || empresa.pais) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <MapPin size={11} color="#9ca3af" />
                    <Text style={pm.meta}>{[empresa.ciudad, paisConBandera(empresa.pais)].filter(Boolean).join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>

            {afin && (
              <View style={[pm.afinBadge, { backgroundColor: afin.bg }]}>
                <Star size={12} color={afin.color} />
                <Text style={[pm.afinText, { color: afin.color }]}>{afin.label}</Text>
              </View>
            )}

            {!!empresa.descripcion && <Text style={pm.desc}>{empresa.descripcion}</Text>}

            {!!empresa.oferta && (
              <View style={[pm.infoBox, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[pm.infoLabel, { color: '#166534' }]}>Ofrece</Text>
                <Text style={[pm.infoText, { color: '#166534' }]}>{empresa.oferta}</Text>
              </View>
            )}
            {!!empresa.demanda && (
              <View style={[pm.infoBox, { backgroundColor: '#eff6ff' }]}>
                <Text style={[pm.infoLabel, { color: '#1e40af' }]}>Busca</Text>
                <Text style={[pm.infoText, { color: '#1e40af' }]}>{empresa.demanda}</Text>
              </View>
            )}

            <View style={{ marginTop: 8, gap: 6 }}>
              {!!empresa.correoCorporativo && (
                <View style={pm.contactRow}><Mail size={13} color="#9ca3af" /><Text style={pm.contactText}>{empresa.correoCorporativo}</Text></View>
              )}
              {!!empresa.telefonoWhatsapp && (
                <View style={pm.contactRow}><Phone size={13} color="#9ca3af" /><Text style={pm.contactText}>{empresa.telefonoWhatsapp}</Text></View>
              )}
              {!!empresa.sitioWeb && (
                <View style={pm.contactRow}><Globe size={13} color={GREEN} /><Text style={[pm.contactText, { color: GREEN, fontWeight: '700' }]}>{empresa.sitioWeb}</Text></View>
              )}
              {!!empresa.urlPdf && (
                <View style={pm.contactRow}><FileText size={13} color={GREEN} /><Text style={[pm.contactText, { color: GREEN, fontWeight: '700' }]}>Ver catálogo / brochure</Text></View>
              )}
            </View>

            {esEncargado && (
              <TouchableOpacity
                style={pm.solicitarBtn}
                onPress={() => {
                  onClose();
                  navigation.navigate('Empresas');
                }}
                activeOpacity={0.85}
              >
                <Send size={15} color="#fff" />
                <Text style={pm.solicitarBtnText}>Solicitar reunión</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function EmpresaDirectorioScreen() {
  const navigation = useNavigation<any>();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroOferta, setFiltroOferta] = useState('');
  const [filtroDemanda, setFiltroDemanda] = useState('');
  const [filtroLugar, setFiltroLugar] = useState('');
  const [perfilAbierto, setPerfilAbierto] = useState<any>(null);
  const user = userStore.get();

  const cargar = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ eeId: String(eeId) });
      if (filtroOferta.trim()) params.set('oferta', filtroOferta.trim());
      if (filtroDemanda.trim()) params.set('demanda', filtroDemanda.trim());
      if (filtroLugar.trim()) params.set('lugar', filtroLugar.trim());
      const res = await fetch(`${API_URL}/empresa/directorio?${params}`);
      const data = res.ok ? await res.json() : [];
      setEmpresas(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.empresaeventoId, filtroOferta, filtroDemanda, filtroLugar]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Directorio</Text>
        <TouchableOpacity onPress={() => setMostrarFiltros((v) => !v)} style={[s.filterBtn, mostrarFiltros && s.filterBtnActive]}>
          <Filter size={16} color={mostrarFiltros ? '#fff' : GREEN} />
        </TouchableOpacity>
      </View>

      <View style={s.searchBox}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, rubro o código..."
          placeholderTextColor="#9ca3af"
          style={s.searchInput}
        />
      </View>

      {mostrarFiltros && (
        <View style={s.filtrosBox}>
          <TextInput value={filtroOferta} onChangeText={setFiltroOferta} placeholder="Ofrece..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
          <TextInput value={filtroDemanda} onChangeText={setFiltroDemanda} placeholder="Busca..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
          <TextInput value={filtroLugar} onChangeText={setFiltroLugar} placeholder="Lugar (ciudad o país)..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={GREEN} />
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(item) => String(item.empresaeventoId)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} colors={[GREEN]} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Building2 size={40} color="#d1d5db" />
              <Text style={s.emptyText}>No hay empresas para mostrar.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const afin = afinidadInfo(item.afinidad);
            return (
              <TouchableOpacity style={s.card} onPress={() => setPerfilAbierto(item)} activeOpacity={0.8}>
                {afin && (
                  <View style={[s.afinBadge, { backgroundColor: afin.bg }]}>
                    <Star size={10} color={afin.color} />
                    <Text style={[s.afinText, { color: afin.color }]}>{afin.label}</Text>
                  </View>
                )}
                <View style={s.cardTop}>
                  {item.urlFotoPerfil ? (
                    <ImagenLightbox uri={item.urlFotoPerfil} style={s.cardAvatar} imgStyle={{ borderRadius: 12 }} />
                  ) : (
                    <View style={s.cardAvatar}><Text style={s.cardAvatarText}>{(item.nombre ?? 'E')[0].toUpperCase()}</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName} numberOfLines={2}>{item.nombre}</Text>
                    {!!item.codigo && <Text style={s.codigoText}>{item.codigo}</Text>}
                    {!!item.rubro && <Text style={s.rubroText}>{item.rubro}</Text>}
                  </View>
                </View>
                {!!item.oferta && <Text style={s.ofertaText} numberOfLines={2}>Ofrece: {item.oferta}</Text>}
                <Text style={s.verPerfil}>Ver perfil completo →</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <PerfilModal empresa={perfilAbierto} esEncargado={!!user?.esResponsable} onClose={() => setPerfilAbierto(null)} navigation={navigation} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  filterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: GREEN },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  filtrosBox: { marginHorizontal: 16, marginTop: 8, gap: 8 },
  filtroInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 40, fontSize: 13, color: '#0f172a' },
  list: { padding: 16, gap: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  afinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  afinText: { fontSize: 10, fontWeight: '700' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardAvatar: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  cardAvatarText: { fontSize: 18, fontWeight: '800', color: GREEN },
  cardName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  codigoText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  rubroText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  ofertaText: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  verPerfil: { fontSize: 12, fontWeight: '800', color: GREEN },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 60, height: 60, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  codigo: { fontSize: 10, fontWeight: '700', color: '#9ca3af', marginLeft: 3 },
  rubro: { fontSize: 12, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 11, color: '#9ca3af', marginLeft: 3 },
  afinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 14 },
  afinText: { fontSize: 11, fontWeight: '700' },
  desc: { fontSize: 13, color: '#4b5563', lineHeight: 19, marginTop: 14 },
  infoBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  infoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  infoText: { fontSize: 13 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { fontSize: 12, color: '#6b7280' },
  solicitarBtn: { flexDirection: 'row', gap: 8, backgroundColor: GREEN, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  solicitarBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
