import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, Platform, ActivityIndicator, StyleSheet,
  Pressable,
} from 'react-native';
import { Bot, X, Send, User, Calendar, Clock, MapPin, Video, Building2 } from 'lucide-react-native';
import { API_URL, userStore } from '../utils/userStore';
import ImagenLightbox from './ImagenLightbox';
import KeyboardSafeView from './KeyboardSafeView';
import { SafeAreaView } from 'react-native-safe-area-context';

const GREEN = '#449D3A';

const SUGERENCIAS = [
  'Agendar una reunión',
  'Mi próxima reunión',
  'Todas mis reuniones aceptadas',
  'Mi próxima mesa',
  'Fecha y horario del evento',
  'Solicitudes pendientes',
  'Cupos disponibles',
];

const BIENVENIDA = '¡Hola! Soy tu asistente virtual del evento. Elige una opción del 1 al 7 o escribe tu pregunta. Después de cada consulta volveré a mostrarte el menú principal.';

interface ReunionCard {
  empresa: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  lugar: string;
  enlace: string | null;
  estado: string;
}

interface Msg {
  role: 'user' | 'bot';
  text: string;
  imageUrl?: string;
  opciones?: string[];
  reuniones?: ReunionCard[];
}

function ReunionCardMobile({ r }: { r: ReunionCard }) {
  return (
    <View style={s.reunionCard}>
      <View style={s.reunionRow}>
        <Building2 size={13} color={GREEN} />
        <Text style={s.reunionEmpresa}>{r.empresa}</Text>
      </View>
      <View style={s.reunionRow}>
        <Calendar size={13} color="#6b7280" />
        <Text style={s.reunionText}>{r.fecha}</Text>
      </View>
      <View style={s.reunionRow}>
        <Clock size={13} color="#6b7280" />
        <Text style={s.reunionText}>{r.horaInicio} – {r.horaFin}</Text>
      </View>
      <View style={s.reunionRow}>
        {r.tipo === 'Virtual' ? <Video size={13} color="#6b7280" /> : <MapPin size={13} color="#6b7280" />}
        <Text style={s.reunionText}>{r.tipo} · {r.lugar}</Text>
      </View>
      <View style={s.reunionBadge}>
        <Text style={s.reunionBadgeText}>{r.estado}</Text>
      </View>
    </View>
  );
}

export function AsistenteChatButton({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={s.headerBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Bot size={22} color="#374151" />
    </TouchableOpacity>
  );
}

export default function AsistenteChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: BIENVENIDA, opciones: SUGERENCIAS },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [eeId, setEeId] = useState<number | null>(userStore.get()?.empresaeventoId ?? null);
  const [contexto, setContexto] = useState<any>(null);
  const listRef = useRef<FlatList>(null);
  const sendingRef = useRef(false);

  // Resolver eeId si aún no está en el userStore (ej: chat abierto antes de cargar dashboard)
  useEffect(() => {
    if (!visible || eeId) return;
    const stored = userStore.get()?.empresaeventoId;
    if (stored) { setEeId(stored); return; }
    const usuarioId = userStore.get()?.id;
    if (!usuarioId) return;
    fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${usuarioId}`)
      .then((r) => r.json())
      .then((ctx) => {
        if (ctx?.empresaeventoId) {
          setEeId(ctx.empresaeventoId);
          userStore.set({ ...userStore.get(), empresaeventoId: ctx.empresaeventoId, empresaUsuarioId: ctx.empresaUsuarioId });
        }
      })
      .catch(() => {});
  }, [visible, eeId]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [msgs, visible]);

  const send = async (texto: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      const escrito = texto.trim();
      const ultimoMensaje = msgs[msgs.length - 1];
      const ultimasOpciones = ultimoMensaje?.role === 'bot' ? ultimoMensaje.opciones : undefined;
      const indice = /^\d+$/.test(escrito) ? Number(escrito) - 1 : -1;
      const t = indice >= 0 && ultimasOpciones?.[indice] ? ultimasOpciones[indice] : escrito;
      if (!t || loading) return;
      if (!eeId) {
        setMsgs((prev) => [...prev, { role: 'bot', text: 'Aún estoy cargando tu información. Intenta en unos segundos.' }]);
        return;
      }
      setInput('');
      const newMsgs: Msg[] = [...msgs, { role: 'user', text: t }];
      setMsgs(newMsgs);
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/empresa/asistente`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eeId, euId: userStore.get()?.empresaUsuarioId ?? undefined, mensaje: t, contexto }),
        });
        const data = await res.json();
        setContexto(data.contexto ?? null);
        const sigueFlujo = Boolean(data.contexto?.paso);
        setMsgs((prev) => [...prev, {
          role: 'bot', text: data.respuesta, imageUrl: data.imageUrl, reuniones: data.reuniones,
          opciones: data.opciones?.length ? data.opciones : (sigueFlujo ? undefined : SUGERENCIAS),
        }]);
      } catch {
        setMsgs((prev) => [...prev, { role: 'bot', text: 'Lo siento, no pude conectarme. Intenta de nuevo.' }]);
      } finally {
        setLoading(false);
      }
    } finally {
      sendingRef.current = false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={s.overlay}>
      <KeyboardSafeView>
      <Pressable style={{ flex: 1, justifyContent: 'center', padding: 12 }} onPress={onClose}>
        <View style={s.sheet}>
          <Pressable onPress={() => {}} style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerIcon}>
                <Bot size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>Asistente Virtual</Text>
                <Text style={s.headerSub}>Pregúntame sobre el evento</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <X size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={listRef}
              style={{ flex: 1 }}
              data={msgs}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={s.msgList}
              onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              renderItem={({ item, index }) => (
                <View>
                  <View style={[s.row, item.role === 'user' ? s.rowUser : s.rowBot]}>
                    {item.role === 'bot' && (
                      <View style={s.avatar}><Bot size={14} color={GREEN} /></View>
                    )}
                    <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
                      <Text style={item.role === 'user' ? s.textUser : s.textBot}>{item.text}</Text>
                      {item.imageUrl && (
                        <ImagenLightbox uri={item.imageUrl} style={s.msgImg} imgStyle={{ borderRadius: 10 }} />
                      )}
                    </View>
                    {item.role === 'user' && (
                      <View style={s.avatar}><User size={14} color={GREEN} /></View>
                    )}
                  </View>
                  {!!item.reuniones?.length && (
                    <View style={s.reunionCardsWrap}>
                      {item.reuniones.map((r: ReunionCard, idx: number) => <ReunionCardMobile key={idx} r={r} />)}
                    </View>
                  )}
                  {/* Quick replies: solo en el último mensaje del bot */}
                  {item.role === 'bot' && !!item.opciones?.length && index === msgs.length - 1 && !loading && (
                    <View style={s.quickWrap}>
                      {item.opciones.map((op: string, optionIndex: number) => (
                        <TouchableOpacity key={op} style={s.quick} onPress={() => send(op)} activeOpacity={0.7}>
                          <Text style={s.quickText}>{optionIndex + 1}. {op}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              ListFooterComponent={loading ? (
                <View style={[s.row, s.rowBot]}>
                  <View style={s.avatar}><Bot size={14} color={GREEN} /></View>
                  <View style={[s.bubble, s.bubbleBot]}>
                    <ActivityIndicator size="small" color={GREEN} />
                  </View>
                </View>
              ) : null}
            />

            {/* Suggestions */}
            {false && msgs.length === 1 && (
              <View style={s.sugsWrap}>
                {SUGERENCIAS.map((sg) => (
                  <TouchableOpacity key={sg} style={s.sug} onPress={() => send(sg)} activeOpacity={0.7}>
                    <Text style={s.sugText}>{sg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input */}
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Escribe tu pregunta o el numero de una opcion..."
                placeholderTextColor="#9ca3af"
                onSubmitEditing={() => send(input)}
                returnKeyType="send"
                editable={!loading}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
                onPress={() => send(input)}
                disabled={!input.trim() || loading}
                activeOpacity={0.7}
              >
                <Send size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
      </KeyboardSafeView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    height: '80%', backgroundColor: '#fff',
    borderRadius: 24, overflow: 'hidden',
  },
  header: {
    backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  msgList: { padding: 16, gap: 12, flexGrow: 1 },
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  rowUser: { justifyContent: 'flex-end' },
  rowBot:  { justifyContent: 'flex-start' },
  avatar:  {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
  },
  bubbleUser: { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  bubbleBot:  { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  textUser: { color: '#fff', fontSize: 14, lineHeight: 20 },
  textBot:  { color: '#1e293b', fontSize: 14, lineHeight: 20 },
  msgImg:   { width: 200, height: 130, marginTop: 8 },
  sugsWrap: {
    paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  sug: {
    backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  sugText: { fontSize: 11, color: GREEN, fontWeight: '600' },
  reunionCardsWrap: { marginLeft: 36, marginTop: 2, marginBottom: 8, gap: 8, maxWidth: '85%' },
  reunionCard: {
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(68,157,58,0.3)',
    padding: 10, gap: 4,
  },
  reunionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reunionEmpresa: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  reunionText: { fontSize: 12, color: '#374151' },
  reunionBadge: {
    alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(68,157,58,0.3)',
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  reunionBadgeText: { fontSize: 10, fontWeight: '800', color: GREEN },
  quickWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginLeft: 36, marginTop: 2, marginBottom: 8,
  },
  quick: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#86efac',
    paddingHorizontal: 10, paddingVertical: 7,
  },
  quickText: { fontSize: 12, color: GREEN, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  input: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1e293b',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  headerBtn: { marginLeft: 8, padding: 6 },
});
