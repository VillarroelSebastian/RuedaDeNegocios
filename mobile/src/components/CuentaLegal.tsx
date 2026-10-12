import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ShieldCheck, Trash2, X } from 'lucide-react-native';
import { API_URL, userStore } from '../utils/userStore';
import { abrirEnlace } from '../utils/abrirEnlace';
import { navigationRef } from '../../App';

// Origen público de la web (sin el prefijo /api del backend).
export const WEB_URL = API_URL.replace(/\/api\/?$/, '');
export const URL_PRIVACIDAD = `${WEB_URL}/privacidad`;

// Enlaces legales de la cuenta: política de privacidad y eliminación de cuenta
// (requisito de Google Play: la baja debe poder pedirse dentro de la app).
export default function CuentaLegal() {
  const [abierto, setAbierto] = useState(false);
  const [contrasenia, setContrasenia] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const eliminar = async () => {
    if (enviandoRef.current) return;
    if (!contrasenia) { setError('Escribe tu contraseña para confirmar.'); return; }
    enviandoRef.current = true;
    setEnviando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/cuenta/eliminar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contrasenia }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? 'No se pudo eliminar la cuenta.');
      await userStore.clear();
      setAbierto(false);
      if (navigationRef.isReady()) navigationRef.reset({ index: 0, routes: [{ name: 'Login' as never }] });
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar la cuenta.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={{ marginTop: 8, marginBottom: 8 }}>
      <TouchableOpacity onPress={() => abrirEnlace(URL_PRIVACIDAD)} activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 }}>
        <ShieldCheck size={18} color="#64748b" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>Política de privacidad</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { setContrasenia(''); setError(''); setAbierto(true); }} activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 }}>
        <Trash2 size={18} color="#b91c1c" />
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#b91c1c' }}>Eliminar mi cuenta</Text>
      </TouchableOpacity>

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>Eliminar mi cuenta</Text>
                <TouchableOpacity onPress={() => setAbierto(false)}><X size={22} color="#64748b" /></TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#475569', marginTop: 10, lineHeight: 19 }}>
                Dejarás de poder ingresar con esta cuenta y se desactivarán tus dispositivos de notificaciones.
                Los registros del evento en los que participaste (pagos, reuniones y resultados) se conservan para el historial del evento.
                Esta acción no se puede deshacer desde la app.
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', marginTop: 14, marginBottom: 5 }}>Tu contraseña para confirmar *</Text>
              <TextInput value={contrasenia} onChangeText={setContrasenia} secureTextEntry autoCapitalize="none" placeholder="Contraseña" placeholderTextColor="#9ca3af"
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14 }} />
              {!!error && <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{error}</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setAbierto(false)} disabled={enviando}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                  <Text style={{ color: '#475569', fontWeight: '800' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={eliminar} disabled={enviando || !contrasenia}
                  style={{ flex: 1, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: enviando || !contrasenia ? 0.5 : 1 }}>
                  {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Eliminar cuenta</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
