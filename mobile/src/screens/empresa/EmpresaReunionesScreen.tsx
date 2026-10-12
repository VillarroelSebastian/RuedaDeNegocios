import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Linking,
  Modal, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  CalendarDays, Clock, MapPin, Video, ExternalLink, AlertCircle,
  Edit2, X, CheckCircle2, ChevronRight, Star, AlertTriangle,
  Send, Inbox, Ban, XCircle, Calendar, Users, Monitor, Table2, Check,
} from 'lucide-react-native';
import CambiosPanelMobile from '../../components/CambiosPanelMobile';
import { API_URL, userStore } from '../../utils/userStore';
import { fechaEvento, horaEvento, partesFechaEvento } from '../../utils/fechaEvento';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return fechaEvento(iso, { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtDateShort(iso: string) {
  if (!iso) return '';
  return fechaEvento(iso, { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return horaEvento(iso);
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PROGRAMADA:   { bg: '#dbeafe', text: '#1e40af', label: 'Programada' },
  REPROGRAMADA: { bg: '#fef3c7', text: '#92400e', label: 'Reprogramada' },
  EN_CURSO:   { bg: '#fef9c3', text: '#854d0e', label: 'En curso'   },
  FINALIZADA: { bg: '#dcfce7', text: '#166534', label: 'Finalizada' },
  CANCELADA:  { bg: '#fee2e2', text: '#dc2626', label: 'Cancelada'  },
};

// Solicitudes pendientes (recibidas y enviadas) se gestionan directamente
// aquí en reuniones: ya no hay tabs "Enviadas"/"Recibidas" separadas.
const SOLICITUD_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDIENTE: { bg: '#fef3c7', text: '#92400e', label: 'Pendiente' },
  ACEPTADA:  { bg: '#dcfce7', text: '#166534', label: 'Aceptada'  },
  RECHAZADA: { bg: '#fee2e2', text: '#dc2626', label: 'Rechazada' },
  CANCELADA: { bg: '#f1f5f9', text: '#475569', label: 'Cancelada' },
};

interface AppModal { tipo: 'ok' | 'err'; msg: string }

// ── Cambiar Horario Modal ─────────────────────────────────────────────────────

function CambiarHorarioModal({ reunion, eeId, onClose, onOk }: {
  reunion: any; eeId: number; onClose: () => void; onOk: () => void;
}) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState(0);
  const [fechaSel, setFechaSel] = useState('');
  const [horaSel, setHoraSel] = useState<number | null>(null);
  const [minutosStr, setMinutosStr] = useState('00');
  const [tipoReunion, setTipoReunion] = useState(reunion?.tipo ?? 'PRESENCIAL');
  const [mensaje, setMensaje] = useState(reunion?.mensaje ?? '');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [appModal, setAppModal] = useState<AppModal | null>(null);
  // Mesas libres en el nuevo horario (solo presencial). null = automática: el
  // sistema conserva la mesa actual si sigue libre o asigna otra.
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesaSelec, setMesaSelec] = useState<number | null>(null);

  const fechasDisponibles = useMemo(() =>
    [...new Set(agenda.map((h: any) => partesFechaEvento(h.inicio).dateKey))] as string[],
    [agenda]
  );
  const horariosDelDia = useMemo(() =>
    horarios.filter((h: any) => partesFechaEvento(h.inicio).dateKey === fechaSel),
    [horarios, fechaSel]
  );
  const agendaDelDia = useMemo(() =>
    agenda.filter((h: any) => partesFechaEvento(h.inicio).dateKey === fechaSel),
    [agenda, fechaSel]
  );
  const horarioMatch = useMemo(() => {
    if (horaSel === null) return null;
    const mins = parseInt(minutosStr) || 0;
    return horariosDelDia.find((h: any) => {
      const p = partesFechaEvento(h.inicio);
      return p.hour === horaSel && p.minute === mins;
    }) ?? null;
  }, [horariosDelDia, horaSel, minutosStr]);
  useEffect(() => {
    if (!reunion) return;
    const eeReceptoraId = reunion.solicitanteEeId === eeId ? reunion.receptoraEeId : reunion.solicitanteEeId;
    fetch(`${API_URL}/empresa/horarios?eeId=${eeId}&eeReceptoraId=${eeReceptoraId}&excludeReunionId=${reunion.id}`)
      .then((r) => r.json())
      .then((data) => {
        const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
        const agendaCompleta: any[] = Array.isArray(data?.agenda)
          ? data.agenda
          : hrs.map((slot: any) => ({ ...slot, disponible: true, estado: 'DISPONIBLE' }));
        setHorarios(hrs);
        setAgenda(agendaCompleta);
        setDuracionMin(data?.duracionMinutos ?? 0);
        const primerSlot = hrs[0];
        if (primerSlot) {
          const partes = partesFechaEvento(primerSlot.inicio);
          const primerMinuto = hrs
            .filter((slot: any) => partesFechaEvento(slot.inicio).dateKey === partes.dateKey && partesFechaEvento(slot.inicio).hour === partes.hour)
            .map((slot: any) => partesFechaEvento(slot.inicio).minute)
            .sort((a: number, b: number) => a - b)[0];
          setFechaSel(partes.dateKey);
          setHoraSel(partes.hour);
          setMinutosStr(String(primerMinuto ?? 0).padStart(2, '0'));
        } else if (agendaCompleta[0]) {
          setFechaSel(partesFechaEvento(agendaCompleta[0].inicio).dateKey);
          setHoraSel(null);
        }
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargando(false));
  }, [reunion, eeId]);

  useEffect(() => {
    setMesaSelec(null);
    if (tipoReunion !== 'PRESENCIAL' || !horarioMatch?.inicio || !horarioMatch?.fin) { setMesas([]); return; }
    let vigente = true;
    fetch(`${API_URL}/empresa/mesas-disponibles?inicio=${encodeURIComponent(horarioMatch.inicio)}&fin=${encodeURIComponent(horarioMatch.fin)}`)
      .then((r) => r.json())
      .then((d) => { if (vigente) setMesas(Array.isArray(d) ? d : []); })
      .catch(() => { if (vigente) setMesas([]); });
    return () => { vigente = false; };
  }, [tipoReunion, horarioMatch?.inicio, horarioMatch?.fin]);

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    if (!horarioMatch) { setAppModal({ tipo: 'err', msg: 'Selecciona un horario válido.' }); guardandoRef.current = false; return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/${reunion.id}/cambiar-horario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, inicio: horarioMatch.inicio, tipoReunion, mensaje, ...(tipoReunion === 'PRESENCIAL' && mesaSelec ? { mesaId: mesaSelec } : {}) }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onOk();
    } catch (e: any) {
      setAppModal({ tipo: 'err', msg: e.message || 'Error al cambiar el horario.' });
    } finally { setGuardando(false); guardandoRef.current = false; }
  };

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      {appModal && (
        // position: absolute + inset 0: sin esto, al ser hermano del overlay
        // de abajo (ambos con flex:1 dentro del mismo <Modal>) React Native
        // repartía el alto entre los dos en vez de superponerlos — por eso
        // el aviso aparecía arriba, aplastando "Proponer cambios" debajo en
        // vez de taparlo del todo.
        <View style={[cm.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }]}>
          <View style={cm.modalBox}>
            <Text style={[cm.modalMsg, { color: '#dc2626' }]}>{appModal.msg}</Text>
            <Pressable onPress={() => setAppModal(null)} style={[cm.modalBtn, { backgroundColor: '#ef4444' }]}>
              <Text style={cm.modalBtnText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={cm.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0} style={cm.sheet}>
          <View style={cm.header}>
            <View style={{ flex: 1 }}>
              <Text style={cm.title}>Proponer cambios</Text>
              <Text style={cm.sub} numberOfLines={1}>Con {reunion?.contraparte?.nombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
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
            ) : agenda.length === 0 ? (
              <Text style={cm.emptyText}>No hay otros horarios disponibles para ambas empresas.</Text>
            ) : (
              <>
                <Text style={cm.sectionLabel}>Fecha</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
                    {fechasDisponibles.map((fecha) => {
                      const ejemplo = agenda.find((slot: any) => partesFechaEvento(slot.inicio).dateKey === fecha);
                      return <TouchableOpacity key={fecha} onPress={() => {
                        setFechaSel(fecha);
                        const primerSlot = horarios.find((slot: any) => partesFechaEvento(slot.inicio).dateKey === fecha);
                        if (primerSlot) {
                          const partes = partesFechaEvento(primerSlot.inicio);
                          setHoraSel(partes.hour);
                          setMinutosStr(String(partes.minute).padStart(2, '0'));
                        } else setHoraSel(null);
                      }} style={[cm.horaBtn, fechaSel === fecha && cm.horaBtnActive]}>
                        <Text style={[cm.horaBtnText, fechaSel === fecha && cm.horaBtnTextActive]}>{ejemplo ? fmtDateShort(ejemplo.inicio) : fecha}</Text>
                      </TouchableOpacity>;
                    })}
                  </View>
                </ScrollView>
                <Text style={cm.sectionLabel}>Agenda de la empresa</Text>
                <View style={cm.slotGrid}>
                  {agendaDelDia.map((slot: any, index: number) => {
                    const disponible = slot.disponible !== false;
                    const seleccionado = horarioMatch?.inicio === slot.inicio;
                    const etiquetas: Record<string, string> = {
                      DISPONIBLE: 'Disponible', PENDIENTE: 'Pendiente', OCUPADO: 'Ocupado',
                      NO_DISPONIBLE: 'No disponible', PASADO: 'Finalizado',
                    };
                    return <TouchableOpacity key={`${slot.inicio}-${index}`} disabled={!disponible}
                      onPress={() => {
                        const partes = partesFechaEvento(slot.inicio);
                        setHoraSel(partes.hour);
                        setMinutosStr(String(partes.minute).padStart(2, '0'));
                      }}
                      style={[cm.slotCard, disponible ? cm.slotAvailable : cm.slotUnavailable, seleccionado && cm.slotSelected]}>
                      <Text style={[cm.slotTime, { color: disponible ? '#166534' : '#991b1b' }]}>
                        {fmtTime(slot.inicio)} – {fmtTime(slot.fin)}
                      </Text>
                      <Text style={[cm.slotState, { color: disponible ? '#15803d' : '#b91c1c' }]}>
                        {etiquetas[slot.estado] || (disponible ? 'Disponible' : 'No disponible')}
                      </Text>
                    </TouchableOpacity>;
                  })}
                </View>
                {horarioMatch && (
                  <View style={cm.okBox}>
                    <CheckCircle2 size={13} color={GREEN} style={{ marginRight: 6 }} />
                    <Text style={cm.okText}>{fmtDateShort(horarioMatch.inicio)} · {fmtTime(horarioMatch.inicio)}</Text>
                  </View>
                )}
              </>
            )}

            {tipoReunion === 'PRESENCIAL' && !!horarioMatch && (
              <View style={{ marginTop: 14 }}>
                <Text style={cm.sectionLabel}>Mesa</Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  {reunion?.mesa?.numeroMesa ? `Mesa actual: ${reunion.mesa.numeroMesa}. ` : ''}Elige una mesa libre en el nuevo horario o deja que el sistema asigne la mejor.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity onPress={() => setMesaSelec(null)}
                    style={{ width: '100%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: mesaSelec === null ? GREEN : '#e2e8f0', backgroundColor: mesaSelec === null ? '#f0fdf4' : '#fff' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: mesaSelec === null ? '#166534' : '#64748b' }}>Automática (recomendada)</Text>
                  </TouchableOpacity>
                  {mesas.map((m: any) => (
                    <TouchableOpacity key={m.id} onPress={() => setMesaSelec(m.id)}
                      style={{ minWidth: 72, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: mesaSelec === m.id ? GREEN : '#e2e8f0', backgroundColor: mesaSelec === m.id ? '#f0fdf4' : '#fff' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: mesaSelec === m.id ? '#166534' : '#475569' }}>Mesa {m.numeroMesa}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {mesas.length === 0 && <Text style={{ fontSize: 11, color: '#d97706', marginTop: 6 }}>No hay mesas libres en ese horario.</Text>}
              </View>
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  // Centrado y con margen lateral: pegado al borde inferior, la barra de
  // navegación de Android tapaba los botones de la parte baja del modal.
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, maxHeight: '88%', width: '100%' },
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
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slotCard: { width: '48%', minWidth: 138, borderWidth: 1.5, borderRadius: 12, padding: 11 },
  slotAvailable: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  slotUnavailable: { borderColor: '#fecaca', backgroundColor: '#fef2f2', opacity: 0.82 },
  slotSelected: { borderColor: GREEN, backgroundColor: '#dcfce7' },
  slotTime: { fontSize: 13, fontWeight: '800' },
  slotState: { fontSize: 10, fontWeight: '700', marginTop: 3 },
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

// ── Detalle de solicitud (pendiente) ────────────────────────────────────────
// Reemplaza las antiguas pestañas "Enviadas"/"Recibidas": una solicitud
// pendiente se ve y se gestiona (aceptar/rechazar/editar/cancelar) desde
// esta misma pantalla de reuniones.

function DetalleSolicitudModal({ sol, navigation, onClose, onAceptar, onRechazar, onCancelar, onEditar }: {
  sol: any; navigation: any; onClose: () => void;
  onAceptar: () => void; onRechazar: () => void; onCancelar: () => void; onEditar: () => void;
}) {
  const esEnviada = !!sol.esMiSolicitud;
  const empresa = esEnviada ? sol.receptora : sol.solicitante;
  const initial = (empresa?.nombre ?? 'E')[0].toUpperCase();

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={dsm.row}>
      <Text style={dsm.rowLabel}>{label}</Text>
      <View style={dsm.rowVal}>{children}</View>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={dsm.overlay}>
        <View style={dsm.sheet}>
          <View style={dsm.handle} />
          <View style={dsm.header}>
            <Text style={dsm.title}>Detalle de solicitud</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={dsm.badges}>
              <View style={[dsm.badge, { backgroundColor: (SOLICITUD_STYLE[sol.estado] ?? SOLICITUD_STYLE.PENDIENTE).bg }]}>
                <Text style={[dsm.badgeTxt, { color: (SOLICITUD_STYLE[sol.estado] ?? SOLICITUD_STYLE.PENDIENTE).text }]}>
                  {(SOLICITUD_STYLE[sol.estado] ?? SOLICITUD_STYLE.PENDIENTE).label}
                </Text>
              </View>
              <View style={[dsm.badge, { backgroundColor: sol.tipo === 'PRESENCIAL' ? '#eff6ff' : '#f5f3ff' }]}>
                {sol.tipo === 'PRESENCIAL' ? <Users size={10} color="#1d4ed8" /> : <Monitor size={10} color="#7c3aed" />}
                <Text style={[dsm.badgeTxt, { color: sol.tipo === 'PRESENCIAL' ? '#1d4ed8' : '#7c3aed' }]}>
                  {sol.tipo === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                </Text>
              </View>
            </View>

            {sol.tieneConflicto && (
              <View style={dsm.conflict}>
                <AlertTriangle size={13} color="#92400e" />
                <Text style={dsm.conflictTxt}>Hay otra solicitud pendiente para el mismo horario. Solo puedes aceptar una.</Text>
              </View>
            )}

            <View style={dsm.infoCard}>
              <View style={[dsm.row, { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
                <Text style={dsm.rowLabel}>Empresa</Text>
                <View style={[dsm.rowVal, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={dsm.avatar}><Text style={dsm.avatarTxt}>{initial}</Text></View>
                  <Text style={dsm.empresaNombre}>{empresa?.nombre ?? '—'}</Text>
                </View>
              </View>
              <Row label="Fecha">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} color="#9ca3af" />
                  <Text style={dsm.rowValTxt}>{fmtDate(sol.inicio)} · {fmtTime(sol.inicio)}</Text>
                </View>
              </Row>
              {sol.mesa?.numeroMesa && (
                <Row label="Mesa">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Table2 size={13} color="#9ca3af" />
                    <Text style={dsm.rowValTxt}>Mesa {sol.mesa.numeroMesa}</Text>
                  </View>
                </Row>
              )}
              {sol.mensaje && <Row label="Mensaje"><Text style={dsm.mensajeTxt}>"{sol.mensaje}"</Text></Row>}
            </View>

            <View style={dsm.actions}>
              {!esEnviada ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={dsm.btnRechazar} onPress={onRechazar} activeOpacity={0.8}>
                    <XCircle size={16} color="#dc2626" /><Text style={dsm.btnRechazarTxt}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dsm.btnAceptar} onPress={onAceptar} activeOpacity={0.8}>
                    <CheckCircle2 size={16} color="#fff" /><Text style={dsm.btnAceptarTxt}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={dsm.btnEditar} onPress={onEditar} activeOpacity={0.8}>
                    <Edit2 size={16} color={GREEN} /><Text style={dsm.btnEditarTxt}>Editar solicitud</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dsm.btnCancelar} onPress={onCancelar} activeOpacity={0.8}>
                    <Ban size={16} color="#dc2626" /><Text style={dsm.btnCancelarTxt}>Cancelar solicitud</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={dsm.btnCerrar} onPress={onClose} activeOpacity={0.8}>
                <Text style={dsm.btnCerrarTxt}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const dsm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: 20, paddingTop: 12 },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 12 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  badges:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:{ fontSize: 10, fontWeight: '700' },
  conflict: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' },
  conflictTxt: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 },
  infoCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 12, marginBottom: 16 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 12 },
  rowLabel:  { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, width: 72, marginRight: 8, paddingTop: 1 },
  rowVal:    { flex: 1 },
  rowValTxt: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  avatar:    { width: 28, height: 28, borderRadius: 8, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 12, fontWeight: '800', color: GREEN },
  empresaNombre: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  mensajeTxt:{ fontSize: 12, color: '#374151', fontStyle: 'italic', lineHeight: 18 },
  actions:   { gap: 10 },
  btnAceptar:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 14, height: 48 },
  btnAceptarTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnRechazar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#fca5a5' },
  btnRechazarTxt: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  btnEditar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#bbf7d0' },
  btnEditarTxt: { color: GREEN, fontSize: 14, fontWeight: '700' },
  btnCancelar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#fca5a5' },
  btnCancelarTxt: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  btnCerrar:  { alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
  btnCerrarTxt: { fontSize: 14, fontWeight: '800', color: '#334155' },
});

// ── Confirmar acción sobre una solicitud (aceptar/rechazar/cancelar) ───────

function ActionSolicitudModal({ sol, type, onClose, onDone }: {
  sol: any; type: 'cancelar' | 'aceptar' | 'rechazar';
  onClose: () => void; onDone: () => void;
}) {
  const [acting, setActing] = useState(false);
  const actingRef = useRef(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const user = userStore.get();

  const doAction = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    setErr(''); setActing(true);
    try {
      const res = await fetch(`${API_URL}/empresa/solicitudes/${sol.id}/${type}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId: user?.empresaeventoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Error al ${type}`);
      setOk(true);
      onDone();
    } catch (e: any) { setErr(e.message || 'Error de red'); }
    finally { setActing(false); actingRef.current = false; }
  };

  const titleMap = { cancelar: 'Cancelar solicitud', aceptar: 'Confirmar reunión', rechazar: 'Rechazar solicitud' };

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={dsm.overlay}>
        <View style={[dsm.sheet, { paddingBottom: 24 }]}>
          <View style={dsm.handle} />
          <View style={dsm.header}>
            <Text style={dsm.title}>{titleMap[type]}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {ok ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
              <CheckCircle2 size={48} color={GREEN} />
              <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' }}>
                {type === 'cancelar' ? 'Solicitud cancelada' : type === 'aceptar' ? '¡Reunión confirmada!' : 'Solicitud rechazada'}
              </Text>
              <TouchableOpacity style={{ backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8, width: '100%' }} onPress={onClose}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {!!err && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' }}>
                  <AlertCircle size={14} color="#dc2626" />
                  <Text style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>{err}</Text>
                </View>
              )}
              {type !== 'aceptar' && (
                <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 24 }}>
                  {type === 'cancelar' ? '¿Seguro que deseas cancelar esta solicitud?' : '¿Rechazas esta solicitud de reunión?'}
                </Text>
              )}
              {type === 'aceptar' && (
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Users size={14} color={GREEN} />
                    <Text style={{ fontSize: 12, color: '#6b7280', width: 68, fontWeight: '600' }}>Empresa</Text>
                    <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '700', flex: 1 }}>{sol.solicitante?.nombre ?? '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} color={GREEN} />
                    <Text style={{ fontSize: 12, color: '#6b7280', width: 68, fontWeight: '600' }}>Fecha</Text>
                    <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '700', flex: 1 }}>{fmtDate(sol.inicio)} {fmtTime(sol.inicio)}</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }} onPress={onClose}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, { backgroundColor: type === 'aceptar' ? GREEN : '#dc2626' }, acting && { opacity: 0.7 }]}
                  onPress={doAction} disabled={acting}>
                  {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      {type === 'cancelar' ? 'Cancelar solicitud' : type === 'aceptar' ? 'Confirmar reunión' : 'Rechazar'}
                    </Text>
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

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetalleReunionModal({ reunion, eeId, esEncargado, navigation, onClose, onCambiarHorario, onFinalizado }: {
  reunion: any; eeId: number; esEncargado: boolean;
  navigation: any; onClose: () => void; onCambiarHorario: () => void; onFinalizado: () => void;
}) {
  const [reloj, setReloj] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setReloj(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const ahora = new Date(reloj);
  const minutosRestantes = Math.max(0, Math.ceil((new Date(reunion.fin).getTime() - reloj) / 60000));
  const esProgramada = (reunion.estado === 'PROGRAMADA' || reunion.estado === 'REPROGRAMADA') && new Date(reunion.fin) > ahora;
  const esFinalizada = reunion.estado === 'FINALIZADA' || new Date(reunion.fin) <= ahora;
  // Gestionar la reunión (iniciar, finalizar, cancelar, proponer cambios,
  // registrar evaluación) es tarea exclusiva del encargado de la empresa; un
  // participante solo puede ver el detalle de sus próximas reuniones.
  const puedeFinalizarEncargado = esEncargado && reunion.estado === 'EN_CURSO';
  const puedeIniciar = esEncargado && ['PROGRAMADA', 'REPROGRAMADA'].includes(reunion.estado);
  const otraPidioIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor !== eeId;
  const yoPediIniciar = reunion.inicioAnticipadoPor && reunion.inicioAnticipadoPor === eeId;
  const st = STATUS_STYLE[reunion.estado] ?? { bg: '#f1f5f9', text: '#475569', label: reunion.estado };
  const isVirtual = reunion.tipo === 'VIRTUAL';
  const [finalizando, setFinalizando] = useState(false);
  const finalizandoRef = useRef(false);
  const [errFin, setErrFin] = useState<string | null>(null);
  const [confirmandoFin, setConfirmandoFin] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const iniciandoRef = useRef(false);
  const [msgIni, setMsgIni] = useState<string | null>(null);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [cancelandoReunion, setCancelandoReunion] = useState(false);
  const cancelandoReunionRef = useRef(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  const handleIniciar = async () => {
    if (iniciandoRef.current) return;
    iniciandoRef.current = true;
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
    finally { iniciandoRef.current = false; }
  };

  const handleFinalizar = async () => {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
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
    finally { finalizandoRef.current = false; }
  };

  const handleCancelarReunion = async () => {
    if (cancelandoReunionRef.current) return;
    cancelandoReunionRef.current = true;
    setCancelandoReunion(true); setErrFin(null);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/${reunion.id}/cancelar`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, motivo: motivoCancelacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo cancelar la reunión.');
      onFinalizado();
    } catch (e: any) {
      setErrFin(e.message || 'No se pudo cancelar la reunión.');
      setCancelandoReunion(false);
    } finally { cancelandoReunionRef.current = false; }
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

          <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
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
              {isVirtual && !reunion.enlace && (
                <View style={{ marginTop: 10, borderRadius: 10, backgroundColor: '#fffbeb', padding: 10, flexDirection: 'row', gap: 8 }}>
                  <AlertTriangle size={15} color="#92400e" />
                  <Text style={{ color: '#92400e', fontSize: 12, flex: 1 }}>
                    Esta reunión todavía no tiene enlace. El equipo técnico recibirá una alerta urgente si intentas iniciarla.
                  </Text>
                </View>
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
            {reunion.estado === 'EN_CURSO' && <View style={{backgroundColor:minutosRestantes<=2?'#fef2f2':minutosRestantes<=5?'#fffbeb':'#eff6ff',borderRadius:12,padding:12,marginBottom:12}}><Text style={{fontSize:13,fontWeight:'800',textAlign:'center',color:minutosRestantes<=2?'#b91c1c':minutosRestantes<=5?'#92400e':'#1e40af'}}>{minutosRestantes>0?`Quedan aproximadamente ${minutosRestantes} minuto(s)`:'El tiempo programado terminó'}</Text><Text style={{fontSize:11,textAlign:'center',color:'#64748b',marginTop:3}}>Al concluir, finaliza la reunión y registra la evaluación.</Text></View>}
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
            {esProgramada && <View style={dm.scheduleNotice}><CalendarDays size={16} color="#1d4ed8" /><Text style={dm.scheduleNoticeText}>La reunión está programada para {fmtTime(reunion.inicio)}. Puedes solicitar el inicio anticipado hasta 10 minutos antes.</Text></View>}
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
              {esEncargado && esProgramada && (confirmandoCancelacion ? (
                <View style={dm.cancelMeetingBox}>
                  <Text style={dm.cancelMeetingText}>La otra empresa y el equipo técnico verán esta cancelación.</Text>
                  <TextInput
                    value={motivoCancelacion}
                    onChangeText={setMotivoCancelacion}
                    maxLength={300}
                    multiline
                    placeholder="Motivo de la cancelación (opcional)"
                    style={dm.cancelMeetingInput}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setConfirmandoCancelacion(false)} disabled={cancelandoReunion} style={dm.confirmFinCancel}>
                      <Text style={dm.confirmFinCancelText}>Volver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelarReunion} disabled={cancelandoReunion} style={[dm.cancelMeetingConfirm, cancelandoReunion && { opacity: 0.6 }]}>
                      {cancelandoReunion ? <ActivityIndicator size="small" color="#fff" /> : <Text style={dm.finalizarBtnText}>Confirmar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setConfirmandoCancelacion(true)} style={dm.cancelMeetingBtn} activeOpacity={0.8}>
                  <AlertTriangle size={14} color="#b91c1c" style={{ marginRight: 8 }} />
                  <Text style={dm.cancelMeetingBtnText}>Cancelar reunión</Text>
                </TouchableOpacity>
              ))}
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
  actions: { gap: 12 },
  primaryBtn: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', marginBottom: 2 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  closeBtn: { borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#334155' },
  scheduleNotice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 12, padding: 11 },
  scheduleNoticeText: { flex: 1, color: '#1e3a8a', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  finalizarBtn: { flexDirection: 'row', backgroundColor: '#f97316', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center' },
  finalizarBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  iniciarBtn: { flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  confirmFinBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 14, padding: 12 },
  confirmFinText: { flex: 1, color: '#9a3412', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  confirmFinCancel: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  confirmFinCancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  confirmFinOk: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  cancelMeetingBtn: { flexDirection: 'row', borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2' },
  cancelMeetingBtnText: { fontSize: 14, fontWeight: '700', color: '#b91c1c' },
  cancelMeetingBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 14, padding: 12, gap: 10 },
  cancelMeetingText: { color: '#991b1b', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  cancelMeetingInput: { minHeight: 62, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: 'top', color: '#0f172a' },
  cancelMeetingConfirm: { flex: 1, height: 42, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EmpresaReunionesScreen({ navigation, route, embedded = false, reunionIdProp, filtroProp }: any) {
  const [items,       setItems]       = useState<any[]>([]);
  // Solicitudes aún pendientes (recibidas y enviadas): ya no tienen tabs
  // propias, se gestionan en esta misma lista junto a las reuniones.
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'enviadas' | 'proximas' | 'finalizadas' | 'cambios'>(filtroProp ?? 'todas');
  // Propuestas de cambio de horario/modalidad (recibidas, enviadas e historial).
  const [cambios, setCambios] = useState<any[]>([]);
  // Un deep-link de notificación (p. ej. "tienes una solicitud nueva") puede
  // llegar con un filtro distinto mientras esta pantalla ya está montada.
  useEffect(() => { if (filtroProp) setFiltro(filtroProp); }, [filtroProp]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');
  const [eeId,        setEeId]        = useState<number | null>(null);
  const [detalleModal,setDetalleModal]= useState<any>(null);
  const [cambiarModal,setCambiarModal]= useState<any>(null);
  const [appModal,    setAppModal]    = useState<AppModal | null>(null);
  const [respondiendoCambioId, setRespondiendoCambioId] = useState<number | null>(null);
  const respondiendoCambioRef = useRef<number | null>(null);
  const [detalleSolicitud, setDetalleSolicitud] = useState<any>(null);
  const [actionSolicitud, setActionSolicitud] = useState<{ sol: any; type: 'cancelar' | 'aceptar' | 'rechazar' } | null>(null);

  const recibidasPendientes = useMemo(() => solicitudes.filter((s) => !s.esMiSolicitud), [solicitudes]);
  const cambiosPorResponder = useMemo(() => cambios.filter((c) => c.estado === 'PENDIENTE' && c.direccion === 'recibida').length, [cambios]);
  const enviadasPendientes  = useMemo(() => solicitudes.filter((s) => s.esMiSolicitud), [solicitudes]);

  // La lista se muestra agrupada: primero las solicitudes recibidas que
  // esperan mi respuesta (como una bandeja de entrada, sin importar fecha),
  // luego lo vigente (reuniones programadas + solicitudes enviadas que
  // esperan respuesta) ordenado por fecha con cabecera por día, y al final
  // todo lo finalizado/cancelado. El filtro activo recorta cada bloque.
  const itemsAgrupados = useMemo(() => {
    const ahoraMs = Date.now();
    const esFinalizada = (r: any) => r.estado === 'FINALIZADA' || new Date(r.fin).getTime() <= ahoraMs;
    const vigentes = items.filter((r) => !esFinalizada(r));
    const finalizadas = items.filter(esFinalizada)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

    const salida: any[] = [];

    if (filtro === 'todas' || filtro === 'pendientes') {
      if (recibidasPendientes.length > 0) {
        salida.push({ __cabecera: true, id: 'cab-pendientes', titulo: 'Pendientes por aceptar', destacada: true });
        salida.push(...recibidasPendientes.map((s) => ({ ...s, __tipo: 'solicitud' })));
      }
    }

    if (filtro === 'todas' || filtro === 'proximas' || filtro === 'enviadas') {
      const vigentesFiltradas = filtro === 'enviadas' ? [] : vigentes.map((r) => ({ ...r, __tipo: 'reunion' }));
      const enviadasFiltradas = filtro === 'proximas' ? [] : enviadasPendientes.map((s) => ({ ...s, __tipo: 'solicitud', fin: s.inicio }));
      const combinadas = [...vigentesFiltradas, ...enviadasFiltradas]
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
      let diaActual = '';
      for (const r of combinadas) {
        const dia = partesFechaEvento(r.inicio).dateKey;
        if (dia !== diaActual) {
          diaActual = dia;
          salida.push({ __cabecera: true, id: `dia-${dia}`, titulo: fmtDate(r.inicio) });
        }
        salida.push(r);
      }
    }

    if ((filtro === 'todas' || filtro === 'finalizadas') && finalizadas.length > 0) {
      salida.push({ __cabecera: true, id: 'dia-finalizadas', titulo: `Finalizadas (${finalizadas.length})`, apagada: true });
      salida.push(...finalizadas.map((r) => ({ ...r, __tipo: 'reunion' })));
    }
    return salida;
  }, [items, recibidasPendientes, enviadasPendientes, filtro]);

  const user = userStore.get();
  const [esEncargado, setEsEncargado] = useState(!!userStore.get()?.esResponsable);
  useEffect(() => userStore.subscribe(() => setEsEncargado(!!userStore.get()?.esResponsable)), []);

  const fetchCambios = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/cambios?eeId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setCambios(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchSolicitudes = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/empresa/solicitudes?eeId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setSolicitudes(lista.filter((s: any) => s.estado === 'PENDIENTE'));
    } catch {}
  }, []);

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
      if (esEncargado) await Promise.all([fetchSolicitudes(id), fetchCambios(id)]);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId, esEncargado, fetchSolicitudes, fetchCambios]);

  useFocusEffect(useCallback(() => {
    fetchData();
    const iv = setInterval(fetchData, 15_000);
    return () => clearInterval(iv);
  }, [fetchData]));

  // Llegar aquí desde una notificación (reunión iniciada, recordatorio...)
  // debe abrir directamente el detalle de esa reunión, no solo la lista.
  const reunionIdAbierta = useRef<number | null>(null);
  useEffect(() => {
    const pedidoId = reunionIdProp ?? route?.params?.reunionId;
    if (!pedidoId || reunionIdAbierta.current === pedidoId || items.length === 0) return;
    const match = items.find((it) => it.id === pedidoId);
    if (match) {
      reunionIdAbierta.current = pedidoId;
      setDetalleModal(match);
      navigation.setParams?.({ reunionId: undefined });
    }
  }, [items, reunionIdProp, route?.params?.reunionId, navigation]);

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  const ahora = new Date();

  const Root = embedded ? View : SafeAreaView;
  const rootProps = embedded ? { style: s.root } : { style: s.root, edges: ['top'] as const };

  return (
    <Root {...rootProps}>
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
            setFiltro('cambios');
            setAppModal({ tipo: 'ok', msg: 'Solicitud de cambio enviada. Te avisaremos cuando la otra empresa responda.' });
          }}
        />
      )}

      {/* Detalle de solicitud pendiente */}
      {detalleSolicitud && (
        <DetalleSolicitudModal
          sol={detalleSolicitud}
          navigation={navigation}
          onClose={() => setDetalleSolicitud(null)}
          onAceptar={() => setActionSolicitud({ sol: detalleSolicitud, type: 'aceptar' })}
          onRechazar={() => setActionSolicitud({ sol: detalleSolicitud, type: 'rechazar' })}
          onCancelar={() => setActionSolicitud({ sol: detalleSolicitud, type: 'cancelar' })}
          onEditar={() => { setDetalleSolicitud(null); navigation.navigate('Empresas', { editarSolicitud: detalleSolicitud }); }}
        />
      )}

      {/* Confirmar aceptar/rechazar/cancelar solicitud */}
      {actionSolicitud && (
        <ActionSolicitudModal
          sol={actionSolicitud.sol}
          type={actionSolicitud.type}
          onClose={() => setActionSolicitud(null)}
          onDone={() => { setActionSolicitud(null); setDetalleSolicitud(null); if (eeId) fetchSolicitudes(eeId); fetchData(); }}
        />
      )}

      {!embedded && (
        <View style={s.header}>
          <Text style={s.headerTitle}>Mis reuniones</Text>
          <Text style={s.headerSub}>{items.length} reunión{items.length !== 1 ? 'es' : ''}</Text>
        </View>
      )}

      {esEncargado && (
        <View style={s.filterRow}>
          {([
            ['todas', 'Todas'],
            ['pendientes', `Pendientes${recibidasPendientes.length > 0 ? ` (${recibidasPendientes.length})` : ''}`],
            ['enviadas', 'Enviadas'],
            ['proximas', 'Próximas'],
            ['cambios', 'Cambios'],
            ['finalizadas', 'Finalizadas'],
          ] as const).map(([key, label]) => (
            <TouchableOpacity key={key} onPress={() => setFiltro(key)} style={[s.filterChip, { flexDirection: 'row', alignItems: 'center', gap: 5 }, filtro === key && s.filterChipActive]}>
              <Text style={[s.filterChipText, filtro === key && s.filterChipTextActive]}>{label}</Text>
              {key === 'cambios' && cambiosPorResponder > 0 && (
                <View style={s.redBadge}><Text style={s.redBadgeText}>{cambiosPorResponder}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {esEncargado && filtro === 'cambios' && eeId ? (
        <CambiosPanelMobile eeId={eeId} cambios={cambios} refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          onActualizado={() => { fetchData(); }}
          onMensaje={(tipo, msg) => setAppModal({ tipo, msg })}
          onReintentar={(reunionId) => { const r = items.find((x) => x.id === reunionId); if (r) setCambiarModal(r); }} />
      ) : (
      <FlatList
        data={itemsAgrupados}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListHeaderComponent={
          esEncargado && cambiosPorResponder > 0 ? (
            <TouchableOpacity onPress={() => setFiltro('cambios')} style={s.changeCard} activeOpacity={0.8}>
              <Text style={s.changeTitle}>Tienes {cambiosPorResponder} solicitud{cambiosPorResponder > 1 ? 'es' : ''} de cambio por responder</Text>
              <Text style={s.changeText}>Toca para verlas en Cambios.</Text>
            </TouchableOpacity>
          ) : null
        }        ListEmptyComponent={
          <View style={s.empty}>
            <CalendarDays size={48} color="#d1d5db" />
            <Text style={s.emptyText}>
              {filtro === 'pendientes' ? 'No tienes solicitudes pendientes por aceptar'
                : filtro === 'enviadas' ? 'No tienes solicitudes enviadas pendientes'
                : filtro === 'finalizadas' ? 'No tienes reuniones finalizadas'
                : 'No tienes reuniones confirmadas'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.__cabecera) {
            return (
              <Text style={[s.grupoTitulo, item.apagada && s.grupoTituloApagado, item.destacada && s.grupoTituloDestacado]}>{item.titulo}</Text>
            );
          }
          if (item.__tipo === 'solicitud') {
            const esEnviada = !!item.esMiSolicitud;
            const empresaSol = esEnviada ? item.receptora : item.solicitante;
            const isVirtualSol = item.tipo === 'VIRTUAL';
            return (
              <TouchableOpacity style={[s.card, s.cardSolicitud]} onPress={() => setDetalleSolicitud(item)} activeOpacity={0.8}>
                <View style={s.cardHeader}>
                  <View style={[s.badge, { backgroundColor: SOLICITUD_STYLE.PENDIENTE.bg }]}>
                    <Text style={[s.badgeText, { color: SOLICITUD_STYLE.PENDIENTE.text }]}>Pendiente</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: isVirtualSol ? '#eff6ff' : '#f0fdf4' }]}>
                    {isVirtualSol ? <Video size={11} color="#2563eb" style={{ marginRight: 3 }} /> : <MapPin size={11} color={GREEN} style={{ marginRight: 3 }} />}
                    <Text style={[s.badgeText, { color: isVirtualSol ? '#2563eb' : GREEN }]}>{item.tipo}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: esEnviada ? '#eef2ff' : '#fffbeb' }]}>
                    {esEnviada ? <Send size={10} color="#4f46e5" style={{ marginRight: 3 }} /> : <Inbox size={10} color="#d97706" style={{ marginRight: 3 }} />}
                    <Text style={[s.badgeText, { color: esEnviada ? '#4f46e5' : '#d97706' }]}>{esEnviada ? 'Enviada' : 'Recibida'}</Text>
                  </View>
                </View>
                <View style={s.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.counterpart} numberOfLines={1}>{empresaSol?.nombre ?? '—'}</Text>
                    <View style={s.timeRow}>
                      <CalendarDays size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={s.metaText}>{fmtDateShort(item.inicio)}</Text>
                      <Clock size={12} color="#94a3b8" style={{ marginLeft: 8, marginRight: 4 }} />
                      <Text style={s.metaText}>{fmtTime(item.inicio)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {!esEnviada ? (
                      <>
                        <Pressable style={s.quickBtnRed} onPress={(e) => { e.stopPropagation?.(); setActionSolicitud({ sol: item, type: 'rechazar' }); }}>
                          <X size={14} color="#dc2626" />
                        </Pressable>
                        <Pressable style={s.quickBtnGreen} onPress={(e) => { e.stopPropagation?.(); setActionSolicitud({ sol: item, type: 'aceptar' }); }}>
                          <Check size={14} color="#fff" />
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable style={s.quickBtnEdit} onPress={(e) => { e.stopPropagation?.(); navigation.navigate('Empresas', { editarSolicitud: item }); }}>
                          <Edit2 size={14} color={GREEN} />
                        </Pressable>
                        <Pressable style={s.quickBtnGray} onPress={(e) => { e.stopPropagation?.(); setActionSolicitud({ sol: item, type: 'cancelar' }); }}>
                          <Ban size={14} color="#6b7280" />
                        </Pressable>
                      </>
                    )}
                    <ChevronRight size={16} color="#d1d5db" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
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
                    {item.contraparte?.nombre ?? '—'}
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
      )}
    </Root>
  );
}

const s = StyleSheet.create({
  // Cabeceras de la lista agrupada: un día, o el bloque de finalizadas.
  grupoTitulo: { fontSize: 13, fontWeight: '800', color: '#0f172a', textTransform: 'capitalize', marginTop: 14, marginBottom: 8 },
  grupoTituloApagado: { color: '#94a3b8', textTransform: 'none' },
  grupoTituloDestacado: { color: '#92400e', textTransform: 'none', marginTop: 4 },
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: '#f8fafc' },
  filterChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  redBadge: { minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  redBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  filterChipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  cardSolicitud: { borderColor: '#fde68a', backgroundColor: '#fffdf7' },
  quickBtnGreen: { width: 30, height: 30, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  quickBtnRed:   { width: 30, height: 30, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  quickBtnEdit:  { width: 30, height: 30, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  quickBtnGray:  { width: 30, height: 30, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
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
