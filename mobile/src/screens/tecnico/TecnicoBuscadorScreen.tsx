import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Image, Linking,
} from 'react-native';
import {
  Search, Building2, Armchair, CalendarCheck, Video, MapPin, X,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa', label: 'Programada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316', label: 'En curso' },
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Finalizada' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: 'Cancelada' },
};
const TIPO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  VIRTUAL:    { color: '#2563eb', bg: '#dbeafe', label: 'Virtual' },
  PRESENCIAL: { color: '#059669', bg: '#d1fae5', label: 'Presencial' },
  MIXTA:      { color: '#7c3aed', bg: '#ede9fe', label: 'Mixta' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

function EmpresaCard({ e }: { e: any }) {
  return (
    <View style={{ backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#f1f5f9',
      padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12,
      shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:1 }}>
      {e.urlFotoPerfil
        ? <Image source={{ uri: e.urlFotoPerfil }} style={{ width:44, height:44, borderRadius:22 }} resizeMode="cover" />
        : <View style={{ width:44, height:44, borderRadius:22, backgroundColor:'#dcfce7',
            alignItems:'center', justifyContent:'center' }}>
            <Building2 color={GREEN} size={18} />
          </View>
      }
      <View style={{ flex:1 }}>
        <Text style={{ fontSize:14, fontWeight:'700', color:'#111827' }} numberOfLines={1}>{e.nombre}</Text>
        {e.rubro ? <Text style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{e.rubro}</Text> : null}
        {e.correoEmpresa ? <Text style={{ fontSize:10, color:'#9ca3af', marginTop:1 }}>{e.correoEmpresa}</Text> : null}
      </View>
      <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:999,
        backgroundColor: e.estaActivo === 1 ? '#dcfce7' : '#f3f4f6' }}>
        <Text style={{ fontSize:9, fontWeight:'700',
          color: e.estaActivo === 1 ? '#15803d' : '#9ca3af' }}>
          {e.estaActivo === 1 ? 'Activa' : 'Inactiva'}
        </Text>
      </View>
    </View>
  );
}

function ReunionCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const sol        = r.solicitudreunion;
  const ea         = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb         = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est        = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip        = TIPO_CFG[r.tipoReunion]    ?? TIPO_CFG.PRESENCIAL;
  const link       = sol?.enlaceReunionVirtual;
  const mapsUrl    = sol?.ubicacionGoogleMapsReunion
    ?? (sol?.latitudPresencial && sol?.longitudPresencial ? `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}` : null)
    ?? (sol?.direccionTexto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}` : null);
  const esVirtual  = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  return (
    <View style={{ backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#f1f5f9',
      marginBottom:8, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:1 }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding:14 }} activeOpacity={0.85}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:6 }}>
          <View style={{ width:7, height:7, borderRadius:4, backgroundColor:est.dot }} />
          <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', flex:1 }} numberOfLines={1}>
            {ea?.nombre ?? '—'} ↔ {eb?.nombre ?? '—'}
          </Text>
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:7, flexWrap:'wrap', marginLeft:13 }}>
          <Text style={{ fontSize:10, color:'#6b7280' }}>
            Mesa {r.mesa?.numeroMesa} · {fmtDate(r.fechaHoraInicioReunion)} {fmtTime(r.fechaHoraInicioReunion)}
          </Text>
          <View style={{ paddingHorizontal:6, paddingVertical:2, borderRadius:999, backgroundColor:tip.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:tip.color }}>{tip.label}</Text>
          </View>
          <View style={{ paddingHorizontal:6, paddingVertical:2, borderRadius:999, backgroundColor:est.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:est.color }}>{est.label}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && ((esVirtual && link) || (esPresencial && mapsUrl)) && (
        <View style={{ borderTopWidth:1, borderTopColor:'#f3f4f6', padding:12, gap:8 }}>
          {esVirtual && link && (
            <TouchableOpacity onPress={() => Linking.openURL(link)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:9, borderRadius:10, backgroundColor:'#2563eb' }}>
              <Video color="#fff" size={13} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Entrar a reunión virtual</Text>
            </TouchableOpacity>
          )}
          {esPresencial && mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:9, borderRadius:10, backgroundColor:'#059669' }}>
              <MapPin color="#fff" size={13} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Ver en Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function MesaCard({ m }: { m: any }) {
  return (
    <View style={{ backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#f1f5f9',
      padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', gap:12,
      shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:1 }}>
      <View style={{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
        backgroundColor: m.estaActivo === 1 ? GREEN : '#e5e7eb' }}>
        <Text style={{ color: m.estaActivo === 1 ? '#fff' : '#9ca3af',
          fontWeight:'800', fontSize:15 }}>{String(m.numeroMesa).padStart(2,'0')}</Text>
      </View>
      <View style={{ flex:1 }}>
        <Text style={{ fontSize:14, fontWeight:'700', color:'#111827' }}>Mesa {m.numeroMesa}</Text>
        <Text style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
          {m._count?.reunion ?? 0} reunión(es) · {m.capacidadPersonas} personas
        </Text>
      </View>
      <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:999,
        backgroundColor: m.estaActivo === 1 ? '#dcfce7' : '#f3f4f6' }}>
        <Text style={{ fontSize:9, fontWeight:'700',
          color: m.estaActivo === 1 ? '#15803d' : '#9ca3af' }}>
          {m.estaActivo === 1 ? 'Activa' : 'Inactiva'}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, marginTop:4 }}>
      {icon}
      <Text style={{ fontSize:14, fontWeight:'800', color:'#0f172a', flex:1 }}>{label}</Text>
      <View style={{ backgroundColor:'#f1f5f9', borderRadius:999, paddingHorizontal:8, paddingVertical:2 }}>
        <Text style={{ fontSize:11, fontWeight:'700', color:'#64748b' }}>{count}</Text>
      </View>
    </View>
  );
}

export default function TecnicoBuscadorScreen() {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/tecnico/buscar?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(text), 400);
  };

  const empresas  = results?.empresas  ?? [];
  const reuniones = results?.reuniones ?? [];
  const mesas     = results?.mesas     ?? [];
  const total     = empresas.length + reuniones.length + mesas.length;

  return (
    <View style={{ flex:1, backgroundColor:'#f8fafc' }}>
      {/* Header */}
      <View style={{ backgroundColor:'#fff', paddingHorizontal:16, paddingTop:52, paddingBottom:14,
        borderBottomWidth:1, borderBottomColor:'#f1f5f9' }}>
        <Text style={{ fontSize:22, fontWeight:'800', color:'#0f172a' }}>Buscador</Text>
        <Text style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Empresas, reuniones y mesas</Text>

        {/* Search input */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginTop:12,
          backgroundColor:'#f1f5f9', borderRadius:14, paddingHorizontal:14, paddingVertical:10 }}>
          <Search color="#9ca3af" size={16} />
          <TextInput
            value={query}
            onChangeText={handleChange}
            placeholder="Buscar..."
            placeholderTextColor="#9ca3af"
            style={{ flex:1, fontSize:14, color:'#111827' }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}>
              <X color="#9ca3af" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16 }} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={{ paddingVertical:40, alignItems:'center' }}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        )}

        {!loading && query.trim().length < 2 && (
          <View style={{ paddingVertical:60, alignItems:'center', gap:12 }}>
            <Search color="#d1d5db" size={48} />
            <Text style={{ fontSize:15, fontWeight:'600', color:'#9ca3af' }}>Escribe para buscar</Text>
            <Text style={{ fontSize:12, color:'#cbd5e1', textAlign:'center' }}>
              Busca por nombre de empresa, número de mesa o estado de reunión
            </Text>
          </View>
        )}

        {!loading && results && total === 0 && (
          <View style={{ paddingVertical:60, alignItems:'center', gap:12 }}>
            <Search color="#d1d5db" size={48} />
            <Text style={{ fontSize:15, fontWeight:'600', color:'#9ca3af' }}>Sin resultados</Text>
            <Text style={{ fontSize:12, color:'#cbd5e1' }}>Intenta con otro término</Text>
          </View>
        )}

        {!loading && empresas.length > 0 && (
          <View style={{ marginBottom:16 }}>
            <SectionHeader icon={<Building2 color={GREEN} size={16} />} label="Empresas" count={empresas.length} />
            {empresas.map((e: any) => <EmpresaCard key={e.id} e={e} />)}
          </View>
        )}

        {!loading && reuniones.length > 0 && (
          <View style={{ marginBottom:16 }}>
            <SectionHeader icon={<CalendarCheck color="#2563eb" size={16} />} label="Reuniones" count={reuniones.length} />
            {reuniones.map((r: any) => <ReunionCard key={r.id} r={r} />)}
          </View>
        )}

        {!loading && mesas.length > 0 && (
          <View style={{ marginBottom:16 }}>
            <SectionHeader icon={<Armchair color="#7c3aed" size={16} />} label="Mesas" count={mesas.length} />
            {mesas.map((m: any) => <MesaCard key={m.id} m={m} />)}
          </View>
        )}

        <View style={{ height:20 }} />
      </ScrollView>
    </View>
  );
}
