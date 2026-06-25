import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Send, Inbox, X, Check, Ban, AlertTriangle, AlertCircle } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDIENTE:  { bg: '#fef3c7', text: '#92400e', label: 'Pendiente'  },
  ACEPTADA:   { bg: '#dcfce7', text: '#166534', label: 'Aceptada'   },
  RECHAZADA:  { bg: '#fee2e2', text: '#dc2626', label: 'Rechazada'  },
  CANCELADA:  { bg: '#f1f5f9', text: '#475569', label: 'Cancelada'  },
};

export default function EmpresaSolicitudesScreen() {
  const [enviadas,   setEnviadas]   = useState<any[]>([]);
  const [recibidas,  setRecibidas]  = useState<any[]>([]);
  const [tab,        setTab]        = useState<'enviadas'|'recibidas'>('recibidas');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // Action modal
  const [actionModal, setActionModal] = useState(false);
  const [actionSol,   setActionSol]   = useState<any>(null);
  const [actionType,  setActionType]  = useState<'cancelar'|'aceptar'|'rechazar'>('cancelar');
  const [acting,      setActing]      = useState(false);
  const [actError,    setActError]    = useState('');
  const [actOk,       setActOk]       = useState(false);

  const user = userStore.get();

  const fetchData = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/solicitudes?eeId=${eeId}`);
      if (!res.ok) throw new Error('Error cargando solicitudes');
      const data = await res.json();

      // Backend returns flat array with esMiSolicitud flag
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

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openAction = (sol: any, type: 'cancelar'|'aceptar'|'rechazar') => {
    setActionSol(sol);
    setActionType(type);
    setActError(''); setActOk(false);
    setActionModal(true);
  };

  const doAction = async () => {
    if (!actionSol) return;
    setActError(''); setActing(true);
    try {
      const endpointMap = {
        cancelar: `${API_URL}/empresa/solicitudes/${actionSol.id}/cancelar`,
        aceptar:  `${API_URL}/empresa/solicitudes/${actionSol.id}/aceptar`,
        rechazar: `${API_URL}/empresa/solicitudes/${actionSol.id}/rechazar`,
      };
      const bodyMap: Record<string, any> = {
        cancelar: { eeId: user?.empresaeventoId },
        aceptar:  { eeId: user?.empresaeventoId },
        rechazar: { eeId: user?.empresaeventoId },
      };
      const res = await fetch(endpointMap[actionType], {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyMap[actionType]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Error al ${actionType}`);
      setActOk(true);
      fetchData();
    } catch (e: any) {
      setActError(e.message || 'Error de red');
    } finally {
      setActing(false);
    }
  };

  const currentList = tab === 'enviadas' ? enviadas : recibidas;

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'recibidas' && s.tabActive]}
          onPress={() => setTab('recibidas')}
        >
          <Inbox size={15} color={tab === 'recibidas' ? GREEN : '#9ca3af'} style={{ marginRight: 5 }} />
          <Text style={[s.tabText, tab === 'recibidas' && s.tabTextActive]}>
            Recibidas {recibidas.length > 0 ? `(${recibidas.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'enviadas' && s.tabActive]}
          onPress={() => setTab('enviadas')}
        >
          <Send size={15} color={tab === 'enviadas' ? GREEN : '#9ca3af'} style={{ marginRight: 5 }} />
          <Text style={[s.tabText, tab === 'enviadas' && s.tabTextActive]}>
            Enviadas {enviadas.length > 0 ? `(${enviadas.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
        ListEmptyComponent={
          <View style={s.empty}>
            {tab === 'recibidas'
              ? <Inbox size={48} color="#d1d5db" />
              : <Send  size={48} color="#d1d5db" />}
            <Text style={s.emptyText}>
              No tienes solicitudes {tab === 'recibidas' ? 'recibidas' : 'enviadas'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.estado] ?? { bg: '#f1f5f9', text: '#475569', label: item.estado };
          const contraparte = tab === 'enviadas'
            ? (item.receptora?.nombre ?? '—')
            : (item.solicitante?.nombre ?? '—');

          return (
            <View style={s.card}>
              {/* Conflict warning */}
              {item.tieneConflicto && (
                <View style={s.conflictBanner}>
                  <AlertTriangle size={13} color="#92400e" style={{ marginRight: 5 }} />
                  <Text style={s.conflictText}>Conflicto de horario con otra solicitud pendiente</Text>
                </View>
              )}

              <View style={s.cardTop}>
                <Text style={s.cardCounterpart} numberOfLines={1}>{contraparte}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              <Text style={s.cardTime}>
                {fmtDate(item.inicio)} · {fmtTime(item.inicio)} – {fmtTime(item.fin)}
              </Text>
              {item.tipo && <Text style={s.cardMeta}>{item.tipo}</Text>}
              {item.mensaje && <Text style={s.cardMensaje} numberOfLines={2}>{item.mensaje}</Text>}

              {/* Actions */}
              {item.estado === 'PENDIENTE' && tab === 'enviadas' && (
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => openAction(item, 'cancelar')}
                  activeOpacity={0.8}
                >
                  <Ban size={14} color="#dc2626" style={{ marginRight: 5 }} />
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}
              {item.estado === 'PENDIENTE' && tab === 'recibidas' && (
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={s.rejectBtn}
                    onPress={() => openAction(item, 'rechazar')}
                    activeOpacity={0.8}
                  >
                    <X size={14} color="#dc2626" style={{ marginRight: 4 }} />
                    <Text style={s.rejectBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.acceptBtn}
                    onPress={() => openAction(item, 'aceptar')}
                    activeOpacity={0.8}
                  >
                    <Check size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={s.acceptBtnText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Confirm action modal */}
      <Modal visible={actionModal} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.actionCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {actionType === 'cancelar' ? 'Cancelar solicitud' :
                 actionType === 'aceptar'  ? 'Aceptar solicitud'  : 'Rechazar solicitud'}
              </Text>
              <TouchableOpacity onPress={() => setActionModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {actOk ? (
              <View style={s.successBox}>
                <Check size={40} color={GREEN} />
                <Text style={s.successText}>
                  {actionType === 'cancelar' ? 'Solicitud cancelada' :
                   actionType === 'aceptar'  ? 'Solicitud aceptada y reunión creada' : 'Solicitud rechazada'}
                </Text>
                <TouchableOpacity style={s.btnPrimary} onPress={() => setActionModal(false)}>
                  <Text style={s.btnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!!actError && (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>{actError}</Text>
                  </View>
                )}
                <Text style={s.confirmText}>
                  {actionType === 'cancelar'
                    ? '¿Seguro que deseas cancelar esta solicitud? Esta acción no se puede deshacer.'
                    : actionType === 'aceptar'
                    ? '¿Aceptas esta solicitud de reunión? Se creará una reunión programada.'
                    : '¿Rechazas esta solicitud de reunión?'}
                </Text>
                <View style={s.confirmBtns}>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setActionModal(false)}>
                    <Text style={s.btnSecText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.btnAction,
                      actionType === 'aceptar' ? s.btnActionGreen : s.btnActionRed,
                      acting && { opacity: 0.7 },
                    ]}
                    onPress={doAction}
                    disabled={acting}
                  >
                    {acting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.btnText}>
                          {actionType === 'cancelar' ? 'Cancelar' :
                           actionType === 'aceptar'  ? 'Aceptar'  : 'Rechazar'}
                        </Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:    { borderBottomColor: GREEN },
  tabText:      { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  tabTextActive:{ color: GREEN },
  errorBox: {
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13 },
  list:  { padding: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 14, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  conflictBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderRadius: 8, padding: 8, marginBottom: 10,
    borderWidth: 1, borderColor: '#fde68a',
  },
  conflictText: { fontSize: 11, color: '#92400e', fontWeight: '600', flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  cardCounterpart: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardTime:    { fontSize: 12, color: '#64748b', marginBottom: 4 },
  cardMeta:    { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: '600' },
  cardMensaje: { fontSize: 12, color: '#374151', lineHeight: 18, marginTop: 4 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 10, backgroundColor: '#fef2f2', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  cancelBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  rejectBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 10, padding: 10,
  },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  confirmText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 24 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  btnSecText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  btnAction: {
    flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
  },
  btnActionGreen: { backgroundColor: GREEN },
  btnActionRed:   { backgroundColor: '#dc2626' },
  btnPrimary: {
    backgroundColor: GREEN, borderRadius: 14, height: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 16, width: '100%',
  },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  successBox:  { alignItems: 'center', paddingVertical: 20, gap: 12 },
  successText: { fontSize: 14, color: '#374151', fontWeight: '600', textAlign: 'center' },
});
