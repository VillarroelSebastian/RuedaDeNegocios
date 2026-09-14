import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { Award, Building2, CalendarCheck, Download, Handshake, Star, TrendingUp, Users, Wallet } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function Barra({ etiqueta, valor, maximo, color = GREEN }: { etiqueta: string; valor: number; maximo: number; color?: string }) {
  return <View style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ color: '#475569', fontSize: 13, flex: 1 }}>{etiqueta}</Text><Text style={{ color: '#0f172a', fontWeight: '800' }}>{valor}</Text></View><View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}><View style={{ width: `${Math.max(0, Math.min(100, (valor / Math.max(maximo, 1)) * 100))}%`, height: '100%', backgroundColor: color, borderRadius: 99 }} /></View></View>;
}

export default function EstadisticasScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cargar = async () => { try { const res = await fetch(`${API_URL}/admin/estadisticas`); if (!res.ok) throw new Error(); setStats(await res.json()); } catch { setStats(null); } finally { setLoading(false); setRefreshing(false); } };
  useEffect(() => { cargar(); }, []);

  const compartir = async () => {
    if (!stats) return;
    const k = stats.kpis;
    const filas: any[][] = [['Métrica', 'Valor'], ['Empresas registradas', k.empresasRegistradas], ['Personas registradas', k.participantesTotales], ['Empresas asistentes', k.empresasAsistentes], ['Personas asistentes', k.personasAsistentes], ['Reuniones realizadas', k.reunionesRealizadas], ['Acuerdos registrados', k.acuerdosRegistrados], ['Movimiento aproximado (Bs.)', k.totalGeneradoAprox], ['Promedio de calificación', k.promedioCalificacion], ['Índice de éxito (%)', k.indiceExito], [], ['Empresa', 'Reuniones', 'Estrellas otorgadas', 'Generado (Bs.)'], ...(stats.rankingEmpresas || []).map((e: any) => [e.nombre, e.reuniones, e.estrellasOtorgadas, e.montoGenerado])];
    await Share.share({ title: 'Estadísticas del evento', message: filas.map((fila) => fila.join(';')).join('\n') });
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!stats) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}><Text style={{ color: '#64748b' }}>No se pudieron cargar las estadísticas.</Text><TouchableOpacity onPress={cargar} style={{ marginTop: 14 }}><Text style={{ color: GREEN, fontWeight: '800' }}>Reintentar</Text></TouchableOpacity></View>;

  const k = stats.kpis;
  const tarjetas: any[][] = [['Empresas registradas', k.empresasRegistradas, Building2, GREEN], ['Personas registradas', k.participantesTotales, Users, '#2563eb'], ['Empresas asistentes', k.empresasAsistentes, Building2, '#0891b2'], ['Personas asistentes', k.personasAsistentes, Users, '#0d9488'], ['Reuniones realizadas', k.reunionesRealizadas, Handshake, '#7c3aed'], ['Acuerdos', k.acuerdosRegistrados, CalendarCheck, '#db2777'], ['Promedio', `${k.promedioCalificacion || 0}/5`, Star, '#d97706'], ['Movimiento aprox.', `Bs. ${Number(k.totalGeneradoAprox || 0).toLocaleString('es-BO')}`, Wallet, '#059669'], ['Índice de éxito', `${k.indiceExito || 0}%`, Award, '#6d28d9'], ['Tasa de acuerdos', `${k.tasaAcuerdos || 0}%`, TrendingUp, '#be123c']];
  const reuniones: any[][] = [['Programadas', stats.reunionesPorEstado.programadas, '#60a5fa'], ['En curso', stats.reunionesPorEstado.enCurso, '#fb923c'], ['Finalizadas', stats.reunionesPorEstado.finalizadas, GREEN], ['Reprogramadas', stats.reunionesPorEstado.reprogramadas, '#a78bfa'], ['Canceladas', stats.reunionesPorEstado.canceladas, '#ef4444']];
  const maxReuniones = Math.max(...reuniones.map((r) => Number(r[1])), 1);
  const top = stats.topEmpresas || [];

  return <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={GREEN} />}><View style={{ padding: 16, gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Estadísticas del evento</Text><Text style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Resumen operativo e impacto de la rueda</Text></View><TouchableOpacity onPress={compartir} style={{ backgroundColor: GREEN, borderRadius: 12, padding: 11 }}><Download size={20} color="#fff" /></TouchableOpacity></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{tarjetas.map(([label, value, Icon, color]: any) => <View key={label} style={{ width: '48%', minHeight: 118, backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' }}><Icon size={21} color={color} /><Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 8 }} numberOfLines={2}>{value}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 3, textTransform: 'uppercase' }}>{label}</Text></View>)}</View>
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Reuniones por estado</Text>{reuniones.map(([label, value, color]: any) => <Barra key={label} etiqueta={label} valor={value} maximo={maxReuniones} color={color} />)}</View>
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>Asistencia</Text><Barra etiqueta="Empresas que asistieron" valor={stats.asistencia.empresasAsistentes} maximo={stats.asistencia.empresasRegistradas} /><Barra etiqueta="Personas que asistieron" valor={stats.asistencia.personasAsistentes} maximo={stats.asistencia.personasRegistradas} color="#0891b2" /><Text style={{ color: '#64748b', fontSize: 12 }}>{stats.asistencia.registros} escaneos. Cada persona se cuenta una sola vez como asistente.</Text></View>
    {top.length > 0 && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Top 5 empresas por reuniones</Text>{top.map((e: any, i: number) => <Barra key={`${e.nombre}-${i}`} etiqueta={`${i + 1}. ${e.nombre}`} valor={e.total} maximo={top[0]?.total || 1} />)}</View>}
    {(stats.calificaciones || []).length > 0 && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Distribución de calificaciones</Text>{stats.calificaciones.map((c: any) => <Barra key={c.estrellas} etiqueta={`${c.estrellas} estrella${c.estrellas === 1 ? '' : 's'}`} valor={c.total} maximo={Math.max(...stats.calificaciones.map((v: any) => v.total), 1)} color="#f59e0b" />)}</View>}
    <View style={{ backgroundColor: '#f5f3ff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#ddd6fe' }}><Text style={{ color: '#5b21b6', fontWeight: '900' }}>Índice integral de la rueda</Text><Text style={{ color: '#4c1d95', fontSize: 36, fontWeight: '900', marginVertical: 8 }}>{stats.indiceExito.valor}%</Text><Text style={{ color: '#5b21b6', fontSize: 12, lineHeight: 18 }}>{stats.indiceExito.descripcion}</Text>{Object.entries(stats.indiceExito.componentes || {}).map(([clave, valor]: any) => <View key={clave} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ color: '#6d28d9', textTransform: 'capitalize' }}>{clave.replace(/([A-Z])/g, ' $1')}</Text><Text style={{ color: '#4c1d95', fontWeight: '800' }}>{valor}%</Text></View>)}</View>
    <View style={{ height: 20 }} />
  </View></ScrollView>;
}
