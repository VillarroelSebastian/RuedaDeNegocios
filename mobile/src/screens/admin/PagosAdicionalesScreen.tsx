import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Linking, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  CreditCard, Building2, Users, FileText, Check, X,
  AlertCircle, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

const TABS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'COMPLETADO', label: 'Aprobados' },
  { value: 'OBSERVADO', label: 'Observados' },
  { value: 'RECHAZADO', label: 'Rechazados' },
];

function badgeEstado(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETADO: { bg: '#dcfce7', text: '#166534', label: 'Aprobado'  },
    PENDIENTE:  { bg: '#ffedd5', text: '#9a3412', label: 'Pendiente' },
    OBSERVADO:  { bg: '#fef9c3', text: '#854d0e', label: 'Observado' },
    RECHAZADO:  { bg: '#fee2e2', text: '#991b1b', label: 'Rechazado' },
  };
  const b = map[estado] ?? { bg: '#f3f4f6', text: '#6b7280', label: estado };
  return (
    <View style={{ backgroundColor: b.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: b.text, fontSize: 10, fontWeight: '700' }}>{b.label}</Text>
    </View>
  );
}

export default function PagosAdicionalesScreen() {
  const { show, modal } = useModal();
  const [tab, setTab]           = useState('');
  const [pagos, setPagos]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail modal
  const [selected,  setSelected]  = useState<any>(null);
  const [obs, setObs]             = useState('');
  const [acting, setActing]       = useState(false);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());

  const fetchPagos = useCallback(async () => {
    try {
      const url = tab
        ? `${API_URL}/admin/pagos-adicionales?estado=${tab}`
        : `${API_URL}/admin/pagos-adicionales`;
      const res = await fetch(url);
      const data = await res.json();
      setPagos(Array.isArray(data) ? data : []);
    } catch { setPagos([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchPagos(); }, [fetchPagos]));

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetail = (p: any) => { setSelected(p); setObs(''); };
  const closeDetail = () => { setSelected(null); setObs(''); };

  const handleAprobar = () => {
    if (!selected) return;
    show({
      type: 'confirm',
      title: 'Aprobar pago adicional',
      message: `¿Aprobar ${selected.cantidadParticipantes} cupo(s) adicional(es) para ${selected.empresa?.nombre ?? 'la empresa'}? Esto aumentará sus slots pagados.`,
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setActing(true);
        try {
          const res = await fetch(`${API_URL}/admin/pagos-adicionales/${selected.id}/aprobar`, { method: 'PUT' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'Error al aprobar');
          show({ type: 'success', title: '¡Aprobado!', message: `Slots aumentados a ${data.nuevoTotalSlots ?? '?'}.` });
          closeDetail();
          fetchPagos();
        } catch (e: any) {
          show({ type: 'error', title: 'Error', message: e.message || 'No se pudo aprobar el pago.' });
        } finally { setActing(false); }
      },
    });
  };

  const handleObservar = async () => {
    if (!selected) return;
    if (!obs.trim()) {
      show({ type: 'warning', title: 'Requerido', message: 'Escribe una observación antes de continuar.' });
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`${API_URL}/admin/pagos-adicionales/${selected.id}/observar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacion: obs.trim() }),
      });
      if (!res.ok) throw new Error('Error al observar');
      show({ type: 'success', title: '¡Enviado!', message: 'Se envió la observación a la empresa.' });
      setObs('');
      closeDetail();
      fetchPagos();
    } catch {
      show({ type: 'error', title: 'Error', message: 'No se pudo enviar la observación.' });
    } finally { setActing(false); }
  };

  const handleRechazar = () => {
    if (!selected) return;
    if (!obs.trim()) {
      show({ type: 'warning', title: 'Motivo requerido', message: 'Escribe el motivo del rechazo en el campo de observación.' });
      return;
    }
    show({
      type: 'confirm',
      title: 'Rechazar pago adicional',
      message: 'El pago adicional será rechazado. Los slots pagados no cambiarán.',
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setActing(true);
        try {
          const res = await fetch(`${API_URL}/admin/pagos-adicionales/${selected.id}/rechazar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo: obs.trim() }),
          });
          if (!res.ok) throw new Error('Error al rechazar');
          show({ type: 'success', title: 'Rechazado', message: 'El pago adicional fue rechazado.' });
          setObs('');
          closeDetail();
          fetchPagos();
        } catch {
          show({ type: 'error', title: 'Error', message: 'No se pudo rechazar el pago.' });
        } finally { setActing(false); }
      },
    });
  };

  const openComprobante = (url?: string) => {
    if (!url) {
      show({ type: 'info', title: 'Sin comprobante', message: 'Comprobante no disponible.' });
      return;
    }
    Linking.openURL(url).catch(() => {
      show({ type: 'error', title: 'Error', message: 'No se pudo abrir el comprobante.' });
    });
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {modal}

      {/* Header */}
      <View style={s.header}>
        <CreditCard color={GREEN} size={20} style={{ marginRight: 8 }} />
        <View>
          <Text style={s.headerTitle}>Pagos Adicionales</Text>
          <Text style={s.headerSub}>Cupos extra solicitados por empresas</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.value}
            onPress={() => setTab(t.value)}
            style={[s.tab, tab === t.value && s.tabActive]}
          >
            <Text style={[s.tabText, tab === t.value && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPagos(); }} tintColor={GREEN} />}
        >
          {pagos.length === 0 ? (
            <View style={s.empty}>
              <CreditCard color="#d1d5db" size={40} />
              <Text style={s.emptyText}>No hay pagos adicionales en esta categoría</Text>
            </View>
          ) : (
            pagos.map((p) => {
              const isOpen = expanded.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={s.card}
                  onPress={() => toggleExpand(p.id)}
                  activeOpacity={0.85}
                >
                  {/* Row principal */}
                  <View style={s.cardRow}>
                    <View style={s.cardIconBox}>
                      <Building2 color={GREEN} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>{p.empresa?.nombre ?? '—'}</Text>
                      <Text style={s.cardSub}>{p.empresa?.rubro ?? '—'}</Text>
                    </View>
                    {badgeEstado(p.estadoPago)}
                    {isOpen ? <ChevronUp color="#9ca3af" size={16} style={{ marginLeft: 6 }} /> : <ChevronDown color="#9ca3af" size={16} style={{ marginLeft: 6 }} />}
                  </View>

                  {/* Detalle colapsable */}
                  {isOpen && (
                    <View style={s.cardDetails}>
                      <View style={s.detailRow}>
                        <Users color="#94a3b8" size={13} style={{ marginRight: 6 }} />
                        <Text style={s.detailLabel}>Cupos solicitados:</Text>
                        <Text style={s.detailValue}>{p.cantidadParticipantes}</Text>
                      </View>
                      {p.montoPago != null && (
                        <View style={s.detailRow}>
                          <CreditCard color="#94a3b8" size={13} style={{ marginRight: 6 }} />
                          <Text style={s.detailLabel}>Monto:</Text>
                          <Text style={s.detailValue}>{Number(p.montoPago).toLocaleString()} BOB</Text>
                        </View>
                      )}
                      {p.fechaCreacion && (
                        <View style={s.detailRow}>
                          <AlertCircle color="#94a3b8" size={13} style={{ marginRight: 6 }} />
                          <Text style={s.detailLabel}>Fecha:</Text>
                          <Text style={s.detailValue}>{new Date(p.fechaCreacion).toLocaleDateString('es-BO')}</Text>
                        </View>
                      )}
                      {p.observacion && (
                        <View style={s.observBox}>
                          <Text style={s.observLabel}>Observación:</Text>
                          <Text style={s.observText}>{p.observacion}</Text>
                        </View>
                      )}

                      {/* Comprobante */}
                      <TouchableOpacity
                        style={s.comprobanteBtn}
                        onPress={() => openComprobante(p.urlComprobante)}
                        activeOpacity={0.8}
                      >
                        <FileText color={p.urlComprobante ? GREEN : '#9ca3af'} size={14} style={{ marginRight: 6 }} />
                        <Text style={[s.comprobanteBtnText, { color: p.urlComprobante ? GREEN : '#9ca3af' }]}>
                          {p.urlComprobante ? 'Ver comprobante' : 'Comprobante no disponible'}
                        </Text>
                        {p.urlComprobante && <ExternalLink color={GREEN} size={12} style={{ marginLeft: 4 }} />}
                      </TouchableOpacity>

                      {/* Botón gestionar */}
                      {p.estadoPago === 'PENDIENTE' && (
                        <TouchableOpacity
                          style={s.gestionarBtn}
                          onPress={() => openDetail(p)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.gestionarBtnText}>Gestionar pago</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Modal de gestión */}
      <Modal visible={!!selected} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Gestionar pago adicional</Text>
              <TouchableOpacity onPress={closeDetail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Info resumen */}
                <View style={s.modalInfoBox}>
                  <Text style={s.modalInfoTitle}>{selected.empresa?.nombre ?? '—'}</Text>
                  <View style={s.modalInfoRow}>
                    <Text style={s.modalInfoLabel}>Cupos solicitados:</Text>
                    <Text style={s.modalInfoValue}>{selected.cantidadParticipantes}</Text>
                  </View>
                  {selected.montoPago != null && (
                    <View style={s.modalInfoRow}>
                      <Text style={s.modalInfoLabel}>Monto:</Text>
                      <Text style={s.modalInfoValue}>{Number(selected.montoPago).toLocaleString()} BOB</Text>
                    </View>
                  )}
                  <View style={[s.modalInfoRow, { marginTop: 6 }]}>
                    <Text style={s.modalInfoLabel}>Estado:</Text>
                    {badgeEstado(selected.estadoPago)}
                  </View>
                </View>

                {/* Comprobante */}
                <TouchableOpacity
                  style={s.comprobanteBtn}
                  onPress={() => openComprobante(selected.urlComprobante)}
                  activeOpacity={0.8}
                >
                  <FileText color={selected.urlComprobante ? GREEN : '#9ca3af'} size={14} style={{ marginRight: 6 }} />
                  <Text style={[s.comprobanteBtnText, { color: selected.urlComprobante ? GREEN : '#9ca3af' }]}>
                    {selected.urlComprobante ? 'Ver comprobante' : 'Comprobante no disponible'}
                  </Text>
                  {selected.urlComprobante && <ExternalLink color={GREEN} size={12} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>

                {/* Observación */}
                <Text style={s.obsLabel}>Observación / motivo (opcional para aprobar, requerido para observar o rechazar)</Text>
                <TextInput
                  value={obs}
                  onChangeText={setObs}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="Escribe el motivo o comentario..."
                  placeholderTextColor="#9ca3af"
                  style={s.obsInput}
                />

                {/* Acciones */}
                <View style={s.actionsCol}>
                  <TouchableOpacity
                    style={[s.btnAprobar, acting && { opacity: 0.6 }]}
                    onPress={handleAprobar}
                    disabled={acting}
                  >
                    {acting ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Check size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={s.btnAprobarText}>Aprobar — +{selected.cantidadParticipantes} cupos</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btnObservar, acting && { opacity: 0.6 }]}
                    onPress={handleObservar}
                    disabled={acting}
                  >
                    <AlertCircle size={16} color="#6b7280" style={{ marginRight: 6 }} />
                    <Text style={s.btnObservarText}>Solicitar nueva evidencia</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btnRechazar, acting && { opacity: 0.6 }]}
                    onPress={handleRechazar}
                    disabled={acting}
                  >
                    <X size={16} color="#dc2626" style={{ marginRight: 6 }} />
                    <Text style={s.btnRechazarText}>Rechazar pago adicional</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 24 }} />
              </ScrollView>
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  tabsScroll:      { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabsRow:         { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6' },
  tabActive:       { backgroundColor: GREEN },
  tabText:         { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  tabTextActive:   { color: '#fff' },
  list: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#9ca3af', fontSize: 14, marginTop: 12, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  cardRow:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardIconBox: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  cardDetails: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f8fafc', gap: 6 },

  detailRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailLabel:{ fontSize: 12, color: '#64748b', marginRight: 4 },
  detailValue:{ fontSize: 12, fontWeight: '700', color: '#374151' },

  observBox:  { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#fde68a' },
  observLabel:{ fontSize: 10, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  observText: { fontSize: 12, color: '#78350f' },

  comprobanteBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, backgroundColor: '#f8fafc',
  },
  comprobanteBtnText: { fontSize: 12, fontWeight: '600' },

  gestionarBtn: {
    backgroundColor: GREEN, borderRadius: 10, padding: 10, marginTop: 8,
    alignItems: 'center',
  },
  gestionarBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%', paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalInfoBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalInfoTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  modalInfoRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalInfoLabel: { fontSize: 12, color: '#64748b' },
  modalInfoValue: { fontSize: 13, fontWeight: '700', color: '#374151' },

  obsLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 8 },
  obsInput: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 13, color: '#0f172a', minHeight: 80, marginBottom: 16,
  },
  actionsCol: { gap: 10 },
  btnAprobar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14,
  },
  btnAprobarText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnObservar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  btnObservarText: { color: '#374151', fontWeight: '700', fontSize: 14 },
  btnRechazar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  btnRechazarText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
});
