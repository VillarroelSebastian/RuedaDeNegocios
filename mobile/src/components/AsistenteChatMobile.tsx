import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
  Pressable,
} from 'react-native';
import { Bot, X, Send, User, MessageCircle } from 'lucide-react-native';
import { API_URL, userStore } from '../utils/userStore';
import ImagenLightbox from './ImagenLightbox';

const GREEN = '#449D3A';

const SUGERENCIAS = [
  '¿Cuándo es mi próxima reunión?',
  '¿En qué mesa me toca?',
  '¿Cuáles son las fechas del evento?',
  '¿Cuál es el estado de mi pago?',
];

interface Msg {
  role: 'user' | 'bot';
  text: string;
  imageUrl?: string;
}

export function AsistenteChatButton({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={s.headerBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <MessageCircle size={22} color="#374151" />
    </TouchableOpacity>
  );
}

export default function AsistenteChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const eeId = userStore.get()?.empresaeventoId;

  useEffect(() => {
    if (visible) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [msgs, visible]);

  const send = async (texto: string) => {
    const t = texto.trim();
    if (!t || loading || !eeId) return;
    setInput('');
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: t }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/empresa/asistente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, mensaje: t }),
      });
      const data = await res.json();
      setMsgs((prev) => [...prev, { role: 'bot', text: data.respuesta, imageUrl: data.imageUrl }]);
    } catch {
      setMsgs((prev) => [...prev, { role: 'bot', text: 'Lo siento, no pude conectarme. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.sheet}
        >
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
              data={msgs}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={s.msgList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
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
            {msgs.length === 1 && (
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
                placeholder="Escribe tu pregunta..."
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
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet: {
    height: '80%', backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
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
