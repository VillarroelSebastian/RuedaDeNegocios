import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Send, Inbox, X, Check, Ban, AlertTriangle, AlertCircle,
  Calendar, Users, Monitor, Table2, ChevronRight, CheckCircle2, XCircle, Clock, Building2,
  Edit2,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { fechaEvento, horaEvento } from '../../utils/fechaEvento';
import EmpresaEmpresasScreen from './EmpresaEmpresasScreen';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return fechaEvento(iso, { weekday: 'short', day: '2-digit', month: 'short' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return horaEvento(iso);
}

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; label: string; Icon: any }> = {
  PENDIENTE: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b', label: 'Pendiente', Icon: Clock },
  ACEPTADA:  { bg: '#dcfce7', text: '#166534', border: '#22c55e', label: 'Aceptada',  Icon: CheckCircle2 },
  RECHAZADA: { bg: '#fee2e2', text: '#dc2626', border: '#ef4444', label: 'Rechazada', Icon: XCircle },
  CANCELADA: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: 'Cancelada', Icon: Ban },
};

function StatusBadge({ estado }: { estado: string }) {
  const cfg = STATUS_CFG[estado] ?? STATUS_CFG.CANCELADA;
  const Icon = cfg.Icon;
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <Icon size={10} color={cfg.text} />
      <Text style={[badge.txt, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  txt:  { fontSize: 10, fontWeight: '700' },
});

// ── Detail Modal ────────────────────────────────────────────────────────────

function DetalleModal({ sol, tab, onClose, onAceptar, onRechazar, onCancelar }: {
  sol: any; tab: 'enviadas' | 'recibidas';
  onClose: () => void; onAceptar: () => void; onRechazar: () => void; onCancelar: () => void;
}) {
  const empresa = tab === 'enviadas' ? sol.receptora : sol.solicitante;
  const initial = (empresa?.nombre ?? 'E')[0].toUpperCase();
  const isPendiente = sol.estado === 'PENDIENTE';

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={dm.row}>
      <Text style={dm.rowLabel}>{label}</Text>
      <View style={dm.rowVal}>{children}</View>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={dm.overlay}>
        <View style={dm.sheet}>
          {/* Handle */}
          <View style={dm.handle} />

          {/* Header */}
          <View style={dm.header}>
            <Text style={dm.title}>Detalle de solicitud</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Badges */}
            <View style={dm.badges}>
              <StatusBadge estado={sol.estado} />
              <View style={[dm.tipoBadge, sol.tipo === 'PRESENCIAL' ? dm.tipoPres : dm.tipoVirt]}>
                {sol.tipo === 'PRESENCIAL'
                  ? <Users size={10} color="#1d4ed8" />
                  : <Monitor size={10} color="#7c3aed" />}
                <Text style={[dm.tipoBadgeTxt, { color: sol.tipo === 'PRESENCIAL' ? '#1d4ed8' : '#7c3aed' }]}>
                  {sol.tipo === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                </Text>
              </View>
            </View>

            {/* Conflict */}
            {sol.tieneConflicto && (
              <View style={dm.conflict}>
                <AlertTriangle size={13} color="#92400e" />
                <Text style={dm.conflictTxt}>Hay otra solicitud pendiente para el mismo horario. Solo puedes aceptar una.</Text>
              </View>
            )}

            {/* Info card */}
            <View style={dm.infoCard}>
              {/* Avatar + company */}
              <View style={[dm.row, { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
                <Text style={dm.rowLabel}>Empresa</Text>
                <View style={[dm.rowVal, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={dm.avatar}>
                    <Text style={dm.avatarTxt}>{initial}</Text>
                  </View>
                  <Text style={dm.empresaNombre}>
                    {empresa?.nombre ?? '—'}{empresa?.codigo ? ` · ${empresa.codigo}` : ''}
                  </Text>
                </View>
              </View>

              <Row label="Fecha">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} color="#9ca3af" />
                  <Text style={dm.rowValTxt}>{fmtDate(sol.inicio)} · {fmtTime(sol.inicio)}</Text>
                </View>
              </Row>

              {(sol.reunion?.mesa?.numeroMesa || sol.mesa?.numeroMesa) && (
                <Row label="Mesa">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Table2 size={13} color="#9ca3af" />
                    <Text style={dm.rowValTxt}>Mesa {sol.reunion?.mesa?.numeroMesa ?? sol.mesa?.numeroMesa}</Text>
                  </View>
                </Row>
              )}

              {sol.enlace && (
                <Row label="Enlace">
                  <Text style={dm.enlaceTxt} numberOfLines={1}>{sol.enlace}</Text>
                </Row>
              )}

              {sol.mensaje && (
                <Row label="Mensaje">
                  <Text style={dm.mensajeTxt}>"{sol.mensaje}"</Text>
                </Row>
              )}

              {sol.motivo && (
                <Row label="Motivo">
                  <Text style={dm.motivoTxt}>{sol.motivo}</Text>
                </Row>
              )}
            </View>

            {/* Actions */}
            <View style={dm.actions}>
              {tab === 'recibidas' && isPendiente && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={dm.btnRechazar} onPress={onRechazar} activeOpacity={0.8}>
                    <XCircle size={16} color="#dc2626" />
                    <Text style={dm.btnRechazarTxt}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dm.btnAceptar} onPress={onAceptar} activeOpacity={0.8}>
                    <CheckCircle2 size={16} color="#fff" />
                    <Text style={dm.btnAceptarTxt}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {tab === 'enviadas' && isPendiente && (
                <TouchableOpacity style={dm.btnCancelar} onPress={onCancelar} activeOpacity={0.8}>
                  <Ban size={16} color="#dc2626" />
                  <Text style={dm.btnCancelarTxt}>Cancelar solicitud</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={dm.btnCerrar} onPress={onClose} activeOpacity={0.8}>
                <Text style={dm.btnCerrarTxt}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: 20, paddingTop: 12 },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 12 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  badges:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tipoBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tipoPres:      { backgroundColor: '#eff6ff' },
  tipoVirt:      { backgroundColor: '#f5f3ff' },
  tipoBadgeTxt:  { fontSize: 10, fontWeight: '700' },
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
  enlaceTxt: { fontSize: 12, color: GREEN, fontWeight: '600' },
  mensajeTxt:{ fontSize: 12, color: '#374151', fontStyle: 'italic', lineHeight: 18 },
  motivoTxt: { fontSize: 12, color: '#dc2626', lineHeight: 18 },
  actions:   { gap: 10 },
  btnAceptar:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 14, height: 48 },
  btnAceptarTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnRechazar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fee2e2', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#fca5a5' },
  btnRechazarTxt: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  btnCancelar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 14, height: 48, borderWidth: 1, borderColor: '#fca5a5' },
  btnCancelarTxt: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  btnCerrar:  { alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  btnCerrarTxt: { fontSize: 14, fontWeight: '700', color: '#9ca3af' },
});

// ── Action Confirm Modal ────────────────────────────────────────────────────

function ActionModal({ sol, type, onClose, onDone }: {
  sol: any; type: 'cancelar' | 'aceptar' | 'rechazar';
  onClose: () => void; onDone: () => void;
}) {
  const [acting, setActing] = useState(false);
  const [err, setErr]       = useState('');
  const [ok, setOk]         = useState(false);
  const user = userStore.get();

  const doAction = async () => {
    setErr(''); setActing(true);
    try {
      const url = `${API_URL}/empresa/solicitudes/${sol.id}/${type}`;
      const res = await fetch(url, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId: user?.empresaeventoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Error al ${type}`);
      setOk(true);
      onDone();
    } catch (e: any) { setErr(e.message || 'Error de red'); }
    finally { setActing(false); }
  };

  const titleMap = { cancelar: 'Cancelar solicitud', aceptar: 'Confirmar reunión', rechazar: 'Rechazar solicitud' };

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.handle} />
          <View style={am.header}>
            <Text style={am.title}>{titleMap[type]}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {ok ? (
            <View style={am.successBox}>
              <CheckCircle2 size={48} color={GREEN} />
              <Text style={am.successTxt}>
                {type === 'cancelar' ? 'Solicitud cancelada' :
                 type === 'aceptar'  ? '¡Reunión confirmada!' : 'Solicitud rechazada'}
              </Text>
              <TouchableOpacity style={am.btnPrimary} onPress={onClose}>
                <Text style={am.btnPrimaryTxt}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {!!err && (
                <View style={am.errBox}>
                  <AlertCircle size={14} color="#dc2626" />
                  <Text style={am.errTxt}>{err}</Text>
                </View>
              )}

              {type === 'aceptar' && (
                <View style={am.infoCard}>
                  <View style={am.infoRow}>
                    <Users size={14} color={GREEN} />
                    <Text style={am.infoLabel}>Empresa</Text>
                    <Text style={am.infoVal}>{sol.solicitante?.nombre ?? '—'}</Text>
                  </View>
                  <View style={am.infoRow}>
                    <Calendar size={14} color={GREEN} />
                    <Text style={am.infoLabel}>Fecha</Text>
                    <Text style={am.infoVal}>{fmtDate(sol.inicio)} {fmtTime(sol.inicio)}</Text>
                  </View>
                  {sol.tipo === 'PRESENCIAL' && (
                    <View style={am.mesaBox}>
                      <Table2 size={13} color="#1d4ed8" />
                      <Text style={am.mesaTxt}>
                        {sol.mesa?.numeroMesa
                          ? `Mesa elegida: Mesa ${sol.mesa.numeroMesa}`
                          : 'Se asignará la primera mesa disponible'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {type !== 'aceptar' && (
                <Text style={am.confirmTxt}>
                  {type === 'cancelar'
                    ? '¿Seguro que deseas cancelar esta solicitud?'
                    : '¿Rechazas esta solicitud de reunión?'}
                </Text>
              )}

              <View style={am.btnRow}>
                <TouchableOpacity style={am.btnSec} onPress={onClose}>
                  <Text style={am.btnSecTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[am.btnMain, type === 'aceptar' ? am.btnGreen : am.btnRed, acting && { opacity: 0.7 }]}
                  onPress={doAction} disabled={acting}>
                  {acting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={am.btnMainTxt}>
                        {type === 'cancelar' ? 'Cancelar solicitud' :
                         type === 'aceptar'  ? 'Confirmar reunión'  : 'Rechazar'}
                      </Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 12 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  errBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5' },
  errTxt:  { fontSize: 13, color: '#dc2626', flex: 1 },
  infoCard:{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, color: '#6b7280', width: 68, fontWeight: '600' },
  infoVal:   { fontSize: 13, color: '#0f172a', fontWeight: '700', flex: 1 },
  mesaBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  mesaTxt:   { fontSize: 12, color: '#1e40af', flex: 1 },
  confirmTxt:{ fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 24 },
  btnRow:    { flexDirection: 'row', gap: 10 },
  btnSec:    { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  btnSecTxt: { fontSize: 14, fontWeight: '700', color: '#374151' },
  btnMain:   { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  btnGreen:  { backgroundColor: GREEN },
  btnRed:    { backgroundColor: '#dc2626' },
  btnMainTxt:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  successBox:{ alignItems: 'center', paddingVertical: 24, gap: 12 },
  successTxt:{ fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
  btnPrimary:{ backgroundColor: GREEN, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8, width: '100%' },
  btnPrimaryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Main Screen ─────────────────────────────────────────────────────────────

const STATUS_BORDER: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  ACEPTADA:  GREEN,
  RECHAZADA: '#ef4444',
  CANCELADA: '#cbd5e1',
};

export default function EmpresaSolicitudesScreen() {
  const navigation = useNavigation<any>();
  const [enviadas,   setEnviadas]   = useState<any[]>([]);
  const [recibidas,  setRecibidas]  = useState<any[]>([]);
  const [tab,        setTab]        = useState<'empresas' | 'enviadas' | 'recibidas'>('empresas');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const [detalleModal, setDetalleModal] = useState<any | null>(null);
  const [actionModal,  setActionModal]  = useState<{ sol: any; type: 'cancelar' | 'aceptar' | 'rechazar' } | null>(null);

  const user = userStore.get();

  const fetchData = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/solicitudes?eeId=${eeId}`);
      if (!res.ok) throw new Error('Error cargando solicitudes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEnviadas(data.filter((s: any) => s.esMiSolicitud));
        setRecibidas(data.filter((s: any) => !s.esMiSolicitud));
      } else {
        setEnviadas(data.enviadas ?? []);
        setRecibidas(data.recibidas ?? []);
      }
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId]);

  useFocusEffect(useCallback(() => {
    fetchData();
    const iv = setInterval(fetchData, 15_000);
    return () => clearInterval(iv);
  }, [fetchData]));

  const currentList = tab === 'enviadas' ? enviadas : recibidas;

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'empresas' && s.tabActive]} onPress={() => setTab('empresas')}>
          <Building2 size={15} color={tab === 'empresas' ? GREEN : '#9ca3af'} />
          <Text style={[s.tabText, tab === 'empresas' && s.tabTextActive]}>Empresas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'recibidas' && s.tabActive]} onPress={() => { setTab('recibidas'); fetchData(); }}>
          <Inbox size={15} color={tab === 'recibidas' ? GREEN : '#9ca3af'} />
          <Text style={[s.tabText, tab === 'recibidas' && s.tabTextActive]}>
            Recibidas{recibidas.length > 0 ? ` (${recibidas.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'enviadas' && s.tabActive]} onPress={() => { setTab('enviadas'); fetchData(); }}>
          <Send size={15} color={tab === 'enviadas' ? GREEN : '#9ca3af'} />
          <Text style={[s.tabText, tab === 'enviadas' && s.tabTextActive]}>
            Enviadas{enviadas.length > 0 ? ` (${enviadas.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab !== 'empresas' && !!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {tab === 'empresas' ? (
        <View style={s.companySection}>
          <EmpresaEmpresasScreen embedded />
        </View>
      ) : <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              {tab === 'recibidas' ? <Inbox size={32} color="#d1d5db" /> : <Send size={32} color="#d1d5db" />}
            </View>
            <Text style={s.emptyTitle}>Sin solicitudes</Text>
            <Text style={s.emptyText}>
              No tienes solicitudes {tab === 'recibidas' ? 'recibidas' : 'enviadas'} aún.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const empresa = tab === 'enviadas' ? item.receptora : item.solicitante;
          const initial = (empresa?.nombre ?? 'E')[0].toUpperCase();
          const borderColor = STATUS_BORDER[item.estado] ?? '#cbd5e1';

          return (
            <TouchableOpacity
              style={[s.card, { borderLeftColor: borderColor }]}
              onPress={() => setDetalleModal(item)}
              activeOpacity={0.85}
            >
              {/* Conflict */}
              {item.tieneConflicto && (
                <View style={s.conflictBanner}>
                  <AlertTriangle size={12} color="#92400e" />
                  <Text style={s.conflictText}>Conflicto de horario — revisa antes de aceptar</Text>
                </View>
              )}

              <View style={s.cardBody}>
                {/* Avatar */}
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{initial}</Text>
                </View>

                {/* Info */}
                <View style={s.cardInfo}>
                  <View style={s.cardBadges}>
                    <StatusBadge estado={item.estado} />
                    <View style={[s.tipoBadge, item.tipo === 'PRESENCIAL' ? s.tipoPres : s.tipoVirt]}>
                      {item.tipo === 'PRESENCIAL'
                        ? <Users size={9} color="#1d4ed8" />
                        : <Monitor size={9} color="#7c3aed" />}
                      <Text style={[s.tipoBadgeTxt, { color: item.tipo === 'PRESENCIAL' ? '#1d4ed8' : '#7c3aed' }]}>
                        {item.tipo === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.cardNombre} numberOfLines={1}>
                    {empresa?.nombre ?? '—'}{empresa?.codigo ? ` · ${empresa.codigo}` : ''}
                  </Text>

                  <View style={s.cardDate}>
                    <Calendar size={11} color="#9ca3af" />
                    <Text style={s.cardDateTxt}>{fmtDate(item.inicio)} · {fmtTime(item.inicio)}</Text>
                  </View>

                  {item.mensaje && (
                    <Text style={s.cardMensaje} numberOfLines={1}>"{item.mensaje}"</Text>
                  )}
                  {item.motivo && (
                    <Text style={s.cardMotivo} numberOfLines={1}>Motivo: {item.motivo}</Text>
                  )}
                </View>

                {/* Quick actions */}
                <View style={s.quickActions}>
                  {tab === 'recibidas' && item.estado === 'PENDIENTE' && (
                    <>
                      <Pressable
                        style={s.quickBtnGreen}
                        onPress={(e) => { setActionModal({ sol: item, type: 'aceptar' }); }}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Check size={14} color="#fff" />
                      </Pressable>
                      <Pressable
                        style={s.quickBtnRed}
                        onPress={() => setActionModal({ sol: item, type: 'rechazar' })}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <X size={14} color="#dc2626" />
                      </Pressable>
                    </>
                  )}
                  {tab === 'enviadas' && item.estado === 'PENDIENTE' && (
                    <>
                      <Pressable
                        style={s.quickBtnEdit}
                        onPress={() => navigation.navigate('Empresas', { editarSolicitud: item })}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Edit2 size={14} color={GREEN} />
                      </Pressable>
                      <Pressable
                        style={s.quickBtnGray}
                        onPress={() => setActionModal({ sol: item, type: 'cancelar' })}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Ban size={14} color="#6b7280" />
                      </Pressable>
                    </>
                  )}
                  <ChevronRight size={16} color="#d1d5db" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />}

      {/* Detail modal */}
      {detalleModal && (
        <DetalleModal
          sol={detalleModal}
          tab={tab === 'recibidas' ? 'recibidas' : 'enviadas'}
          onClose={() => setDetalleModal(null)}
          onAceptar={() => { setDetalleModal(null); setActionModal({ sol: detalleModal, type: 'aceptar' }); }}
          onRechazar={() => { setDetalleModal(null); setActionModal({ sol: detalleModal, type: 'rechazar' }); }}
          onCancelar={() => { setDetalleModal(null); setActionModal({ sol: detalleModal, type: 'cancelar' }); }}
        />
      )}

      {/* Action confirm modal */}
      {actionModal && (
        <ActionModal
          sol={actionModal.sol}
          type={actionModal.type}
          onClose={() => setActionModal(null)}
          onDone={() => { fetchData(); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  companySection: { flex: 1 },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: GREEN },
  tabText:       { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  tabTextActive: { color: GREEN },

  errorBox:  { margin: 16, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1 },

  list:  { padding: 16, paddingBottom: 40, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 4 },
  emptyText:  { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  conflictBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  conflictText: { fontSize: 11, color: '#92400e', fontWeight: '600', flex: 1 },

  cardBody:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt:  { fontSize: 18, fontWeight: '800', color: GREEN },
  cardInfo:   { flex: 1, gap: 3 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 2 },
  cardNombre: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardDate:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDateTxt:{ fontSize: 11, color: '#6b7280' },
  cardMensaje:{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  cardMotivo: { fontSize: 11, color: '#ef4444' },

  tipoBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  tipoPres:     { backgroundColor: '#eff6ff' },
  tipoVirt:     { backgroundColor: '#f5f3ff' },
  tipoBadgeTxt: { fontSize: 9, fontWeight: '700' },

  quickActions: { flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  quickBtnGreen: { width: 30, height: 30, borderRadius: 9, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  quickBtnRed:   { width: 30, height: 30, borderRadius: 9, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  quickBtnGray:  { width: 30, height: 30, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  quickBtnEdit:  { width: 30, height: 30, borderRadius: 9, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
});
