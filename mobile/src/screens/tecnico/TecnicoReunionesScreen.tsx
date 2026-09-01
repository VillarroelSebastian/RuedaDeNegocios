import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Modal as RNModal, TextInput, Linking,
} from 'react-native';
import {
  Building2, Clock, Video, MapPin, CheckCircle, ChevronDown,
  ChevronUp, Search, X, Armchair, AlertTriangle,
  Star,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz',
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', {
    day: 'numeric', month: 'short', timeZone: 'America/La_Paz',
  });
}

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa', label: 'Programada' },
  REPROGRAMADA:{ color: '#b45309', bg: '#fef3c7', dot: '#f59e0b', label: 'Reprogramada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316', label: 'En curso' },
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Finalizada' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: 'Cancelada' },
};
const TIPO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  VIRTUAL:    { color: '#2563eb', bg: '#dbeafe', label: 'Virtual' },
  PRESENCIAL: { color: '#059669', bg: '#d1fae5', label: 'Presencial' },
  MIXTA:      { color: '#7c3aed', bg: '#ede9fe', label: 'Mixta' },
};

function AppModal({ visible, type, title, message, onClose }: any) {
  const cfg: any = { success:{ bg:'#f0fdf4', border:'#86efac', btn:GREEN }, error:{ bg:'#fef2f2', border:'#fca5a5', btn:'#ef4444' } };
  const c = cfg[type] ?? cfg.success;
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center', padding:24 }}>
        <View style={{ backgroundColor:c.bg, borderWidth:1, borderColor:c.border, borderRadius:20, padding:24, width:'100%', maxWidth:360 }}>
          <Text style={{ fontSize:17, fontWeight:'700', color:'#111827', textAlign:'center', marginBottom:8 }}>{title}</Text>
          <Text style={{ fontSize:14, color:'#4b5563', textAlign:'center', lineHeight:20, marginBottom:20 }}>{message}</Text>
          <TouchableOpacity style={{ backgroundColor:c.btn, borderRadius:12, paddingVertical:12, alignItems:'center' }} onPress={onClose}>
            <Text style={{ fontWeight:'700', color:'#fff' }}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
}

function ReunionCard({ r, onCambiarEstado }: { r: any; onCambiarEstado: (id:number, est:string)=>void }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const canceladaPorEmpresa = r.estadoReunion === 'CANCELADA'
    && /^Cancelada por /i.test(r.observacionesReunion ?? '');
  const enlaceOperativo = ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion);
  const permitidos: Record<string, string[]> = {
    PROGRAMADA: ['EN_CURSO', 'CANCELADA'],
    REPROGRAMADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['FINALIZADA'], FINALIZADA: [], CANCELADA: [],
  };
  const opcionesEstado = permitidos[r.estadoReunion] ?? [];

  return (
    <View style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#f1f5f9',
      marginBottom:10, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:4, elevation:1 }}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding:14 }} activeOpacity={0.85}>
        {/* Empresas */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:est.dot }} />
          {ea?.urlFotoPerfil
            ? <Image source={{ uri: ea.urlFotoPerfil }} style={{ width:28, height:28, borderRadius:14 }} resizeMode="contain"/>
            : <View style={{ width:28, height:28, borderRadius:14, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center' }}><Building2 color={GREEN} size={12}/></View>
          }
          <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', flex:1 }} numberOfLines={1}>{ea?.nombre ?? '—'}</Text>
          <Text style={{ color:'#9ca3af', fontSize:12, marginHorizontal:2 }}>↔</Text>
          {eb?.urlFotoPerfil
            ? <Image source={{ uri: eb.urlFotoPerfil }} style={{ width:28, height:28, borderRadius:14 }} resizeMode="contain"/>
            : <View style={{ width:28, height:28, borderRadius:14, backgroundColor:'#dbeafe', alignItems:'center', justifyContent:'center' }}><Building2 color="#2563eb" size={12}/></View>
          }
          <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', flex:1 }} numberOfLines={1}>{eb?.nombre ?? '—'}</Text>
          {expanded ? <ChevronUp color="#9ca3af" size={15}/> : <ChevronDown color="#9ca3af" size={15}/>}
        </View>

        {/* Info */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:7, flexWrap:'wrap', marginLeft:14 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
            <Armchair color="#9ca3af" size={11}/>
            <Text style={{ fontSize:10, color:'#6b7280', fontWeight:'600' }}>{r.mesa?.numeroMesa ? `Mesa ${r.mesa.numeroMesa}` : 'Sin mesa física'}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:3 }}>
            <Clock color="#9ca3af" size={11}/>
            <Text style={{ fontSize:10, color:'#6b7280' }}>{fmtDate(r.fechaHoraInicioReunion)} · {fmtTime(r.fechaHoraInicioReunion)}</Text>
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
        <View style={{ borderTopWidth:1, borderTopColor:'#f3f4f6', padding:14, gap:8 }}>
          {canceladaPorEmpresa && (
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8, borderWidth:1,
              borderColor:'#fecaca', backgroundColor:'#fef2f2', borderRadius:12, padding:10 }}>
              <AlertTriangle color="#dc2626" size={16}/>
              <Text style={{ flex:1, color:'#991b1b', fontSize:12, lineHeight:17 }}>{r.observacionesReunion}</Text>
            </View>
          )}
          {esVirtual && link && enlaceOperativo && (
            <TouchableOpacity onPress={() => Linking.openURL(link)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:10, borderRadius:12, backgroundColor:'#2563eb' }}>
              <Video color="#fff" size={14}/>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Entrar a reunión virtual</Text>
            </TouchableOpacity>
          )}
          {esPresencial && mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:10, borderRadius:12, backgroundColor:'#059669' }}>
              <MapPin color="#fff" size={14}/>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Ver en Google Maps</Text>
            </TouchableOpacity>
          )}
          {opcionesEstado.length > 0 && <TouchableOpacity onPress={() => setMenuOpen(true)}
            style={{ borderWidth:1, borderColor:GREEN, borderRadius:12, paddingVertical:10, alignItems:'center' }}>
            <Text style={{ color:GREEN, fontWeight:'700', fontSize:12 }}>Cambiar estado de reunión</Text>
          </TouchableOpacity>}
        </View>
      )}

      {/* Modal cambiar estado */}
      <RNModal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' }}
          activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={{ backgroundColor:'#fff', borderRadius:20, padding:20, width:'82%', maxWidth:340 }}>
            <Text style={{ fontSize:15, fontWeight:'700', color:'#111827', marginBottom:14, textAlign:'center' }}>Estado de la reunión</Text>
            {opcionesEstado.map((key) => {
              const cfg = ESTADO_CFG[key];
              return (
              <TouchableOpacity key={key} onPress={() => { setMenuOpen(false); onCambiarEstado(r.id, key); }}
                style={{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12, paddingHorizontal:14,
                  borderRadius:12, marginBottom:6,
                  backgroundColor: r.estadoReunion === key ? cfg.bg : '#f9fafb',
                  borderWidth:1, borderColor: r.estadoReunion === key ? cfg.dot : '#f1f5f9' }}>
                <View style={{ width:10, height:10, borderRadius:5, backgroundColor:cfg.dot }} />
                <Text style={{ fontSize:13, fontWeight:'600', color: r.estadoReunion === key ? cfg.color : '#374151', flex:1 }}>{cfg.label}</Text>
                {r.estadoReunion === key && <CheckCircle color={cfg.color} size={15}/>}
              </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

export default function TecnicoReunionesScreen() {
  const [reuniones,  setReuniones]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEst,  setFiltroEst]  = useState('TODOS');
  const [filtroTip,  setFiltroTip]  = useState('TODOS');
  const [modal,      setModal]      = useState<any>({ visible:false, type:'success', title:'', message:'' });
  const [evaluando, setEvaluando] = useState<any>(null);
  const [evaluacion, setEvaluacion] = useState<any>({ calificacionA:0, rangoA:'', observacionesA:'', calificacionB:0, rangoB:'', observacionesB:'' });
  const [guardando, setGuardando] = useState(false);

  const fetchReuniones = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroEst !== 'TODOS') params.set('estado', filtroEst);
      if (filtroTip !== 'TODOS') params.set('tipo',   filtroTip);
      const res  = await fetch(`${API_URL}/tecnico/reuniones?${params}`);
      const data = await res.json();
      setReuniones(Array.isArray(data) ? data : []);
    } catch { setReuniones([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filtroEst, filtroTip]);

  useEffect(() => { setLoading(true); fetchReuniones(); }, [filtroEst, filtroTip]);

  const handleCambiarEstado = async (id: number, estado: string) => {
    if (estado === 'FINALIZADA') {
      setEvaluando(reuniones.find((r) => r.id === id) ?? null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoReunion: estado }),
      });
      if (!res.ok) throw new Error();
      setModal({ visible:true, type:'success', title:'Estado actualizado', message:`Reunión marcada como ${estado}.` });
      fetchReuniones();
    } catch {
      setModal({ visible:true, type:'error', title:'Error', message:'No se pudo actualizar el estado.' });
    }
  };

  const guardarEvaluacion = async () => {
    if (!evaluando || !evaluacion.calificacionA || !evaluacion.calificacionB || !evaluacion.rangoA.trim() || !evaluacion.rangoB.trim() || !evaluacion.observacionesA.trim() || !evaluacion.observacionesB.trim()) {
      setModal({ visible:true, type:'error', title:'Datos incompletos', message:'Completa la evaluación de ambas empresas.' }); return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${evaluando.id}/finalizar-evaluar`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(evaluacion) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo finalizar');
      setEvaluando(null); setEvaluacion({ calificacionA:0, rangoA:'', observacionesA:'', calificacionB:0, rangoB:'', observacionesB:'' });
      setModal({ visible:true, type:'success', title:'Reunión finalizada', message:'Se guardaron las evaluaciones de ambas empresas.' }); fetchReuniones();
    } catch (e:any) { setModal({ visible:true, type:'error', title:'Error', message:e.message }); }
    finally { setGuardando(false); }
  };

  const estados = ['TODOS','PROGRAMADA','REPROGRAMADA','EN_CURSO','FINALIZADA','CANCELADA'];
  const tipos   = ['TODOS','PRESENCIAL','VIRTUAL','MIXTA'];
  const canceladasPorEmpresa = reuniones.filter((r) =>
    r.estadoReunion === 'CANCELADA' && /^Cancelada por /i.test(r.observacionesReunion ?? ''),
  );

  return (
    <View style={{ flex:1, backgroundColor:'#f8fafc' }}>
      <AppModal {...modal} onClose={() => setModal((m:any) => ({ ...m, visible:false }))} />
      <RNModal visible={!!evaluando} transparent animationType="slide" onRequestClose={() => setEvaluando(null)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'flex-end'}}><View style={{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'92%',padding:20}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><Text style={{fontSize:19,fontWeight:'800'}}>Finalizar y evaluar</Text><TouchableOpacity onPress={() => setEvaluando(null)}><X size={22} color="#64748b" /></TouchableOpacity></View>
          <ScrollView>{['A','B'].map((sufijo) => { const sol=evaluando?.solicitudreunion; const nombre=sufijo==='A' ? sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa?.nombre : sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa?.nombre; const kc=`calificacion${sufijo}`, kr=`rango${sufijo}`, ko=`observaciones${sufijo}`; return <View key={sufijo} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:16,padding:14,marginBottom:12}}><Text style={{fontWeight:'800',marginBottom:10}}>{nombre ?? `Empresa ${sufijo}`}</Text><View style={{flexDirection:'row',gap:5,marginBottom:10}}>{[1,2,3,4,5].map(n=><TouchableOpacity key={n} onPress={()=>setEvaluacion((v:any)=>({...v,[kc]:n}))}><Star size={28} color={evaluacion[kc]>=n?'#f59e0b':'#d1d5db'} fill={evaluacion[kc]>=n?'#f59e0b':'transparent'} /></TouchableOpacity>)}</View><TextInput value={evaluacion[kr]} onChangeText={(t)=>setEvaluacion((v:any)=>({...v,[kr]:t}))} placeholder="Rango estimado del acuerdo" style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:12,padding:11,marginBottom:8}}/><TextInput value={evaluacion[ko]} onChangeText={(t)=>setEvaluacion((v:any)=>({...v,[ko]:t}))} placeholder="Observaciones y puntos tratados" multiline style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:12,padding:11,minHeight:70,textAlignVertical:'top'}}/></View>})}</ScrollView>
          <TouchableOpacity disabled={guardando} onPress={guardarEvaluacion} style={{backgroundColor:'#f97316',borderRadius:14,paddingVertical:14,alignItems:'center',opacity:guardando?.6:1}}><Text style={{color:'#fff',fontWeight:'800'}}>{guardando?'Guardando…':'Finalizar y guardar'}</Text></TouchableOpacity>
        </View></View>
      </RNModal>

      {/* Header */}
      <View style={{ backgroundColor:'#fff', paddingHorizontal:16, paddingTop:52, paddingBottom:14,
        borderBottomWidth:1, borderBottomColor:'#f1f5f9' }}>
        <Text style={{ fontSize:22, fontWeight:'800', color:'#0f172a' }}>Reuniones</Text>
        <Text style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{reuniones.length} resultado(s)</Text>

        {/* Filtro estado */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:10 }}>
          <View style={{ flexDirection:'row', gap:7 }}>
            {estados.map((e) => {
              const cfg = e !== 'TODOS' ? ESTADO_CFG[e] : null;
              const activo = filtroEst === e;
              return (
                <TouchableOpacity key={e} onPress={() => setFiltroEst(e)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1,
                    backgroundColor: activo ? (cfg?.bg ?? '#0f172a') : '#fff',
                    borderColor:     activo ? (cfg?.dot ?? '#0f172a') : '#e5e7eb' }}>
                  <Text style={{ fontSize:11, fontWeight:'700',
                    color: activo ? (cfg?.color ?? '#fff') : '#6b7280' }}>
                    {e === 'TODOS' ? 'Todos' : cfg?.label ?? e}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Filtro tipo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:7 }}>
          <View style={{ flexDirection:'row', gap:7 }}>
            {tipos.map((t) => {
              const cfg = t !== 'TODOS' ? TIPO_CFG[t] : null;
              const activo = filtroTip === t;
              return (
                <TouchableOpacity key={t} onPress={() => setFiltroTip(t)}
                  style={{ paddingHorizontal:12, paddingVertical:5, borderRadius:20, borderWidth:1,
                    backgroundColor: activo ? (cfg?.bg ?? '#f1f5f9') : '#fff',
                    borderColor:     activo ? (cfg?.color ?? '#374151') : '#e5e7eb' }}>
                  <Text style={{ fontSize:11, fontWeight:'600',
                    color: activo ? (cfg?.color ?? '#374151') : '#6b7280' }}>
                    {t === 'TODOS' ? 'Todos los tipos' : cfg?.label ?? t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ padding:16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReuniones(); }} tintColor={GREEN} />}
          showsVerticalScrollIndicator={false}
        >
          {canceladasPorEmpresa.length > 0 && (
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:12,
              borderWidth:1, borderColor:'#fecaca', backgroundColor:'#fef2f2', borderRadius:16, padding:14 }}>
              <AlertTriangle color="#dc2626" size={19}/>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#991b1b', fontSize:13, fontWeight:'800' }}>
                  {canceladasPorEmpresa.length} reunión(es) cancelada(s) por empresas
                </Text>
                <Text style={{ color:'#b91c1c', fontSize:11, lineHeight:16, marginTop:3 }}>
                  Abre las tarjetas canceladas para consultar quién canceló y el motivo.
                </Text>
              </View>
            </View>
          )}
          {reuniones.length === 0 ? (
            <View style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#f1f5f9', padding:40, alignItems:'center' }}>
              <CheckCircle color="#d1d5db" size={36}/>
              <Text style={{ color:'#9ca3af', marginTop:12, fontSize:14 }}>Sin reuniones con este filtro</Text>
            </View>
          ) : (
            reuniones.map((r) => <ReunionCard key={r.id} r={r} onCambiarEstado={handleCambiarEstado} />)
          )}
          <View style={{ height:20 }} />
        </ScrollView>
      )}
    </View>
  );
}
