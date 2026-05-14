import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Linking,
} from 'react-native';
import {
  Armchair, Building2, Clock, Video, MapPin, ChevronDown,
  ChevronUp, Link2,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

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

function CompanyChip({ empresa }: { empresa: any }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:8, flex:1, minWidth:0,
      backgroundColor:'#f8fafc', borderRadius:10, paddingHorizontal:10, paddingVertical:8 }}>
      {empresa?.urlFotoPerfil
        ? <Image source={{ uri: empresa.urlFotoPerfil }} style={{ width:30, height:30, borderRadius:15 }} resizeMode="cover" />
        : <View style={{ width:30, height:30, borderRadius:15, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center' }}>
            <Building2 color={GREEN} size={13} />
          </View>
      }
      <View style={{ flex:1, minWidth:0 }}>
        <Text style={{ fontSize:12, fontWeight:'700', color:'#111827' }} numberOfLines={1}>{empresa?.nombre ?? '—'}</Text>
        <Text style={{ fontSize:10, color:'#6b7280' }} numberOfLines={1}>{empresa?.rubro ?? ''}</Text>
      </View>
    </View>
  );
}

function ReunionRow({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const sol = r.solicitudreunion;
  const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip = TIPO_CFG[r.tipoReunion]    ?? TIPO_CFG.PRESENCIAL;
  const link        = sol?.enlaceReunionVirtual;
  const mapsUrl     = sol?.ubicacionGoogleMapsReunion
    ?? (sol?.latitudPresencial && sol?.longitudPresencial ? `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}` : null)
    ?? (sol?.direccionTexto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}` : null);
  const esVirtual   = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  return (
    <View style={{ borderTopWidth:1, borderTopColor:'#f3f4f6' }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding:14 }} activeOpacity={0.8}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:est.dot }} />
          <CompanyChip empresa={ea} />
          <Text style={{ color:'#9ca3af', fontSize:12 }}>↔</Text>
          <CompanyChip empresa={eb} />
          {expanded ? <ChevronUp color="#9ca3af" size={16}/> : <ChevronDown color="#9ca3af" size={16}/>}
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap', marginLeft:16 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Clock color="#9ca3af" size={11} />
            <Text style={{ fontSize:10, color:'#6b7280' }}>{fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}</Text>
          </View>
          <View style={{ paddingHorizontal:7, paddingVertical:2, borderRadius:999, backgroundColor:tip.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:tip.color }}>{tip.label}</Text>
          </View>
          <View style={{ paddingHorizontal:7, paddingVertical:2, borderRadius:999, backgroundColor:est.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:est.color }}>{est.label}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal:14, paddingBottom:14, gap:8 }}>
          {esVirtual && link && (
            <TouchableOpacity onPress={() => Linking.openURL(link)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:10, borderRadius:12, backgroundColor:'#2563eb' }}>
              <Video color="#fff" size={15} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Entrar a reunión virtual</Text>
            </TouchableOpacity>
          )}
          {esPresencial && mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:10, borderRadius:12, backgroundColor:'#059669' }}>
              <MapPin color="#fff" size={15} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Ver en Google Maps</Text>
            </TouchableOpacity>
          )}
          {sol?.mensajeParaEmpresaReceptora && (
            <Text style={{ fontSize:11, color:'#6b7280', fontStyle:'italic' }}>
              "{sol.mensajeParaEmpresaReceptora}"
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function TecnicoMesasScreen() {
  const [mesas,      setMesas]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro,     setFiltro]     = useState<'todas' | 'activas' | 'inactivas'>('todas');

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/tecnico/mesas`);
      const data = await res.json();
      setMesas(data.mesas ?? []);
    } catch { setMesas([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, []);

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === 'activas')   return m.estaActivo === 1;
    if (filtro === 'inactivas') return m.estaActivo === 0;
    return true;
  });

  const total    = mesas.length;
  const activas  = mesas.filter((m) => m.estaActivo === 1).length;
  const ocupadas = mesas.filter((m) => (m.reunion?.length ?? 0) > 0).length;

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#f8fafc' }}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={{ flex:1, backgroundColor:'#f8fafc' }}>
      {/* Header */}
      <View style={{ backgroundColor:'#fff', paddingHorizontal:16, paddingTop:52, paddingBottom:14,
        borderBottomWidth:1, borderBottomColor:'#f1f5f9' }}>
        <Text style={{ fontSize:22, fontWeight:'800', color:'#0f172a' }}>Mesas del evento</Text>
        <Text style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{total} mesas · {activas} activas · {ocupadas} ocupadas</Text>

        {/* Filtros */}
        <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
          {(['todas', 'activas', 'inactivas'] as const).map((f) => (
            <TouchableOpacity key={f} onPress={() => setFiltro(f)}
              style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:1,
                backgroundColor: filtro === f ? GREEN : '#fff',
                borderColor:     filtro === f ? GREEN : '#e5e7eb' }}>
              <Text style={{ fontSize:12, fontWeight:'600',
                color: filtro === f ? '#fff' : '#6b7280', textTransform:'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMesas(); }} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {mesasFiltradas.map((mesa) => (
          <View key={mesa.id} style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1,
            borderColor:'#f1f5f9', marginBottom:14, overflow:'hidden',
            shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 }}>
            {/* Header mesa */}
            <View style={{ flexDirection:'row', alignItems:'center', gap:12, padding:14,
              backgroundColor:'#fafafa', borderBottomWidth:1, borderBottomColor:'#f3f4f6' }}>
              <View style={{ width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
                backgroundColor: mesa.estaActivo === 1 ? GREEN : '#e5e7eb' }}>
                <Text style={{ color: mesa.estaActivo === 1 ? '#fff' : '#9ca3af',
                  fontWeight:'800', fontSize:15 }}>{String(mesa.numeroMesa).padStart(2,'0')}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'700', color:'#0f172a' }}>Mesa {mesa.numeroMesa}</Text>
                <Text style={{ fontSize:11, color:'#94a3b8' }}>
                  {mesa._count?.reunion ?? 0} reunión(es) · {mesa.capacidadPersonas} personas
                </Text>
              </View>
              <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:999,
                backgroundColor: mesa.estaActivo === 1 ? '#dcfce7' : '#f3f4f6' }}>
                <Text style={{ fontSize:10, fontWeight:'700',
                  color: mesa.estaActivo === 1 ? '#15803d' : '#9ca3af' }}>
                  {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>

            {/* Reuniones */}
            {mesa.reunion && mesa.reunion.length > 0
              ? mesa.reunion.map((r: any) => <ReunionRow key={r.id} r={r} />)
              : <Text style={{ paddingVertical:16, textAlign:'center', color:'#9ca3af', fontSize:13 }}>
                  Sin reuniones asignadas
                </Text>
            }
          </View>
        ))}
        <View style={{ height:20 }} />
      </ScrollView>
    </View>
  );
}
