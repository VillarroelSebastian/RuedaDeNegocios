import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Linking,
  Modal, ScrollView, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  CalendarDays, Clock, MapPin, Video, ExternalLink, AlertCircle,
  Edit2, X, CheckCircle2, ChevronRight, Star, AlertTriangle,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtDateShort(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PROGRAMADA:   { bg: '#dbeafe', text: '#1e40af', label: 'Programada' },
  REPROGRAMADA: { bg: '#fef3c7', text: '#92400e', label: 'Reprogramada' },
  EN_CURSO:   { bg: '#fef9c3', text: '#854d0e', label: 'En curso'   },
  FINALIZADA: { bg: '#dcfce7', text: '#166534', label: 'Finalizada' },
  CANCELADA:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelada'  },
};

interface AppModal { tipo: 'ok' | 'err'; msg: string }

// ── Cambiar Horario Modal ─────────────────────────────────────────────────────

function CambiarHorarioModal({ reunion, eeId, onClose, onOk }: {
  reunion: any; eeId: number; onClose: () => void; onOk: () => void;
}) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState(0);
  const [horaSel, setHoraSel] = useState<number | null>(null);
  const [minutosStr, setMinutosStr] = useState('00');
  const [tipoReunion, setTipoReunion] = useState(reunion?.tipo ?? 'PRESENCIAL');
  const [mensaje, setMensaje] = useState(reunion?.mensaje ?? '');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [appModal, setAppModal] = useState<AppModal | null>(null);

  const horasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[],
    [horarios]
  );
  const minutosParaHora = useMemo(() => {
    if (horaSel === null) return [];
    return horarios
      .filter((h: any) => new Date(h.inicio).getHours() === horaSel)
      .map((h: any) => new Date(h.inicio).getMinutes())
      .sort((a: any, b: any) => a - b);
  }, [horarios, horaSel]);
  const horarioMatch = useMemo(() => {
    if (horaSel === null) return null;
    const mins = parseInt(minutosStr) || 0;
    return horarios.find((h: any) => {
      const d = new Date(h.inicio);
      return d.getHours() === horaSel && d.getMinutes() === mins;
    }) ?? null;
  }, [horarios, horaSel, minutosStr]);
  const minutosInvalidos = horaSel !== null && minutosStr !== '' && !horarioMatch;

  useEffect(() => {
    if (!reunion) return;
    const eeReceptoraId = reunion.solicitanteEeId === eeId ? reunion.receptoraEeId : reunion.solicitanteEeId;
    fetch(`${API_URL}/empresa/horarios?eeId=${eeId}&eeReceptoraId=${eeReceptoraId}&excludeReunionId=${reunion.id}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setDuracionMin(data?.duracionMinutos ?? 0);
        const available = [...new Set(hrs.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
        const cur = new Date().getHours();
        const auto = available.find((h) => h >= cur) ?? available[0];
        if (auto !== undefined) { setHoraSel(auto); setMinutosStr('00'); }
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
  }, [reunion, eeId]);

  const handleGuardar = async () => {
    if (!horarioMatch) { setAppModal({ tipo: 'err', msg: 'Selecciona un horario válido.' }); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/${reunion.id}/cambiar-horario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, inicio: horarioMatch.inicio, tipoReunion, mensaje }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) {
      setAppModal({ tipo: 'err', msg: e.message || 'Error al cambiar el horario.' });
    } finally { setGuardando(false); }
  };

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      {appModal && (
        <View style={[cm.overlay, { zIndex: 100 }]}>
          <View style={cm.modalBox}>
            <Text style={[cm.modalMsg, { color: '#dc2626' }]}>{appModal.msg}</Text>
            <Pressable onPress={() => setAppModal(null)} style={[cm.modalBtn, { backgroundColor: '#ef4444' }]}>
              <Text style={cm.modalBtnText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <View style={{ flex: 1 }}>
              <Text style={cm.title}>Proponer cambios</Text>
              <Text style={cm.sub} numberOfLines={1}>Con {reunion?.contraparte?.nombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={cm.currentBox}>
              <Text style={cm.currentLabel}>Horario actual</Text>
              <Text style={cm.currentVal}>{fmtDate(reunion?.inicio)} · {fmtTime(reunion?.inicio)} – {fmtTime(reunion?.fin)}</Text>
            </View>

            <Text style={cm.sectionLabel}>Modalidad propuesta</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
              {['PRESENCIAL','VIRTUAL'].map((tipo) => (
                <TouchableOpacity key={tipo} onPress={() => setTipoReunion(tipo)}
                  style={{ flex:1, paddingVertical:10, borderRadius:12, alignItems:'center', borderWidth:1.5, borderColor:tipoReunion === tipo ? GREEN : '#e2e8f0', backgroundColor:tipoReunion === tipo ? '#f0fdf4' : '#fff' }}>
                  <Text style={{ fontSize:12, fontWeight:'700', color:tipoReunion === tipo ? '#166534' : '#64748b' }}>{tipo === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={cm.sectionLabel}>Mensaje / detalle del cambio</Text>
            <TextInput value={mensaje} onChangeText={setMensaje} multiline maxLength={500}
              placeholder="Explica a la otra empresa qué deseas cambiar..." placeholderTextColor="#94a3b8"
              style={{ minHeight:76, textAlignVertical:'top', borderWidth:1, borderColor:'#e2e8f0', borderRadius:12, padding:12, color:'#0f172a', marginBottom:12 }} />

            {duracionMin > 0 && (
              <View style={cm.durBanner}>
                <Clock size={13} color={GREEN} style={{ marginRight: 6 }} />
                <Text style={cm.durText}>Las reuniones durarán {duracionMin} minutos</Text>
              </View>
            )}

            {cargando ? (
              <View style={cm.loadBox}>
                <ActivityIndicator color={GREEN} size="small" />
                <Text style={cm.loadText}>Buscando horarios...</Text>
              </View>
            ) : horarios.length === 0 ? (
              <Text style={cm.emptyText}>No hay otros horarios disponibles para ambas empresas.</Text>
            ) : (
              <>
                <Text style={cm.sectionLabel}>Hora</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {horasDisponibles.map((h: number) => (
                      <TouchableOpacity key={h} onPress={() => { setHoraSel(h); setMinutosStr('00'); }}
                        style={[cm.horaBtn, horaSel === h && cm.horaBtnActive]} activeOpacity={0.8}>
                        <Text style={[cm.horaBtnText, horaSel === h && cm.horaBtnTextActive]}>
                          {String(h).padStart(2,'0')}:00
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {horaSel !== null && (
                  <>
                    <Text style={cm.sectionLabel}>Minutos</Text>
                    <TextInput
                      value={minutosStr}
                      onChangeText={setMinutosStr}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="00"
                      style={[cm.minsInput, minutosInvalidos && cm.minsInputErr]}
                    />
                    {minutosInvalidos && (
                      <View style={cm.warnBox}>
                        <AlertTriangle size={12} color="#d97706" style={{ marginRight: 6 }} />
                        <Text style={cm.warnText}>
                          La empresa no tiene disponibilidad a las {String(horaSel).padStart(2,'0')}:{minutosStr.padStart(2,'0')}. Prueba con otro horario.
                        </Text>
                      </View>
                    )}
                    {horarioMatch && (
                      <View style={cm.okBox}>
                        <CheckCircle2 size={13} color={GREEN} style={{ marginRight: 6 }} />
                        <Text style={cm.okText}>{fmtDateShort(horarioMatch.inicio)} · {fmtTime(horarioMatch.inicio)}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            <View style={cm.btnRow}>
              <TouchableOpacity onPress={onClose} style={cm.cancelBtn}>
                <Text style={cm.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGuardar}
                disabled={guardando || !horarioMatch}
                style={[cm.confirmBtn, (guardando || !horarioMatch) && { opacity: 0.4 }]}>
                {guardando
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <CheckCircle2 size={14} color="#fff" style={{ marginRight: 6 }} />
                }
                <Text style={cm.confirmText}>Enviar propuesta</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  title:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sub:    { fontSize: 13, color: '#64748b', marginTop: 2 },
  currentBox: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  currentLabel: { fontSize: 10, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', marginBottom: 3 },
  currentVal:   { fontSize: 13, fontWeight: '600', color: '#78350f' },
  durBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  durText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  loadBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadText: { fontSize: 13, color: '#94a3b8' },
  emptyText: { fontSize: 13, color: '#d97706', textAlign: 'center', backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 12 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { fontSize: 12, color: '#1e40af', flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  horaBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  horaBtnActive: { borderColor: GREEN, backgroundColor: '#f0fdf4' },
  horaBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  horaBtnTextActive: { color: '#166534' },
  minsInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10, textAlign: 'center', backgroundColor: '#f8fafc' },
  minsInputErr: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  warnText: { fontSize: 12, color: '#d97706', flex: 1 },
  okBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  okText: { fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelText: { fontWeight: '700', fontSize: 14, color: '#64748b' },
  confirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: 13, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxWidth: 340, gap: 16, alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto' },
  modalMsg: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  modalBtn: { paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontWeight: '700', fontSize: 13, color: '#fff' },
});

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetalleReunionModal({ reunion, eeId, esEncargado, navigation, onClose, onCambiarHorario, onFinalizado }: {
  reunion: any; eeId: number; esEncargado: boolean;
  navigation: any; onClose: () => void; onCambiarHorario: () => void; onFinalizado: () => void;
}) {
  const ahora = new Date();
  const esProgramada = (reunion.estado === 'PROGRAMADA' || reunion.estado === 'REPROGRAMADA') && new Date(reunion.fin) > ahora;
  const esFinalizada = reunion.estado === 'FINALIZADA' || new Date(reunion.fin) <= ahora;
  const puedeFinalizarEncargado = esEncargado && ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(reunion.estado);
  const puedeIniciar = esEncargado && ['PROGRAMADA', 'REPROGRAMADA'].includes(reunion.estado);
  const otraPidioIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor !== eeId;
  const yoPediIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor === eeId;
  const st = STATUS_STYLE[reunion.estado] ?? { bg: '#f1f5f9', text: '#475569', label: reunion.estado };
  const isVirtual = reunion.tipo === 'VIRTUAL';
  const [finalizando, setFinalizando] = useState(false);
  const [errFin, setErrFin] = useState<string | null>(null);
  const [confirmandoFin, setConfirmandoFin] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [msgIni, setMsgIni] = useState<string | null>(null);

  const handleIniciar = async () => {
    setIniciando(true); setMsgIni(null);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/${reunion.id}/iniciar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      if (d.iniciada) { onFinalizado(); }
      else { setMsgIni('Le avisamos a la otra empresa. La reunión iniciará cuando ambas confirmen.'); setIniciando(false); onFinalizado(); }
    } catch (e: any) { setMsgIni(e.message || 'Error al iniciar'); setIniciando(false); }
  };

  const handleFinalizar = async () => {
    setConfirmandoFin(false);
    setFinalizando(true); setErrFin(null);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/${reunion.id}/finalizar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onFinalizado();
    } catch (e: any) { setErrFin(e.message || 'Error al finalizar'); setFinalizando(false); }
  };

  const Row = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
    <View style={dm.row}>
      <Text style={dm.rowLabel}>{label}</Text>
      <Text style={dm.rowValue}>{value as any}</Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={dm.overlay}>
        <View style={dm.sheet}>
          <View style={dm.header}>
            <View style={{ flex: 1 }}>
              <Text style={dm.title}>Detalles de la reunión</Text>
              <Text style={dm.sub} numberOfLines={1}>Con {reunion.contraparte?.nombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Badges */}
            <View style={dm.badges}>
              <View style={[dm.badge, { backgroundColor: st.bg }]}>
                <Text style={[dm.badgeText, { color: st.text }]}>{st.label}</Text>
              </View>
              <View style={[dm.badge, { backgroundColor: isVirtual ? '#eff6ff' : '#f0fdf4' }]}>
                {isVirtual
                  ? <Video size={11} color="#2563eb" style={{ marginRight: 3 }} />
                  : <MapPin size={11} color={GREEN} style={{ marginRight: 3 }} />}
                <Text style={[dm.badgeText, { color: isVirtual ? '#2563eb' : GREEN }]}>{reunion.tipo}</Text>
              </View>
              <View style={[dm.badge, { backgroundColor: reunion.yoSolicite ? '#eef2ff' : '#fffbeb' }]}>
                <Text style={[dm.badgeText, { color: reunion.yoSolicite ? '#4f46e5' : '#d97706' }]}>
                  {reunion.yoSolicite ? 'Tú la solicitaste' : 'Te la solicitaron'}
                </Text>
              </View>
            </View>

            {/* Info card */}
            <View style={dm.infoCard}>
              <Text style={dm.companyName}>
                {reunion.contraparte?.nombre ?? '—'}
                {reunion.contraparte?.codigo ? ` · ${reunion.contraparte.codigo}` : ''}
              </Text>
              {reunion.contraparte?.rubro && <Text style={dm.rubro}>{reunion.contraparte.rubro}</Text>}

              <View style={dm.divider} />

              <View style={dm.metaRow}>
                <CalendarDays size={14} color="#94a3b8" style={{ marginRight: 8 }} />
                <Text style={dm.metaText}>{fmtDate(reunion.inicio)}</Text>
              </View>
              <View style={dm.metaRow}>
                <Clock size={14} color="#94a3b8" style={{ marginRight: 8 }} />
                <Text style={dm.metaText}>{fmtTime(reunion.inicio)} – {fmtTime(reunion.fin)}</Text>
              </View>
              {!isVirtual && reunion.mesa?.numeroMesa && (
                <View style={dm.metaRow}>
                  <MapPin size={14} color="#94a3b8" style={{ marginRight: 8 }} />
                  <Text style={dm.metaText}>Mesa {reunion.mesa.numeroMesa}</Text>
                </View>
              )}
              {isVirtual && reunion.enlace && (
                <TouchableOpacity style={dm.metaRow} onPress={() => Linking.openURL(reunion.enlace).catch(() => {})}>
                  <ExternalLink size={14} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={[dm.metaText, { color: '#2563eb', textDecorationLine: 'underline', flex: 1 }]} numberOfLines={1}>{reunion.enlace}</Text>
                </TouchableOpacity>
              )}
              {reunion.mensaje && (
                <>
                  <View style={dm.divider} />
                  <Text style={dm.mensajeLabel}>Mensaje</Text>
                  <Text style={dm.mensajeText}>{reunion.mensaje}</Text>
                </>
              )}
            </View>

            {/* Result */}
            {reunion.miResultado && (
              <View style={dm.resultCard}>
                <Text style={dm.resultLabel}>Mi evaluación</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <Text style={dm.resultScore}>{reunion.miResultado.calificacionReunion}/5</Text>
                  {reunion.miResultado.rangoAcuerdoComercial && (
                    <Text style={dm.resultAcuerdo}>· {reunion.miResultado.rangoAcuerdoComercial}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={dm.actions}>
              {puedeIniciar && (
                <>
                  {!!msgIni && (
                    <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                      <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center' }}>{msgIni}</Text>
                    </View>
                  )}
                  {yoPediIniciar ? (
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 12, marginBottom: 8 }}>
                      <Text style={{ color: GREEN, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>Esperando que la otra empresa confirme el inicio…</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={handleIniciar} disabled={iniciando} style={[dm.iniciarBtn, iniciando && { opacity: 0.6 }]} activeOpacity={0.8}>
                      {iniciando ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text style={dm.finalizarBtnText}>{otraPidioIniciar ? 'Confirmar inicio (la otra quiere iniciar)' : 'Iniciar reunión'}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
              {esEncargado && esProgramada && (
                <TouchableOpacity onPress={onCambiarHorario} style={dm.secondaryBtn} activeOpacity={0.8}>
                  <Edit2 size={14} color="#374151" style={{ marginRight: 8 }} />
                  <Text style={dm.secondaryBtnText}>Cambiar horario</Text>
                </TouchableOpacity>
              )}
              {puedeFinalizarEncargado && (
                <>
                  {!!errFin && (
                    <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                      <Text style={{ color: '#dc2626', fontSize: 12, textAlign: 'center' }}>{errFin}</Text>
                    </View>
                  )}
                  {confirmandoFin ? (
                    <View style={dm.confirmFinBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        <AlertTriangle size={15} color="#f97316" style={{ marginRight: 6, marginTop: 1 }} />
                        <Text style={dm.confirmFinText}>¿Finalizar esta reunión? Esta acción no se puede deshacer.</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => setConfirmandoFin(false)} style={dm.confirmFinCancel} activeOpacity={0.8}>
                          <Text style={dm.confirmFinCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleFinalizar} disabled={finalizando} style={[dm.confirmFinOk, finalizando && { opacity: 0.6 }]} activeOpacity={0.8}>
                          {finalizando
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={dm.finalizarBtnText}>Confirmar</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setConfirmandoFin(true)}
                      disabled={finalizando}
                      style={[dm.finalizarBtn, finalizando && { opacity: 0.6 }]}
                      activeOpacity={0.8}
                    >
                      <CheckCircle2 size={14} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={dm.finalizarBtnText}>Finalizar reunión</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {esEncargado && esFinalizada && !reunion.miResultado && (
                <TouchableOpacity
                  onPress={() => { onClose(); navigation.navigate('Resultados', { reunionId: reunion.id, contraparte: reunion.contraparte?.nombre }); }}
                  style={dm.primaryBtn} activeOpacity={0.8}
                >
                  <Star size={14} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={dm.primaryBtnText}>Registrar evaluación</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={dm.closeBtn} activeOpacity={0.8}>
                <Text style={dm.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  title:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sub:    { fontSize: 13, color: '#64748b', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoCard: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  companyName: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  rubro: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  mensajeLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  mensajeText: { fontSize: 13, color: '#64748b', lineHeight: 20, fontStyle: 'italic' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  rowLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', width: 80 },
  rowValue: { fontSize: 13, color: '#0f172a', fontWeight: '600', flex: 1 },
  resultCard: { backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fde68a' },
  resultLabel: { fontSize: 11, fontWeight: '700', color: '#92400e', textTransform: 'uppercase', marginBottom: 8 },
  resultScore: { fontSize: 16, fontWeight: '800', color: '#b45309' },
  resultAcuerdo: { fontSize: 12, color: '#d97706', fontWeight: '600' },
  actions: { gap: 10 },
  primaryBtn: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  closeBtn: { borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  finalizarBtn: { flexDirection: 'row', backgroundColor: '#f97316', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  finalizarBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  iniciarBtn: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  confirmFinBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 14, padding: 12 },
  confirmFinText: { flex: 1, color: '#9a3412', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  confirmFinCancel: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  confirmFinCancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  confirmFinOk: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EmpresaReunionesScreen({ navigation }: any) {
  const [items,       setItems]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');
  const [eeId,        setEeId]        = useState<number | null>(null);
  const [esEncargado, setEsEncargado] = useState(false);
  const [detalleModal,setDetalleModal]= useState<any>(null);
  const [cambiarModal,setCambiarModal]= useState<any>(null);
  const [appModal,    setAppModal]    = useState<AppModal | null>(null);

  const user = userStore.get();

  const fetchData = useCallback(async () => {
    const id = user?.empresaeventoId;
    if (!id) { setLoading(false); return; }
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones?eeId=${id}`);
      if (!res.ok) throw new Error('Error cargando reuniones');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setEeId(id);
      setEsEncargado(!!user?.esResponsable);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId, user?.esResponsable]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const responderCambio = async (cambioId: number, aceptar: boolean) => {
    if (!eeId) return;
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/cambios/${cambioId}/responder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, aceptar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'No se pudo responder la propuesta');
      setAppModal({ tipo: 'ok', msg: aceptar ? 'Cambio aceptado y agenda actualizada.' : 'Cambio rechazado.' });
      fetchData();
    } catch (e: any) {
      setAppModal({ tipo: 'err', msg: e.message || 'No se pudo responder la propuesta' });
    }
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  const ahora = new Date();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* App modal */}
      <Modal visible={!!appModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={[s.modalMsg, appModal?.tipo === 'err' && { color: '#dc2626' }]}>{appModal?.msg}</Text>
            <Pressable onPress={() => setAppModal(null)} style={[s.modalBtn, { backgroundColor: appModal?.tipo === 'err' ? '#ef4444' : GREEN }]}>
              <Text style={s.modalBtnText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Detail modal */}
      {detalleModal && eeId && (
        <DetalleReunionModal
          reunion={detalleModal}
          eeId={eeId}
          esEncargado={esEncargado}
          navigation={navigation}
          onClose={() => setDetalleModal(null)}
          onCambiarHorario={() => { setCambiarModal(detalleModal); setDetalleModal(null); }}
          onFinalizado={() => { setDetalleModal(null); fetchData(); }}
        />
      )}

      {/* Cambiar horario modal */}
      {cambiarModal && eeId && (
        <CambiarHorarioModal
          reunion={cambiarModal}
          eeId={eeId}
          onClose={() => setCambiarModal(null)}
          onOk={() => {
            setCambiarModal(null);
            setLoading(true);
            fetchData();
            setAppModal({ tipo: 'ok', msg: 'Horario actualizado correctamente.' });
          }}
        />
      )}

      <View style={s.header}>
        <Text style={s.headerTitle}>Mis reuniones</Text>
        <Text style={s.headerSub}>{items.length} reunión{items.length !== 1 ? 'es' : ''}</Text>
      </View>

      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListHeaderComponent={
          <View>
            {items.filter((r) => r.cambioPendiente && r.cambioPendiente.solicitadoPorEe_id !== eeId).map((r) => (
              <View key={`cambio-${r.cambioPendiente.id}`} style={s.changeCard}>
                <Text style={s.changeTitle}>Cambio solicitado por {r.contraparte?.nombre}</Text>
                <Text style={s.changeText}>
                  Nueva propuesta: {fmtDate(r.cambioPendiente.fechaHoraInicio)} · {fmtTime(r.cambioPendiente.fechaHoraInicio)}
                  {` · ${r.cambioPendiente.tipoReunion === 'VIRTUAL' ? 'Virtual' : 'Presencial'}`}
                </Text>
                {!!r.cambioPendiente.mensaje && <Text style={s.changeText}>“{r.cambioPendiente.mensaje}”</Text>}
                <View style={s.changeActions}>
                  <TouchableOpacity style={s.changeReject} onPress={() => responderCambio(r.cambioPendiente.id, false)}>
                    <Text style={s.changeRejectText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.changeAccept} onPress={() => responderCambio(r.cambioPendiente.id, true)}>
                    <Text style={s.changeAcceptText}>Aceptar cambio</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <CalendarDays size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No tienes reuniones confirmadas</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.estado] ?? { bg: '#f1f5f9', text: '#475569', label: item.estado };
          const isVirtual = item.tipo === 'VIRTUAL';
          const esFinalizada = item.estado === 'FINALIZADA' || new Date(item.fin) <= ahora;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => setDetalleModal(item)}
              activeOpacity={0.8}
            >
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: isVirtual ? '#eff6ff' : '#f0fdf4' }]}>
                  {isVirtual
                    ? <Video size={11} color="#2563eb" style={{ marginRight: 3 }} />
                    : <MapPin size={11} color={GREEN} style={{ marginRight: 3 }} />}
                  <Text style={[s.badgeText, { color: isVirtual ? '#2563eb' : GREEN }]}>{item.tipo}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: item.yoSolicite ? '#eef2ff' : '#fffbeb' }]}>
                  <Text style={[s.badgeText, { color: item.yoSolicite ? '#4f46e5' : '#d97706' }]}>
                    {item.yoSolicite ? 'Tú la solicitaste' : 'Te la solicitaron'}
                  </Text>
                </View>
              </View>

              <View style={s.cardBody}>
                <View style={{ flex: 1 }}>
                  <Text style={s.counterpart} numberOfLines={1}>
                    {item.contraparte?.nombre ?? '—'}{item.contraparte?.codigo ? ` · ${item.contraparte.codigo}` : ''}
                  </Text>
                  <View style={s.timeRow}>
                    <CalendarDays size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text style={s.metaText}>{fmtDateShort(item.inicio)}</Text>
                    <Clock size={12} color="#94a3b8" style={{ marginLeft: 8, marginRight: 4 }} />
                    <Text style={s.metaText}>{fmtTime(item.inicio)} – {fmtTime(item.fin)}</Text>
                  </View>
                  {!isVirtual && item.mesa?.numeroMesa && (
                    <Text style={s.metaText}>{`Mesa ${item.mesa.numeroMesa}`}</Text>
                  )}
                  {esFinalizada && !item.miResultado && (
                    <Text style={s.pendingEval}>Pendiente de evaluación</Text>
                  )}
                  {item.miResultado && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Text style={s.ratingText}>{item.miResultado.calificacionReunion}/5</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  changeCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  changeTitle: { color: '#78350f', fontSize: 14, fontWeight: '800' },
  changeText: { color: '#a16207', fontSize: 12, marginTop: 4 },
  changeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  changeReject: { flex: 1, borderColor: '#fcd34d', borderWidth: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  changeRejectText: { color: '#92400e', fontSize: 12, fontWeight: '700' },
  changeAccept: { flex: 1, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  changeAcceptText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list:   { padding: 16, paddingBottom: 32 },
  errorBox: { flexDirection: 'row', alignItems: 'center', margin: 16, padding: 12, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#dc2626', fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  cardBody:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:       { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  counterpart: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  timeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  metaText:    { fontSize: 12, color: '#64748b' },
  pendingEval: { fontSize: 11, color: GREEN, fontWeight: '700', marginTop: 4 },
  ratingText:  { fontSize: 12, fontWeight: '700', color: '#d97706' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 340, gap: 16 },
  modalMsg: { fontSize: 14, fontWeight: '600', color: '#1f2937', textAlign: 'center', lineHeight: 20 },
  modalBtn: { paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontWeight: '700', fontSize: 13, color: '#fff' },
});
