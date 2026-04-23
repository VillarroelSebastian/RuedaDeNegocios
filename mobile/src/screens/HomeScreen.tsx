import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Linking, ImageBackground, Image,
} from 'react-native';
import { API_URL } from '../utils/userStore';

// ─── Paleta ────────────────────────────────────────────────────────────────
const C = {
  green950: '#052e16',
  green900: '#14532d',
  green800: '#166534',
  green700: '#15803d',
  green600: '#16a34a',
  green400: '#4ade80',
  green200: '#bbf7d0',
  green100: '#dcfce7',
  green50:  '#f0fdf4',
  blue100:  '#dbeafe',
  blue700:  '#1d4ed8',
  purple100:'#ede9fe',
  purple700:'#7c3aed',
  amber100: '#fef3c7',
  amber700: '#b45309',
  gray50:   '#f8fafc',
  gray100:  '#f1f5f9',
  gray200:  '#e2e8f0',
  gray400:  '#94a3b8',
  gray500:  '#6b7280',
  gray600:  '#4b5563',
  gray700:  '#374151',
  gray800:  '#1f2937',
  gray900:  '#111827',
  white:    '#ffffff',
};

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface EventoPublico {
  id: number;
  nombre: string;
  edicion: string;
  descripcion: string | null;
  sobreElEvento: string | null;
  fechaInicioEvento: string;
  fechaFinEvento: string;
  correoContacto: string | null;
  telefonoContacto: string | null;
  enlaceFacebook: string | null;
  enlaceInstagram: string | null;
  enlaceTwitterX: string | null;
  urlLogoEvento: string | null;
  urlImagenMapaRecinto: string | null;
  urlImagenCronogramaCharlas: string | null;
  ciudadEvento: string | null;
  paisEvento: string | null;
  stats: { empresasCount: number; mesasCount: number; actividadesCount: number; tecnicosCount: number };
}

interface Actividad {
  id: number;
  tipoActividad: string;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  horaInicioActividad: string;
  horaFinActividad: string;
  nombreCompletoPilaExpositor: string | null;
  organizacionDelExpositor: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const TIPO_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  CONFERENCIA: { bg: C.blue100,   text: C.blue700,   border: '#93c5fd' },
  TALLER:      { bg: C.green100,  text: C.green700,  border: '#86efac' },
  PANEL:       { bg: C.purple100, text: C.purple700, border: '#c4b5fd' },
  Seminario:   { bg: C.amber100,  text: C.amber700,  border: '#fcd34d' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [evRes, actsRes] = await Promise.all([
          fetch(`${API_URL}/public/evento`),
          fetch(`${API_URL}/public/actividades`),
        ]);
        const ev   = evRes.ok   ? await evRes.json()   : null;
        const acts = actsRes.ok ? await actsRes.json() : [];
        if (ev && ev.id && ev.nombre && ev.stats) setEvento(ev);
        setActividades(Array.isArray(acts) ? acts.slice(0, 3) : []);
      } catch { /* sin conexión */ } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <StatusBar barStyle="light-content" backgroundColor={C.green900} />
        <View style={s.loadingLogo}>
          <Text style={s.loadingLogoText}>RN</Text>
        </View>
        <ActivityIndicator size="large" color={C.green400} style={{ marginTop: 24 }} />
        <Text style={s.loadingText}>Cargando evento…</Text>
      </View>
    );
  }

  // ── Sin evento ───────────────────────────────────────────────────────────
  if (!evento) {
    return (
      <View style={s.emptyScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={s.emptyIcon}><Text style={{ fontSize: 36 }}>📅</Text></View>
        <Text style={s.emptyTitle}>Sin evento activo</Text>
        <Text style={s.emptySubtitle}>Contacta al administrador para más información.</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
          <Text style={s.emptyBtnText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ubicacion = [evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <StatusBar barStyle="light-content" backgroundColor={C.green900} />
      <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 0 }}>

        {/* ════════════════════════════════════ HERO ══════════════════════ */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80' }}
          style={s.heroBg}
          resizeMode="cover"
        >
          {/* Overlay degradado */}
          <View style={s.heroOverlay} />

          <View style={s.heroContent}>
            {/* Logo o iniciales */}
            {evento.urlLogoEvento
              ? <Image source={{ uri: evento.urlLogoEvento }} style={s.heroLogo} resizeMode="contain" />
              : (
                <View style={s.heroLogoFallback}>
                  <Text style={s.heroLogoFallbackText}>RN</Text>
                </View>
              )
            }

            {/* Pill edición */}
            <View style={s.heroPill}>
              <View style={s.heroPillDot} />
              <Text style={s.heroPillText}>
                {`Edición ${evento.edicion}`}{ubicacion ? `  ·  ${ubicacion}` : ''}
              </Text>
            </View>

            {/* Título */}
            <Text style={s.heroTitle}>{evento.nombre}</Text>

            {/* Descripción */}
            {evento.descripcion && (
              <Text style={s.heroDesc}>{evento.descripcion}</Text>
            )}

            {/* Fechas + lugar */}
            <View style={s.heroMeta}>
              <Text style={s.heroMetaText}>
                📅  {fmtDate(evento.fechaInicioEvento)} – {fmtDate(evento.fechaFinEvento)}
              </Text>
              {ubicacion ? <Text style={s.heroMetaText}>📍  {ubicacion}</Text> : null}
            </View>

            {/* Botones CTA */}
            <View style={s.heroBtns}>
              <TouchableOpacity style={s.heroBtnPrimary} onPress={() => navigation.navigate('Registro')} activeOpacity={0.85}>
                <Text style={s.heroBtnPrimaryText}>Registrar empresa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroBtnSecondary} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
                <Text style={s.heroBtnSecondaryText}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* ══════════════════════════════════ STATS ═══════════════════════ */}
        <View style={s.statsSection}>
          {[
            { label: 'Empresas',    value: evento.stats.empresasCount,    icon: '🏢' },
            { label: 'Mesas',       value: evento.stats.mesasCount,        icon: '🪑' },
            { label: 'Actividades', value: evento.stats.actividadesCount,  icon: '📋' },
            { label: 'Técnicos',    value: evento.stats.tecnicosCount,     icon: '👥' },
          ].map((stat, i) => (
            <View key={stat.label} style={[s.statItem, i < 3 && s.statItemBorder]}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════ SOBRE EL EVENTO ═════════════════ */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Sobre el Evento</Text>
          <Text style={s.sectionTitle}>El encuentro empresarial del Beni</Text>
          <Text style={s.sectionBody}>
            {evento.sobreElEvento ??
              'La Rueda de Negocios del Beni es el espacio más importante de encuentro empresarial del departamento. Conectamos empresas, emprendedores y actores del sector productivo mediante reuniones previamente agendadas, facilitando oportunidades comerciales y alianzas estratégicas.'}
          </Text>

          {/* Bullets */}
          <View style={{ marginTop: 16, gap: 10 }}>
            {[
              'Reuniones de negocios de 20 minutos',
              'Agenda previamente coordinada',
              'Empresas de todo el país',
              'Actividades y conferencias especializadas',
            ].map((item) => (
              <View key={item} style={s.bullet}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Mapa recinto */}
          {evento.urlImagenMapaRecinto && (
            <View style={s.recintoImg}>
              <Image source={{ uri: evento.urlImagenMapaRecinto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View style={s.recintoLabel}>
                <Text style={s.recintoLabelText}>📍  Mapa del recinto</Text>
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════════════════ ACTIVIDADES ══════════════════════ */}
        {actividades.length > 0 && (
          <View style={[s.section, { backgroundColor: C.white }]}>
            <Text style={s.sectionLabel}>Programa</Text>
            <Text style={s.sectionTitle}>Actividades del Evento</Text>
            <Text style={[s.sectionBody, { marginBottom: 20 }]}>
              Conferencias, talleres y paneles para potenciar tu negocio.
            </Text>

            {actividades.map((act) => {
              const t = TIPO_STYLE[act.tipoActividad] ?? { bg: C.gray100, text: C.gray600, border: C.gray200 };
              return (
                <View key={act.id} style={s.actCard}>
                  {/* Borde izquierdo de color */}
                  <View style={[s.actAccent, { backgroundColor: t.border }]} />

                  <View style={s.actBody}>
                    {/* Cabecera: badge + hora */}
                    <View style={s.actHeader}>
                      <View style={[s.actBadge, { backgroundColor: t.bg }]}>
                        <Text style={[s.actBadgeText, { color: t.text }]}>{act.tipoActividad}</Text>
                      </View>
                      <Text style={s.actTime}>
                        {fmtTime(act.horaInicioActividad)} – {fmtTime(act.horaFinActividad)}
                      </Text>
                    </View>

                    {/* Nombre */}
                    <Text style={s.actName}>{act.nombreActividad}</Text>

                    {/* Descripción */}
                    {act.descripcionActividad ? (
                      <Text style={s.actDesc} numberOfLines={2}>{act.descripcionActividad}</Text>
                    ) : null}

                    {/* Sala */}
                    <Text style={s.actRoom}>📍  {act.nombreSalaEspacio}</Text>

                    {/* Expositor */}
                    {act.nombreCompletoPilaExpositor && (
                      <View style={s.actSpeaker}>
                        <View style={s.actSpeakerAvatar}>
                          <Text style={s.actSpeakerAvatarText}>{act.nombreCompletoPilaExpositor[0]}</Text>
                        </View>
                        <View>
                          <Text style={s.actSpeakerName}>{act.nombreCompletoPilaExpositor}</Text>
                          {act.organizacionDelExpositor
                            ? <Text style={s.actSpeakerOrg}>{act.organizacionDelExpositor}</Text>
                            : null}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ══════════════════════════════ CRONOGRAMA ═══════════════════════ */}
        {evento.urlImagenCronogramaCharlas && (
          <View style={[s.section, { alignItems: 'center' }]}>
            <Text style={s.sectionLabel}>Programa</Text>
            <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Cronograma de Charlas</Text>
            <View style={s.cronograma}>
              <Image
                source={{ uri: evento.urlImagenCronogramaCharlas }}
                style={{ width: '100%', height: 260 }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* ════════════════════════════════ CTA BANNER ═════════════════════ */}
        <View style={s.ctaBanner}>
          <Text style={s.ctaTitle}>¿Tu empresa ya está inscrita?</Text>
          <Text style={s.ctaBody}>
            Accede al panel de administración para gestionar el evento, empresas y pagos.
          </Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Iniciar Sesión  →</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════ CONTACTO ════════════════════════ */}
        <View style={[s.section, { backgroundColor: C.white }]}>
          <Text style={[s.sectionLabel, { textAlign: 'center' }]}>Información</Text>
          <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Contacto</Text>
          <Text style={[s.sectionBody, { textAlign: 'center', marginBottom: 20 }]}>
            ¿Tienes dudas? Comunícate con nosotros.
          </Text>

          {evento.telefonoContacto && (
            <TouchableOpacity style={s.contactCard} onPress={() => Linking.openURL(`tel:${evento.telefonoContacto}`)} activeOpacity={0.8}>
              <View style={[s.contactIcon, { backgroundColor: C.green100 }]}>
                <Text style={s.contactIconEmoji}>📞</Text>
              </View>
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>Teléfono / WhatsApp</Text>
                <Text style={s.contactValue}>{evento.telefonoContacto}</Text>
              </View>
              <Text style={s.contactArrow}>›</Text>
            </TouchableOpacity>
          )}

          {evento.correoContacto && (
            <TouchableOpacity style={s.contactCard} onPress={() => Linking.openURL(`mailto:${evento.correoContacto}`)} activeOpacity={0.8}>
              <View style={[s.contactIcon, { backgroundColor: C.blue100 }]}>
                <Text style={s.contactIconEmoji}>✉️</Text>
              </View>
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>Correo Electrónico</Text>
                <Text style={s.contactValue}>{evento.correoContacto}</Text>
              </View>
              <Text style={s.contactArrow}>›</Text>
            </TouchableOpacity>
          )}

          {ubicacion ? (
            <View style={s.contactCard}>
              <View style={[s.contactIcon, { backgroundColor: C.amber100 }]}>
                <Text style={s.contactIconEmoji}>📍</Text>
              </View>
              <View style={s.contactInfo}>
                <Text style={s.contactLabel}>Ubicación</Text>
                <Text style={s.contactValue}>{evento.ciudadEvento ?? ''}</Text>
                {evento.paisEvento ? <Text style={s.contactSub}>{evento.paisEvento}</Text> : null}
              </View>
            </View>
          ) : null}

          {/* Redes sociales */}
          {(evento.enlaceFacebook || evento.enlaceInstagram || evento.enlaceTwitterX) && (
            <View style={s.socialRow}>
              {evento.enlaceFacebook && (
                <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#1877f2' }]} onPress={() => Linking.openURL(evento.enlaceFacebook!)} activeOpacity={0.85}>
                  <Text style={s.socialBtnText}>f</Text>
                </TouchableOpacity>
              )}
              {evento.enlaceInstagram && (
                <TouchableOpacity style={[s.socialBtn, { backgroundColor: '#e1306c' }]} onPress={() => Linking.openURL(evento.enlaceInstagram!)} activeOpacity={0.85}>
                  <Text style={s.socialBtnText}>ig</Text>
                </TouchableOpacity>
              )}
              {evento.enlaceTwitterX && (
                <TouchableOpacity style={[s.socialBtn, { backgroundColor: C.gray900 }]} onPress={() => Linking.openURL(evento.enlaceTwitterX!)} activeOpacity={0.85}>
                  <Text style={s.socialBtnText}>X</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════ FOOTER ═══════════════════════ */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <Text style={s.footerTitle}>{evento.nombre}</Text>
          <Text style={s.footerSub}>
            Edición {evento.edicion}{ubicacion ? `  ·  ${ubicacion}` : ''}
          </Text>
          <Text style={s.footerCopy}>© {new Date().getFullYear()} Todos los derechos reservados</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Loading / vacío
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green900 },
  loadingLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.green800, alignItems: 'center', justifyContent: 'center' },
  loadingLogoText: { color: C.white, fontWeight: '800', fontSize: 22, letterSpacing: 1 },
  loadingText: { color: C.green200, marginTop: 12, fontSize: 14 },
  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray50, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.green100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: C.gray800, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.gray500, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 28, backgroundColor: C.green700, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // Hero
  heroBg: { width: '100%', minHeight: 520 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,46,22,0.82)',
  },
  heroContent: {
    paddingTop: 70,
    paddingBottom: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heroLogo: { width: 72, height: 72, borderRadius: 18, marginBottom: 20 },
  heroLogoFallback: { width: 72, height: 72, borderRadius: 18, backgroundColor: C.green800, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroLogoFallbackText: { color: C.white, fontWeight: '800', fontSize: 22, letterSpacing: 1 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
    gap: 8,
  },
  heroPillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green400 },
  heroPillText: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600' },
  heroTitle: {
    color: C.white,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  heroMeta: { alignItems: 'center', gap: 6, marginBottom: 28 },
  heroMetaText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 0.2 },
  heroBtns: { flexDirection: 'column', width: '100%', gap: 10 },
  heroBtnPrimary: {
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  heroBtnPrimaryText: { color: C.green900, fontWeight: '700', fontSize: 15 },
  heroBtnSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  heroBtnSecondaryText: { color: 'rgba(255,255,255,0.88)', fontWeight: '600', fontSize: 15 },

  // Stats
  statsSection: {
    flexDirection: 'row',
    backgroundColor: C.green800,
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statItemBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { color: C.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { color: C.green200, fontSize: 10, marginTop: 2, textAlign: 'center', paddingHorizontal: 4 },

  // Secciones genéricas
  section: {
    backgroundColor: C.gray50,
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.green600,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.gray900,
    lineHeight: 30,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionBody: {
    fontSize: 14,
    color: C.gray500,
    lineHeight: 22,
  },

  // Bullets
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green600, flexShrink: 0 },
  bulletText: { fontSize: 13, color: C.gray600, flex: 1, lineHeight: 20 },

  // Recinto
  recintoImg: { marginTop: 22, borderRadius: 16, overflow: 'hidden', height: 190 },
  recintoLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  recintoLabelText: { fontSize: 11, color: C.gray700, fontWeight: '600' },

  // Tarjetas de actividad
  actCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: C.gray100,
  },
  actAccent: { width: 4, flexShrink: 0 },
  actBody: { flex: 1, padding: 14 },
  actHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  actBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  actBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actTime: { color: C.gray400, fontSize: 11, flexShrink: 0 },
  actName: { fontSize: 14, fontWeight: '700', color: C.gray900, lineHeight: 20, marginBottom: 4 },
  actDesc: { fontSize: 12, color: C.gray500, lineHeight: 18, marginBottom: 6 },
  actRoom: { fontSize: 11, color: C.gray400, marginTop: 2 },
  actSpeaker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
  },
  actSpeakerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actSpeakerAvatarText: { fontSize: 13, fontWeight: '700', color: C.green700 },
  actSpeakerName: { fontSize: 12, fontWeight: '600', color: C.gray800 },
  actSpeakerOrg: { fontSize: 11, color: C.gray400, marginTop: 1 },

  // Cronograma
  cronograma: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: C.gray100,
  },

  // Banner CTA
  ctaBanner: {
    backgroundColor: C.green900,
    paddingHorizontal: 28,
    paddingVertical: 40,
    alignItems: 'center',
  },
  ctaTitle: { color: C.white, fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 28, marginBottom: 10 },
  ctaBody: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  ctaBtn: {
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ctaBtnText: { color: C.green900, fontWeight: '700', fontSize: 15 },

  // Contacto
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.gray50,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  contactIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactIconEmoji: { fontSize: 21 },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: C.gray400, marginBottom: 3 },
  contactValue: { fontSize: 14, fontWeight: '600', color: C.gray800 },
  contactSub: { fontSize: 11, color: C.gray400, marginTop: 2 },
  contactArrow: { fontSize: 22, color: C.gray400, fontWeight: '300' },

  // Redes sociales
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
  socialBtn: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  socialBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  // Footer
  footer: { backgroundColor: C.green950, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, alignItems: 'center' },
  footerDivider: { width: 40, height: 3, backgroundColor: C.green700, borderRadius: 2, marginBottom: 20 },
  footerTitle: { color: C.green400, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  footerSub: { color: C.green800, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  footerCopy: { color: C.green900, fontSize: 11, textAlign: 'center' },
});
