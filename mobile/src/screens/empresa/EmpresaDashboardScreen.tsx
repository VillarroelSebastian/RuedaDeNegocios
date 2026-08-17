import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Briefcase, CalendarDays, Send, Inbox,
  Newspaper, ChevronRight, AlertCircle, Star,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

export default function EmpresaDashboardScreen({ navigation }: any) {
  const [ctx,       setCtx]       = useState<any>(null);
  const [stats,     setStats]     = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,     setError]     = useState('');

  const user = userStore.get();

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setError('');
    try {
      const ctxRes = await fetch(`${API_URL}/empresa/mi-empresa?usuarioId=${user.id}`);
      if (!ctxRes.ok) throw new Error('No se pudo cargar la empresa');
      const ctxData = await ctxRes.json();
      setCtx(ctxData);

      // Persist eeId into userStore so other screens can read it
      userStore.set({ ...user, empresaeventoId: ctxData.empresaeventoId, empresaUsuarioId: ctxData.empresaUsuarioId, esResponsable: ctxData.esResponsable });

      if (ctxData.empresaeventoId) {
        const statsRes = await fetch(`${API_URL}/empresa/dashboard-stats?eeId=${ctxData.empresaeventoId}`);
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={GREEN} />
    </View>
  );

  const esEncargado = !!ctx?.esResponsable;
  const proximaReunion = stats?.proximaReunion;
  const estadoPago = stats?.estadoPago ?? ctx?.estadoPago;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.nombres ?? 'U')[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={s.greeting}>Bienvenido/a</Text>
              <Text style={s.userName} numberOfLines={1}>{user?.nombres ?? user?.correo}</Text>
            </View>
          </View>
          <View style={[s.badge, esEncargado ? s.badgeEncargado : s.badgePart]}>
            <Text style={[s.badgeText, esEncargado ? s.badgeTextEnc : s.badgeTextPart]}>
              {esEncargado ? 'Encargado' : 'Participante'}
            </Text>
          </View>
        </View>

        {/* Empresa */}
        {ctx && (
          <View style={s.empresaCard}>
            <Briefcase size={16} color={GREEN} style={{ marginRight: 8 }} />
            <Text style={s.empresaName} numberOfLines={1}>{ctx.empresa?.nombre ?? '—'}</Text>
          </View>
        )}

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <AlertCircle size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Alerta solicitudes pendientes — solo encargado */}
        {esEncargado && stats?.pendientesRecibidas > 0 && (
          <TouchableOpacity style={s.alertBox} onPress={() => navigation.navigate('Solicitudes')} activeOpacity={0.8}>
            <AlertCircle size={16} color="#92400e" style={{ marginRight: 8 }} />
            <Text style={s.alertText}>
              Tienes {stats.pendientesRecibidas} solicitud{stats.pendientesRecibidas > 1 ? 'es' : ''} de reunión pendiente{stats.pendientesRecibidas > 1 ? 's' : ''} por revisar
            </Text>
          </TouchableOpacity>
        )}

        {esEncargado && stats?.pendientesEvaluar > 0 && (
          <TouchableOpacity style={[s.alertBox, { backgroundColor:'#f0fdf4', borderColor:'#86efac' }]} onPress={() => navigation.navigate('Resultados')} activeOpacity={0.8}>
            <Star size={17} color={GREEN} style={{ marginRight:8 }} />
            <Text style={[s.alertText, { color:'#166534' }]}>Tienes {stats.pendientesEvaluar} reunión(es) pendiente(s) de calificar. Registra el acuerdo y tus observaciones.</Text>
            <ChevronRight size={17} color={GREEN}/>
          </TouchableOpacity>
        )}

        {/* Stats */}
        {stats && (
          <View style={s.statsGrid}>
            {esEncargado && (
              <>
                <StatCard icon={<Inbox size={20} color={GREEN} />} label="Recibidas" value={stats.pendientesRecibidas ?? 0} color="#f0fdf4" />
                <StatCard icon={<Send size={20} color="#2563eb" />} label="Enviadas" value={stats.pendientesEnviadas ?? 0} color="#eff6ff" />
              </>
            )}
            <StatCard icon={<CalendarDays size={20} color="#7c3aed" />} label="Reuniones" value={stats.reunionesTotal ?? 0} color="#f5f3ff" />
            {estadoPago !== 'COMPLETADO' && (
              <StatCard icon={<Briefcase size={20} color="#059669" />} label="Estado" value={null} status={estadoPago} color="#ecfdf5" />
            )}
          </View>
        )}

        {/* Próxima reunión */}
        {proximaReunion && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Próxima reunión</Text>
            <TouchableOpacity style={s.meetingCard} onPress={() => navigation.navigate('Reuniones')} activeOpacity={0.8}>
              <Text style={s.meetingCounterpart}>{proximaReunion.contraparte?.nombre ?? '—'}</Text>
              <Text style={s.meetingTime}>
                {fmtDate(proximaReunion.inicio)} · {fmtTime(proximaReunion.inicio)}
              </Text>
              {proximaReunion.mesa?.numeroMesa && <Text style={s.meetingMeta}>Mesa {proximaReunion.mesa.numeroMesa}</Text>}
              {proximaReunion.tipo && <Text style={s.meetingMeta}>{proximaReunion.tipo}</Text>}
              <ChevronRight size={16} color="#9ca3af" style={{ position: 'absolute', right: 16, top: 20 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Comunicados recientes */}
        {stats?.comunicados?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Comunicados</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Comunicados')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.verTodo}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            {stats.comunicados.slice(0, 3).map((c: any) => (
              <TouchableOpacity key={c.id} style={s.listItem} onPress={() => navigation.navigate('Comunicados')} activeOpacity={0.7}>
                <Newspaper size={14} color={GREEN} style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.listItemTitle} numberOfLines={2}>{c.titulo}</Text>
                  <Text style={s.listItemSub}>{fmtDate(c.fecha)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Próximas actividades */}
        {stats?.actividades?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Actividades</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Eventos')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.verTodo}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {stats.actividades.slice(0, 3).map((a: any) => (
              <TouchableOpacity key={a.id} style={s.listItem} onPress={() => navigation.navigate('Eventos')} activeOpacity={0.7}>
                <CalendarDays size={14} color="#7c3aed" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.listItemTitle} numberOfLines={1}>{a.nombre}</Text>
                  <Text style={s.listItemSub}>{fmtDate(a.fecha)} · {a.hora?.slice(11,16)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Acceso rápido */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Acceso rápido</Text>
          <View style={s.quickGrid}>
            {[
              { label: 'Comunicados',    screen: 'Comunicados',    color: '#f0fdf4', soloEncargado: false },
              { label: 'Actividades',    screen: 'Eventos',        color: '#eff6ff', soloEncargado: false },
              { label: 'Empresas',       screen: 'Empresas',       color: '#fdf4ff', soloEncargado: false },
              { label: 'Mensajes',       screen: 'Mensajes',       color: '#f0f9ff', soloEncargado: false },
              { label: 'Oportunidades',  screen: 'Oportunidades',  color: '#fefce8', soloEncargado: false },
              { label: 'Resultados',     screen: 'Resultados',     color: '#f5f3ff', soloEncargado: true  },
              { label: 'Solicitudes',    screen: 'Solicitudes',    color: '#fff7ed', soloEncargado: true  },
              { label: 'Horarios',       screen: 'Horarios',       color: '#ecfdf5', soloEncargado: true  },
            ].filter(q => esEncargado || !q.soloEncargado).map((q) => (
              <TouchableOpacity
                key={q.screen}
                style={[s.quickCard, { backgroundColor: q.color }]}
                onPress={() => navigation.navigate(q.screen)}
                activeOpacity={0.75}
              >
                <Text style={s.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, status, color }: any) {
  return (
    <View style={[s.statCard, { backgroundColor: color }]}>
      {icon}
      <Text style={s.statValue}>{value === null ? (status ?? '—') : String(value)}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  greeting:   { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  userName:   { fontSize: 15, fontWeight: '800', color: '#0f172a', maxWidth: 180 },

  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeEncargado:  { backgroundColor: '#dcfce7' },
  badgePart:       { backgroundColor: '#dbeafe' },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  badgeTextEnc:    { color: '#166534' },
  badgeTextPart:   { color: '#1e40af' },

  empresaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  empresaName: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText:  { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  alertBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#fde68a',
  },
  alertText:  { color: '#92400e', fontSize: 13, fontWeight: '600', flex: 1 },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 8, marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  section:       { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  verTodo: { fontSize: 12, color: GREEN, fontWeight: '700' },

  meetingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  meetingCounterpart: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4, paddingRight: 24 },
  meetingTime: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  meetingMeta: { fontSize: 12, color: '#94a3b8' },

  listItem: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  listItemTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  listItemSub:   { fontSize: 11, color: '#94a3b8' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    width: '47%', borderRadius: 14, padding: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
});
