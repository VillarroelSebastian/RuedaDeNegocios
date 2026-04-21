import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Modal as RNModal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { API_URL } from '../utils/userStore';

const MAX_PARTICIPANTES = 5;

const RUBROS = [
  'Agropecuario y Ganadería','Comercio y Distribución','Construcción e Infraestructura',
  'Educación y Capacitación','Finanzas y Seguros','Gastronomía y Turismo',
  'Industria y Manufactura','Minería e Hidrocarburos','Salud y Bienestar',
  'Servicios Profesionales','Tecnología e Innovación','Transporte y Logística',
  'Artesanía y Cultura','Medio Ambiente y Energía','Inmobiliario','Otro',
];

const SOUTH_AMERICA: Record<string, string[]> = {
  'Bolivia':   ['Trinidad','La Paz','Santa Cruz de la Sierra','Cochabamba','Sucre','Oruro','Potosí','Tarija','Cobija','Riberalta'],
  'Argentina': ['Buenos Aires','Córdoba','Rosario','Mendoza','Tucumán','La Plata','Mar del Plata','Salta'],
  'Brasil':    ['São Paulo','Río de Janeiro','Brasilia','Salvador','Fortaleza','Manaus','Curitiba','Recife'],
  'Chile':     ['Santiago','Valparaíso','Concepción','Antofagasta','Viña del Mar','Temuco'],
  'Colombia':  ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Bucaramanga'],
  'Ecuador':   ['Quito','Guayaquil','Cuenca','Manta','Ambato'],
  'Paraguay':  ['Asunción','Ciudad del Este','Encarnación','Luque'],
  'Perú':      ['Lima','Arequipa','Trujillo','Cusco','Piura','Chiclayo'],
  'Uruguay':   ['Montevideo','Salto','Paysandú','Rivera'],
  'Venezuela': ['Caracas','Maracaibo','Valencia','Barquisimeto'],
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface EventoPublico {
  id: number;
  nombre: string;
  edicion: string;
  sobreElEvento: string | null;
  urlImagenMapaRecinto: string | null;
  ciudadEvento: string | null;
  paisEvento: string | null;
  eventoreglaqr: ReglaqR[];
}
interface ReglaqR { id: number; rangoDesde: number; rangoHasta: number; monto: number; urlQR: string }
interface Participante { nombre: string; apellido: string; correo: string; cargo: string; telefono: string }

// ─── AppModal ────────────────────────────────────────────────────────────────
type ModalType = 'success' | 'error' | 'warning' | 'confirm';
function AppModal({ visible, type, title, message, onClose, onConfirm }: {
  visible: boolean; type: ModalType; title: string; message: string;
  onClose: () => void; onConfirm?: () => void;
}) {
  const colors: Record<ModalType, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '❌' },
    warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️' },
    confirm: { bg: '#f0f9ff', border: '#7dd3fc', icon: '❓' },
  };
  const c = colors[type];
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>{c.icon}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>{title}</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {onConfirm && (
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={onClose}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#5B9A27', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={onConfirm ?? onClose}>
              <Text style={{ fontWeight: '700', color: '#fff' }}>{onConfirm ? 'Confirmar' : 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }} onPress={onClose} activeOpacity={1}>
        <Image source={{ uri: url }} style={{ width: '95%', height: '70%' }} resizeMode="contain" />
        <TouchableOpacity onPress={onClose} style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Cerrar</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

// ─── Picker Modal ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, items, selected, onSelect, onClose }: {
  visible: boolean; title: string; items: string[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#6b7280', fontSize: 16 }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {items.map(item => (
              <TouchableOpacity
                key={item}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between' }}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={{ fontSize: 14, color: '#111827' }}>{item}</Text>
                {selected === item && <Text style={{ color: '#5B9A27' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

// ─── StepBar ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Empresa', 'Pago', 'Participantes', 'Confirmación'];
function StepBar({ step }: { step: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={label}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? '#5B9A27' : '#e5e7eb' }}>
                <Text style={{ color: i <= step ? '#fff' : '#9ca3af', fontWeight: '700', fontSize: 12 }}>{i < step ? '✓' : String(i + 1)}</Text>
              </View>
              <Text style={{ fontSize: 9, color: i <= step ? '#5B9A27' : '#9ca3af', marginTop: 3, fontWeight: i === step ? '700' : '400' }}>{label}</Text>
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View style={{ flex: 1, height: 2, backgroundColor: i < step ? '#5B9A27' : '#e5e7eb', marginHorizontal: 2, marginBottom: 16 }} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}
const inp = { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: '#fafafa', color: '#111827' };
const selBtn = (hasVal: boolean) => ({ ...inp, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const });

// ─── Main ────────────────────────────────────────────────────────────────────
export default function RegistroScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const [modal, setModal] = useState<{ visible: boolean; type: ModalType; title: string; message: string; onConfirm?: () => void }>({
    visible: false, type: 'error', title: '', message: '',
  });
  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void) =>
    setModal({ visible: true, type, title, message, onConfirm });
  const closeModal = () => setModal(m => ({ ...m, visible: false }));

  // Picker states
  const [showRubros, setShowRubros] = useState(false);
  const [showPaises, setShowPaises] = useState(false);
  const [showCiudades, setShowCiudades] = useState(false);

  // Step 1
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [correoEmpresa, setCorreoEmpresa] = useState('');
  const [telefonoWA, setTelefonoWA] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [numParticipantes, setNumParticipantes] = useState(1);
  const [tipoParticipacion, setTipoParticipacion] = useState<'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDO'>('PRESENCIAL');

  // Step 2
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [comprobanteUri, setComprobanteUri] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [confirmadoPago, setConfirmadoPago] = useState(false);

  // Step 3
  const [responsable, setResponsable] = useState<Participante>({ nombre: '', apellido: '', correo: '', cargo: '', telefono: '' });
  const [adicionales, setAdicionales] = useState<Participante[]>([]);

  // Step 4
  const [resultado, setResultado] = useState<any>(null);

  // Init
  useEffect(() => {
    fetch(`${API_URL}/public/evento`)
      .then(r => r.json())
      .then(ev => setEvento(ev))
      .catch(() => showModal('error', 'Sin conexión', 'No se pudo cargar la información del evento.'))
      .finally(() => setLoadingInit(false));
  }, []);

  // QR helpers
  const reglasQR = evento?.eventoreglaqr ?? [];
  const reglaActual = reglasQR.find(r => numParticipantes >= r.rangoDesde && numParticipantes <= r.rangoHasta) ?? reglasQR[reglasQR.length - 1];
  const costoBase = Number(evento?.montoBaseIncripcionBolivianos ?? reglaActual?.monto ?? 0);
  const totalPago = costoBase;
  const urlQRActual = reglaActual?.urlQR ?? '';

  // File upload
  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showModal('warning', 'Permiso requerido', 'Se necesita acceso a la galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'comprobante.jpg' } as any);
      const res = await fetch(`${API_URL}/admin/imagenes/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al subir');
      setComprobanteUrl(data.url);
      setComprobanteUri(asset.uri);
    } catch (err: any) {
      showModal('error', 'Error al subir', err.message ?? 'No se pudo subir el comprobante.');
    } finally { setUploadingFile(false); }
  };

  // Validations
  const validateStep0 = () => {
    if (!nombre.trim()) return 'El nombre de la empresa es requerido.';
    if (!rubro) return 'Selecciona un rubro.';
    if (!pais) return 'Selecciona un país.';
    if (!ciudad) return 'Selecciona una ciudad.';
    if (!correoEmpresa.trim()) return 'El correo corporativo es requerido.';
    if (!telefonoWA.trim()) return 'El teléfono/WhatsApp es requerido.';
    return null;
  };
  const validateStep1 = () => {
    if (!comprobanteUrl) return 'Sube el comprobante de pago.';
    if (!confirmadoPago) return 'Confirma que el pago fue realizado.';
    return null;
  };
  const validateStep2 = () => {
    if (!responsable.nombre.trim() || !responsable.apellido.trim()) return 'Nombre y apellido del responsable son requeridos.';
    if (!responsable.correo.trim()) return 'El correo del responsable es requerido.';
    if (!responsable.cargo.trim()) return 'El cargo del responsable es requerido.';
    if (!responsable.telefono.trim()) return 'El teléfono del responsable es requerido.';
    for (const [i, p] of adicionales.entries()) {
      if (!p.nombre.trim() || !p.apellido.trim() || !p.correo.trim() || !p.cargo.trim() || !p.telefono.trim())
        return `Completa todos los campos del participante adicional ${i + 2}.`;
    }
    return null;
  };

  const goNext = () => {
    if (step === 0) { const e = validateStep0(); if (e) { showModal('warning', 'Campos incompletos', e); return; } }
    if (step === 1) { const e = validateStep1(); if (e) { showModal('warning', 'Pago pendiente', e); return; } }
    if (step === 2) { const e = validateStep2(); if (e) { showModal('warning', 'Participantes incompletos', e); return; } submitRegistro(); return; }
    setStep(s => s + 1);
  };

  const submitRegistro = async () => {
    setSubmitting(true);
    try {
      const payload = {
        empresa: {
          nombre: nombre.trim(),
          rubro,
          paisNombre: pais,
          ciudadNombre: ciudad,
          sitioWeb: sitioWeb.trim() || null,
          correoCorporativo: correoEmpresa.trim(),
          telefonoWhatsapp: telefonoWA.trim(),
          descripcion: descripcion.trim() || null,
        },
        participacion: { numeroParticipantes: numParticipantes, tipoParticipacion },
        comprobante: { urlComprobante: comprobanteUrl },
        participantes: [
          { nombreCompleto: `${responsable.nombre} ${responsable.apellido}`, cargo: responsable.cargo, correo: responsable.correo, telefono: responsable.telefono, esResponsable: true },
          ...adicionales.map(p => ({ nombreCompleto: `${p.nombre} ${p.apellido}`, cargo: p.cargo, correo: p.correo, telefono: p.telefono, esResponsable: false })),
        ],
      };
      const res = await fetch(`${API_URL}/public/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al registrar');
      setResultado(data);
      setStep(3);
    } catch (err: any) {
      showModal('error', 'Error en el registro', err.message ?? 'No se pudo completar el registro.');
    } finally { setSubmitting(false); }
  };

  if (loadingInit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#5B9A27" />
        <Text style={{ color: '#6b7280', marginTop: 12 }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  const paisList = Object.keys(SOUTH_AMERICA);
  const ciudadList = pais ? SOUTH_AMERICA[pais] ?? [] : [];

  // ── Step 4: Confirmation ─────────────────────────────────────
  if (step === 3 && resultado) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <StatusBar style="dark" />
        <StepBar step={3} />
        {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 72, height: 72, backgroundColor: '#dcfce7', borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 36 }}>✅</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' }}>¡Registro completado!</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              Tu empresa fue registrada. El equipo verificará tu pago y recibirás acceso al sistema.
            </Text>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#5B9A27' }}>{resultado.empresaevento?.numeroParticipantes ?? numParticipantes}</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>Participantes</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#f59e0b' }}>PENDIENTE</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>Estado del pago</Text>
            </View>
          </View>

          {/* Empresa */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#5B9A27', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Empresa registrada</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{nombre}</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{rubro} · {ciudad}, {pais}</Text>
          </View>

          {/* Ver participantes */}
          <TouchableOpacity
            onPress={() => setShowParticipants(v => !v)}
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ fontWeight: '600', color: '#374151' }}>{showParticipants ? 'Ocultar participantes' : 'Ver participantes'}</Text>
          </TouchableOpacity>

          {showParticipants && resultado.participantes?.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              {resultado.participantes.map((p: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: '#166534' }}>{(p.nombres ?? p.nombreCompleto ?? '?')[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{p.nombres ?? p.nombreCompleto} {p.apellidoPaterno ?? ''}</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>{p.cargo} · {p.correo}</Text>
                    </View>
                  </View>
                  {p.esResponsable && (
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>Resp.</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Event banner */}
          {evento && (
            <View style={{ backgroundColor: '#111827', borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
              {evento.urlImagenMapaRecinto ? (
                <TouchableOpacity onPress={() => setLightboxUrl(evento.urlImagenMapaRecinto!)}>
                  <Image source={{ uri: evento.urlImagenMapaRecinto }} style={{ width: '100%', height: 140 }} resizeMode="contain" />
                </TouchableOpacity>
              ) : (
                <View style={{ height: 80, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28 }}>🗺️</Text>
                </View>
              )}
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{evento.nombre}</Text>
                {evento.sobreElEvento && (
                  <Text style={{ fontSize: 12, color: '#d1d5db', marginTop: 6, lineHeight: 18 }} numberOfLines={3}>{evento.sobreElEvento}</Text>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity style={{ backgroundColor: '#5B9A27', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }} onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Ir al Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Steps 0-2 ───────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      <AppModal visible={modal.visible} type={modal.type} title={modal.title} message={modal.message} onClose={closeModal} onConfirm={modal.onConfirm} />
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* Pickers */}
      <PickerModal visible={showRubros} title="Seleccionar rubro" items={RUBROS} selected={rubro} onSelect={setRubro} onClose={() => setShowRubros(false)} />
      <PickerModal visible={showPaises} title="Seleccionar país" items={paisList} selected={pais} onSelect={(v) => { setPais(v); setCiudad(''); }} onClose={() => setShowPaises(false)} />
      <PickerModal visible={showCiudades} title="Seleccionar ciudad" items={ciudadList} selected={ciudad} onSelect={setCiudad} onClose={() => setShowCiudades(false)} />

      {/* Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 22, color: '#374151' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>Registro de Empresa</Text>
      </View>

      <StepBar step={step} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

          {/* ─── STEP 0: Empresa ────────────────────────────────── */}
          {step === 0 && (
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Información de la empresa</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Datos generales de tu organización.</Text>

              <Field label="Nombre de la empresa *">
                <TextInput style={inp} value={nombre} onChangeText={setNombre} placeholder="Empresa S.R.L." placeholderTextColor="#9ca3af" />
              </Field>

              <Field label="Rubro *">
                <TouchableOpacity style={selBtn(!!rubro)} onPress={() => setShowRubros(true)}>
                  <Text style={{ color: rubro ? '#111827' : '#9ca3af', fontSize: 14 }}>{rubro || 'Seleccionar rubro…'}</Text>
                  <Text style={{ color: '#9ca3af' }}>▾</Text>
                </TouchableOpacity>
              </Field>

              <Field label="País *">
                <TouchableOpacity style={selBtn(!!pais)} onPress={() => setShowPaises(true)}>
                  <Text style={{ color: pais ? '#111827' : '#9ca3af', fontSize: 14 }}>{pais || 'Seleccionar país…'}</Text>
                  <Text style={{ color: '#9ca3af' }}>▾</Text>
                </TouchableOpacity>
              </Field>

              <Field label="Ciudad *">
                <TouchableOpacity
                  style={{ ...selBtn(!!ciudad), opacity: pais ? 1 : 0.5 }}
                  onPress={() => pais ? setShowCiudades(true) : showModal('warning', 'Selecciona un país', 'Primero selecciona un país para ver las ciudades disponibles.')}
                >
                  <Text style={{ color: ciudad ? '#111827' : '#9ca3af', fontSize: 14 }}>{ciudad || (pais ? 'Seleccionar ciudad…' : 'Selecciona un país primero')}</Text>
                  <Text style={{ color: '#9ca3af' }}>▾</Text>
                </TouchableOpacity>
              </Field>

              <Field label="Correo corporativo *">
                <TextInput style={inp} value={correoEmpresa} onChangeText={setCorreoEmpresa} placeholder="contacto@empresa.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
              </Field>

              <Field label="Teléfono / WhatsApp *">
                <TextInput style={inp} value={telefonoWA} onChangeText={setTelefonoWA} placeholder="+591 7XXXXXXX" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
              </Field>

              <Field label="Sitio web">
                <TextInput style={inp} value={sitioWeb} onChangeText={setSitioWeb} placeholder="https://www.empresa.com" placeholderTextColor="#9ca3af" autoCapitalize="none" />
              </Field>

              <Field label="Descripción">
                <TextInput style={{ ...inp, minHeight: 80, textAlignVertical: 'top' }} value={descripcion} onChangeText={setDescripcion} placeholder="Breve descripción…" placeholderTextColor="#9ca3af" multiline numberOfLines={3} />
              </Field>

              {/* Participación */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Tipo de participación *</Text>
                {(['PRESENCIAL', 'VIRTUAL', 'HIBRIDO'] as const).map(tipo => (
                  <TouchableOpacity key={tipo} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }} onPress={() => setTipoParticipacion(tipo)}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tipoParticipacion === tipo ? '#5B9A27' : '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      {tipoParticipacion === tipo && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B9A27' }} />}
                    </View>
                    <Text style={{ fontSize: 14, color: '#374151' }}>{tipo}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 12, marginBottom: 8 }}>Número de participantes (máx. {MAX_PARTICIPANTES})</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setNumParticipantes(n => Math.max(1, n - 1))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20, color: '#374151' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', minWidth: 30, textAlign: 'center' }}>{numParticipantes}</Text>
                  <TouchableOpacity
                    onPress={() => setNumParticipantes(n => Math.min(MAX_PARTICIPANTES, n + 1))}
                    disabled={numParticipantes >= MAX_PARTICIPANTES}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: numParticipantes >= MAX_PARTICIPANTES ? '#e5e7eb' : '#5B9A27', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 20, color: numParticipantes >= MAX_PARTICIPANTES ? '#9ca3af' : '#fff' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ─── STEP 1: Pago ────────────────────────────────────── */}
          {step === 1 && (
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Pago</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Escanea el QR y sube el comprobante.</Text>

              {/* Resumen */}
              <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Resumen</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: '#374151' }}>Participantes</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{numParticipantes}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>Total a pagar</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#5B9A27' }}>Bs {totalPago.toFixed(2)}</Text>
                </View>
              </View>

              {/* QR */}
              {urlQRActual ? (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Pago con QR</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Toca el QR para ampliarlo</Text>
                  <TouchableOpacity onPress={() => setLightboxUrl(urlQRActual)}>
                    <Image source={{ uri: urlQRActual }} style={{ width: 200, height: 200 }} resizeMode="contain" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>Escanea con tu app de banco o billetera digital</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                  <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 13 }}>No hay QR configurado. Contacta al administrador.</Text>
                </View>
              )}

              {/* Comprobante upload */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Comprobante de pago *</Text>
                {comprobanteUrl ? (
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setLightboxUrl(comprobanteUri || comprobanteUrl)}>
                      <Image source={{ uri: comprobanteUri || comprobanteUrl }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" />
                      <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 6 }}>Toca para ampliar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginTop: 10 }} onPress={() => { setComprobanteUrl(''); setComprobanteUri(''); }}>
                      <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Quitar archivo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickAndUpload}
                    disabled={uploadingFile}
                    style={{ borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center' }}
                  >
                    {uploadingFile ? <ActivityIndicator color="#5B9A27" /> : (
                      <>
                        <Text style={{ fontSize: 28, marginBottom: 8 }}>📎</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Seleccionar imagen</Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Confirmación */}
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }} onPress={() => setConfirmadoPago(!confirmadoPago)}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: confirmadoPago ? '#5B9A27' : '#d1d5db', backgroundColor: confirmadoPago ? '#5B9A27' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  {confirmadoPago && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                  Confirmo que he realizado el pago y adjunto el comprobante correctamente.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 2: Participantes ───────────────────────────── */}
          {step === 2 && (
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Participantes</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                {numParticipantes} participante{numParticipantes > 1 ? 's' : ''} declarados.
              </Text>

              {/* Responsable */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Responsable principal *</Text>
                {(['nombre', 'apellido', 'cargo', 'correo', 'telefono'] as const).map(field => (
                  <Field key={field} label={`${field.charAt(0).toUpperCase() + field.slice(1)} *`}>
                    <TextInput
                      style={inp}
                      value={responsable[field]}
                      onChangeText={v => setResponsable(r => ({ ...r, [field]: v }))}
                      placeholder={field === 'correo' ? 'correo@ejemplo.com' : field === 'telefono' ? '+591 7XXXXXXX' : field.charAt(0).toUpperCase() + field.slice(1)}
                      placeholderTextColor="#9ca3af"
                      keyboardType={field === 'correo' ? 'email-address' : field === 'telefono' ? 'phone-pad' : 'default'}
                      autoCapitalize={field === 'correo' ? 'none' : 'words'}
                    />
                  </Field>
                ))}
              </View>

              {/* Adicionales */}
              {adicionales.map((p, i) => (
                <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Participante {i + 2}</Text>
                    <TouchableOpacity onPress={() => setAdicionales(arr => arr.filter((_, j) => j !== i))}>
                      <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                  {(['nombre', 'apellido', 'cargo', 'correo', 'telefono'] as const).map(field => (
                    <Field key={field} label={`${field.charAt(0).toUpperCase() + field.slice(1)} *`}>
                      <TextInput
                        style={inp}
                        value={p[field]}
                        onChangeText={v => setAdicionales(arr => arr.map((x, j) => j === i ? { ...x, [field]: v } : x))}
                        placeholder={field === 'correo' ? 'correo@ejemplo.com' : field === 'telefono' ? '+591 7XXXXXXX' : field.charAt(0).toUpperCase() + field.slice(1)}
                        placeholderTextColor="#9ca3af"
                        keyboardType={field === 'correo' ? 'email-address' : field === 'telefono' ? 'phone-pad' : 'default'}
                        autoCapitalize={field === 'correo' ? 'none' : 'words'}
                      />
                    </Field>
                  ))}
                </View>
              ))}

              {adicionales.length + 1 < numParticipantes && (
                <TouchableOpacity
                  style={{ borderWidth: 2, borderColor: '#5B9A27', borderStyle: 'dashed', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16 }}
                  onPress={() => setAdicionales(arr => [...arr, { nombre: '', apellido: '', correo: '', cargo: '', telefono: '' }])}
                >
                  <Text style={{ color: '#5B9A27', fontWeight: '700', fontSize: 14 }}>+ Agregar participante adicional</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>{adicionales.length + 1} / {numParticipantes} registrados</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ─── Navigation ─────────────────────────────────────── */}
          <TouchableOpacity
            onPress={goNext}
            disabled={submitting}
            style={{ backgroundColor: '#5B9A27', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 32 }}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {step === 2 ? 'Enviar registro' : 'Continuar'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
