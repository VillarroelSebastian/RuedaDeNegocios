import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Building2, Sparkles } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';
type EmpresaOportunidad = { empresaeventoId: number; nombre: string; codigo?: string | null };
type Oportunidad = { empresaA: EmpresaOportunidad; empresaB: EmpresaOportunidad; motivos: string[] };
export default function OportunidadesStaffScreen() {
  const [items, setItems] = useState<Oportunidad[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const cargar = useCallback(async () => { try { const r = await fetch(`${API_URL}/staff/oportunidades`); const d = await r.json(); if (!r.ok) throw new Error(d?.message || 'No se pudieron cargar las coincidencias.'); setItems(Array.isArray(d) ? d : []); setError(''); } catch (e: any) { setError(e.message); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={GREEN} /></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}>
    <View><Text style={{ fontSize: 22, fontWeight: '800', color: '#111827' }}>Oportunidades</Text><Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>Empresas con oferta, demanda o intereses compatibles.</Text></View>
    {!!error && <Text style={{ borderRadius: 12, backgroundColor: '#fef2f2', padding: 12, color: '#b91c1c' }}>{error}</Text>}
    {!items.length && !error && <Text style={{ paddingVertical: 40, textAlign: 'center', color: '#9ca3af' }}>No se encontraron coincidencias.</Text>}
    {items.map((item) => <View key={`${item.empresaA.empresaeventoId}-${item.empresaB.empresaeventoId}`} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7', backgroundColor: '#fff', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Empresa data={item.empresaA} /><Sparkles size={19} color="#f59e0b" /><Empresa data={item.empresaB} /></View>
      <View style={{ marginTop: 12, gap: 6 }}>{item.motivos.map((m: string, i: number) => <Text key={i} style={{ borderRadius: 9, backgroundColor: '#f0fdf4', padding: 8, fontSize: 11, fontWeight: '600', color: '#166534' }}>{m}</Text>)}</View>
    </View>)}
  </ScrollView>;
}
function Empresa({ data }: { data: EmpresaOportunidad }) { return <View style={{ flex: 1, alignItems: 'center' }}><View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' }}><Building2 size={18} color={GREEN} /></View><Text numberOfLines={2} style={{ marginTop: 5, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#111827' }}>{data.nombre}</Text><Text style={{ fontSize: 9, color: '#9ca3af' }}>{data.codigo || 'Sin código'}</Text></View>; }
