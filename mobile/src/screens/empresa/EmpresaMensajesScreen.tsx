import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator,
  RefreshControl, StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { MessageSquare, Send, Search, X, ChevronLeft, Plus, Building2 } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';
const POLL_MS = 5000;

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
function fmtFechaCorta(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return fmtHora(iso);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}

export default function EmpresaMensajesScreen() {
  const route = useRoute<any>();
  const user = userStore.get();
  const eeId = user?.empresaeventoId;
  const euId = user?.empresaUsuarioId;
  const esEncargado = !!user?.esResponsable;

  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Conversación abierta (vista de chat dentro de la misma pantalla)
  const [activa, setActiva] = useState<{ eeId: number; nombre: string } | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Modal nueva conversación
  const [modalNueva, setModalNueva] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmp, setCargandoEmp] = useState(false);

  const listRef = useRef<FlatList>(null);
  const activaRef = useRef(activa);
  useEffect(() => { activaRef.current = activa; }, [activa]);

  const cargarConvs = useCallback(async () => {
    if (!eeId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/empresa/mensajes/conversaciones?eeId=${eeId}`);
      const data = res.ok ? await res.json() : [];
      setConvs(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [eeId]);

  const cargarMensajes = useCallback(async (otroEeId: number) => {
    if (!eeId) return;
    try {
      const res = await fetch(`${API_URL}/empresa/mensajes?eeId=${eeId}&otroEeId=${otroEeId}`);
      const data = res.ok ? await res.json() : [];
      setMensajes(Array.isArray(data) ? data : []);
    } catch {}
  }, [eeId]);

  useFocusEffect(useCallback(() => { cargarConvs(); }, [cargarConvs]));

  // Abrir conversación directa si llegó por parámetro (ej. desde el perfil de una empresa)
  useEffect(() => {
    const con = route.params?.con;
    const nombre = route.params?.nombre;
    if (con && nombre) setActiva({ eeId: Number(con), nombre: String(nombre) });
  }, [route.params]);

  // Polling: refresca conversaciones y el chat abierto
  useEffect(() => {
    if (!eeId) return;
    const iv = setInterval(() => {
      cargarConvs();
      const act = activaRef.current;
      if (act) cargarMensajes(act.eeId);
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [eeId, cargarConvs, cargarMensajes]);

  useEffect(() => {
    if (activa) { cargarMensajes(activa.eeId); cargarConvs(); }
  }, [activa, cargarMensajes, cargarConvs]);

  const abrirNueva = async () => {
    setModalNueva(true);
    setBusqueda('');
    setCargandoEmp(true);
    try {
      const res = await fetch(`${API_URL}/empresa/directorio?eeId=${eeId}`);
      const data = res.ok ? await res.json() : [];
      setEmpresas(Array.isArray(data) ? data : []);
    } catch {}
    finally { setCargandoEmp(false); }
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !eeId || !euId || !activa || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/empresa/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eeId, euId, receptorEeId: activa.eeId, contenido: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al enviar');
      setTexto('');
      await cargarMensajes(activa.eeId);
      cargarConvs();
    } catch (e: any) { setError(e.message || 'Error de red'); }
    finally { setEnviando(false); }
  };

  const filtradas = empresas.filter((e: any) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  // ── Vista de chat abierto ──
  if (activa) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0} style={{ flex: 1 }}>
          <View style={s.chatHeader}>
            <TouchableOpacity onPress={() => { setActiva(null); setMensajes([]); cargarConvs(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronLeft size={22} color="#374151" />
            </TouchableOpacity>
            <View style={s.chatAvatar}><Building2 size={16} color={GREEN} /></View>
            <Text style={s.chatTitle} numberOfLines={1}>{activa.nombre}</Text>
          </View>

          <FlatList
            ref={listRef}
            data={mensajes}
            keyExtractor={(m: any) => String(m.id)}
            contentContainerStyle={{ padding: 14, gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListEmptyComponent={
              <Text style={s.chatEmpty}>Escribe el primer mensaje para iniciar la conversación.</Text>
            }
            renderItem={({ item }: any) => (
              <View style={[s.burbujaWrap, item.esMio ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                <View style={[s.burbuja, item.esMio ? s.burbujaMia : s.burbujaOtra]}>
                  {!item.esMio && !!item.autor && (
                    <Text style={s.burbujaAutor}>{item.autor}</Text>
                  )}
                  <Text style={[s.burbujaTexto, item.esMio && { color: '#fff' }]}>{item.contenido}</Text>
                  <Text style={[s.burbujaHora, item.esMio && { color: 'rgba(255,255,255,0.6)' }]}>{fmtHora(item.fecha)}</Text>
                </View>
              </View>
            )}
          />

          {!!error && <Text style={s.chatError}>{error}</Text>}

          {/* Input — solo el encargado escribe; la conversación con la organización es de solo lectura */}
          {activa.eeId === 0 ? (
            <View style={s.readonlyNote}>
              <Text style={s.readonlyNoteText}>Mensajes del equipo del evento — no puedes responder por aquí.</Text>
            </View>
          ) : !esEncargado ? (
            <View style={s.readonlyNote}>
              <Text style={s.readonlyNoteText}>Solo el encargado de la empresa puede enviar mensajes.</Text>
            </View>
          ) : (
            <View style={s.inputRow}>
              <TextInput
                style={s.inputChat}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#9ca3af"
                value={texto}
                onChangeText={setTexto}
                maxLength={1000}
                multiline
              />
              <TouchableOpacity
                style={[s.sendBtn, (!texto.trim() || enviando) && { opacity: 0.4 }]}
                onPress={enviar}
                disabled={!texto.trim() || enviando}
                activeOpacity={0.8}
              >
                {enviando ? <ActivityIndicator color="#fff" size="small" /> : <Send size={17} color="#fff" />}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Lista de conversaciones ──
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Mensajes</Text>
        {esEncargado && (
          <TouchableOpacity style={s.nuevaBtn} onPress={abrirNueva} activeOpacity={0.8}>
            <Plus size={15} color="#fff" />
            <Text style={s.nuevaBtnText}>Nueva</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={s.headerSub}>
        {esEncargado ? 'Conversa directamente con otras empresas del evento' : 'Conversaciones de tu empresa (solo el encargado puede escribir)'}
      </Text>

      <FlatList
        data={convs}
        keyExtractor={(c: any) => String(c.eeId)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargarConvs(); }} colors={[GREEN]} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <MessageSquare size={44} color="#d1d5db" />
            <Text style={s.emptyText}>Aún no tienes conversaciones.</Text>
            <Text style={s.emptySub}>Usa "Nueva" para escribirle a una empresa.</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <TouchableOpacity
            style={s.convCard}
            onPress={() => setActiva({ eeId: item.eeId, nombre: item.nombre })}
            activeOpacity={0.8}
          >
            <View style={s.convAvatar}>
              <Text style={s.convAvatarText}>{(item.nombre ?? 'E')[0].toUpperCase()}</Text>
              {item.noLeidos > 0 && (
                <View style={s.badge}><Text style={s.badgeText}>{item.noLeidos > 9 ? '9+' : String(item.noLeidos)}</Text></View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[s.convNombre, item.noLeidos > 0 && { fontWeight: '800' }]} numberOfLines={1}>{item.nombre}</Text>
                <Text style={s.convFecha}>{fmtFechaCorta(item.fecha)}</Text>
              </View>
              <Text style={[s.convUltimo, item.noLeidos > 0 && { color: '#374151', fontWeight: '600' }]} numberOfLines={1}>
                {item.esMio ? 'Tú: ' : ''}{item.ultimoMensaje}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal nueva conversación */}
      <Modal visible={modalNueva} animationType="slide" transparent statusBarTranslucent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Nueva conversación</Text>
              <TouchableOpacity onPress={() => setModalNueva(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={s.searchBox}>
              <Search size={15} color="#94a3b8" />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar empresa..."
                placeholderTextColor="#9ca3af"
                style={s.searchInput}
              />
            </View>
            {cargandoEmp ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={GREEN} />
            ) : (
              <FlatList
                data={filtradas}
                keyExtractor={(e: any) => String(e.empresaeventoId)}
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ padding: 10 }}
                ListEmptyComponent={<Text style={[s.emptyText, { paddingVertical: 20 }]}>Sin resultados.</Text>}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={s.empRow}
                    onPress={() => { setModalNueva(false); setActiva({ eeId: item.empresaeventoId, nombre: item.nombre }); }}
                    activeOpacity={0.8}
                  >
                    <View style={s.empAvatar}><Text style={s.empAvatarText}>{(item.nombre ?? 'E')[0].toUpperCase()}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.empNombre} numberOfLines={1}>{item.nombre}</Text>
                      {!!item.rubro && <Text style={s.empRubro} numberOfLines={1}>{item.rubro}</Text>}
                    </View>
                  </TouchableOpacity>
                )}
              />
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub:   { fontSize: 12, color: '#94a3b8', paddingHorizontal: 16, marginTop: 2, marginBottom: 4 },
  nuevaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  nuevaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  emptySub:  { fontSize: 12, color: '#b6bec9', textAlign: 'center' },

  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 13, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  convAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  convAvatarText: { fontSize: 18, fontWeight: '800', color: GREEN },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  convNombre: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  convFecha:  { fontSize: 10, color: '#94a3b8' },
  convUltimo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  // Chat
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  chatAvatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  chatTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  chatEmpty: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 24 },
  chatError: { fontSize: 12, color: '#dc2626', textAlign: 'center', paddingBottom: 4 },

  burbujaWrap: { width: '100%' },
  burbuja: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  burbujaMia:  { backgroundColor: GREEN, borderTopRightRadius: 4 },
  burbujaOtra: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderTopLeftRadius: 4 },
  burbujaAutor: { fontSize: 10, fontWeight: '800', color: GREEN, marginBottom: 2 },
  burbujaTexto: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  burbujaHora:  { fontSize: 9, color: '#94a3b8', marginTop: 3, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  inputChat: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 13, paddingVertical: 9, fontSize: 14, color: '#0f172a',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  readonlyNote: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  readonlyNoteText: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },

  // Modal nueva conversación
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 20, maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
  },
  empAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  empAvatarText: { fontSize: 15, fontWeight: '800', color: GREEN },
  empNombre: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  empRubro:  { fontSize: 11, color: '#94a3b8' },
});
