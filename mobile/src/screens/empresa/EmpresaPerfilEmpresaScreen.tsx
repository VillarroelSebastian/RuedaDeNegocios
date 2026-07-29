import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  Building2, MapPin, Hash, Star, Globe, Mail, Phone, FileText, Send,
  MessageSquare, ChevronLeft, Users, Sparkles, Target, Handshake, AlertCircle,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { paisConBandera } from '../../utils/pais';

const GREEN = '#449D3A';

function afinidadInfo(afinidad: string | null) {
  if (afinidad === 'alta')
    return {
      titulo: 'Alta afinidad — mismo rubro',
      detalle: 'Esta empresa pertenece a tu mismo rubro. Suelen compartir intereses, proveedores o clientes: una reunión puede abrir alianzas o acuerdos directos.',
      color: GREEN, bg: '#f0fdf4', border: '#bbf7d0', fill: true,
    };
  if (afinidad === 'media')
    return {
      titulo: 'Afinidad media — rubro complementario',
      detalle: 'Su rubro complementa al tuyo. Podrían ser proveedor, cliente o socio estratégico. Vale la pena explorar cómo se apoyan mutuamente.',
      color: '#d97706', bg: '#fffbeb', border: '#fde68a', fill: false,
    };
  return null;
}

export default function EmpresaPerfilEmpresaScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const eeId = route.params?.eeId;
  const user = userStore.get();
  const esEncargado = !!user?.esResponsable;
  const miEeId = user?.empresaeventoId;

  const [emp, setEmp] = useState<any>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    if (!eeId) { setEstado('error'); return; }
    fetch(`${API_URL}/empresa/perfil-empresa/${eeId}?miEeId=${miEeId ?? ''}`)
      .then((r) => r.json())
      .then((d) => { if (d?.empresaeventoId) { setEmp(d); setEstado('ok'); } else setEstado('error'); })
      .catch(() => setEstado('error'));
  }, [eeId, miEeId]);

  if (estado === 'cargando') return (
    <SafeAreaView style={s.center} edges={['top']}><ActivityIndicator size="large" color={GREEN} /></SafeAreaView>
  );
  if (estado === 'error' || !emp) return (
    <SafeAreaView style={s.center} edges={['top']}>
      <AlertCircle size={40} color="#f87171" />
      <Text style={{ color: '#6b7280', marginTop: 10 }}>No se pudo cargar el perfil.</Text>
    </SafeAreaView>
  );

  const afin = afinidadInfo(emp.afinidad);
  const waNum = emp.telefonoWhatsapp ? String(emp.telefonoWhatsapp).replace(/[^\d]/g, '') : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Volver */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color="#374151" />
          <Text style={s.backText}>Empresas</Text>
        </TouchableOpacity>

        {/* Hero — compacto, con avatar + nombre dentro */}
        <View style={s.hero}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {emp.urlFotoPerfil ? (
              <Image source={{ uri: emp.urlFotoPerfil }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Building2 size={34} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.nombre} numberOfLines={3}>{emp.nombre}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {!!emp.rubro && <View style={s.heroChip}><Text style={s.heroChipText}>{emp.rubro}</Text></View>}
                {!!emp.tipoParticipacion && <View style={[s.heroChip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}><Text style={s.heroChipText}>{emp.tipoParticipacion}</Text></View>}
              </View>
            </View>
          </View>
          {/* Meta */}
          <View style={s.heroMeta}>
            {!!emp.codigo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Hash size={12} color="rgba(255,255,255,0.85)" /><Text style={s.metaText}>{emp.codigo}</Text>
              </View>
            )}
            {(!!emp.ciudad || !!emp.pais) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MapPin size={12} color="rgba(255,255,255,0.85)" /><Text style={s.metaText}>{[emp.ciudad, paisConBandera(emp.pais)].filter(Boolean).join(', ')}</Text>
              </View>
            )}
            {!!emp.numeroParticipantes && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Users size={12} color="rgba(255,255,255,0.85)" /><Text style={s.metaText}>{emp.numeroParticipantes} participante(s)</Text>
              </View>
            )}
          </View>
        </View>

        {/* Acciones (encargado) */}
        {esEncargado && (
          <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigation.navigate('Empresas', { solicitarEeId: emp.empresaeventoId, solicitarNombre: emp.nombre })}
              activeOpacity={0.85}
            >
              <Send size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.btnPrimaryText}>Solicitar reunión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => navigation.navigate('Mensajes', { con: emp.empresaeventoId, nombre: emp.nombre })}
              activeOpacity={0.85}
            >
              <MessageSquare size={15} color={GREEN} style={{ marginRight: 8 }} />
              <Text style={s.btnSecondaryText}>Enviar mensaje</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Afinidad — didáctico */}
        {afin && (
          <View style={[s.card, { backgroundColor: afin.bg, borderColor: afin.border, marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Sparkles size={15} color={afin.color} style={{ marginRight: 6 }} />
              <Text style={[s.cardTitle, { color: afin.color, flex: 1 }]}>{afin.titulo}</Text>
              <Star size={15} color={afin.color} fill={afin.fill ? afin.color : 'transparent'} />
            </View>
            <Text style={s.afinDetalle}>{afin.detalle}</Text>
          </View>
        )}

        {/* Descripción */}
        {!!emp.descripcion && (
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={s.cardTitleDark}>Sobre la empresa</Text>
            <Text style={s.parrafo}>{emp.descripcion}</Text>
          </View>
        )}

        {/* Ofrece / Busca */}
        {!!emp.oferta && (
          <View style={[s.card, { marginTop: 12, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Handshake size={15} color="#166534" style={{ marginRight: 6 }} />
              <Text style={[s.tagLabel, { color: '#166534' }]}>Qué ofrece</Text>
            </View>
            <Text style={[s.parrafo, { color: '#166534' }]}>{emp.oferta}</Text>
          </View>
        )}
        {!!emp.demanda && (
          <View style={[s.card, { marginTop: 12, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Target size={15} color="#1e40af" style={{ marginRight: 6 }} />
              <Text style={[s.tagLabel, { color: '#1e40af' }]}>Qué busca</Text>
            </View>
            <Text style={[s.parrafo, { color: '#1e3a8a' }]}>{emp.demanda}</Text>
          </View>
        )}

        {/* Sectores de interés */}
        {!!emp.interesesBusqueda && (
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={s.cardTitleDark}>Sectores de interés</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {String(emp.interesesBusqueda).split(',').map((sec: string, i: number) => sec.trim() ? (
                <View key={i} style={s.sectorChip}><Text style={s.sectorChipText}>{sec.trim()}</Text></View>
              ) : null)}
            </View>
          </View>
        )}

        {/* Contacto */}
        {(!!emp.encargado || !!emp.correoCorporativo || !!waNum || !!emp.sitioWeb || !!emp.urlPdf) && (
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={s.cardTitleDark}>Contacto</Text>
            {!!emp.encargado && (
              <View style={s.contactRow}>
                <Users size={15} color="#94a3b8" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={s.contactLabel}>Encargado</Text>
                  <Text style={s.contactValue}>{emp.encargado}</Text>
                </View>
              </View>
            )}
            {!!emp.correoCorporativo && (
              <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`mailto:${emp.correoCorporativo}`).catch(() => {})} activeOpacity={0.7}>
                <Mail size={15} color={GREEN} /><Text style={s.contactBtnText} numberOfLines={1}>{emp.correoCorporativo}</Text>
              </TouchableOpacity>
            )}
            {!!waNum && (
              <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`https://wa.me/${waNum}`).catch(() => {})} activeOpacity={0.7}>
                <Phone size={15} color={GREEN} /><Text style={s.contactBtnText} numberOfLines={1}>{emp.telefonoWhatsapp}</Text>
              </TouchableOpacity>
            )}
            {!!emp.sitioWeb && (
              <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(emp.sitioWeb).catch(() => {})} activeOpacity={0.7}>
                <Globe size={15} color={GREEN} /><Text style={s.contactBtnText} numberOfLines={1}>Sitio web</Text>
              </TouchableOpacity>
            )}
            {!!emp.urlPdf && (
              <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(emp.urlPdf).catch(() => {})} activeOpacity={0.7}>
                <FileText size={15} color={GREEN} /><Text style={s.contactBtnText} numberOfLines={1}>Catálogo / brochure</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  backText: { fontSize: 15, fontWeight: '600', color: '#374151', marginLeft: 2 },
  hero: {
    marginHorizontal: 16, marginTop: 6, borderRadius: 24,
    backgroundColor: GREEN, paddingHorizontal: 18, paddingVertical: 18,
  },
  heroChip: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatar: { width: 72, height: 72, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: '#fff' },
  nombre: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 25 },
  heroMeta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  card: {
    marginHorizontal: 16, borderRadius: 16, padding: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardTitleDark: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  afinDetalle: { fontSize: 13, color: '#475569', lineHeight: 20 },
  parrafo: { fontSize: 14, color: '#475569', lineHeight: 21 },
  tagLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectorChip: { backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  sectorChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },

  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  contactLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  contactValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, marginTop: 8,
  },
  contactBtnText: { fontSize: 13, color: '#374151', fontWeight: '600', flex: 1 },

  btnPrimary: {
    flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    flexDirection: 'row', borderRadius: 14, height: 48, borderWidth: 1.5, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  btnSecondaryText: { color: GREEN, fontSize: 14, fontWeight: '700' },
});
