import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  User, Building2, LogOut, Edit3, UserPlus, UserX,
  ShieldCheck, Users, CreditCard, AlertCircle, Check, X,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

export default function EmpresaPerfilScreen({ navigation }: any) {
  const [perfil,      setPerfil]      = useState<any>(null);
  const [empresa,     setEmpresa]     = useState<any>(null);
  const [participantes, setParticipantes] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState('');

  // Edit perfil modal
  const [editModal,   setEditModal]   = useState(false);
  const [editNombre,  setEditNombre]  = useState('');
  const [editTel,     setEditTel]     = useState('');
  const [editCargo,   setEditCargo]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveOk,      setSaveOk]      = useState(false);

  // Add participant modal
  const [addModal,    setAddModal]    = useState(false);
  const [addNombre,   setAddNombre]   = useState('');
  const [addApellido, setAddApellido] = useState('');
  const [addCorreo,   setAddCorreo]   = useState('');
  const [addTel,      setAddTel]      = useState('');
  const [addCargo,    setAddCargo]    = useState('');
  const [adding,      setAdding]      = useState(false);
  const [addError,    setAddError]    = useState('');
  const [addOk,       setAddOk]       = useState(false);

  // Additional payment modal
  const [pagoModal,   setPagoModal]   = useState(false);
  const [pagoCant,    setPagoCant]    = useState('1');
  const [pagoUrl,     setPagoUrl]     = useState('');
  const [pagoMonto,   setPagoMonto]   = useState('');
  const [pagandoAd,   setPagandoAd]   = useState(false);
  const [pagoError,   setPagoError]   = useState('');
  const [pagoOk,      setPagoOk]      = useState(false);

  const user = userStore.get();

  const fetchAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setError('');
    try {
      const [perfRes, ctxRes] = await Promise.all([
        fetch(`${API_URL}/empresa/perfil?usuarioId=${user.id}`),
        fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${user.id}`),
      ]);
      const perfData = perfRes.ok ? await perfRes.json() : null;
      const ctxData  = ctxRes.ok  ? await ctxRes.json()  : null;
      setPerfil(perfData);
      setEmpresa(ctxData);

      if (ctxData?.empresaeventoId) {
        const partRes = await fetch(`${API_URL}/empresa/participantes?eeId=${ctxData.empresaeventoId}`);
        if (partRes.ok) setParticipantes(await partRes.json());
      }
    } catch (e: any) {
      setError(e.message || 'Error cargando perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const openEdit = () => {
    setEditNombre(perfil?.usuario?.nombres ?? user?.nombres ?? '');
    setEditTel(perfil?.usuario?.telefono ?? '');
    setEditCargo(perfil?.cargo ?? '');
    setSaveError(''); setSaveOk(false);
    setEditModal(true);
  };

  const handleSavePerfil = async () => {
    setSaveError(''); setSaving(true);
    try {
      const res = await fetch(`${API_URL}/empresa/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          euId:    perfil?.empresaUsuarioId,
          nombres: editNombre.trim(),
          telefono: editTel.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al guardar');
      setSaveOk(true);
      fetchAll();
    } catch (e: any) {
      setSaveError(e.message || 'Error de red');
    } finally {
      setSaving(false);
    }
  };

  const openAddParticipant = () => {
    setAddNombre(''); setAddApellido(''); setAddCorreo('');
    setAddTel(''); setAddCargo(''); setAddError(''); setAddOk(false);
    setAddModal(true);
  };

  const handleAddParticipant = async () => {
    if (!addNombre.trim() || !addApellido.trim() || !addCorreo.trim()) {
      setAddError('Nombre, apellido y correo son obligatorios.');
      return;
    }
    setAddError(''); setAdding(true);
    try {
      const eeId = empresa?.empresaeventoId;
      const res = await fetch(`${API_URL}/empresa/participantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eeId,
          euEncargadoId: perfil?.empresaUsuarioId,
          nombre:    addNombre.trim(),
          apellido:  addApellido.trim(),
          correo:    addCorreo.trim(),
          telefono:  addTel.trim(),
          cargo:     addCargo.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al agregar');
      setAddOk(true);
      fetchAll();
    } catch (e: any) {
      setAddError(e.message || 'Error de red');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = (eu: any) => {
    Alert.alert(
      'Desactivar participante',
      `¿Deseas desactivar a ${eu.usuario?.nombres ?? 'este participante'}? No podrá iniciar sesión.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/empresa/participantes/${eu.id ?? eu.euId}/desactivar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eeId: empresa?.empresaeventoId, euEncargadoId: perfil?.empresaUsuarioId }),
              });
              if (!res.ok) {
                const d = await res.json();
                Alert.alert('Error', d?.message || 'No se pudo desactivar');
              } else {
                fetchAll();
              }
            } catch {
              Alert.alert('Error', 'Error de red');
            }
          },
        },
      ]
    );
  };

  const openPagoAdicional = () => {
    setPagoCant('1'); setPagoUrl(''); setPagoMonto('');
    setPagoError(''); setPagoOk(false);
    setPagoModal(true);
  };

  const handlePagoAdicional = async () => {
    if (!pagoUrl.trim()) { setPagoError('Ingresa la URL del comprobante.'); return; }
    setPagoError(''); setPagandoAd(true);
    try {
      const eeId = empresa?.empresaeventoId;
      const res = await fetch(`${API_URL}/empresa/pagos-adicionales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eeId,
          euEncargadoId: perfil?.empresaUsuarioId,
          cantidadParticipantes: parseInt(pagoCant, 10) || 1,
          urlComprobante: pagoUrl.trim(),
          montoPago: pagoMonto ? parseFloat(pagoMonto) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al enviar');
      setPagoOk(true);
      fetchAll();
    } catch (e: any) {
      setPagoError(e.message || 'Error de red');
    } finally {
      setPagandoAd(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: () => { userStore.clear(); navigation.replace('Login'); },
      },
    ]);
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  const esEncargado = !!empresa?.esResponsable;
  const slots = participantes ?? {};
  const canAdd = esEncargado && (slots.slotsDisponibles ?? 0) > 0;
  const canRequestMore = esEncargado &&
    (slots.slotsPagados ?? 0) < (slots.maxPermitidos ?? 5) &&
    !slots.pagoAdicionalPendiente;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.nombres ?? 'U')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{perfil?.usuario?.nombres ?? user?.nombres ?? '—'}</Text>
            <Text style={s.profileEmail}>{perfil?.usuario?.correo ?? user?.correo}</Text>
            <View style={[s.badge, esEncargado ? s.badgeEnc : s.badgePart]}>
              <Text style={[s.badgeText, esEncargado ? s.badgeTextEnc : s.badgeTextPart]}>
                {esEncargado ? 'Encargado' : 'Participante'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={openEdit} style={s.editBtn} activeOpacity={0.7}>
            <Edit3 size={16} color={GREEN} />
          </TouchableOpacity>
        </View>

        {!!error && (
          <View style={s.errorBox}>
            <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Empresa info */}
        {empresa && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Building2 size={16} color={GREEN} style={{ marginRight: 6 }} />
              <Text style={s.sectionTitle}>Empresa</Text>
            </View>
            <InfoRow label="Nombre"  value={empresa?.empresa?.nombre ?? '—'} />
            <InfoRow label="Rubro"   value={empresa?.empresa?.rubro ?? '—'} />
            <InfoRow label="Estado"  value={empresa?.estadoAcceso ?? empresa?.estadoPago ?? '—'} />
          </View>
        )}

        {/* Datos personales */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <User size={16} color={GREEN} style={{ marginRight: 6 }} />
            <Text style={s.sectionTitle}>Datos personales</Text>
          </View>
          <InfoRow label="Nombre"   value={perfil?.usuario?.nombres ?? user?.nombres ?? '—'} />
          <InfoRow label="Correo"   value={perfil?.usuario?.correo ?? user?.correo ?? '—'} />
          <InfoRow label="Teléfono" value={perfil?.usuario?.telefono ?? '—'} />
          <InfoRow label="Cargo"    value={perfil?.cargo ?? '—'} />
        </View>

        {/* ENCARGADO: Gestión de participantes */}
        {esEncargado && participantes && (
          <>
            {/* Slot summary */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <ShieldCheck size={16} color={GREEN} style={{ marginRight: 6 }} />
                <Text style={s.sectionTitle}>Cupos de participantes</Text>
              </View>
              <View style={s.slotGrid}>
                <SlotCard label="Máx. permitidos" value={slots.maxPermitidos ?? '—'} color="#dbeafe" textColor="#1e40af" />
                <SlotCard label="Cupos pagados"   value={slots.slotsPagados  ?? '—'} color="#dcfce7" textColor="#166534" />
                <SlotCard label="Cupos usados"    value={slots.slotsUsados   ?? '—'} color="#fef3c7" textColor="#92400e" />
                <SlotCard label="Disponibles"     value={slots.slotsDisponibles ?? '—'} color="#f3e8ff" textColor="#6b21a8" />
              </View>

              {slots.pagoAdicionalPendiente && (
                <View style={s.infoBanner}>
                  <CreditCard size={14} color="#1e40af" style={{ marginRight: 6 }} />
                  <Text style={s.infoBannerText}>Pago adicional pendiente de aprobación</Text>
                </View>
              )}

              <View style={s.slotActions}>
                {canAdd && (
                  <TouchableOpacity style={s.addBtn} onPress={openAddParticipant} activeOpacity={0.8}>
                    <UserPlus size={15} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.addBtnText}>Agregar participante</Text>
                  </TouchableOpacity>
                )}
                {canRequestMore && (
                  <TouchableOpacity style={s.pagoBtn} onPress={openPagoAdicional} activeOpacity={0.8}>
                    <CreditCard size={15} color={GREEN} style={{ marginRight: 6 }} />
                    <Text style={s.pagoBtnText}>Solicitar más cupos</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Participants list */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Users size={16} color={GREEN} style={{ marginRight: 6 }} />
                <Text style={s.sectionTitle}>Participantes ({(slots.participantes ?? []).length})</Text>
              </View>
              {(slots.participantes ?? []).length === 0 && (
                <Text style={s.emptyText}>No hay participantes registrados</Text>
              )}
              {(slots.participantes ?? []).map((p: any, i: number) => {
                const isMe = p.usuario?.id === user?.id;
                const isEnc = !!p.esResponsable;
                return (
                  <View key={p.id ?? i} style={s.participantRow}>
                    <View style={s.participantAvatar}>
                      <Text style={s.participantAvatarText}>
                        {(p.usuario?.nombres ?? 'P')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.participantName}>
                        {p.usuario?.nombres ?? '—'} {p.usuario?.apellidoPaterno ?? ''}
                      </Text>
                      <Text style={s.participantEmail}>{p.usuario?.correo ?? '—'}</Text>
                      {p.cargo && <Text style={s.participantCargo}>{p.cargo}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={[s.roleBadge, isEnc ? s.roleBadgeEnc : s.roleBadgePart]}>
                        <Text style={[s.roleText, isEnc ? s.roleTextEnc : s.roleTextPart]}>
                          {isEnc ? 'Encargado' : 'Participante'}
                        </Text>
                      </View>
                      {!isMe && !isEnc && (
                        <TouchableOpacity style={s.deactivateBtn} onPress={() => handleDeactivate(p)} activeOpacity={0.8}>
                          <Text style={s.deactivateBtnText}>Desactivar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Payment history */}
            {(slots.pagos ?? []).length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <CreditCard size={16} color={GREEN} style={{ marginRight: 6 }} />
                  <Text style={s.sectionTitle}>Historial de pagos</Text>
                </View>
                {(slots.pagos ?? []).map((p: any) => (
                  <View key={String(p.id ?? p.fechaCreacion ?? Math.random())} style={s.pagoRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={[s.pagoTipoBadge, p.tipoPago === 'ADICIONAL' ? s.pagoTipoAdd : s.pagoTipoIni]}>
                          <Text style={[s.pagoTipoText, p.tipoPago === 'ADICIONAL' ? s.pagoTipoTextAdd : s.pagoTipoTextIni]}>
                            {p.tipoPago === 'ADICIONAL' ? 'Adicional' : 'Inicial'}
                          </Text>
                        </View>
                        <View style={[s.pagoEstado, pagoEstadoStyle(p.estadoPago)]}>
                          <Text style={[s.pagoEstadoText, pagoEstadoTextStyle(p.estadoPago)]}>
                            {p.estadoPago ?? '—'}
                          </Text>
                        </View>
                      </View>
                      {!!p.fechaCreacion && (
                        <Text style={s.pagoFecha}>{new Date(p.fechaCreacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                      )}
                      {!!p.cantidadParticipantes && p.cantidadParticipantes > 0 && (
                        <Text style={s.pagoInfo}>+{p.cantidadParticipantes} cupos adicionales</Text>
                      )}
                      {!!p.montoPago && <Text style={s.pagoMonto}>Monto: Bs. {p.montoPago}</Text>}
                      {!p.urlComprobante && <Text style={s.pagoSinComp}>Sin comprobante</Text>}
                      {!!p.observacion && <Text style={s.pagoObs}>Obs: {p.observacion}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editModal} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {saveOk ? (
              <View style={s.successBox}>
                <Check size={40} color={GREEN} />
                <Text style={s.successText}>Perfil actualizado</Text>
                <TouchableOpacity style={s.btnPrimary} onPress={() => setEditModal(false)}>
                  <Text style={s.btnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView>
                {!!saveError && <View style={s.errorBox}><Text style={s.errorText}>{saveError}</Text></View>}
                <Text style={s.label}>Nombre</Text>
                <TextInput style={s.input} value={editNombre} onChangeText={setEditNombre} placeholder="Tu nombre completo" placeholderTextColor="#9ca3af" />
                <Text style={s.label}>Teléfono</Text>
                <TextInput style={s.input} value={editTel} onChangeText={setEditTel} placeholder="Teléfono" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                <Text style={s.label}>Cargo</Text>
                <TextInput style={s.input} value={editCargo} onChangeText={setEditCargo} placeholder="Tu cargo en la empresa" placeholderTextColor="#9ca3af" />
                <TouchableOpacity style={[s.btnPrimary, saving && { opacity: 0.7 }]} onPress={handleSavePerfil} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Guardar</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add participant modal */}
      <Modal visible={addModal} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Agregar participante</Text>
              <TouchableOpacity onPress={() => setAddModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {addOk ? (
              <View style={s.successBox}>
                <Check size={40} color={GREEN} />
                <Text style={s.successText}>Participante creado correctamente</Text>
                <View style={s.infoBox}>
                  <AlertCircle size={14} color="#92400e" style={{ marginRight: 6 }} />
                  <Text style={s.infoText}>Revisa la consola del backend para ver las credenciales generadas.</Text>
                </View>
                <TouchableOpacity style={s.btnPrimary} onPress={() => setAddModal(false)}>
                  <Text style={s.btnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView>
                {!!addError && <View style={s.errorBox}><Text style={s.errorText}>{addError}</Text></View>}
                <Text style={s.label}>Nombre *</Text>
                <TextInput style={s.input} value={addNombre} onChangeText={setAddNombre} placeholder="Nombre" placeholderTextColor="#9ca3af" />
                <Text style={s.label}>Apellido *</Text>
                <TextInput style={s.input} value={addApellido} onChangeText={setAddApellido} placeholder="Apellido" placeholderTextColor="#9ca3af" />
                <Text style={s.label}>Correo electrónico *</Text>
                <TextInput style={s.input} value={addCorreo} onChangeText={setAddCorreo} placeholder="correo@ejemplo.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
                <Text style={s.label}>Teléfono</Text>
                <TextInput style={s.input} value={addTel} onChangeText={setAddTel} placeholder="Teléfono" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                <Text style={s.label}>Cargo</Text>
                <TextInput style={s.input} value={addCargo} onChangeText={setAddCargo} placeholder="Cargo en la empresa" placeholderTextColor="#9ca3af" />
                <TouchableOpacity style={[s.btnPrimary, adding && { opacity: 0.7 }]} onPress={handleAddParticipant} disabled={adding}>
                  {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Agregar participante</Text>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Additional payment modal */}
      <Modal visible={pagoModal} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Solicitar cupos adicionales</Text>
              <TouchableOpacity onPress={() => setPagoModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {pagoOk ? (
              <View style={s.successBox}>
                <Check size={40} color={GREEN} />
                <Text style={s.successText}>Solicitud enviada. El administrador revisará tu comprobante.</Text>
                <TouchableOpacity style={s.btnPrimary} onPress={() => setPagoModal(false)}>
                  <Text style={s.btnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {!!pagoError && <View style={s.errorBox}><Text style={s.errorText}>{pagoError}</Text></View>}
                <Text style={s.label}>Cantidad de cupos a solicitar</Text>
                <TextInput style={s.input} value={pagoCant} onChangeText={setPagoCant} keyboardType="number-pad" placeholder="1" placeholderTextColor="#9ca3af" />
                <Text style={s.label}>URL del comprobante de pago *</Text>
                <TextInput style={s.input} value={pagoUrl} onChangeText={setPagoUrl} placeholder="https://..." placeholderTextColor="#9ca3af" autoCapitalize="none" />
                <Text style={s.label}>Monto pagado (opcional)</Text>
                <TextInput style={s.input} value={pagoMonto} onChangeText={setPagoMonto} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9ca3af" />
                <TouchableOpacity style={[s.btnPrimary, pagandoAd && { opacity: 0.7 }]} onPress={handlePagoAdicional} disabled={pagandoAd}>
                  {pagandoAd ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Enviar solicitud</Text>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function SlotCard({ label, value, color, textColor }: any) {
  return (
    <View style={[s.slotCard, { backgroundColor: color }]}>
      <Text style={[s.slotValue, { color: textColor }]}>{String(value)}</Text>
      <Text style={s.slotLabel}>{label}</Text>
    </View>
  );
}

function pagoEstadoStyle(estado: string) {
  const map: Record<string, any> = {
    PENDIENTE:   { backgroundColor: '#fef3c7' },
    COMPLETADO:  { backgroundColor: '#dcfce7' },
    RECHAZADO:   { backgroundColor: '#fee2e2' },
    OBSERVADO:   { backgroundColor: '#dbeafe' },
  };
  return map[estado] ?? { backgroundColor: '#f1f5f9' };
}
function pagoEstadoTextStyle(estado: string) {
  const map: Record<string, any> = {
    PENDIENTE:  { color: '#92400e' },
    COMPLETADO: { color: '#166534' },
    RECHAZADO:  { color: '#dc2626' },
    OBSERVADO:  { color: '#1e40af' },
  };
  return map[estado] ?? { color: '#475569' };
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },

  profileHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText:   { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileName:  { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeEnc:  { backgroundColor: '#dcfce7' },
  badgePart: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextEnc:  { color: '#166534' },
  badgeTextPart: { color: '#1e40af' },
  editBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  errorBox: {
    padding: 12, borderRadius: 12, marginBottom: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13 },

  section: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, color: '#374151', fontWeight: '600', flex: 2, textAlign: 'right' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },

  slotGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  slotCard:    { width: '47%', borderRadius: 14, padding: 12 },
  slotValue:   { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  slotLabel:   { fontSize: 10, color: '#64748b', fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dbeafe', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoBannerText: { fontSize: 12, color: '#1e40af', fontWeight: '600', flex: 1 },
  slotActions: { gap: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 12, padding: 12,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pagoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  pagoBtnText: { color: GREEN, fontSize: 14, fontWeight: '700' },

  participantRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  participantAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  participantAvatarText: { fontSize: 15, fontWeight: '800', color: GREEN },
  participantName:  { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  participantEmail: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  participantCargo: { fontSize: 11, color: '#64748b', marginTop: 1, fontWeight: '600' },
  roleBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeEnc:  { backgroundColor: '#dcfce7' },
  roleBadgePart: { backgroundColor: '#dbeafe' },
  roleText:       { fontSize: 9, fontWeight: '700' },
  roleTextEnc:    { color: '#166534' },
  roleTextPart:   { color: '#1e40af' },

  deactivateBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  deactivateBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },

  pagoRow: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  pagoTipoBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pagoTipoIni:     { backgroundColor: '#dbeafe' },
  pagoTipoAdd:     { backgroundColor: '#f3e8ff' },
  pagoTipoText:    { fontSize: 10, fontWeight: '700' },
  pagoTipoTextIni: { color: '#1e40af' },
  pagoTipoTextAdd: { color: '#6b21a8' },
  pagoFecha:       { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  pagoInfo:        { fontSize: 12, color: '#374151', fontWeight: '600' },
  pagoMonto:       { fontSize: 11, color: '#64748b', marginTop: 1 },
  pagoSinComp:     { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 1 },
  pagoObs:         { fontSize: 11, color: '#92400e', marginTop: 2 },
  pagoEstado:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pagoEstadoText:  { fontSize: 10, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%', paddingBottom: 36,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 14, color: '#0f172a',
  },
  btnPrimary: {
    backgroundColor: GREEN, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  successBox:  { alignItems: 'center', paddingVertical: 24, gap: 14 },
  successText: { fontSize: 15, color: '#374151', fontWeight: '600', textAlign: 'center' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#fde68a', maxWidth: '100%',
  },
  infoText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 },
});
