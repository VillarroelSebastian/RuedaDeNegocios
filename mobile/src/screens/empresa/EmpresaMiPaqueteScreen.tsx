import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import {
  Package, Check, X as XIcon, Users, Armchair, Star, Globe,
  TrendingUp, Clock, Upload, AlertCircle,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';
import ImagenLightbox from '../../components/ImagenLightbox';

const GREEN = '#449D3A';

const ETIQUETA_MESA: Record<string, string> = {
  NORMAL: 'Mesa estándar',
  PREFERENCIAL: 'Mesa preferencial',
  VIP: 'Mesa VIP',
};

export default function EmpresaMiPaqueteScreen() {
  const { show, modal } = useModal();
  const [ctx, setCtx] = useState<any>(null);
  const [datos, setDatos] = useState<any>(null);
  const [mejoras, setMejoras] = useState<any[]>([]);
  const [tienePendiente, setTienePendiente] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Flujo "Mejorar paquete"
  const [mostrarMejora, setMostrarMejora] = useState(false);
  const [seleccionado, setSeleccionado] = useState<any>(null);
  const [urlComprobante, setUrlComprobante] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const fetchAll = useCallback(async () => {
    setError('');
    try {
      const user = userStore.get();
      if (!user?.id) return;
      const ctxRes = await fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${user.id}`);
      if (!ctxRes.ok) throw new Error('No se pudo cargar tu empresa');
      const ctxData = await ctxRes.json();
      setCtx(ctxData);
      if (!ctxData?.empresaeventoId) return;

      const pRes = await fetch(`${API_URL}/empresa/mi-paquete?eeId=${ctxData.empresaeventoId}`);
      if (pRes.ok) setDatos(await pRes.json());

      if (ctxData.esResponsable) {
        const mRes = await fetch(`${API_URL}/empresa/mi-paquete/mejoras?eeId=${ctxData.empresaeventoId}`);
        if (mRes.ok) {
          const m = await mRes.json();
          setMejoras(m.mejoras ?? []);
          setTienePendiente(!!m.tieneSolicitudPendiente);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const elegirComprobante = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { show({ type: 'error', title: 'Permiso necesario', message: 'Se necesita permiso para acceder a la galería.' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('file', { uri: asset.uri, name: 'comprobante.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      const up = await fetch(`${API_URL}/public/imagenes/upload`, { method: 'POST', body: fd });
      const upData = await up.json();
      if (!upData.url) throw new Error('No se pudo subir el comprobante');
      setUrlComprobante(upData.url);
    } catch (e: any) {
      show({ type: 'error', title: 'Error al subir', message: e.message || 'No se pudo subir el comprobante.' });
    } finally {
      setSubiendo(false);
    }
  };

  const enviarMejora = async () => {
    if (!seleccionado || !urlComprobante || !ctx) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/empresa/mi-paquete/mejorar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eeId: ctx.empresaeventoId, euEncargadoId: ctx.empresaUsuarioId,
          paqueteId: seleccionado.id, urlComprobante,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setMostrarMejora(false);
      setSeleccionado(null);
      setUrlComprobante('');
      show({ type: 'success', title: 'Solicitud enviada', message: 'Tu solicitud de mejora de paquete quedó pendiente de aprobación.' });
      fetchAll();
    } catch (e: any) {
      show({ type: 'error', title: 'No se pudo enviar', message: e.message || 'Intenta nuevamente.' });
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
  );

  if (!datos) {
    return (
      <View style={s.center}>
        <Package size={48} color="#d1d5db" />
        <Text style={s.emptyTitle}>No pudimos cargar tu paquete</Text>
      </View>
    );
  }

  const sinPaquete = !datos.paqueteId;
  const capacidades = [
    { ok: true, Icon: Users, texto: `${datos.credencialesIncluidas} credenciales incluidas (hasta ${datos.maxParticipantes} personas)` },
    { ok: datos.nivelMesa !== 'NORMAL', Icon: Armchair, texto: ETIQUETA_MESA[datos.nivelMesa] ?? datos.nivelMesa },
    { ok: datos.apareceEnCatalogo, Icon: Globe, texto: 'Visible en el catálogo de participantes' },
    { ok: datos.destacadoEnListados, Icon: Star, texto: 'Destacada en los listados' },
    { ok: datos.logoEnWeb, Icon: Globe, texto: 'Logo en la web del evento' },
  ];

  return (
    <View style={s.root}>
      {modal}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <View style={s.errorBox}>
            <AlertCircle size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {!sinPaquete && mejoras.length > 0 && !mostrarMejora && (
          <TouchableOpacity
            style={[s.mejorarBtn, tienePendiente && { opacity: 0.5 }]}
            disabled={tienePendiente}
            onPress={() => setMostrarMejora(true)}
            activeOpacity={0.85}
          >
            <TrendingUp size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.mejorarBtnText}>Mejorar paquete</Text>
          </TouchableOpacity>
        )}

        {tienePendiente && (
          <View style={s.pendingBox}>
            <Clock size={16} color="#92400e" style={{ marginRight: 8 }} />
            <Text style={s.pendingText}>Ya tienes una solicitud de mejora pendiente de revisión.</Text>
          </View>
        )}

        {mostrarMejora && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Elige el nuevo paquete</Text>
            {mejoras.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSeleccionado(m)}
                style={[s.opcionPaquete, seleccionado?.id === m.id && s.opcionPaqueteSel]}
              >
                <Text style={s.opcionNombre}>{m.nombre}</Text>
                <Text style={s.opcionMeta}>{m.credencialesIncluidas} credenciales · {ETIQUETA_MESA[m.nivelMesa] ?? m.nivelMesa}</Text>
                <Text style={s.opcionCosto}>Costo de mejora: Bs {Number(m.costoMejora).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}

            {seleccionado && (
              <>
                <Text style={[s.cardTitle, { marginTop: 14 }]}>Comprobante de pago</Text>
                <View style={s.qrBox}>
                  <Text style={s.qrLabel}>QR de pago · Bs {Number(seleccionado.costoMejora).toFixed(2)}</Text>
                  <ImagenLightbox uri={seleccionado.urlQRMejora} style={{ width: '100%', height: 180, marginTop: 8 }} />
                </View>

                {urlComprobante ? (
                  <View style={s.comprobantePreview}>
                    <Image source={{ uri: urlComprobante }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                  </View>
                ) : null}

                <TouchableOpacity style={s.uploadZone} onPress={elegirComprobante} disabled={subiendo} activeOpacity={0.8}>
                  <Upload size={20} color={subiendo ? GREEN : '#9ca3af'} />
                  <Text style={[s.uploadText, subiendo && { color: GREEN }]}>
                    {subiendo ? 'Subiendo...' : urlComprobante ? 'Reemplazar comprobante' : 'Subir comprobante'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.btnCancelar} onPress={() => { setMostrarMejora(false); setSeleccionado(null); setUrlComprobante(''); }}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnEnviar, (!seleccionado || !urlComprobante || enviando) && { opacity: 0.5 }]}
                disabled={!seleccionado || !urlComprobante || enviando}
                onPress={enviarMejora}
              >
                <Text style={s.btnEnviarText}>{enviando ? 'Enviando...' : 'Solicitar mejora'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.card}>
          {sinPaquete ? (
            <Text style={s.sinPaqueteText}>
              Tu empresa se inscribió con la tarifa general del evento, sin paquete asignado.
            </Text>
          ) : (
            <>
              <Text style={s.tag}>PAQUETE CONTRATADO</Text>
              <Text style={s.paqueteNombre}>{datos.paqueteNombre}</Text>
              <Text style={s.paqueteCosto}>Bs. {datos.paqueteCosto}</Text>
            </>
          )}

          <View style={s.progresoBox}>
            <View style={s.progresoHeader}>
              <Text style={s.progresoLabel}>Participantes registrados</Text>
              <Text style={s.progresoValor}>{datos.participantesUsados} / {datos.maxParticipantes}</Text>
            </View>
            <View style={s.progresoTrack}>
              <View style={[s.progresoFill, { width: `${Math.min(100, (datos.participantesUsados / Math.max(1, datos.maxParticipantes)) * 100)}%` }]} />
            </View>
            <Text style={s.progresoHint}>
              {datos.participantesDisponibles > 0
                ? `Puedes registrar ${datos.participantesDisponibles} persona(s) más.`
                : 'Alcanzaste el máximo de tu paquete.'}
            </Text>
          </View>

          <Text style={s.sectionLabel}>Qué incluye en la plataforma</Text>
          {capacidades.map(({ ok, Icon, texto }) => (
            <View key={texto} style={s.capRow}>
              {ok ? <Check size={14} color={GREEN} /> : <XIcon size={14} color="#d1d5db" />}
              <Icon size={14} color={ok ? '#64748b' : '#d1d5db'} style={{ marginLeft: 6, marginRight: 6 }} />
              <Text style={[s.capText, !ok && s.capTextOff]}>{texto}</Text>
            </View>
          ))}

          {datos.beneficios?.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 14 }]}>Beneficios de difusión</Text>
              {datos.beneficios.map((b: string) => (
                <View key={b} style={s.capRow}>
                  <Check size={13} color={GREEN} style={{ marginTop: 2 }} />
                  <Text style={[s.capText, { marginLeft: 8 }]}>{b}</Text>
                </View>
              ))}
              <Text style={s.beneficiosHint}>La organización coordina contigo la entrega de estos beneficios.</Text>
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scroll: { padding: 16, paddingBottom: 32 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '600', flex: 1 },

  mejorarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 13, marginBottom: 14,
  },
  mejorarBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  pendingBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#fde68a',
  },
  pendingText: { color: '#92400e', fontSize: 12, fontWeight: '600', flex: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  opcionPaquete: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, padding: 12, marginBottom: 8,
  },
  opcionPaqueteSel: { borderColor: GREEN, backgroundColor: '#f0fdf4' },
  opcionNombre: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  opcionMeta:   { fontSize: 11, color: '#64748b', marginTop: 2 },
  opcionCosto:  { fontSize: 13, fontWeight: '800', color: GREEN, marginTop: 4 },

  qrBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, borderWidth: 1, borderColor: '#bbf7d0',
    padding: 12, alignItems: 'center', marginBottom: 12,
  },
  qrLabel: { fontSize: 12, fontWeight: '800', color: '#166534' },

  comprobantePreview: {
    width: '100%', height: 150, borderRadius: 12, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, overflow: 'hidden',
  },
  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb', borderRadius: 14,
    paddingVertical: 20, alignItems: 'center', gap: 6,
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnCancelar: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  btnCancelarText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  btnEnviar: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center' },
  btnEnviarText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  sinPaqueteText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  tag: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 0.5 },
  paqueteNombre: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  paqueteCosto:  { fontSize: 15, fontWeight: '700', color: '#64748b', marginTop: 2 },

  progresoBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, marginTop: 16, marginBottom: 16,
  },
  progresoHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progresoLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  progresoValor: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  progresoTrack: { height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', marginTop: 8, overflow: 'hidden' },
  progresoFill:  { height: '100%', backgroundColor: GREEN },
  progresoHint:  { fontSize: 11, color: '#64748b', marginTop: 8 },

  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginBottom: 10 },
  capRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  capText: { fontSize: 13, color: '#1f2937', flex: 1 },
  capTextOff: { color: '#9ca3af', textDecorationLine: 'line-through' },
  beneficiosHint: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
});
