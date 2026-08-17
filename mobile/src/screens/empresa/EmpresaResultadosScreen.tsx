import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Star, CheckCircle, AlertCircle, X } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

const RANGOS = [
  'Sin acuerdo',
  'Hasta $us 5.000',
  'Hasta $us 10.000',
  'Hasta $us 25.000',
  'Hasta $us 50.000',
  'Hasta $us 100.000',
  'Más de $us 100.000',
];

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EmpresaResultadosScreen({ route }: any) {
  const [reuniones,  setReuniones]  = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [refreshing,setRefreshing]  = useState(false);
  const [error,     setError]       = useState('');

  // Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReu,  setSelectedReu]  = useState<any>(null);
  const [calificacion, setCalificacion] = useState(0);
  const [rango,        setRango]        = useState(RANGOS[0]);
  const [observacion,  setObservacion]  = useState('');
  const [interes,      setInteres]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');
  const [saveOk,       setSaveOk]       = useState(false);

  const user = userStore.get();

  const fetchData = useCallback(async () => {
    let eeId = userStore.get()?.empresaeventoId;
    // Resolver contexto si aún no está en el store (evita pantalla vacía)
    if (!eeId) {
      const usuarioId = userStore.get()?.id;
      if (usuarioId) {
        try {
          const ctxRes = await fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${usuarioId}`);
          const ctx = await ctxRes.json();
          if (ctx?.empresaeventoId) {
            await userStore.set({ ...userStore.get(), empresaeventoId: ctx.empresaeventoId, empresaUsuarioId: ctx.empresaUsuarioId });
            eeId = ctx.empresaeventoId;
          }
        } catch {}
      }
    }
    if (!eeId) { setLoading(false); setError('No se pudo cargar tu información de empresa.'); return; }
    setError('');
    try {
      const [reuRes, resRes] = await Promise.all([
        fetch(`${API_URL}/empresa/reuniones?eeId=${eeId}`),
        fetch(`${API_URL}/empresa/resultados?eeId=${eeId}`),
      ]);
      const reuData = reuRes.ok ? await reuRes.json() : [];
      const resData = resRes.ok ? await resRes.json() : [];
      setReuniones(Array.isArray(reuData) ? reuData.filter((r: any) => r.estado === 'FINALIZADA') : []);
      setResultados(Array.isArray(resData) ? resData : []);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openForm = (reunion: any) => {
    setSelectedReu(reunion);
    setCalificacion(0);
    setRango(RANGOS[0]);
    setObservacion('');
    setInteres(false);
    setSaveError('');
    setSaveOk(false);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (calificacion === 0) { setSaveError('Selecciona una calificación de 1 a 5 estrellas.'); return; }
    if (!observacion.trim()) { setSaveError('Escribe los puntos tratados, compromisos u observaciones de la reunión.'); return; }
    setSaveError('');
    setSaving(true);
    try {
      const eeId = userStore.get()?.empresaeventoId;
      const res = await fetch(`${API_URL}/empresa/resultados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reunionId: selectedReu.id,
          eeId,
          euId: userStore.get()?.empresaUsuarioId,
          calificacion,
          rango,
          observaciones: observacion.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al guardar resultado');
      setSaveOk(true);
      fetchData();
    } catch (e: any) {
      setSaveError(e.message || 'Error de red');
    } finally {
      setSaving(false);
    }
  };

  const reunionesConResultado = new Set(resultados.map((r: any) => r.reunion_id));
  const pendientes = reuniones.filter((r: any) => !reunionesConResultado.has(r.id));

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListHeaderComponent={
          <>
            {/* Por evaluar */}
            <Text style={s.sectionTitle}>Por evaluar ({pendientes.length})</Text>
            {pendientes.length === 0 && (
              <View style={s.emptySmall}>
                <Text style={s.emptyText}>No hay reuniones pendientes de evaluación</Text>
              </View>
            )}
            {pendientes.map((r: any) => (
              <View key={r.id} style={s.card}>
                <Text style={s.cardCounterpart}>{r.contraparte?.nombre ?? '—'}</Text>
                <Text style={s.cardDate}>{fmtDate(r.inicio)}</Text>
                <TouchableOpacity style={s.evalBtn} onPress={() => openForm(r)} activeOpacity={0.8}>
                  <Star size={14} color={GREEN} style={{ marginRight: 6 }} />
                  <Text style={s.evalBtnText}>Registrar resultado</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Historial */}
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>Historial ({resultados.length})</Text>
            {resultados.length === 0 && (
              <View style={s.emptySmall}>
                <Text style={s.emptyText}>No hay resultados registrados</Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {resultados.map((r: any) => (
              <View key={r.id} style={s.resultCard}>
                <View style={s.resultHeader}>
                  <Text style={s.resultCounterpart}>{r.empresaevento_resultadoreunion_empresaeventoCalificada_idToempresaevento?.empresa?.nombre ?? '—'}</Text>
                  <StarDisplay value={r.calificacionReunion} />
                </View>
                <Text style={s.resultDate}>{fmtDate(r.fechaCreacion)}</Text>
                {r.rangoAcuerdoComercial && <Text style={s.resultRango}>Acuerdo: {r.rangoAcuerdoComercial}</Text>}
                {r.observacionesPuntosTratados && <Text style={s.resultObs}>{r.observacionesPuntosTratados}</Text>}
                {r.interesEnSeguimiento && (
                  <View style={s.interesTag}>
                    <CheckCircle size={11} color={GREEN} style={{ marginRight: 3 }} />
                    <Text style={s.interesText}>Con interés en seguimiento</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        }
        renderItem={() => null}
      />

      {/* Evaluation modal */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Resultado de reunión</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedReu && (
              <Text style={s.modalSub}>Con: {selectedReu.contraparte ?? '—'}</Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {saveOk ? (
                <View style={s.successBox}>
                  <CheckCircle size={40} color={GREEN} />
                  <Text style={s.successText}>Resultado registrado correctamente</Text>
                  <TouchableOpacity style={s.btnPrimary} onPress={() => setModalVisible(false)}>
                    <Text style={s.btnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {!!saveError && (
                    <View style={s.errorBox}>
                      <Text style={s.errorText}>{saveError}</Text>
                    </View>
                  )}

                  {/* Stars */}
                  <Text style={s.label}>Calificación *</Text>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <TouchableOpacity key={v} onPress={() => setCalificacion(v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Star size={34} color={v <= calificacion ? '#f59e0b' : '#d1d5db'} fill={v <= calificacion ? '#f59e0b' : 'transparent'} />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Rango */}
                  <Text style={s.label}>Rango de acuerdo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {RANGOS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[s.rangoPill, rango === r && s.rangoPillActive]}
                        onPress={() => setRango(r)}
                      >
                        <Text style={[s.rangoText, rango === r && s.rangoTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Observación */}
                  <Text style={s.label}>Observaciones</Text>
                  <TextInput
                    style={s.textarea}
                    placeholder="Describe los temas tratados, acuerdos alcanzados..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    value={observacion}
                    onChangeText={setObservacion}
                    textAlignVertical="top"
                  />

                  {/* Interés */}
                  <TouchableOpacity style={s.checkRow} onPress={() => setInteres(v => !v)}>
                    <View style={[s.checkbox, interes && s.checkboxChecked]}>
                      {interes && <CheckCircle size={14} color="#fff" />}
                    </View>
                    <Text style={s.checkLabel}>Interés en seguimiento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btnPrimary, saving && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnText}>Guardar resultado</Text>}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star key={v} size={14} color={v <= value ? '#f59e0b' : '#d1d5db'} fill={v <= value ? '#f59e0b' : 'transparent'} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16, paddingBottom: 32 },
  errorBox: {
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText:  { color: '#dc2626', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  emptySmall: { padding: 16, alignItems: 'center' },
  emptyText:  { fontSize: 13, color: '#9ca3af' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardCounterpart: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  cardDate:        { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  evalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  evalBtnText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  resultHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultCounterpart:{ fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  resultDate:       { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  resultRango:      { fontSize: 12, color: '#64748b', marginBottom: 2, fontWeight: '600' },
  resultObs:        { fontSize: 12, color: '#64748b', lineHeight: 18, marginTop: 4 },
  interesTag: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  interesText: { fontSize: 11, color: GREEN, fontWeight: '600' },

  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalSub:    { fontSize: 13, color: '#64748b', marginBottom: 20 },
  label:       { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  starsRow:    { flexDirection: 'row', gap: 12, marginBottom: 20 },
  rangoPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  rangoPillActive: { backgroundColor: GREEN, borderColor: GREEN },
  rangoText:       { fontSize: 12, color: '#475569', fontWeight: '600' },
  rangoTextActive: { color: '#fff' },
  textarea: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 14, color: '#0f172a', height: 100, marginBottom: 16,
  },
  checkRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  btnPrimary: {
    backgroundColor: GREEN, borderRadius: 14, height: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successBox: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  successText: { fontSize: 15, color: '#374151', textAlign: 'center', fontWeight: '600' },
});
