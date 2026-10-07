import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Building2, CheckCircle2, Search, UserCheck, Users, XCircle } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';
const BLUE = '#2563eb';

function fmtFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ResumenCard({ titulo, color, registrados, asistentes, sinAsistencia, subEtiqueta }: {
  titulo: string; color: string; registrados: number; asistentes: number; sinAsistencia: number; subEtiqueta: string;
}) {
  const size = 72, stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = registrados > 0 ? Math.round((asistentes / registrados) * 100) : 0;
  const offset = c * (1 - pct / 100);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0', flex: 1 }}>
      <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={stroke} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={offset} />
          </Svg>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a' }}>{pct}%</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>{subEtiqueta}</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>{registrados}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>Asistieron</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color }}>{asistentes}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>Sin asistir</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#94a3b8' }}>{sinAsistencia}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AsistenciaScreen() {
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'EMPRESA' | 'FORO'>('todos');

  const cargar = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/asistencia`);
      if (!res.ok) throw new Error();
      setDatos(await res.json());
    } catch { setDatos(null); } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = useMemo(() => {
    const lista: any[] = datos?.listado ?? [];
    return lista.filter((p) => {
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false;
      if (!busqueda.trim()) return true;
      const termino = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(termino) || (p.empresa ?? '').toLowerCase().includes(termino);
    });
  }, [datos, busqueda, filtroTipo]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}><ActivityIndicator color={GREEN} size="large" /></View>;
  if (!datos) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
      <Text style={{ color: '#64748b' }}>No se pudo cargar la asistencia.</Text>
      <TouchableOpacity onPress={cargar} style={{ marginTop: 14 }}><Text style={{ color: GREEN, fontWeight: '800' }}>Reintentar</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={GREEN} />}>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UserCheck size={22} color={GREEN} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>Asistencia al evento</Text>
            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Separado por empresa y Foro · Personal</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ResumenCard titulo="Empresas" color={GREEN} registrados={datos.empresa.registrados} asistentes={datos.empresa.asistentes} sinAsistencia={datos.empresa.sinAsistencia} subEtiqueta="Personas" />
          <ResumenCard titulo="Foro · Personal" color={BLUE} registrados={datos.foro.registrados} asistentes={datos.foro.asistentes} sinAsistencia={datos.foro.sinAsistencia} subEtiqueta="Registrados" />
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 2 }}>Empresas con al menos un asistente</Text>
          <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Una empresa cuenta si alguno de sus participantes ingresó.</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>{datos.empresa.empresasRegistradas}</Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Registradas</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: GREEN }}>{datos.empresa.empresasAsistentes}</Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Con asistencia</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#94a3b8' }}>{datos.empresa.empresasSinAsistencia}</Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Sin asistencia</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 10 }}>Listado de participantes ({filtrados.length})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, marginBottom: 10 }}>
            <Search size={14} color="#94a3b8" />
            <TextInput
              value={busqueda} onChangeText={setBusqueda}
              placeholder="Buscar nombre o empresa..." placeholderTextColor="#9ca3af"
              style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 13, color: '#0f172a' }}
            />
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 3, marginBottom: 10 }}>
            {(['todos', 'EMPRESA', 'FORO'] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setFiltroTipo(t)}
                style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: filtroTipo === t ? '#fff' : 'transparent' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: filtroTipo === t ? '#0f172a' : '#64748b' }}>
                  {t === 'todos' ? 'Todos' : t === 'EMPRESA' ? 'Empresa' : 'Foro'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtrados.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94a3b8', paddingVertical: 20 }}>Sin resultados.</Text>
          ) : filtrados.map((p) => (
            <View key={p.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text style={{ fontWeight: '800', color: '#0f172a', flex: 1 }} numberOfLines={1}>{p.nombre}</Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                  backgroundColor: p.tipo === 'FORO' ? '#eff6ff' : '#f0fdf4',
                }}>
                  {p.tipo === 'FORO' ? <Users size={10} color={BLUE} /> : <Building2 size={10} color={GREEN} />}
                  <Text style={{ fontSize: 10, fontWeight: '800', color: p.tipo === 'FORO' ? BLUE : GREEN }}>{p.tipo === 'FORO' ? 'Foro' : 'Empresa'}</Text>
                </View>
              </View>
              {p.empresa && <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }} numberOfLines={1}>{p.empresa}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {p.cantidadAsistencias > 0
                    ? <CheckCircle2 size={13} color={GREEN} />
                    : <XCircle size={13} color="#d1d5db" />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: p.cantidadAsistencias > 0 ? GREEN : '#9ca3af' }}>
                    {p.cantidadAsistencias} asistencia{p.cantidadAsistencias === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>{fmtFecha(p.ultimaAsistencia)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
