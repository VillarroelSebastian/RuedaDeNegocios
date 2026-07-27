import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet,
} from 'react-native';
import { MessageSquare, X, Send, CheckCircle2 } from 'lucide-react-native';
import { API_URL, userStore } from '../utils/userStore';

const GREEN = '#449D3A';

// Modal para que admin/técnico envíe un mensaje directo a una empresa.
// Aparece en la sección Mensajes de la empresa como "Equipo del evento".
export default function EnviarMensajeEmpresaModal({ receptorEeId, empresaNombre, onClose }: {
  receptorEeId: number; empresaNombre: string; onClose: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const usuarioId = userStore.get()?.id;

  const enviar = async () => {
    if (!texto.trim() || !usuarioId) return;
    setEnviando(true);
    setErr('');
    try {
      const res = await fetch(`${API_URL}/staff/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, receptorEeId, contenido: texto.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al enviar el mensaje');
      setOk(true);
    } catch (e: any) {
      setErr(e.message || 'Error de red');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {ok ? (
            <View style={{ alignItems: 'center' }}>
              <View style={s.okIcon}><CheckCircle2 size={32} color={GREEN} /></View>
              <Text style={s.okTitle}>Mensaje enviado</Text>
              <Text style={s.okText}>La empresa {empresaNombre} verá tu mensaje en su sección de Mensajes.</Text>
              <TouchableOpacity style={s.btnPrimary} onPress={onClose} activeOpacity={0.85}>
                <Text style={s.btnPrimaryText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <MessageSquare size={18} color={GREEN} />
                  <Text style={s.title}>Enviar mensaje</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <Text style={s.para}>
                Para: <Text style={{ fontWeight: '700', color: '#374151' }}>{empresaNombre}</Text>. Lo verá como un mensaje del equipo del evento (no puede responder ahí).
              </Text>
              <TextInput
                style={s.input}
                value={texto}
                onChangeText={setTexto}
                placeholder="Escribe el mensaje para la empresa..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                textAlignVertical="top"
                autoFocus
              />
              {!!err && <Text style={s.err}>{err}</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity style={s.btnSec} onPress={onClose} activeOpacity={0.85}>
                  <Text style={s.btnSecText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPrimary, { flex: 1, opacity: (!texto.trim() || enviando) ? 0.6 : 1 }]}
                  onPress={enviar}
                  disabled={!texto.trim() || enviando}
                  activeOpacity={0.85}
                >
                  {enviando ? <ActivityIndicator color="#fff" size="small" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Send size={15} color="#fff" />
                      <Text style={s.btnPrimaryText}>Enviar</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 400 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  para: { fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#0f172a',
    height: 110,
  },
  err: { color: '#dc2626', fontSize: 12, marginTop: 8 },
  btnPrimary: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSec: {
    flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  btnSecText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  okIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  okTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  okText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
});
