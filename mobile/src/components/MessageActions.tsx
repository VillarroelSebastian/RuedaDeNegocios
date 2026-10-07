/** @jsxImportSource react */
import React, { useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';
import { useFeedback } from './FeedbackProvider';
import KeyboardSafeView from './KeyboardSafeView';
import ButtonLabel from './ButtonLabel';

async function mutate(path: string, method: string, body?: object) {
  const r = await fetch(`${API_URL}/mensajeria/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error((await r.json()).message || 'No se pudo guardar el cambio');
}
export function MessageActions({ mensaje, interno = false, onChanged }: { mensaje: any; interno?: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState(''), [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const show = useFeedback();
  if (!mensaje.puedeModificar) return null;
  const path = `${interno ? 'interno' : 'empresa'}/${mensaje.id}`;
  const save = async () => {
    if (!text.trim() || busy.current) return;
    busy.current = true; setSaving(true);
    try { await mutate(path, 'PUT', { contenido: text }); Keyboard.dismiss(); setEditing(false); onChanged(); }
    catch (e: any) { setEditing(false); show({ type: 'error', title: 'No se pudo editar', message: e.message }); }
    finally { busy.current = false; setSaving(false); }
  };
  return <>
    
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
      <TouchableOpacity accessibilityLabel="Editar mensaje" style={{ padding: 10 }} onPress={() => { Keyboard.dismiss(); setText(mensaje.contenido); setEditing(true); }}><Pencil size={15} color="#173b12" /></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Eliminar mensaje" style={{ padding: 10 }} onPress={() => { Keyboard.dismiss(); show({ type: 'confirm', title: 'Eliminar mensaje', message: 'Se mostrará «Mensaje eliminado» a las personas de esta conversación.', onConfirm: async () => {
        try { await mutate(path, 'DELETE'); onChanged(); } catch (e: any) { show({ type: 'error', title: 'No se pudo eliminar', message: e.message }); }
      } }); }}><Trash2 size={15} color="#173b12" /></TouchableOpacity>
    </View>
    <Modal visible={editing} transparent animationType="fade" onRequestClose={() => { if (!saving) setEditing(false); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)' }}><KeyboardSafeView><View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>Editar mensaje</Text><TouchableOpacity accessibilityLabel="Cerrar" disabled={saving} onPress={() => setEditing(false)}><X size={22} /></TouchableOpacity></View>
          <TextInput autoFocus multiline maxLength={1000} value={text} onChangeText={setText} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, minHeight: 60, maxHeight: 140 }} />
          <TouchableOpacity disabled={saving || !text.trim()} onPress={save} style={{ backgroundColor: '#449D3A', padding: 14, borderRadius: 12, marginTop: 14, opacity: saving || !text.trim() ? .5 : 1 }}><ButtonLabel color="#fff" text={saving ? 'Guardando…' : 'Guardar cambios'} /></TouchableOpacity>
        </View>
      </View></KeyboardSafeView></SafeAreaView>
    </Modal>
  </>;
}
export function DeleteConversation({ canal, eeId, otroEeId, onDeleted }: { canal: string; eeId?: number; otroEeId: number; onDeleted: () => void }) {
  const show = useFeedback();
  return <><TouchableOpacity accessibilityLabel="Eliminar conversación para mí" style={{ padding: 10 }} onPress={() => { Keyboard.dismiss(); show({ type: 'confirm', title: 'Eliminar conversación para mí', message: 'Se ocultará tu historial. Las demás personas conservarán sus mensajes. Un mensaje nuevo volverá a mostrar esta conversación.', onConfirm: async () => {
    try { await mutate('conversacion', 'DELETE', { canal, eeId, otroEeId }); onDeleted(); }
    catch (e: any) { show({ type: 'error', title: 'No se pudo eliminar', message: e.message }); }
  } }); }}><Trash2 size={19} color="#64748b" /></TouchableOpacity></>;
}
