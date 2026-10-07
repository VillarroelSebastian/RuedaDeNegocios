import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, X } from 'lucide-react-native';
import { io } from 'socket.io-client';
import { useNavigation } from '@react-navigation/native';
import { API_URL, userStore } from '../utils/userStore';
import { subscribeNotifications } from '../utils/notificationEvents';
import ImagenLightbox from './ImagenLightbox';
import { useFeedback } from './FeedbackProvider';
import { abrirNotificacion } from '../../App';

export default function NotificationBell() {
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false), [items, setItems] = useState<any[]>([]), [count, setCount] = useState(0);
  const show = useFeedback();
  const refresh = useCallback(async () => {
    if (!userStore.get()?.token) return;
    const r = await fetch(`${API_URL}/notificaciones`);
    if (!r.ok) throw new Error('No se pudieron cargar las notificaciones');
    const data = await r.json(); setItems(data.notificaciones); setCount(data.noLeidas);
  }, []);
  useEffect(() => {
    const update = () => { void refresh().catch(() => {}); };
    update();
    const socket = io(`${API_URL.replace(/\/api\/?$/, '')}/notificaciones`, { transports: ['websocket'], auth: { token: userStore.get()?.token } });
    socket.on('connect', update); socket.onAny((event: string) => { if (!event.startsWith('mensaje') && !event.startsWith('chat-interno')) update(); });
    const timer = setInterval(update, 15000);
    const state = AppState.addEventListener('change', s => { if (s === 'active') update(); });
    const unsubscribe = subscribeNotifications(update);
    const focus = navigation.addListener('focus', update);
    return () => { socket.disconnect(); clearInterval(timer); state.remove(); unsubscribe(); focus(); };
  }, [refresh, navigation]);
  const report = (e: any) => { setOpen(false); show({ type: 'error', title: 'Notificaciones', message: e.message }); };
  const read = async (ids: string[]) => {
    const r = await fetch(`${API_URL}/notificaciones/leidas`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    if (!r.ok) throw new Error('No se pudieron marcar las notificaciones');
    await refresh();
  };
  return <>
    <TouchableOpacity accessibilityLabel={`Notificaciones: ${count} sin leer`} style={{ padding: 8, marginRight: 6 }} onPress={() => { setOpen(true); void refresh().catch(report); }}>
      <Bell size={22} color="#374151" />{count > 0 && <View style={{ position: 'absolute', top: 0, right: 0, borderRadius: 10, minWidth: 20, height: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text></View>}
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)' }}><View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, maxHeight: '90%', overflow: 'hidden' }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800', fontSize: 17 }}>Notificaciones del evento</Text><TouchableOpacity accessibilityLabel="Cerrar" onPress={() => setOpen(false)}><X size={22} /></TouchableOpacity></View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 12 }}>
            {items.length === 0 && <Text style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No hay notificaciones.</Text>}
            {items.map(n => <View key={n.id} style={{ padding: 12, borderRadius: 12, backgroundColor: n.leida ? '#f8fafc' : '#f0fdf4', marginBottom: 8 }}>
              {n.urlImagen && <ImagenLightbox uri={n.urlImagen} style={{ height: 100, width: '100%', marginBottom: 8 }} />}
              <TouchableOpacity onPress={() => { void (async () => { try { if (!n.leida) await read([n.id]); setOpen(false); abrirNotificacion({ tipo: n.tipo, referenciaId: n.referenciaId, url: n.enlace }); } catch (e) { report(e); } })(); }}>
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>{n.titulo}</Text><Text numberOfLines={3} style={{ color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 4 }}>{n.mensaje}</Text><Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 8 }}>{new Date(n.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</Text>
              </TouchableOpacity>
            </View>)}
          </ScrollView>
          {items.some(n => !n.leida) && <TouchableOpacity style={{ padding: 16 }} onPress={() => { void read(items.filter(n => !n.leida).map(n => n.id)).catch(report); }}><Text style={{ textAlign: 'center', fontWeight: '700', color: '#166534' }}>Marcar estas notificaciones como leídas</Text></TouchableOpacity>}
        </View>
      </View></SafeAreaView>
    </Modal>
  </>;
}
