import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Send, Users } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';
const POLL_MS = 7000;

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatInternoScreen() {
  const user = userStore.get();

  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef<FlatList>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/staff/chat-interno`);
      const data = res.ok ? await res.json() : [];
      setMensajes(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    cargar();
    const iv = setInterval(cargar, POLL_MS);
    return () => clearInterval(iv);
  }, [cargar]));

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !user?.id || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/staff/chat-interno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: user.id, contenido: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al enviar');
      setTexto('');
      await cargar();
    } catch (e: any) { setError(e.message || 'Error de red'); }
    finally { setEnviando(false); }
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0} style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={s.headerIcon}><Users size={16} color={GREEN} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle}>Equipo del evento</Text>
            <Text style={s.headerSub}>Canal compartido entre administración y técnicos</Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(m: any) => String(m.id)}
          contentContainerStyle={{ padding: 14, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Users size={44} color="#d1d5db" />
              <Text style={s.emptyText}>Aún no hay mensajes en el canal del equipo.</Text>
            </View>
          }
          renderItem={({ item }: any) => {
            const esMio = item.usuario_id === user?.id;
            return (
              <View style={[s.burbujaWrap, esMio ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                <View style={[s.burbuja, esMio ? s.burbujaMia : s.burbujaOtra]}>
                  {!esMio && (
                    <Text style={s.burbujaAutorOtra}>
                      {item.autorNombre} · {item.autorRol === 'ADMIN' ? 'Organización' : 'Técnico'}
                    </Text>
                  )}
                  <Text style={[s.burbujaTexto, esMio && { color: '#fff' }]}>{item.contenido}</Text>
                  <Text style={[s.burbujaHora, esMio && { color: 'rgba(255,255,255,0.6)' }]}>{fmtHora(item.fechaCreacion)}</Text>
                </View>
              </View>
            );
          }}
        />

        {!!error && <Text style={s.chatError}>{error}</Text>}

        <View style={s.inputRow}>
          <TextInput
            style={s.inputChat}
            placeholder="Escribe algo para el equipo..."
            placeholderTextColor="#9ca3af"
            value={texto}
            onChangeText={setTexto}
            maxLength={1000}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!texto.trim() || enviando) && { opacity: 0.4 }]}
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            activeOpacity={0.8}
          >
            {enviando ? <ActivityIndicator color="#fff" size="small" /> : <Send size={17} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 40 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 30 },

  chatError: { fontSize: 12, color: '#dc2626', textAlign: 'center', paddingBottom: 4 },

  burbujaWrap: { width: '100%' },
  burbuja: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  burbujaMia:  { backgroundColor: GREEN, borderTopRightRadius: 4 },
  burbujaOtra: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderTopLeftRadius: 4 },
  burbujaAutorOtra: { fontSize: 10, fontWeight: '800', color: GREEN, marginBottom: 2 },
  burbujaTexto: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  burbujaHora:  { fontSize: 9, color: '#94a3b8', marginTop: 3, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  inputChat: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 13, paddingVertical: 9, fontSize: 14, color: '#0f172a',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
});
