import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Building2, Search, RefreshCw, CheckCircle2, Circle } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';

const GREEN = '#449D3A';
const FILAS_INICIALES = 6;

type Filtro = 'todas' | 'con' | 'sin';

// Versión compacta de la vista de asistencia del admin: el técnico ve qué
// empresas ya tienen asistentes registrados sin salir del escaneo QR.
export default function ResumenAsistenciaMini({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [verTodas, setVerTodas] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tecnico/asistencia/resumen`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(false);
    } catch { setError(true); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    cargar();
    const iv = setInterval(cargar, 30000);
    return () => clearInterval(iv);
  }, [cargar, refreshKey]);

  const empresas: any[] = data?.empresas ?? [];
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empresas.filter((e) => {
      if (filtro === 'con' && e.asistentes === 0) return false;
      if (filtro === 'sin' && e.asistentes > 0) return false;
      return !q || String(e.nombre).toLowerCase().includes(q);
    });
  }, [empresas, busqueda, filtro]);

  const resumen = data?.empresa;
  const pct = resumen?.empresasRegistradas ? Math.round((resumen.empresasAsistentes / resumen.empresasRegistradas) * 100) : 0;
  const visibles = verTodas ? filtradas : filtradas.slice(0, FILAS_INICIALES);

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Asistencia de empresas</Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>Resumen rápido del evento actual.</Text>
        </View>
        <TouchableOpacity onPress={cargar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <RefreshCw size={15} color="#64748b" />
        </TouchableOpacity>
      </View>

      {cargando ? (
        <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
      ) : error || !resumen ? (
        <Text style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', paddingVertical: 10 }}>No se pudo cargar el resumen de asistencia.</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { v: resumen.empresasRegistradas, l: 'Empresas', bg: '#f8fafc', c: '#0f172a' },
              { v: resumen.empresasAsistentes, l: 'Con asistencia', bg: '#f0fdf4', c: GREEN },
              { v: resumen.empresasSinAsistencia, l: 'Sin asistencia', bg: '#fffbeb', c: '#d97706' },
            ].map((k) => (
              <View key={k.l} style={{ flex: 1, backgroundColor: k.bg, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: k.c }}>{k.v}</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>{k.l}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: GREEN }} />
          </View>
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {pct}% de las empresas con al menos un asistente · {resumen.asistentes} de {resumen.registrados} personas
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 10, marginTop: 12 }}>
            <Search size={14} color="#94a3b8" />
            <TextInput value={busqueda} onChangeText={(t) => { setBusqueda(t); setVerTodas(false); }} placeholder="Buscar empresa…" placeholderTextColor="#94a3b8"
              style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: '#0f172a' }} />
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 3, marginTop: 8 }}>
            {([['todas', 'Todas'], ['con', 'Con asistencia'], ['sin', 'Sin asistencia']] as const).map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => { setFiltro(k); setVerTodas(false); }}
                style={{ flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center', backgroundColor: filtro === k ? '#fff' : 'transparent' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: filtro === k ? '#0f172a' : '#64748b' }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 6 }}>
            {visibles.length === 0 && <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 14 }}>Sin empresas con ese filtro.</Text>}
            {visibles.map((e) => (
              <View key={e.empresaEventoId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                {e.asistentes > 0 ? <CheckCircle2 size={16} color={GREEN} /> : <Circle size={16} color="#cbd5e1" />}
                <Building2 size={13} color="#cbd5e1" />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>{e.nombre}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: e.asistentes > 0 ? GREEN : '#94a3b8' }}>{e.asistentes}/{e.registrados}</Text>
              </View>
            ))}
          </View>
          {filtradas.length > FILAS_INICIALES && (
            <TouchableOpacity onPress={() => setVerTodas((v) => !v)} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>{verTodas ? 'Ver menos' : `Ver las ${filtradas.length} empresas`}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
