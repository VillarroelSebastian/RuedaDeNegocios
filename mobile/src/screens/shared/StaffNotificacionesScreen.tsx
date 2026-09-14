import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Bell, CalendarClock } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';
export default function StaffNotificacionesScreen({ navigation }: any) {
  const admin = userStore.get()?.rolEvento === 'ADMINISTRADOR';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const cargar = useCallback(async (mostrarCarga = true) => { if (mostrarCarga) setLoading(true); try { const r = await fetch(`${API_URL}/${admin ? 'admin/notificaciones' : 'tecnico/notificaciones-reuniones'}`); const d = await r.json(); setItems(admin ? (d.notificaciones || []) : (Array.isArray(d) ? d : [])); } catch { setItems([]); } finally { if (mostrarCarga) setLoading(false); } }, [admin]);
  useFocusEffect(useCallback(() => { cargar(); const timer = setInterval(() => cargar(false), 15000); return () => clearInterval(timer); }, [cargar]));
  const abrir = (n: any) => {
    if (!admin) { navigation.navigate('TecnicoTabs', { screen: 'TecnicoVirtuales' }); return; }
    if (String(n.enlace).includes('pagos-adicionales')) navigation.navigate('PagosAdicionales');
    else if (String(n.enlace).match(/\/admin\/pagos\/(\d+)/)) navigation.navigate('PagoDetail', { id: Number(String(n.enlace).match(/\d+$/)?.[0]) });
    else navigation.navigate('AdminTabs', { screen: 'Empresas' });
  };
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}><View style={{ padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Bell size={23} color={GREEN} /><View><Text style={{ fontSize: 21, fontWeight: '900', color: '#0f172a' }}>Notificaciones</Text><Text style={{ color: '#64748b', fontSize: 12 }}>{admin ? 'Pagos, cupos y nuevas empresas' : 'Alertas operativas de reuniones'}</Text></View></View></View>
    {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 45 }} /> : <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={cargar} tintColor={GREEN} />} contentContainerStyle={{ padding: 14, gap: 10 }}>{items.length === 0 ? <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 45 }}>No hay notificaciones pendientes.</Text> : items.map((n: any) => <TouchableOpacity key={n.id} onPress={() => abrir(n)} style={{ backgroundColor: n.urgente || !n.leida ? '#fff7ed' : '#fff', borderRadius: 14, borderWidth: 1, borderColor: n.urgente ? '#fca5a5' : '#e2e8f0', padding: 14 }}><View style={{ flexDirection: 'row', gap: 10 }}><CalendarClock size={19} color={n.urgente ? '#dc2626' : GREEN} /><View style={{ flex: 1 }}><Text style={{ fontWeight: '900', color: '#0f172a' }}>{n.titulo}</Text><Text style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 4 }}>{n.mensaje}</Text><Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 7 }}>{new Date(n.fecha || n.fechaCreacion).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</Text></View></View></TouchableOpacity>)}</ScrollView>}
  </View>;
}
