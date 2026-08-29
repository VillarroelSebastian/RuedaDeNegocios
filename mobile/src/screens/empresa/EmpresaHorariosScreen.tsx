import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarClock, CheckCircle2, Copy, Info, Plus, Power, Trash2 } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';
type Rango = { desde: string; hasta: string };
type Dia = { fecha: string; habilitado: boolean; rangos: Rango[] };

export default function EmpresaHorariosScreen() {
  const eeId = userStore.get()?.empresaeventoId;
  const [dias, setDias] = useState<Dia[]>([]);
  const [configurado, setConfigurado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    if (!eeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/empresa/horarios-empresa/dias?eeId=${eeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo cargar la agenda.');
      setDias(Array.isArray(data.dias) ? data.dias : []);
      setConfigurado(!!data.configurado);
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'No se pudo cargar la agenda.' });
    } finally { setLoading(false); }
  }, [eeId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const actualizarDia = (i: number, cambio: Partial<Dia>) =>
    setDias((actuales) => actuales.map((d, n) => n === i ? { ...d, ...cambio } : d));

  const actualizarRango = (di: number, ri: number, campo: keyof Rango, valor: string) => {
    const limpio = valor.replace(/[^0-9:]/g, '').slice(0, 5);
    setDias((actuales) => actuales.map((d, n) => n === di ? {
      ...d, rangos: d.rangos.map((r, m) => m === ri ? { ...r, [campo]: limpio } : r),
    } : d));
  };

  const copiarPrimero = () => {
    if (!dias.length) return;
    const rangos = dias[0].rangos.map((r) => ({ ...r }));
    setDias((actuales) => actuales.map((d) => ({ ...d, habilitado: true, rangos: rangos.map((r) => ({ ...r })) })));
    setMensaje({ tipo: 'ok', texto: 'Se copió el primer horario. Puedes modificar cada día por separado.' });
  };

  const guardar = async () => {
    if (!eeId || guardando) return;
    const invalido = dias.some((d) => d.habilitado && (d.rangos.length === 0 || d.rangos.some((r) => !r.desde || !r.hasta || r.desde >= r.hasta)));
    if (invalido) {
      setMensaje({ tipo: 'error', texto: 'Cada día habilitado debe tener al menos un rango válido.' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/empresa/horarios-empresa/dias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eeId, dias }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo guardar la agenda.');
      setDias(data.dias || dias);
      setConfigurado(true);
      setMensaje({ tipo: 'ok', texto: 'Tu agenda quedó disponible para las demás empresas.' });
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'No se pudo guardar la agenda.' });
    } finally { setGuardando(false); }
  };

  if (loading) return <SafeAreaView style={s.root}><View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View></SafeAreaView>;

  return <SafeAreaView style={s.root} edges={['bottom']}>
    <Modal visible={!!mensaje} transparent animationType="fade">
      <View style={s.overlay}><View style={s.modal}>
        <Text style={[s.modalText, mensaje?.tipo === 'error' && { color: '#b91c1c' }]}>{mensaje?.texto}</Text>
        <Pressable onPress={() => setMensaje(null)} style={[s.modalButton, mensaje?.tipo === 'error' && { backgroundColor: '#dc2626' }]}><Text style={s.modalButtonText}>Aceptar</Text></Pressable>
      </View></View>
    </Modal>
    <ScrollView contentContainerStyle={s.content}>
      <View><Text style={s.title}>Mi agenda disponible</Text><Text style={s.subtitle}>Define cuándo aceptas reuniones durante cada día del evento.</Text></View>
      {!configurado && <View style={s.info}><Info size={16} color="#1d4ed8" /><Text style={s.infoText}>Mientras no cambies nada, se usarán todos los horarios definidos por el administrador.</Text></View>}
      <TouchableOpacity onPress={copiarPrimero} style={s.copy}><Copy size={15} color={GREEN} /><Text style={s.copyText}>Copiar primer día a todos</Text></TouchableOpacity>
      {dias.map((dia, di) => <View key={dia.fecha} style={[s.card, !dia.habilitado && s.cardOff]}>
        <View style={s.cardHeader}><View style={{ flex: 1 }}>
          <Text style={s.day}>{new Date(`${dia.fecha}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' })}</Text>
          <Text style={s.dayHint}>{dia.habilitado ? 'Disponible para recibir solicitudes' : 'Día completo inhabilitado'}</Text>
        </View><TouchableOpacity onPress={() => actualizarDia(di, { habilitado: !dia.habilitado })} style={[s.power, !dia.habilitado && s.powerOff]}><Power size={17} color={dia.habilitado ? '#15803d' : '#b91c1c'} /></TouchableOpacity></View>
        {dia.habilitado && <>
          {dia.rangos.map((r, ri) => <View key={ri} style={s.rangeRow}>
            <TextInput value={r.desde} onChangeText={(v) => actualizarRango(di, ri, 'desde', v)} placeholder="08:00" keyboardType="numbers-and-punctuation" maxLength={5} style={s.time} />
            <Text style={s.to}>hasta</Text>
            <TextInput value={r.hasta} onChangeText={(v) => actualizarRango(di, ri, 'hasta', v)} placeholder="18:00" keyboardType="numbers-and-punctuation" maxLength={5} style={s.time} />
            {dia.rangos.length > 1 && <TouchableOpacity onPress={() => actualizarDia(di, { rangos: dia.rangos.filter((_, i) => i !== ri) })} style={s.trash}><Trash2 size={16} color="#dc2626" /></TouchableOpacity>}
          </View>)}
          <TouchableOpacity onPress={() => actualizarDia(di, { rangos: [...dia.rangos, { desde: '', hasta: '' }] })} style={s.add}><Plus size={15} color={GREEN} /><Text style={s.addText}>Agregar otro rango</Text></TouchableOpacity>
        </>}
      </View>)}
      <TouchableOpacity onPress={guardar} disabled={guardando} style={[s.save, guardando && { opacity: 0.55 }]}>{guardando ? <ActivityIndicator color="#fff" /> : <><CheckCircle2 size={17} color="#fff" /><Text style={s.saveText}>Guardar mi agenda</Text></>}</TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 16, paddingBottom: 44, gap: 14 },
  title: { fontSize: 23, fontWeight: '800', color: '#111827' }, subtitle: { marginTop: 3, fontSize: 13, color: '#6b7280' },
  info: { flexDirection: 'row', gap: 9, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }, infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#1e40af' },
  copy: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 }, copyText: { color: GREEN, fontWeight: '700', fontSize: 12 },
  card: { padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' }, cardOff: { backgroundColor: '#fff7f7', borderColor: '#fecaca' }, cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }, day: { textTransform: 'capitalize', fontWeight: '800', color: '#111827', fontSize: 15 }, dayHint: { color: '#9ca3af', fontSize: 11, marginTop: 2 }, power: { padding: 9, borderRadius: 10, backgroundColor: '#f0fdf4' }, powerOff: { backgroundColor: '#fee2e2' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }, time: { flex: 1, minWidth: 75, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: '#111827', textAlign: 'center' }, to: { fontSize: 11, color: '#6b7280' }, trash: { padding: 7 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }, addText: { color: GREEN, fontWeight: '700', fontSize: 12 },
  save: { minHeight: 50, borderRadius: 13, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }, modal: { width: '100%', maxWidth: 390, backgroundColor: '#fff', borderRadius: 18, padding: 20 }, modalText: { color: '#166534', fontSize: 14, lineHeight: 21, textAlign: 'center' }, modalButton: { marginTop: 18, borderRadius: 11, backgroundColor: GREEN, paddingVertical: 11, alignItems: 'center' }, modalButtonText: { color: '#fff', fontWeight: '800' },
});
