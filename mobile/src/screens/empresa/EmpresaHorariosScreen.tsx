import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Info, RotateCcw, Plus, Trash2, CheckCircle2 } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

interface Rango { desde: string; hasta: string }
interface AppModal { tipo: 'ok' | 'err' | 'confirm'; msg: string; onOk?: () => void }

function horaActual00() {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`;
}

export default function EmpresaHorariosScreen() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [rangos, setRangos] = useState<Rango[]>([{ desde: horaActual00(), hasta: '' }]);
  const [appModal, setAppModal] = useState<AppModal | null>(null);

  const user = userStore.get();
  const eeId = user?.empresaeventoId;

  const cargarRangos = useCallback(async () => {
    if (!eeId) return;
    try {
      const res = await fetch(`${API_URL}/empresa/horarios-empresa/rangos?eeId=${eeId}`);
      const rs = await res.json();
      if (Array.isArray(rs) && rs.length > 0) {
        setRangos(rs.map((r: any) => ({ desde: r.desde_hora, hasta: r.hasta_hora })));
      } else {
        setRangos([{ desde: horaActual00(), hasta: '' }]);
      }
    } catch {} finally { setLoading(false); }
  }, [eeId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    cargarRangos();
  }, [cargarRangos]));

  const rangosValidos = rangos.filter((r) => r.desde && r.hasta && r.desde < r.hasta);

  const handleCambiarRango = (i: number, campo: 'desde' | 'hasta', val: string) => {
    const clean = val.replace(/[^0-9:]/g, '').slice(0, 5);
    setRangos((prev) => prev.map((r, idx) => idx === i ? { ...r, [campo]: clean } : r));
  };

  const handleGuardar = async () => {
    if (!eeId || guardando) return;
    if (rangos.some((r) => r.desde && r.hasta && r.desde >= r.hasta)) {
      setAppModal({ tipo: 'err', msg: 'Verifica los rangos: la hora de inicio debe ser menor a la de fin.' });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/empresa/horarios-empresa/rangos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, rangos: rangosValidos.map((r) => ({ desde: r.desde, hasta: r.hasta })) }),
      });
      if (!res.ok) throw new Error();
      setAppModal({
        tipo: 'ok',
        msg: rangosValidos.length === 0
          ? 'Todos los horarios están disponibles.'
          : 'Horarios de disponibilidad guardados correctamente.',
      });
    } catch {
      setAppModal({ tipo: 'err', msg: 'Error al guardar los horarios. Inténtalo de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  const handleResetear = () => {
    setAppModal({
      tipo: 'confirm',
      msg: '¿Poner todos los horarios como disponibles? Se eliminarán todos los rangos configurados.',
      onOk: async () => {
        setAppModal(null);
        if (!eeId) return;
        setReseteando(true);
        try {
          await fetch(`${API_URL}/empresa/horarios-empresa/rangos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eeId, rangos: [] }),
          });
          setRangos([{ desde: '', hasta: '' }]);
          setAppModal({ tipo: 'ok', msg: 'Todos los horarios restablecidos a disponible.' });
        } catch {
          setAppModal({ tipo: 'err', msg: 'Error al restablecer.' });
        } finally {
          setReseteando(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Modal */}
      <Modal visible={!!appModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={[s.modalMsg, appModal?.tipo === 'err' && { color: '#dc2626' }]}>
              {appModal?.msg}
            </Text>
            <View style={s.modalBtns}>
              {appModal?.tipo === 'confirm' && (
                <Pressable onPress={() => setAppModal(null)} style={[s.modalBtn, s.modalBtnCancel]}>
                  <Text style={s.modalBtnCancelText}>Cancelar</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => { if (appModal?.onOk) appModal.onOk(); else setAppModal(null); }}
                style={[s.modalBtn, { backgroundColor: appModal?.tipo === 'err' ? '#ef4444' : GREEN }]}
              >
                <Text style={s.modalBtnText}>
                  {appModal?.tipo === 'confirm' ? 'Confirmar' : 'Aceptar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={s.title}>Mis horarios disponibles</Text>
        <Text style={s.subtitle}>Define en qué franjas horarias estás disponible para reuniones.</Text>

        {/* Info */}
        <View style={s.infoBanner}>
          <Info size={14} color="#1d4ed8" style={{ marginRight: 8, flexShrink: 0 }} />
          <Text style={s.infoText}>
            Por defecto <Text style={{ fontWeight: '700' }}>estás disponible durante todo el evento</Text>.
            Si tienes restricciones de horario, define tus rangos de disponibilidad.
            Puedes agregar múltiples rangos.
          </Text>
        </View>

        {/* Rangos */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Rangos de disponibilidad</Text>

          {rangos.map((rango, i) => {
            const invalido = !!(rango.desde && rango.hasta && rango.desde >= rango.hasta);
            return (
              <View key={i} style={s.rangoRow}>
                <View style={s.rangoInputGroup}>
                  <Text style={s.rangoLabel}>Desde</Text>
                  <TextInput
                    value={rango.desde}
                    onChangeText={(v) => handleCambiarRango(i, 'desde', v)}
                    placeholder="08:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[s.timeInput, invalido && s.timeInputErr]}
                  />
                </View>
                <Text style={s.rangoDash}>–</Text>
                <View style={s.rangoInputGroup}>
                  <Text style={s.rangoLabel}>Hasta</Text>
                  <TextInput
                    value={rango.hasta}
                    onChangeText={(v) => handleCambiarRango(i, 'hasta', v)}
                    placeholder="18:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    style={[s.timeInput, invalido && s.timeInputErr]}
                  />
                </View>
                {rangos.length > 1 && (
                  <TouchableOpacity
                    onPress={() => setRangos((prev) => prev.filter((_, idx) => idx !== i))}
                    style={s.deleteBtn}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => setRangos((prev) => [...prev, { desde: horaActual00(), hasta: '' }])}
            style={s.addRangoBtn}
          >
            <Plus size={14} color={GREEN} />
            <Text style={s.addRangoBtnText}>Agregar otro rango</Text>
          </TouchableOpacity>

          {/* Resumen actual */}
          {rangosValidos.length > 0 && (
            <View style={s.resumenBox}>
              <Text style={s.resumenTitle}>Disponibilidad configurada:</Text>
              {rangosValidos.map((r, i) => (
                <Text key={i} style={s.resumenItem}>• {r.desde} – {r.hasta}</Text>
              ))}
            </View>
          )}

          {/* Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              onPress={handleGuardar}
              disabled={guardando || reseteando}
              style={[s.applyBtn, (guardando || reseteando) && { opacity: 0.5 }]}
            >
              {guardando
                ? <ActivityIndicator size="small" color="#fff" />
                : <CheckCircle2 size={14} color="#fff" />
              }
              <Text style={s.applyBtnText}>Guardar horarios</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetear}
              disabled={guardando || reseteando}
              style={[s.resetBtn, (guardando || reseteando) && { opacity: 0.4 }]}
            >
              <RotateCcw size={13} color="#374151" />
              <Text style={s.resetBtnText}>Todo el día</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 18 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    borderColor: '#f1f5f9', padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },

  rangoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rangoInputGroup: { flex: 1, gap: 4 },
  rangoLabel: { fontSize: 10, fontWeight: '600', color: '#6b7280' },
  rangoDash: { fontSize: 16, color: '#9ca3af', paddingBottom: 8 },
  timeInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14,
    textAlign: 'center', color: '#111827', backgroundColor: '#fafafa',
  },
  timeInputErr: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  deleteBtn: { padding: 8, paddingBottom: 6 },

  addRangoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addRangoBtnText: { fontSize: 13, fontWeight: '600', color: GREEN },

  resumenBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0', gap: 3,
  },
  resumenTitle: { fontSize: 11, fontWeight: '700', color: '#166534', marginBottom: 2 },
  resumenItem: { fontSize: 12, color: '#166534', fontFamily: 'monospace' },

  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flex: 1,
    justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#f9fafb',
  },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 340, gap: 16 },
  modalMsg: { fontSize: 14, fontWeight: '600', color: '#1f2937', textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  modalBtnCancelText: { fontWeight: '700', fontSize: 13, color: '#6b7280' },
  modalBtnText: { fontWeight: '700', fontSize: 13, color: '#fff' },
});
