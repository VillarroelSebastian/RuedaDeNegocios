import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Building2, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';
const PAGE_SIZE = 10;
type EmpresaOportunidad = { empresaeventoId: number; nombre: string; codigo?: string | null; rubro?: string | null };
type Oportunidad = { empresaA: EmpresaOportunidad; empresaB: EmpresaOportunidad; motivos: string[] };

export default function OportunidadesStaffScreen() {
  const [items, setItems] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [rubro, setRubro] = useState('TODOS');
  const [orden, setOrden] = useState<'RELEVANCIA' | 'ALFABETICO'>('RELEVANCIA');
  const [pagina, setPagina] = useState(1);
  const cargar = useCallback(async () => { try { const r = await fetch(`${API_URL}/staff/oportunidades`); const d = await r.json(); if (!r.ok) throw new Error(d?.message || 'No se pudieron cargar las coincidencias.'); setItems(Array.isArray(d) ? d : []); setError(''); } catch (e: any) { setError(e.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const rubros = useMemo(() => [...new Set(items.flatMap((item) => [item.empresaA.rubro, item.empresaB.rubro]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')), [items]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return items.filter((item) => {
      const texto = [item.empresaA.nombre, item.empresaA.codigo, item.empresaA.rubro, item.empresaB.nombre, item.empresaB.codigo, item.empresaB.rubro, ...item.motivos].filter(Boolean).join(' ').toLocaleLowerCase('es');
      return (!q || texto.includes(q)) && (rubro === 'TODOS' || item.empresaA.rubro === rubro || item.empresaB.rubro === rubro);
    }).sort((a, b) => orden === 'ALFABETICO' ? a.empresaA.nombre.localeCompare(b.empresaA.nombre, 'es') : b.motivos.length - a.motivos.length);
  }, [busqueda, items, orden, rubro]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={GREEN} /></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}>
    <View><Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Oportunidades</Text><Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>Empresas con oferta, demanda o intereses compatibles.</Text></View>
    {!!error && <Text style={{ borderRadius: 12, backgroundColor: '#fef2f2', padding: 12, color: '#b91c1c' }}>{error}</Text>}
    {!!items.length && <View style={{ gap: 10, borderRadius: 16, backgroundColor: '#fff', padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 10 }}><Search size={17} color="#9ca3af" /><TextInput value={busqueda} onChangeText={(value) => { setBusqueda(value); setPagina(1); }} placeholder="Empresa, código, rubro o motivo" style={{ flex: 1, height: 42, fontSize: 13 }} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{['TODOS', ...rubros].map((item) => <TouchableOpacity key={item} onPress={() => { setRubro(item); setPagina(1); }} style={{ borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: rubro === item ? GREEN : '#f3f4f6' }}><Text style={{ fontSize: 11, fontWeight: '700', color: rubro === item ? '#fff' : '#4b5563' }}>{item === 'TODOS' ? 'Todos los rubros' : item}</Text></TouchableOpacity>)}</ScrollView>
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['RELEVANCIA', 'ALFABETICO'] as const).map((item) => <TouchableOpacity key={item} onPress={() => { setOrden(item); setPagina(1); }} style={{ flex: 1, borderRadius: 10, padding: 8, backgroundColor: orden === item ? '#dcfce7' : '#f3f4f6' }}><Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '700', color: orden === item ? '#166534' : '#6b7280' }}>{item === 'RELEVANCIA' ? 'Más relevantes' : 'Alfabéticamente'}</Text></TouchableOpacity>)}</View>
    </View>}
    {!items.length && !error && <Text style={{ paddingVertical: 40, textAlign: 'center', color: '#9ca3af' }}>No se encontraron coincidencias.</Text>}
    {!!items.length && !filtrados.length && <Text style={{ paddingVertical: 40, textAlign: 'center', color: '#9ca3af' }}>No hay resultados para estos filtros.</Text>}
    {!!filtrados.length && <Text style={{ fontSize: 11, color: '#6b7280' }}>{filtrados.length} coincidencia(s) · Página {paginaActual} de {totalPaginas}</Text>}
    {visibles.map((item) => <View key={`${item.empresaA.empresaeventoId}-${item.empresaB.empresaeventoId}`} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#fff', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Empresa data={item.empresaA} /><Sparkles size={19} color="#f59e0b" /><Empresa data={item.empresaB} /></View>
      <View style={{ marginTop: 12, gap: 6 }}>{item.motivos.map((m: string, i: number) => <Text key={i} style={{ borderRadius: 9, backgroundColor: '#f0fdf4', padding: 8, fontSize: 11, fontWeight: '600', color: '#166534' }}>{m}</Text>)}</View>
    </View>)}
    {totalPaginas > 1 && <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}><TouchableOpacity disabled={paginaActual === 1} onPress={() => setPagina((p) => Math.max(1, p - 1))} style={{ opacity: paginaActual === 1 ? 0.35 : 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 9 }}><ChevronLeft size={18} color="#374151" /></TouchableOpacity><Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280' }}>{paginaActual} / {totalPaginas}</Text><TouchableOpacity disabled={paginaActual === totalPaginas} onPress={() => setPagina((p) => Math.min(totalPaginas, p + 1))} style={{ opacity: paginaActual === totalPaginas ? 0.35 : 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 9 }}><ChevronRight size={18} color="#374151" /></TouchableOpacity></View>}
  </ScrollView>;
}

function Empresa({ data }: { data: EmpresaOportunidad }) { return <View style={{ flex: 1, alignItems: 'center' }}><View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}><Building2 size={18} color={GREEN} /></View><Text numberOfLines={2} style={{ marginTop: 5, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#111827' }}>{data.nombre}</Text><Text style={{ fontSize: 9, color: '#9ca3af' }}>{data.codigo || 'Sin código'}</Text><Text numberOfLines={1} style={{ fontSize: 9, color: '#6b7280' }}>{data.rubro}</Text></View>; }
