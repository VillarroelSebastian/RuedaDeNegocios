import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Award, Building2, CalendarCheck, Download, Handshake, Star, TrendingUp, Users, Wallet } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function Barra({ etiqueta, valor, maximo, color = GREEN }: { etiqueta: string; valor: number; maximo: number; color?: string }) {
  return <View style={{ marginBottom: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ color: '#475569', fontSize: 13, flex: 1 }}>{etiqueta}</Text><Text style={{ color: '#0f172a', fontWeight: '800' }}>{valor}</Text></View><View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}><View style={{ width: `${Math.max(0, Math.min(100, (valor / Math.max(maximo, 1)) * 100))}%`, height: '100%', backgroundColor: color, borderRadius: 99 }} /></View></View>;
}

// Medidor circular: una proporción única contra un límite. El relleno lleva
// el color de acento; la pista es un paso más claro de la misma rampa.
function RadialGauge({ value, size = 120, stroke = 12, color, trackColor, centerValue, centerLabel }: {
  value: number; size?: number; stroke?: number; color: string; trackColor: string; centerValue: string | number; centerLabel: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c * (1 - clamped / 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} />
      </Svg>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{centerValue}</Text>
      <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{centerLabel}</Text>
    </View>
  );
}

// Dona: reparto por categorías (2-4) dentro de un total.
function Donut({ segments, size = 120, stroke = 18 }: { segments: { value: number; color: string }[]; size?: number; stroke?: number }) {
  const total = Math.max(segments.reduce((s, x) => s + x.value, 0), 1);
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  let startAngle = -90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const paths = segments.map((s, i) => {
    const angle = (s.value / total) * 360;
    if (angle <= 0) return null;
    const endAngle = Math.min(startAngle + angle, startAngle + 359.999);
    const x1 = cx + r * Math.cos(toRad(startAngle)), y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle)), y2 = cy + r * Math.sin(toRad(endAngle));
    const large = angle > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    startAngle = endAngle;
    return <Path key={i} d={d} stroke={s.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />;
  });
  return <Svg width={size} height={size}>{paths}</Svg>;
}

export default function EstadisticasScreen() {
  const [stats, setStats] = useState<any>(null);
  const [finanzas, setFinanzas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cargar = async () => {
    try {
      const [res, resFin] = await Promise.all([fetch(`${API_URL}/admin/estadisticas`), fetch(`${API_URL}/admin/finanzas/resumen`)]);
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setFinanzas(resFin.ok ? await resFin.json() : null);
    } catch { setStats(null); setFinanzas(null); } finally { setLoading(false); setRefreshing(false); }
  };
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
    {finanzas && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontWeight: '900', color: '#0f172a' }}>Recaudación total del evento</Text>
      <Text style={{ color: '#64748b', fontSize: 12, marginTop: 3, marginBottom: 14 }}>Suma de pagos de paquetes y pagos adicionales verificados.</Text>
      <View style={{ backgroundColor: '#ecfdf5', borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', padding: 14, marginBottom: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857', textTransform: 'uppercase' }}>Total recaudado</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#065f46', marginTop: 2 }}>Bs. {Number(finanzas.total).toLocaleString('es-BO')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Paquetes ({finanzas.cantidadPagosPaquetes})</Text>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>Bs. {Number(finanzas.totalPaquetes).toLocaleString('es-BO')}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Adicionales ({finanzas.cantidadPagosAdicionales})</Text>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>Bs. {Number(finanzas.totalAdicionales).toLocaleString('es-BO')}</Text>
        </View>
      </View>
      {(() => {
        const totalFin = Math.max(finanzas.totalPaquetes + finanzas.totalAdicionales, 1);
        return (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
              <View style={{ width: `${(finanzas.totalPaquetes / totalFin) * 100}%`, backgroundColor: GREEN }} />
              <View style={{ width: 2 }} />
              <View style={{ width: `${(finanzas.totalAdicionales / totalFin) * 100}%`, backgroundColor: '#93c5fd' }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: GREEN }} /><Text style={{ fontSize: 11, color: '#64748b' }}>Paquetes</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#93c5fd' }} /><Text style={{ fontSize: 11, color: '#64748b' }}>Adicionales</Text></View>
            </View>
          </View>
        );
      })()}
    </View>}
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Reuniones por estado</Text>{reuniones.map(([label, value, color]: any) => <Barra key={label} etiqueta={label} valor={value} maximo={maxReuniones} color={color} />)}</View>

    {stats.pagosPorEstado && (() => {
      const p = stats.pagosPorEstado;
      const segs = [
        { label: 'Verificados', value: p.verificados, pct: p.porcentajeVerificados, color: GREEN },
        { label: 'Pendientes', value: p.pendientes, pct: p.porcentajePendientes, color: '#fb923c' },
        { label: 'Observados', value: p.observados, pct: p.porcentajeObservados, color: '#fbbf24' },
      ];
      return (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Pagos por estado</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
              <Donut segments={segs} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{p.total}</Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Total</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              {segs.map((s) => (
                <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                    <Text style={{ fontSize: 12, color: '#475569' }}>{s.label}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>{s.value} <Text style={{ color: '#94a3b8', fontWeight: '600' }}>({s.pct}%)</Text></Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    })()}

    {(stats.empresasPorRubro || []).length > 0 && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Empresas por sector (Top 5)</Text>{stats.empresasPorRubro.map((r: any) => <Barra key={r.rubro} etiqueta={r.rubro} valor={r.count} maximo={stats.empresasPorRubro[0].count} color="#2563eb" />)}</View>}

    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 4 }}>Asistencia</Text>
      <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 14 }}>Registrados frente a quienes tuvieron al menos un ingreso por QR.</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <RadialGauge value={(stats.asistencia.empresasAsistentes / Math.max(stats.asistencia.empresasRegistradas, 1)) * 100} color={GREEN} trackColor="#dcfce7" centerValue={stats.asistencia.empresasAsistentes} centerLabel="Empresas" />
          <Text style={{ fontSize: 11, color: '#64748b' }}>{stats.asistencia.empresasRegistradas} registradas</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <RadialGauge value={(stats.asistencia.personasAsistentes / Math.max(stats.asistencia.personasRegistradas, 1)) * 100} color="#0d9488" trackColor="#ccfbf1" centerValue={stats.asistencia.personasAsistentes} centerLabel="Personas" />
          <Text style={{ fontSize: 11, color: '#64748b' }}>{stats.asistencia.personasRegistradas} registradas</Text>
        </View>
      </View>
      <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 14 }}>{stats.asistencia.registros} escaneos. Cada persona se cuenta una sola vez como asistente.</Text>
    </View>
    {top.length > 0 && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Top 5 empresas por reuniones</Text>{top.map((e: any, i: number) => <Barra key={`${e.nombre}-${i}`} etiqueta={`${i + 1}. ${e.nombre}`} valor={e.total} maximo={top[0]?.total || 1} />)}</View>}
    {(stats.calificaciones || []).length > 0 && <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 17, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 15 }}>Distribución de calificaciones</Text>{stats.calificaciones.map((c: any) => <Barra key={c.estrellas} etiqueta={`${c.estrellas} estrella${c.estrellas === 1 ? '' : 's'}`} valor={c.total} maximo={Math.max(...stats.calificaciones.map((v: any) => v.total), 1)} color="#f59e0b" />)}</View>}

    {(() => {
      const pesos: Record<string, number> = { realizacion: 35, asistencia: 25, satisfaccion: 25, coberturaEncuestas: 15 };
      const colores = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'];
      return (
        <View style={{ backgroundColor: '#f5f3ff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#ddd6fe' }}>
          <Text style={{ color: '#5b21b6', fontWeight: '900', marginBottom: 14 }}>Índice integral de la rueda</Text>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <RadialGauge value={stats.indiceExito.valor} size={140} stroke={14} color="#7c3aed" trackColor="#ede9fe" centerValue={`${stats.indiceExito.valor}%`} centerLabel="Índice" />
          </View>
          <Text style={{ color: '#5b21b6', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{stats.indiceExito.descripcion}</Text>
          {Object.entries(stats.indiceExito.componentes || {}).map(([clave, valor]: any, i) => (
            <View key={clave} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#6d28d9', textTransform: 'capitalize', fontSize: 12 }}>{clave.replace(/([A-Z])/g, ' $1')} <Text style={{ color: '#c4b5fd' }}>· {pesos[clave] ?? '—'}%</Text></Text>
                <Text style={{ color: '#4c1d95', fontWeight: '800', fontSize: 12 }}>{valor}%</Text>
              </View>
              <View style={{ height: 6, borderRadius: 99, backgroundColor: '#ede9fe', overflow: 'hidden' }}>
                <View style={{ width: `${valor}%`, height: '100%', backgroundColor: colores[i % colores.length], borderRadius: 99 }} />
              </View>
            </View>
          ))}
        </View>
      );
    })()}
    <View style={{ height: 20 }} />
  </View></ScrollView>;
}
