import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2, CreditCard, Handshake, Armchair, CalendarCheck,
  TrendingUp, TrendingDown, Minus, Calendar, MapPin,
  Users, LayoutGrid, Layers,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';
const GREEN_DARK = '#166534';

// ─── Mapeo de iconos para las stat-cards del dashboard ───────────────────
const ICON_MAP: Record<string, any> = {
  '🏢': Building2, '💳': CreditCard, '🤝': Handshake,
  '🪑': Armchair, '📅': CalendarCheck,
};

function getIconColor(colorStr = '') {
  if (colorStr.includes('green'))  return '#16a34a';
  if (colorStr.includes('orange')) return '#f97316';
  if (colorStr.includes('blue'))   return '#3b82f6';
  if (colorStr.includes('purple')) return '#a855f7';
  if (colorStr.includes('indigo')) return '#6366f1';
  return '#6b7280';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getEventStatus(inicio: string, fin: string): { label: string; color: string; bg: string } {
  const now   = Date.now();
  const start = new Date(inicio).getTime();
  const end   = new Date(fin).getTime();
  if (now < start) return { label: 'Próximo',    color: '#2563eb', bg: '#dbeafe' };
  if (now > end)   return { label: 'Finalizado', color: '#6b7280', bg: '#f3f4f6' };
  return               { label: 'En curso',    color: '#16a34a', bg: '#dcfce7' };
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function DashboardScreen() {
  const [evento,     setEvento]     = useState<any>(null);
  const [stats,      setStats]      = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user      = userStore.get();
  const firstName = user?.nombres?.split(' ')[0] ?? 'Administrador';

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [evRes, dashRes] = await Promise.all([
        fetch(`${API_URL}/public/evento`),
        fetch(`${API_URL}/admin/dashboard/stats`),
      ]);
      const ev   = evRes.ok   ? await evRes.json()   : null;
      const dash = dashRes.ok ? await dashRes.json() : {};

      if (ev && ev.id && ev.nombre) setEvento(ev);
      setStats(Array.isArray(dash.stats) ? dash.stats : []);
      setActivities(Array.isArray(dash.recentActivity) ? dash.recentActivity : []);
    } catch { /* sin conexión */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const status = evento ? getEventStatus(evento.fechaInicioEvento, evento.fechaFinEvento) : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── Header con saludo ─────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerGreeting}>Hola, {firstName} 👋</Text>
          <Text style={s.headerSub}>Panel de administración</Text>
        </View>
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{firstName[0]}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[GREEN]} tintColor={GREEN} />
        }
      >

        {/* ════════════════════ EVENTO ACTIVO ════════════════ */}
        {evento ? (
          <View style={s.eventCard}>
            {/* Fondo degradado verde oscuro */}
            <View style={s.eventBg} />

            {/* Cabecera del card */}
            <View style={s.eventHeader}>
              <View style={s.eventHeaderLeft}>
                {/* Estado */}
                <View style={[s.statusPill, { backgroundColor: status?.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: status?.color }]} />
                  <Text style={[s.statusText, { color: status?.color }]}>{status?.label}</Text>
                </View>
                <Text style={s.eventEdicion}>Edición {evento.edicion}</Text>
              </View>

              {/* Logo o iniciales */}
              {evento.urlLogoEvento
                ? <Image source={{ uri: evento.urlLogoEvento }} style={s.eventLogo} resizeMode="contain" />
                : (
                  <View style={s.eventLogoFallback}>
                    <Text style={s.eventLogoFallbackText}>RN</Text>
                  </View>
                )
              }
            </View>

            {/* Nombre del evento */}
            <Text style={s.eventNombre}>{evento.nombre}</Text>

            {/* Fechas y lugar */}
            <View style={s.eventMeta}>
              <View style={s.eventMetaRow}>
                <Calendar size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.eventMetaText}>
                  {fmtDate(evento.fechaInicioEvento)}  –  {fmtDate(evento.fechaFinEvento)}
                </Text>
              </View>
              {(evento.ciudadEvento || evento.paisEvento) && (
                <View style={s.eventMetaRow}>
                  <MapPin size={13} color="rgba(255,255,255,0.65)" />
                  <Text style={s.eventMetaText}>
                    {[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Divisor */}
            <View style={s.eventDivider} />

            {/* Stats del evento en fila */}
            <View style={s.eventStats}>
              {[
                { icon: Building2, label: 'Empresas',     value: evento.stats?.empresasCount    ?? 0 },
                { icon: LayoutGrid, label: 'Mesas',        value: evento.stats?.mesasCount       ?? 0 },
                { icon: Layers,     label: 'Actividades',  value: evento.stats?.actividadesCount ?? 0 },
                { icon: Users,      label: 'Técnicos',     value: evento.stats?.tecnicosCount    ?? 0 },
              ].map(({ icon: Icon, label, value }, i, arr) => (
                <View key={label} style={[s.eventStat, i < arr.length - 1 && s.eventStatBorder]}>
                  <Icon size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={s.eventStatValue}>{value}</Text>
                  <Text style={s.eventStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.noEventCard}>
            <Calendar size={32} color="#94a3b8" />
            <Text style={s.noEventTitle}>Sin evento activo</Text>
            <Text style={s.noEventSub}>Crea un evento desde el panel web.</Text>
          </View>
        )}

        {/* ════════════════════ STATS GENERALES ══════════════ */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Resumen del Evento</Text>
        </View>

        <View style={s.statsGrid}>
          {stats.map((stat) => {
            const IconComp  = ICON_MAP[stat.icon] ?? Building2;
            const iconColor = getIconColor(stat.color);
            const isPos = stat.change?.includes('+');
            const isNeg = stat.change?.includes('-');

            let badgeStyle = s.statBadgeNeu;
            if (isPos) badgeStyle = s.statBadgePos;
            else if (isNeg) badgeStyle = s.statBadgeNeg;

            let changeColor = '#6b7280';
            if (isPos) changeColor = '#16a34a';
            else if (isNeg) changeColor = '#dc2626';

            return (
              <View key={stat.name} style={s.statCard}>
                <View style={s.statCardTop}>
                  <View style={[s.statIconBox, { backgroundColor: iconColor + '18' }]}>
                    <IconComp color={iconColor} size={20} />
                  </View>
                  <View style={[s.statBadge, badgeStyle]}>
                    {isPos  && <TrendingUp   size={10} color="#16a34a" />}
                    {isNeg  && <TrendingDown size={10} color="#dc2626" />}
                    {!isPos && !isNeg && <Minus size={10} color="#6b7280" />}
                    <Text style={[s.statBadgeText, { color: changeColor }]}>{stat.change}</Text>
                  </View>
                </View>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statName}>{stat.name}</Text>
              </View>
            );
          })}
        </View>

        {/* ════════════════════ ACTIVIDAD RECIENTE ═══════════ */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Actividad Reciente</Text>
        </View>

        <View style={s.activityCard}>
          {activities.length === 0 && (
            <Text style={s.emptyText}>Sin actividad reciente.</Text>
          )}
          {activities.map((act, i) => {
            const isCompleted = act.status === 'COMPLETADO';
            return (
              <View key={act.id} style={[s.activityRow, i < activities.length - 1 && s.activityRowBorder]}>
                <View style={[s.actAvatar, { backgroundColor: isCompleted ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[s.actAvatarText, { color: isCompleted ? '#15803d' : '#b45309' }]}>
                    {act.initials ?? '?'}
                  </Text>
                </View>
                <View style={s.actInfo}>
                  <View style={s.actInfoTop}>
                    <Text style={s.actUser} numberOfLines={1}>{act.user}</Text>
                    <View style={[s.actStatus, { backgroundColor: isCompleted ? '#dcfce7' : '#fef3c7' }]}>
                      <Text style={[s.actStatusText, { color: isCompleted ? '#15803d' : '#b45309' }]}>
                        {act.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.actAction} numberOfLines={1}>{act.action}</Text>
                  <Text style={s.actTime}>
                    {new Date(act.time).toLocaleDateString('es-BO')}  ·  {new Date(act.time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },

  // Header saludo
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerGreeting:   { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub:        { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  headerAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // ── Card del Evento Activo ──────────────────────────────────────────────
  eventCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 20,
  },
  eventBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GREEN_DARK,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eventHeaderLeft: { gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  eventEdicion: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600', letterSpacing: 0.5 },

  eventLogo: { width: 52, height: 52, borderRadius: 14 },
  eventLogoFallback: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  eventLogoFallbackText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  eventNombre: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 14,
  },

  eventMeta:    { gap: 6, marginBottom: 18 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventMetaText:{ color: 'rgba(255,255,255,0.65)', fontSize: 12 },

  eventDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 18 },

  eventStats: { flexDirection: 'row' },
  eventStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  eventStatBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
  },
  eventStatValue: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  eventStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600' },

  // Sin evento
  noEventCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  noEventTitle: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  noEventSub:   { fontSize: 12, color: '#94a3b8' },

  // Secciones
  sectionHeader: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#0f172a' },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    width: '47.5%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statCardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statIconBox:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  statBadgePos: { backgroundColor: '#f0fdf4' },
  statBadgeNeg: { backgroundColor: '#fef2f2' },
  statBadgeNeu: { backgroundColor: '#f8fafc' },
  statBadgeText:{ fontSize: 10, fontWeight: '700' },
  statValue:    { fontSize: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  statName:     { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

  // Actividad reciente
  activityCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityRow:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  actAvatar:         { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actAvatarText:     { fontSize: 13, fontWeight: '800' },
  actInfo:           { flex: 1 },
  actInfoTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8 },
  actUser:           { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  actStatus:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  actStatusText:     { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  actAction:         { fontSize: 12, color: '#64748b', marginBottom: 2 },
  actTime:           { fontSize: 10, color: '#cbd5e1', fontWeight: '600' },
  emptyText:         { textAlign: 'center', color: '#94a3b8', padding: 24, fontSize: 13 },
});
