import React, { useEffect, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { userStore, API_URL } from '../utils/userStore';
import { activarPush, desactivarPush, restaurarPush, escucharPush, pedirPermisoInicial } from '../utils/push';

export default function PushNotifications({ onOpen }: { onOpen: (data: any) => boolean }) {
  const [user, setUser] = useState(userStore.get());
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => userStore.subscribe(() => setUser(userStore.get())), []);
  useEffect(() => { void pedirPermisoInicial().catch(() => {}); }, []);
  useEffect(() => {
    let alive = true, running = false;
    setMessage(''); setActive(false);
    const restore = async () => {
      if (!user?.token || running || userStore.get()?.token !== user.token) return;
      running = true;
      try { const value = await restaurarPush(API_URL, user.token); if (alive) { setActive(value); setMessage(''); } }
      catch { if (alive) setMessage('No se pudo activar push. Reintenta con conexión a internet.'); }
      finally { running = false; }
    };
    void restore();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void restore(); });
    const retry = setInterval(() => { if (AppState.currentState === 'active') void restore(); }, 60000);
    return () => { alive = false; clearInterval(retry); listener.remove(); };
  }, [user?.token]);
  useEffect(() => {
    let stop: undefined | (() => void), cancelled = false;
    escucharPush(onOpen).then(fn => { if (cancelled) fn(); else stop = fn; });
    return () => { cancelled = true; stop?.(); };
  }, [onOpen]);
  if (!user?.token) return null;
  return <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: '#dcfce7' }}>
    <TouchableOpacity disabled={busy} onPress={async () => {
      setBusy(true); setMessage('');
      try {
        if (active) { await desactivarPush(API_URL, user.token); setActive(false); }
        else { await activarPush(API_URL, user.token); setActive(true); }
      } catch (e: any) {
        Alert.alert('Notificaciones', e.message || 'No se pudo configurar push.', [
          { text: 'Cerrar', style: 'cancel' }, { text: 'Abrir ajustes', onPress: () => { void Linking.openSettings(); } },
        ]);
      } finally { setBusy(false); }
    }}>
      <Text style={{ textAlign: 'center', color: '#166534', fontWeight: '600' }}>
        {busy ? 'Procesando…' : active ? 'Notificaciones activadas · Desactivar' : 'Activar notificaciones'}
      </Text>
    </TouchableOpacity>
    {!!message && <Text accessibilityRole="alert" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>{message}</Text>}
  </View>;
}
