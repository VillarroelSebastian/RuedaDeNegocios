import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, StyleSheet, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import ImagenLightbox from '../../components/ImagenLightbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search, Building2, Send, X, MapPin, Video, Check,
  AlertCircle, ChevronLeft, Globe, Clock, RefreshCw, CheckCircle2, Star,
  Filter, Mail, Phone, FileText, Hash,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { paisConBandera } from '../../utils/pais';

const GREEN = '#449D3A';
const POLL_MS = 3000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
// Fecha ISO (YYYY-MM-DD, hora local) de un slot — usada para agrupar horarios por día.
function fechaISO(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtSoloFecha(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fmtUpdateTime(d: Date) {
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
// Minutos realmente disponibles para una fecha+hora dadas — nunca permitir elegir
// uno que no exista en la lista de horarios devuelta por el backend.
function minutosDeHora(horarios: any[], fecha: string | null, hora: number | null): number[] {
  if (fecha === null || hora === null) return [];
  return horarios
    .filter((h: any) => fechaISO(h.inicio) === fecha && new Date(h.inicio).getHours() === hora)
    .map((h: any) => new Date(h.inicio).getMinutes())
    .sort((a: number, b: number) => a - b);
}

type Step = 'modalidad' | 'horario' | 'mesa' | 'mensaje';

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EmpresaEmpresasScreen() {
  // List state
  const [empresas,   setEmpresas]   = useState<any[]>([]);
  const [busqueda,   setBusqueda]   = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroOferta,   setFiltroOferta]   = useState('');
  const [filtroDemanda,  setFiltroDemanda]  = useState('');
  const [filtroLugar,    setFiltroLugar]    = useState('');

  // Profile modal
  const [profileModal,    setProfileModal]    = useState(false);
  const [profileSelected, setProfileSelected] = useState<any>(null);

  // Meeting request modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selected,     setSelected]     = useState<any>(null);
  const [step,         setStep]         = useState<Step>('modalidad');
  const [modalidad,    setModalidad]    = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL');

  // Horarios
  const [horarios,   setHorarios]   = useState<any[]>([]);
  const [duracionMin,setDuracionMin] = useState(0);
  const [horarioSel, setHorarioSel] = useState<any>(null);
  const [fechaSel,   setFechaSel]   = useState<string | null>(null);
  const [horaSel,    setHoraSel]    = useState<number | null>(null);
  const [minutosStr, setMinutosStr] = useState('00');
  const [loadingH,   setLoadingH]   = useState(false);

  // Mesas + polling
  const [mesas,          setMesas]          = useState<any[]>([]);
  const [mesaSel,        setMesaSel]        = useState<any>(null);
  const [mesaWarning,    setMesaWarning]    = useState('');
  const [mesaLastUpdate, setMesaLastUpdate] = useState<Date | null>(null);
  const [loadingM,       setLoadingM]       = useState(false);

  // Mensaje / enlace / send
  const [enlace,    setEnlace]    = useState('');
  const [mensaje,   setMensaje]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk,    setSendOk]    = useState(false);

  // Refs for interval closure safety
  const mesaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const horarioSelRef   = useRef<any>(null);
  const mesaSelRef      = useRef<any>(null);

  const user = userStore.get();
  const esEncargado = !!user?.esResponsable;

  // Keep refs in sync with state
  useEffect(() => { horarioSelRef.current = horarioSel; }, [horarioSel]);
  useEffect(() => { mesaSelRef.current    = mesaSel;    }, [mesaSel]);

  // ── Polling: start/stop based on step + visibility ─────────────────────────

  const stopPolling = useCallback(() => {
    if (mesaIntervalRef.current !== null) {
      clearInterval(mesaIntervalRef.current);
      mesaIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (step === 'mesa' && modalVisible) {
      // Start polling every 3 s
      mesaIntervalRef.current = setInterval(async () => {
        const h = horarioSelRef.current;
        if (!h) return;
        try {
          const url = `${API_URL}/empresa/mesas-disponibles?inicio=${encodeURIComponent(h.inicio)}&fin=${encodeURIComponent(h.fin)}`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          const newMesas: any[] = Array.isArray(data) ? data : [];
          setMesas(newMesas);
          setMesaLastUpdate(new Date());

          // If the currently selected mesa disappeared, warn user
          const prev = mesaSelRef.current;
          if (prev && !newMesas.some((m: any) => m.id === prev.id)) {
            setMesaSel(null);
            mesaSelRef.current = null;
            setMesaWarning('La mesa seleccionada ya no está disponible. Selecciona otra.');
          }
        } catch { /* network error — silently skip */ }
      }, POLL_MS);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [step, modalVisible, stopPolling]);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  // ── Data ─────────────────────────────────────────────────────────────────────

  const fetchEmpresas = useCallback(async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId) { setLoading(false); return; }
    setError('');
    try {
      const params = new URLSearchParams({ eeId: String(eeId) });
      if (filtroOferta.trim())  params.set('oferta',  filtroOferta.trim());
      if (filtroDemanda.trim()) params.set('demanda', filtroDemanda.trim());
      if (filtroLugar.trim())   params.set('lugar',   filtroLugar.trim());
      const res = await fetch(`${API_URL}/empresa/directorio?${params}`);
      if (!res.ok) throw new Error('Error cargando empresas');
      const data = await res.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.empresaeventoId, filtroOferta, filtroDemanda, filtroLugar]);

  useFocusEffect(useCallback(() => { fetchEmpresas(); }, [fetchEmpresas]));

  const fetchHorarios = async (eeReceptoraId: number) => {
    const eeId = user?.empresaeventoId;
    if (!eeId) return;
    setLoadingH(true);
    try {
      const res = await fetch(`${API_URL}/empresa/horarios?eeId=${eeId}&eeReceptoraId=${eeReceptoraId}`);
      const data = res.ok ? await res.json() : {};
      const hrs: any[] = Array.isArray(data?.horarios) ? data.horarios : [];
      setHorarios(hrs);
      setDuracionMin(data?.duracionMinutos ?? 0);
      const fechas = [...new Set(hrs.map((h: any) => fechaISO(h.inicio)))].sort() as string[];
      const hoy = fechaISO(new Date().toISOString());
      const fechaAuto = fechas.find((f) => f >= hoy) ?? fechas[0] ?? null;
      setFechaSel(fechaAuto);
      const delDia = fechaAuto ? hrs.filter((h: any) => fechaISO(h.inicio) === fechaAuto) : [];
      const available = [...new Set(delDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
      const cur = new Date().getHours();
      const auto = available.find((h) => h >= cur) ?? available[0];
      if (auto !== undefined) {
        setHoraSel(auto);
        const minutos = minutosDeHora(hrs, fechaAuto, auto);
        setMinutosStr(minutos.length > 0 ? String(minutos[0]).padStart(2, '0') : '');
      } else {
        setHoraSel(null);
        setMinutosStr('');
      }
    } catch {}
    finally { setLoadingH(false); }
  };

  const fetchMesasInitial = async (inicio: string, fin: string) => {
    if (!inicio || !fin) return;
    setLoadingM(true);
    setMesas([]);
    setMesaSel(null);
    setMesaWarning('');
    setMesaLastUpdate(null);
    try {
      const url = `${API_URL}/empresa/mesas-disponibles?inicio=${encodeURIComponent(inicio)}&fin=${encodeURIComponent(fin)}`;
      const res = await fetch(url);
      const data = res.ok ? await res.json() : [];
      setMesas(Array.isArray(data) ? data : []);
      setMesaLastUpdate(new Date());
    } catch {}
    finally { setLoadingM(false); }
  };

  // ── Modal controls ────────────────────────────────────────────────────────────

  const openProfile = (empresa: any) => {
    setProfileSelected(empresa);
    setProfileModal(true);
  };

  const openModal = (empresa: any) => {
    setSelected(empresa);
    setStep('modalidad');
    setModalidad('PRESENCIAL');
    setHorarios([]);
    setHorarioSel(null);
    setHoraSel(null);
    setMinutosStr('00');
    setMesas([]);
    setMesaSel(null);
    setMesaWarning('');
    setMesaLastUpdate(null);
    setEnlace('');
    setMensaje('');
    setSendError('');
    setSendOk(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    stopPolling();
    setModalVisible(false);
  };

  // ── Step navigation ───────────────────────────────────────────────────────────

  const goToHorario = async () => {
    setStep('horario');
    if (selected) await fetchHorarios(selected.empresaeventoId);
  };

  const selectHorario = async (h: any) => {
    setHorarioSel(h);
    horarioSelRef.current = h;
    if (modalidad === 'PRESENCIAL') {
      setStep('mesa');
      await fetchMesasInitial(h.inicio, h.fin);
    } else {
      setStep('mensaje');
    }
  };

  const goBackFromMesa = () => {
    stopPolling();
    setStep('horario');
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const eeId = user?.empresaeventoId;
    if (!eeId || !horarioSel || !selected) return;
    if (modalidad === 'PRESENCIAL' && !mesaSel) {
      setSendError('Selecciona una mesa para continuar.');
      return;
    }
    setSendError('');
    setSending(true);
    try {
      const body: any = {
        eeId,
        eeReceptoraId: selected.empresaeventoId,
        euId:          user?.empresaUsuarioId,
        tipo:          modalidad,
        inicio:        horarioSel.inicio,
        fin:           horarioSel.fin,
      };
      if (mensaje.trim())   body.mensaje = mensaje.trim();
      if (modalidad === 'PRESENCIAL') body.mesaId = mesaSel.id;
      if (modalidad === 'VIRTUAL' && enlace.trim()) body.enlace = enlace.trim();

      const res = await fetch(`${API_URL}/empresa/solicitudes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data?.message ?? 'Error al enviar solicitud';
        throw new Error(
          /disponible|mesa|horario/i.test(msg)
            ? 'Ese horario o mesa ya no está disponible. Intenta con otra opción.'
            : msg
        );
      }
      stopPolling();
      setSendOk(true);
    } catch (e: any) {
      setSendError(e.message || 'Error de red');
    } finally {
      setSending(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const filtered = busqueda.trim()
    ? empresas.filter((e: any) =>
        (e.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.rubro  ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.ciudad ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : empresas;

  const totalSteps = modalidad === 'PRESENCIAL' ? 4 : 3;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Search + filtros */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 4 }}>
        <View style={[s.searchBar, { flex: 1, margin: 0 }]}>
          <Search size={16} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar empresa, rubro o ciudad..."
            placeholderTextColor="#9ca3af"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {!!busqueda && (
            <TouchableOpacity onPress={() => setBusqueda('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setMostrarFiltros((v) => !v)}
          style={[s.filterBtn, (mostrarFiltros || filtroOferta || filtroDemanda || filtroLugar) && s.filterBtnActive]}
          activeOpacity={0.8}
        >
          <Filter size={16} color={(mostrarFiltros || filtroOferta || filtroDemanda || filtroLugar) ? '#fff' : GREEN} />
        </TouchableOpacity>
      </View>

      {mostrarFiltros && (
        <View style={s.filtrosBox}>
          <TextInput value={filtroOferta} onChangeText={setFiltroOferta} placeholder="Ofrece..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
          <TextInput value={filtroDemanda} onChangeText={setFiltroDemanda} placeholder="Busca..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
          <TextInput value={filtroLugar} onChangeText={setFiltroLugar} placeholder="Lugar (ciudad o país)..." placeholderTextColor="#9ca3af" style={s.filtroInput} />
        </View>
      )}

      {!!error && (
        <View style={s.errorBox}>
          <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* Company list */}
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => String(item.empresaeventoId ?? item.empresaId ?? idx)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEmpresas(); }} tintColor={GREEN} />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Building2 size={52} color="#d1d5db" />
            <Text style={s.emptyText}>
              {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay empresas en el directorio'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.card, item.afinidad === 'alta' && s.cardRecomendada]}>
            {item.afinidad === 'alta' && (
              <View style={s.recoBadge}>
                <Star size={10} color={GREEN} fill={GREEN} />
                <Text style={s.recoText}>Recomendada · Mismo rubro</Text>
              </View>
            )}
            {item.afinidad === 'media' && (
              <View style={[s.recoBadge, s.recoBadgeMedia]}>
                <Star size={10} color="#d97706" />
                <Text style={[s.recoText, { color: '#d97706' }]}>Recomendada · Rubro complementario</Text>
              </View>
            )}
            {/* Card top: avatar + name + rubro */}
            <View style={s.cardTop}>
              {item.urlFotoPerfil ? (
                <ImagenLightbox uri={item.urlFotoPerfil} style={s.cardAvatar} imgStyle={{ borderRadius: 12 }} />
              ) : (
                <View style={s.cardAvatar}>
                  <Text style={s.cardAvatarText}>{(item.nombre ?? 'E')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={2}>{item.nombre}</Text>
                {!!item.codigo && <Text style={s.codigoText}>{item.codigo}</Text>}
                {!!item.rubro && (
                  <View style={s.rubroBadge}>
                    <Text style={s.rubroText}>{item.rubro}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location */}
            {(!!item.ciudad || !!item.pais) && (
              <View style={s.metaRow}>
                <MapPin size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={s.metaText} numberOfLines={1}>
                  {[item.ciudad, paisConBandera(item.pais)].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            {/* Ofrece */}
            {!!item.oferta && (
              <Text style={s.cardDesc} numberOfLines={2}><Text style={{ fontWeight: '800', color: '#374151' }}>Ofrece: </Text>{item.oferta}</Text>
            )}

            {/* Description (2 lines) */}
            {!!item.descripcion && (
              <Text style={s.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
            )}

            {/* Website */}
            {!!item.sitioWeb && (
              <View style={s.metaRow}>
                <Globe size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={s.metaText} numberOfLines={1}>{item.sitioWeb}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={s.cardActions}>
              <TouchableOpacity style={[s.profileBtn, !esEncargado && { flex: 1 }]} onPress={() => openProfile(item)} activeOpacity={0.8}>
                <Text style={s.profileBtnText}>Ver perfil</Text>
              </TouchableOpacity>
              {esEncargado && (
                <TouchableOpacity style={s.solicBtn} onPress={() => openModal(item)} activeOpacity={0.8}>
                  <Send size={13} color="#fff" style={{ marginRight: 5 }} />
                  <Text style={s.solicBtnText}>Solicitar reunión</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {/* ──────────────────────────────────────────────────────────────────────
          PROFILE MODAL
      ────────────────────────────────────────────────────────────────────── */}
      <Modal visible={profileModal} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={[s.sheetCard, { maxHeight: '85%' }]}>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { flex: 1 }]} numberOfLines={2}>
                {profileSelected?.nombre ?? ''}
              </Text>
              <TouchableOpacity onPress={() => setProfileModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Big avatar */}
              <View style={s.profileHero}>
                <View style={s.profileAvatar}>
                  <Text style={s.profileAvatarText}>
                    {(profileSelected?.nombre ?? 'E')[0].toUpperCase()}
                  </Text>
                </View>
                {!!profileSelected?.codigo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Hash size={11} color="#9ca3af" />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', marginLeft: 3 }}>{profileSelected.codigo}</Text>
                  </View>
                )}
                {!!profileSelected?.rubro && (
                  <View style={[s.rubroBadge, { marginTop: 10 }]}>
                    <Text style={s.rubroText}>{profileSelected.rubro}</Text>
                  </View>
                )}
              </View>

              {/* Info rows */}
              {(!!profileSelected?.ciudad || !!profileSelected?.pais) && (
                <ProfileInfoRow
                  icon={<MapPin size={15} color={GREEN} />}
                  label="Ubicación"
                  value={[profileSelected.ciudad, paisConBandera(profileSelected.pais)].filter(Boolean).join(', ')}
                />
              )}
              {!!profileSelected?.sitioWeb && (
                <ProfileInfoRow
                  icon={<Globe size={15} color={GREEN} />}
                  label="Sitio web"
                  value={profileSelected.sitioWeb}
                />
              )}
              {!!profileSelected?.correoCorporativo && (
                <ProfileInfoRow
                  icon={<Mail size={15} color={GREEN} />}
                  label="Correo"
                  value={profileSelected.correoCorporativo}
                />
              )}
              {!!profileSelected?.telefonoWhatsapp && (
                <ProfileInfoRow
                  icon={<Phone size={15} color={GREEN} />}
                  label="WhatsApp"
                  value={profileSelected.telefonoWhatsapp}
                />
              )}
              {!!profileSelected?.tipoParticipacion && (
                <ProfileInfoRow
                  icon={<Building2 size={15} color={GREEN} />}
                  label="Tipo de participación"
                  value={profileSelected.tipoParticipacion}
                />
              )}
              {!!profileSelected?.urlPdf && (
                <ProfileInfoRow
                  icon={<FileText size={15} color={GREEN} />}
                  label="Catálogo"
                  value="Ver catálogo / brochure"
                />
              )}

              {/* Description */}
              <View style={s.profileDescBox}>
                <Text style={s.profileDescLabel}>Descripción</Text>
                <Text style={s.profileDescText}>
                  {profileSelected?.descripcion ?? 'Sin descripción registrada.'}
                </Text>
              </View>

              {!!profileSelected?.oferta && (
                <View style={[s.profileInfoBox, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[s.profileInfoLabel, { color: '#166534' }]}>Ofrece</Text>
                  <Text style={[s.profileInfoText, { color: '#166534' }]}>{profileSelected.oferta}</Text>
                </View>
              )}
              {!!profileSelected?.demanda && (
                <View style={[s.profileInfoBox, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[s.profileInfoLabel, { color: '#1e40af' }]}>Busca</Text>
                  <Text style={[s.profileInfoText, { color: '#1e40af' }]}>{profileSelected.demanda}</Text>
                </View>
              )}

              {/* Buttons */}
              {esEncargado && (
                <TouchableOpacity
                  style={[s.btnPrimary, { marginTop: 20 }]}
                  onPress={() => { setProfileModal(false); openModal(profileSelected); }}
                  activeOpacity={0.8}
                >
                  <Send size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.btnText}>Solicitar reunión</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.btnSecondary, { marginTop: 10, marginBottom: 20 }]}
                onPress={() => setProfileModal(false)}
                activeOpacity={0.8}
              >
                <Text style={s.btnSecText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ──────────────────────────────────────────────────────────────────────
          MEETING REQUEST MODAL
      ────────────────────────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={s.sheetCard}>
              {/* Header */}
              <View style={s.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>Solicitar reunión</Text>
                  {selected && (
                    <Text style={s.sheetSub} numberOfLines={1}>{selected.nombre}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {sendOk ? (
                /* ── Success ── */
                <View style={s.successBox}>
                  <Check size={56} color={GREEN} />
                  <Text style={s.successTitle}>¡Solicitud enviada!</Text>
                  <Text style={s.successText}>
                    La empresa recibirá tu solicitud y podrá aceptarla o rechazarla.
                  </Text>
                  <TouchableOpacity style={s.btnPrimary} onPress={closeModal} activeOpacity={0.8}>
                    <Text style={s.btnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {!!sendError && (
                    <View style={[s.errorBox, { marginHorizontal: 0, marginBottom: 14 }]}>
                      <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
                      <Text style={[s.errorText, { flex: 1 }]}>{sendError}</Text>
                    </View>
                  )}

                  {/* ── STEP 1: Modalidad ── */}
                  {step === 'modalidad' && (
                    <>
                      <StepBadge current={1} total={totalSteps} label="Tipo de reunión" />
                      <Text style={s.stepQuestion}>¿Cómo quieres reunirte?</Text>

                      <TouchableOpacity
                        style={[s.modeCard, modalidad === 'PRESENCIAL' && s.modeCardActive]}
                        onPress={() => setModalidad('PRESENCIAL')}
                        activeOpacity={0.8}
                      >
                        <MapPin size={22} color={modalidad === 'PRESENCIAL' ? '#fff' : '#64748b'} />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[s.modeTitle, modalidad === 'PRESENCIAL' && s.modeTitleActive]}>
                            Presencial
                          </Text>
                          <Text style={[s.modeSub, modalidad === 'PRESENCIAL' && s.modeSubActive]}>
                            En el evento, en una mesa asignada
                          </Text>
                        </View>
                        {modalidad === 'PRESENCIAL' && <Check size={18} color="#fff" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.modeCard, { marginTop: 10 }, modalidad === 'VIRTUAL' && s.modeCardActive]}
                        onPress={() => setModalidad('VIRTUAL')}
                        activeOpacity={0.8}
                      >
                        <Video size={22} color={modalidad === 'VIRTUAL' ? '#fff' : '#64748b'} />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[s.modeTitle, modalidad === 'VIRTUAL' && s.modeTitleActive]}>
                            Virtual
                          </Text>
                          <Text style={[s.modeSub, modalidad === 'VIRTUAL' && s.modeSubActive]}>
                            Por videollamada, con enlace opcional
                          </Text>
                        </View>
                        {modalidad === 'VIRTUAL' && <Check size={18} color="#fff" />}
                      </TouchableOpacity>

                      <TouchableOpacity style={[s.btnPrimary, { marginTop: 20 }]} onPress={goToHorario} activeOpacity={0.8}>
                        <Text style={s.btnText}>Siguiente: Elegir horario</Text>
                      </TouchableOpacity>
                      <View style={{ height: 16 }} />
                    </>
                  )}

                  {/* ── STEP 2: Horario ── */}
                  {step === 'horario' && (
                    <HorarioPicker
                      horarios={horarios}
                      duracionMin={duracionMin}
                      loadingH={loadingH}
                      fechaSel={fechaSel}
                      horaSel={horaSel}
                      minutosStr={minutosStr}
                      horarioSel={horarioSel}
                      onFechaChange={(f) => {
                        setFechaSel(f);
                        const delDia = horarios.filter((h: any) => fechaISO(h.inicio) === f);
                        const available = [...new Set(delDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
                        const auto = available[0] ?? null;
                        const minutos = minutosDeHora(horarios, f, auto);
                        const primerMinuto = minutos[0];
                        setHoraSel(auto);
                        setMinutosStr(primerMinuto !== undefined ? String(primerMinuto).padStart(2, '0') : '');
                        const match = (auto !== null && primerMinuto !== undefined)
                          ? delDia.find((h: any) => new Date(h.inicio).getHours() === auto && new Date(h.inicio).getMinutes() === primerMinuto) ?? null
                          : null;
                        setHorarioSel(match);
                        horarioSelRef.current = match;
                      }}
                      onHoraChange={(h) => {
                        setHoraSel(h);
                        const minutos = minutosDeHora(horarios, fechaSel, h);
                        const primerMinuto = minutos[0];
                        setMinutosStr(primerMinuto !== undefined ? String(primerMinuto).padStart(2, '0') : '');
                        const delDia = fechaSel ? horarios.filter((hr: any) => fechaISO(hr.inicio) === fechaSel) : [];
                        const match = primerMinuto !== undefined
                          ? delDia.find((hr: any) => new Date(hr.inicio).getHours() === h && new Date(hr.inicio).getMinutes() === primerMinuto) ?? null
                          : null;
                        setHorarioSel(match);
                        horarioSelRef.current = match;
                      }}
                      onMinutosChange={(m) => {
                        setMinutosStr(m);
                        const mins = parseInt(m) || 0;
                        const match = horarios.find((h: any) => {
                          const d = new Date(h.inicio);
                          return horaSel !== null && fechaSel !== null && fechaISO(h.inicio) === fechaSel
                            && d.getHours() === horaSel && d.getMinutes() === mins;
                        }) ?? null;
                        setHorarioSel(match);
                        horarioSelRef.current = match;
                      }}
                      onSelectMatch={(h) => selectHorario(h)}
                      onBack={() => setStep('modalidad')}
                      totalSteps={totalSteps}
                    />
                  )}

                  {/* ── STEP 3: Mesa (PRESENCIAL) ── */}
                  {step === 'mesa' && (
                    <>
                      <StepBadge current={3} total={4} label="Selección de mesa" />
                      <BackBtn onPress={goBackFromMesa} />

                      {/* Horario summary */}
                      {horarioSel && (
                        <View style={s.slotSummary}>
                          <Clock size={13} color={GREEN} style={{ marginRight: 6 }} />
                          <Text style={s.slotSummaryText}>
                            {fmtDate(horarioSel.inicio)} · {fmtTime(horarioSel.inicio)} – {fmtTime(horarioSel.fin)}
                          </Text>
                        </View>
                      )}

                      {/* Polling indicator */}
                      <View style={s.pollRow}>
                        <RefreshCw size={11} color={GREEN} style={{ marginRight: 5 }} />
                        <Text style={s.pollText}>Disponibilidad actualizada automáticamente cada 3 seg</Text>
                      </View>
                      {mesaLastUpdate && (
                        <Text style={s.pollTime}>Última actualización: {fmtUpdateTime(mesaLastUpdate)}</Text>
                      )}

                      {/* Warning if selected mesa went away */}
                      {!!mesaWarning && (
                        <View style={[s.errorBox, { marginHorizontal: 0, marginBottom: 12, marginTop: 8 }]}>
                          <AlertCircle size={13} color="#dc2626" style={{ marginRight: 5 }} />
                          <Text style={[s.errorText, { flex: 1 }]}>{mesaWarning}</Text>
                        </View>
                      )}

                      {loadingM ? (
                        <View style={s.loadBox}>
                          <ActivityIndicator color={GREEN} size="small" />
                          <Text style={s.loadText}>Cargando mesas disponibles...</Text>
                        </View>
                      ) : mesas.length === 0 ? (
                        <View style={s.emptyState}>
                          <Text style={s.emptyStateTitle}>No hay mesas disponibles</Text>
                          <Text style={s.emptyStateSub}>Prueba con otro horario o usa modalidad virtual.</Text>
                          <TouchableOpacity style={[s.btnSecondary, { marginTop: 12 }]} onPress={goBackFromMesa}>
                            <Text style={s.btnSecText}>Cambiar horario</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <Text style={s.stepLabel}>Selecciona una mesa disponible</Text>
                          <View style={s.mesaGrid}>
                            {mesas.map((m: any) => (
                              <TouchableOpacity
                                key={String(m.id)}
                                style={[s.mesaBtn, mesaSel?.id === m.id && s.mesaBtnActive]}
                                onPress={() => { setMesaSel(m); setMesaWarning(''); }}
                                activeOpacity={0.8}
                              >
                                <Text style={[s.mesaNum, mesaSel?.id === m.id && s.mesaNumActive]}>
                                  Mesa {m.numeroMesa}
                                </Text>
                                {mesaSel?.id === m.id && (
                                  <Check size={12} color="#fff" style={{ marginTop: 3 }} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>

                          {mesaSel && (
                            <View style={s.mesaConfirm}>
                              <Check size={13} color={GREEN} style={{ marginRight: 6 }} />
                              <Text style={s.mesaConfirmText}>Mesa {mesaSel.numeroMesa} seleccionada</Text>
                            </View>
                          )}

                          <TouchableOpacity
                            style={[s.btnPrimary, { marginTop: 14 }, !mesaSel && { opacity: 0.4 }]}
                            onPress={() => { if (mesaSel) { stopPolling(); setStep('mensaje'); } }}
                            disabled={!mesaSel}
                            activeOpacity={0.8}
                          >
                            <Text style={s.btnText}>Siguiente: Confirmar</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <View style={{ height: 16 }} />
                    </>
                  )}

                  {/* ── STEP 4 (or 3 for VIRTUAL): Confirmar ── */}
                  {step === 'mensaje' && (
                    <>
                      <StepBadge current={totalSteps} total={totalSteps} label="Confirmar solicitud" />
                      <BackBtn onPress={() => setStep(modalidad === 'PRESENCIAL' ? 'mesa' : 'horario')} />

                      {/* Summary card */}
                      <View style={s.summaryCard}>
                        <SummaryRow label="Empresa"   value={selected?.nombre ?? '—'} />
                        <SummaryRow label="Modalidad" value={modalidad === 'PRESENCIAL' ? 'Presencial' : 'Virtual'} />
                        <SummaryRow label="Fecha"     value={fmtDate(horarioSel?.inicio ?? '')} />
                        <SummaryRow label="Horario"   value={`${fmtTime(horarioSel?.inicio ?? '')} – ${fmtTime(horarioSel?.fin ?? '')}`} />
                        {mesaSel && (
                          <SummaryRow label="Mesa" value={`Mesa ${mesaSel.numeroMesa}`} />
                        )}
                      </View>

                      {modalidad === 'VIRTUAL' && (
                        <>
                          <Text style={s.stepLabel}>Enlace de videollamada (opcional)</Text>
                          <TextInput
                            style={s.inputField}
                            placeholder="https://meet.google.com/..."
                            placeholderTextColor="#9ca3af"
                            value={enlace}
                            onChangeText={setEnlace}
                            autoCapitalize="none"
                            keyboardType="url"
                          />
                        </>
                      )}

                      <Text style={s.stepLabel}>Objetivo de la reunión (opcional)</Text>
                      <TextInput
                        style={s.textarea}
                        placeholder="Ej: Explorar posible alianza comercial en el sector agroindustrial..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={4}
                        value={mensaje}
                        onChangeText={setMensaje}
                        textAlignVertical="top"
                      />

                      <TouchableOpacity
                        style={[s.btnPrimary, sending && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={sending}
                        activeOpacity={0.8}
                      >
                        {sending ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Send size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={s.btnText}>Enviar solicitud</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <View style={{ height: 28 }} />
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── HorarioPicker ─────────────────────────────────────────────────────────────

function HorarioPicker({ horarios, duracionMin, loadingH, fechaSel, horaSel, minutosStr, horarioSel,
  onFechaChange, onHoraChange, onMinutosChange, onSelectMatch, onBack, totalSteps }: {
  horarios: any[]; duracionMin: number; loadingH: boolean;
  fechaSel: string | null; horaSel: number | null; minutosStr: string; horarioSel: any;
  onFechaChange: (f: string) => void; onHoraChange: (h: number) => void; onMinutosChange: (m: string) => void;
  onSelectMatch: (h: any) => void; onBack: () => void; totalSteps: number;
}) {
  const GREEN = '#449D3A';
  const fechasDisponibles = [...new Set(horarios.map((h: any) => fechaISO(h.inicio)))].sort() as string[];
  const horariosDelDia = fechaSel ? horarios.filter((h: any) => fechaISO(h.inicio) === fechaSel) : [];
  const horasDisponibles = [...new Set(horariosDelDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
  const minutosParaHora = horaSel !== null
    ? horariosDelDia.filter((h: any) => new Date(h.inicio).getHours() === horaSel).map((h: any) => new Date(h.inicio).getMinutes()).sort((a: any, b: any) => a - b)
    : [];
  const mins = parseInt(minutosStr) || 0;
  const horarioMatch = horaSel !== null && minutosStr !== ''
    ? horariosDelDia.find((h: any) => {
        const d = new Date(h.inicio);
        return d.getHours() === horaSel && d.getMinutes() === mins;
      }) ?? null
    : null;

  return (
    <>
      <StepBadge current={2} total={totalSteps} label="Hora de inicio" />
      <BackBtn onPress={onBack} />

      {loadingH ? (
        <View style={hp.loadBox}>
          <ActivityIndicator color={GREEN} size="small" />
          <Text style={hp.loadText}>Buscando horarios disponibles...</Text>
        </View>
      ) : horarios.length === 0 ? (
        <View style={hp.emptyBox}>
          <Clock size={36} color="#d1d5db" />
          <Text style={hp.emptyTitle}>Sin horarios disponibles</Text>
          <Text style={hp.emptySub}>Puede que tengan reuniones coincidentes o no queden franjas libres.</Text>
        </View>
      ) : (
        <>
          {duracionMin > 0 && (
            <View style={hp.durBanner}>
              <Clock size={13} color={GREEN} style={{ marginRight: 6 }} />
              <Text style={hp.durText}>Las reuniones durarán {duracionMin} minutos</Text>
            </View>
          )}

          {/* Date buttons */}
          <Text style={hp.label}>Fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {fechasDisponibles.map((f: string) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => onFechaChange(f)}
                  style={[hp.horaBtn, fechaSel === f && hp.horaBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[hp.horaBtnText, fechaSel === f && hp.horaBtnTextActive]}>
                    {fmtSoloFecha(f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Hour buttons */}
          <Text style={hp.label}>Hora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {horasDisponibles.map((h: number) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => onHoraChange(h)}
                  style={[hp.horaBtn, horaSel === h && hp.horaBtnActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[hp.horaBtnText, horaSel === h && hp.horaBtnTextActive]}>
                    {String(h).padStart(2,'0')}:00
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Minute buttons — restringidos a los minutos realmente disponibles para la hora elegida */}
          {horaSel !== null && (
            <>
              <Text style={hp.label}>Minutos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {minutosParaHora.map((m: number) => {
                    const mStr = String(m).padStart(2, '0');
                    const active = minutosStr === mStr;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => onMinutosChange(mStr)}
                        style={[hp.horaBtn, active && hp.horaBtnActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[hp.horaBtnText, active && hp.horaBtnTextActive]}>:{mStr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {horarioMatch && (
                <View style={hp.okBox}>
                  <CheckCircle2 size={13} color={GREEN} style={{ marginRight: 6 }} />
                  <Text style={hp.okText}>
                    Disponible: {fmtDate(horarioMatch.inicio)} a las {fmtTime(horarioMatch.inicio)}
                  </Text>
                </View>
              )}

              {horarioMatch && (
                <TouchableOpacity
                  style={[hp.nextBtn]}
                  onPress={() => onSelectMatch(horarioMatch)}
                  activeOpacity={0.8}
                >
                  <Text style={hp.nextBtnText}>Siguiente: {horarioMatch && 'Mesa / Confirmar'}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
      <View style={{ height: 16 }} />
    </>
  );
}

const hp = StyleSheet.create({
  loadBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadText: { fontSize: 13, color: '#94a3b8' },
  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  durBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  durText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  labelHint: { fontSize: 11, fontWeight: '400', color: '#9ca3af' },
  horaBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  horaBtnActive: { borderColor: '#449D3A', backgroundColor: '#f0fdf4' },
  horaBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  horaBtnTextActive: { color: '#166534' },
  okBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  okText: { fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 },
  nextBtn: {
    backgroundColor: '#449D3A', borderRadius: 14, height: 50,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Helper components ─────────────────────────────────────────────────────────

function StepBadge({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View style={hc.stepWrap}>
      <View style={hc.stepDots}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[hc.dot, i < current && hc.dotDone]} />
        ))}
      </View>
      <Text style={hc.stepLabel}>Paso {current} de {total} · {label}</Text>
    </View>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={hc.backBtn} onPress={onPress} activeOpacity={0.7}>
      <ChevronLeft size={17} color="#64748b" />
      <Text style={hc.backText}>Atrás</Text>
    </TouchableOpacity>
  );
}

function ProfileInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={hc.infoRow}>
      {icon}
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={hc.infoLabel}>{label}</Text>
        <Text style={hc.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={hc.sumRow}>
      <Text style={hc.sumLabel}>{label}</Text>
      <Text style={hc.sumValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const hc = StyleSheet.create({
  stepWrap:  { marginBottom: 18 },
  stepDots:  { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  dotDone:   { backgroundColor: GREEN },
  stepLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  backBtn:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16, alignSelf: 'flex-start' },
  backText:  { fontSize: 14, color: '#64748b', marginLeft: 2, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', lineHeight: 20 },
  sumRow:    { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  sumLabel:  { fontSize: 13, color: '#94a3b8', fontWeight: '600', width: 88 },
  sumValue:  { fontSize: 13, color: '#0f172a', fontWeight: '700', flex: 1, textAlign: 'right' },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, borderRadius: 14, paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  filterBtn: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GREEN, backgroundColor: '#fff',
  },
  filterBtnActive: { backgroundColor: GREEN },
  filtrosBox: { marginHorizontal: 16, marginTop: 10, gap: 8 },
  filtroInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 12, height: 42, fontSize: 13, color: '#0f172a',
  },

  errorBox: {
    marginHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13, lineHeight: 18 },

  list:    { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  // ── Cards ──
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardRecomendada: {
    borderColor: '#449D3A', borderWidth: 1.5,
  },
  recoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  recoText: { fontSize: 10, fontWeight: '700', color: '#449D3A', letterSpacing: 0.4 },
  recoBadgeMedia: { backgroundColor: '#fffbeb' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 2, borderColor: '#bbf7d0',
  },
  cardAvatarText: { fontSize: 22, fontWeight: '800', color: GREEN },
  cardName:  { fontSize: 15, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  codigoText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  rubroBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginTop: 5, borderWidth: 1, borderColor: '#bbf7d0',
  },
  rubroText: { fontSize: 11, fontWeight: '700', color: GREEN },
  metaRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  metaText:  { fontSize: 12, color: '#94a3b8', flex: 1 },
  cardDesc:  { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  profileBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: GREEN, alignItems: 'center',
  },
  profileBtnText: { fontSize: 13, fontWeight: '700', color: GREEN },
  solicBtn: {
    flex: 2, flexDirection: 'row', borderRadius: 12, paddingVertical: 10,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  solicBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Modals shared ──
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '92%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  sheetTitle:  { fontSize: 19, fontWeight: '800', color: '#0f172a' },
  sheetSub:    { fontSize: 13, color: '#64748b', marginTop: 3 },

  // ── Profile modal ──
  profileHero: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 4 },
  profileAvatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#bbf7d0',
  },
  profileAvatarText: { fontSize: 32, fontWeight: '800', color: GREEN },
  profileDescBox:    { paddingVertical: 14 },
  profileDescLabel:  { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  profileDescText:   { fontSize: 14, color: '#374151', lineHeight: 22 },
  profileInfoBox:    { borderRadius: 12, padding: 12, marginBottom: 10 },
  profileInfoLabel:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  profileInfoText:   { fontSize: 13 },

  // ── Meeting request steps ──
  stepQuestion: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  stepLabel:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 2 },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0',
    padding: 16, backgroundColor: '#f8fafc',
  },
  modeCardActive: { backgroundColor: GREEN, borderColor: GREEN },
  modeTitle:      { fontSize: 15, fontWeight: '700', color: '#374151' },
  modeTitleActive:{ color: '#fff' },
  modeSub:        { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  modeSubActive:  { color: 'rgba(255,255,255,0.8)' },

  loadBox:  { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadText: { fontSize: 13, color: '#94a3b8' },

  emptyState:      { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptyStateSub:   { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  // Duration banner
  duracionBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  duracionText: { fontSize: 13, color: '#166534', fontWeight: '600' },

  // Time slots
  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 9,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  slotCardActive:  { borderColor: GREEN, backgroundColor: '#f0fdf4' },
  slotDate:        { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 3 },
  slotDateActive:  { color: GREEN },
  slotTime:        { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  slotTimeActive:  { color: '#166534' },
  slotSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  slotSummaryText: { fontSize: 13, color: '#166534', fontWeight: '600' },

  // Polling
  pollRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pollText: { fontSize: 11, color: GREEN, fontWeight: '600' },
  pollTime: { fontSize: 10, color: '#94a3b8', marginBottom: 10 },

  // Mesas
  mesaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  mesaBtn: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', minWidth: 82,
  },
  mesaBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  mesaNum:       { fontSize: 13, fontWeight: '700', color: '#475569' },
  mesaNumActive: { color: '#fff' },
  mesaConfirm: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 2,
  },
  mesaConfirmText: { fontSize: 13, color: '#166534', fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
    marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0',
  },

  // Inputs
  inputField: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 13, fontSize: 14, color: '#0f172a', marginBottom: 16,
  },
  textarea: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 13, fontSize: 14, color: '#0f172a', height: 110, marginBottom: 20,
  },

  // Buttons
  btnPrimary: {
    flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderRadius: 14, height: 48, borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  btnSecText: { fontSize: 14, fontWeight: '700', color: '#64748b' },

  // Success
  successBox:   { alignItems: 'center', paddingVertical: 32, gap: 14 },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  successText:  { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, maxWidth: 270 },
});
