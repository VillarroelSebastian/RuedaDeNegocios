import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Modal as RNModal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutDashboard, Video, Armchair, CalendarCheck, Building2,
  Clock, Calendar, ChevronRight, X, CheckCircle, AlertCircle, MapPin, CalendarPlus, QrCode, Radio, Images,
} from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' });
}

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa', label: 'Programada' },
  REPROGRAMADA: { color: '#b45309', bg: '#fef3c7', dot: '#f59e0b', label: 'Reprogramada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316', label: 'En curso' },
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Finalizada' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: 'Cancelada' },
};

const TIPO_CFG: Record<string, { color: string; bg: string }> = {
  VIRTUAL:    { color: '#2563eb', bg: '#dbeafe' },
  PRESENCIAL: { color: '#059669', bg: '#d1fae5' },
  MIXTA:      { color: '#7c3aed', bg: '#ede9fe' },
};

function AppModal({ visible, type, title, message, onClose }: any) {
  const cfg: any = {
    success: { bg: '#f0fdf4', border: '#86efac', btn: GREEN },
    error:   { bg: '#fef2f2', border: '#fca5a5', btn: '#ef4444' },
    info:    { bg: '#eff6ff', border: '#93c5fd', btn: '#2563eb' },
  };
  const c = cfg[type] ?? cfg.info;
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

function ReunionCard({ r, onEstadoChange }: { r: any; onEstadoChange: (id: number, estado: string) => void }) {
  const sol = r.solicitudreunion;
  const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip         = TIPO_CFG[r.tipoReunion]   ?? TIPO_CFG.PRESENCIAL;
  const mesa        = r.mesa;
  const link        = sol?.enlaceReunionVirtual;
  const mapsUrl     = sol?.ubicacionGoogleMapsReunion
    ?? (sol?.latitudPresencial && sol?.longitudPresencial ? `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}` : null)
    ?? (sol?.direccionTexto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}` : null);
  const esVirtual   = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
  const [menuVisible, setMenuVisible] = useState(false);
  const permitidos: Record<string, string[]> = {
    PROGRAMADA: ['EN_CURSO', 'CANCELADA'], REPROGRAMADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['FINALIZADA'], FINALIZADA: [], CANCELADA: [],
  };
  const estados = permitidos[r.estadoReunion] ?? [];

  return (
    <View style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#f1f5f9', marginBottom:12, overflow:'hidden', shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 }}>
      <View style={{ padding:14 }}>
        {/* Empresas */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:10 }}>
          {ea?.urlFotoPerfil
            ? <Image source={{ uri: ea.urlFotoPerfil }} style={{ width:32, height:32, borderRadius:16 }} resizeMode="contain" />
            : <View style={{ width:32, height:32, borderRadius:16, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center' }}><Building2 color={GREEN} size={14} /></View>
          }
          <Text style={{ flex:1, fontSize:12, fontWeight:'700', color:'#111827' }} numberOfLines={1}>{ea?.nombre ?? '—'}</Text>
          <Text style={{ color:'#9ca3af', fontSize:12 }}>↔</Text>
          {eb?.urlFotoPerfil
            ? <Image source={{ uri: eb.urlFotoPerfil }} style={{ width:32, height:32, borderRadius:16 }} resizeMode="contain" />
            : <View style={{ width:32, height:32, borderRadius:16, backgroundColor:'#dbeafe', alignItems:'center', justifyContent:'center' }}><Building2 color="#2563eb" size={14} /></View>
          }
          <Text style={{ flex:1, fontSize:12, fontWeight:'700', color:'#111827' }} numberOfLines={1}>{eb?.nombre ?? '—'}</Text>
        </View>

        {/* Info fila */}
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Armchair color="#9ca3af" size={12} />
            <Text style={{ fontSize:11, color:'#6b7280', fontWeight:'600' }}>Mesa {mesa?.numeroMesa}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Clock color="#9ca3af" size={12} />
            <Text style={{ fontSize:11, color:'#6b7280' }}>{fmtTime(r.fechaHoraInicioReunion)}</Text>
          </View>
          <View style={{ paddingHorizontal:8, paddingVertical:2, borderRadius:999, backgroundColor:tip.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:tip.color }}>{r.tipoReunion}</Text>
          </View>
          <View style={{ paddingHorizontal:8, paddingVertical:2, borderRadius:999, backgroundColor:est.bg }}>
            <Text style={{ fontSize:9, fontWeight:'700', color:est.color }}>{est.label}</Text>
          </View>
        </View>
      </View>

      {/* Links según tipo */}
      {(esVirtual && link) || (esPresencial && mapsUrl) ? (
        <View style={{ borderTopWidth:1, borderTopColor:'#f3f4f6', padding:12, gap:8 }}>
          {esVirtual && link && (
            <TouchableOpacity onPress={() => Linking.openURL(link)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:9, borderRadius:11, backgroundColor:'#2563eb' }}>
              <Video color="#fff" size={13} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Entrar a reunión virtual</Text>
            </TouchableOpacity>
          )}
          {esPresencial && mapsUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}
              style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
                paddingVertical:9, borderRadius:11, backgroundColor:'#059669' }}>
              <MapPin color="#fff" size={13} />
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>Ver en Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Cambiar estado */}
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        style={{ borderTopWidth:1, borderTopColor:'#f3f4f6', paddingVertical:10, alignItems:'center', backgroundColor:'#fafafa' }}
      >
        <Text style={{ fontSize:12, fontWeight:'600', color:GREEN }}>Cambiar estado</Text>
      </TouchableOpacity>

      {/* Modal estado */}
      <RNModal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' }}
          activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={{ backgroundColor:'#fff', borderRadius:20, padding:20, width:'80%', maxWidth:340 }}>
            <Text style={{ fontSize:16, fontWeight:'700', color:'#111827', marginBottom:16, textAlign:'center' }}>Cambiar estado de reunión</Text>
            {estados.map((est) => {
              const cfg = ESTADO_CFG[est];
              return (
                <TouchableOpacity key={est}
                  onPress={() => { setMenuVisible(false); onEstadoChange(r.id, est); }}
                  style={{ flexDirection:'row', alignItems:'center', gap:12, paddingVertical:12, paddingHorizontal:16,
                    borderRadius:12, marginBottom:8, backgroundColor: r.estadoReunion === est ? cfg.bg : '#f9fafb',
                    borderWidth:1, borderColor: r.estadoReunion === est ? cfg.dot : '#f1f5f9' }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor:cfg.dot }} />
                  <Text style={{ fontSize:14, fontWeight:'600', color: r.estadoReunion === est ? cfg.color : '#374151', flex:1 }}>{cfg.label}</Text>
                  {r.estadoReunion === est && <CheckCircle color={cfg.color} size={16} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

export default function TecnicoDashboardScreen() {
  const user = userStore.get();
  const navigation = useNavigation<any>();
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState<{ visible:boolean; type:string; title:string; message:string }>
    ({ visible:false, type:'info', title:'', message:'' });

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/tecnico/dashboard`);
      const json = await res.json();
      setData(json);
    } catch { setData(null); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleEstadoChange = async (reunionId: number, nuevoEstado: string) => {
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${reunionId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoReunion: nuevoEstado }),
      });
      if (!res.ok) throw new Error();
      setModal({ visible:true, type:'success', title:'Estado actualizado', message:`Reunión marcada como ${nuevoEstado}.` });
      fetchData();
    } catch {
      setModal({ visible:true, type:'error', title:'Error', message:'No se pudo actualizar el estado.' });
    }
  };

  const stats = data?.stats ?? {};
  const proximas = data?.proximasReuniones ?? [];
  const evento   = data?.evento;

  const statCards = [
    { label: 'En curso',   value: stats.reunionesEnCurso  ?? 0, color:'#c2410c', bg:'#ffedd5', icon: <Clock color="#c2410c" size={18}/> },
    { label: 'Próximas',   value: stats.proximasReuniones ?? 0, color:'#1d4ed8', bg:'#dbeafe', icon: <CalendarCheck color="#1d4ed8" size={18}/> },
    { label: 'Virtuales',  value: stats.reunionesVirtuales?? 0, color:'#7c3aed', bg:'#ede9fe', icon: <Video color="#7c3aed" size={18}/> },
    { label: 'Mesas',      value: stats.mesasActivas      ?? 0, color:GREEN,     bg:'#dcfce7', icon: <Armchair color={GREEN} size={18}/> },
  ];

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#f8fafc' }} edges={['top']}>
      <AppModal {...modal} onClose={() => setModal(m => ({ ...m, visible:false }))} />

      {/* Header */}
      <View style={{ backgroundColor:'#fff', paddingHorizontal:20, paddingVertical:16,
        borderBottomWidth:1, borderBottomColor:'#f1f5f9', flexDirection:'row', alignItems:'center', gap:12 }}>
        <View style={{ width:40, height:40, borderRadius:20, backgroundColor:GREEN, alignItems:'center', justifyContent:'center' }}>
          {user?.urlFotoPerfil
            ? <Image source={{ uri: user.urlFotoPerfil }} style={{ width:40, height:40, borderRadius:20 }} />
            : <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>{user?.nombres?.[0] ?? 'T'}</Text>
          }
        </View>
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:16, fontWeight:'800', color:'#0f172a' }}>Panel Técnico</Text>
          <Text style={{ fontSize:12, color:'#94a3b8' }}>{user?.nombres} {user?.apellidoPaterno}</Text>
        </View>
        {evento && (
          <View style={{ backgroundColor:'#dcfce7', paddingHorizontal:10, paddingVertical:4, borderRadius:999 }}>
            <Text style={{ fontSize:10, fontWeight:'700', color:'#166534' }}>{evento.nombre}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          style={{ flex:1 }}
          contentContainerStyle={{ padding:16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={GREEN} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 }}>
            {statCards.map((s) => (
              <View key={s.label} style={{ flex:1, minWidth:'44%', backgroundColor:'#fff', borderRadius:16,
                borderWidth:1, borderColor:'#f1f5f9', padding:16, gap:8,
                shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 }}>
                <View style={{ width:36, height:36, borderRadius:10, backgroundColor:s.bg, alignItems:'center', justifyContent:'center' }}>
                  {s.icon}
                </View>
                <Text style={{ fontSize:28, fontWeight:'800', color:s.color }}>{s.value}</Text>
                <Text style={{ fontSize:11, fontWeight:'600', color:'#94a3b8', textTransform:'uppercase' }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Agendar reunión entre empresas */}
          <TouchableOpacity
            onPress={() => navigation.navigate('TecnicoAgendar')}
            activeOpacity={0.85}
            style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:GREEN,
              borderRadius:16, padding:16, marginBottom:20,
              shadowColor:'#000', shadowOpacity:0.08, shadowRadius:6, elevation:2 }}
          >
            <View style={{ width:40, height:40, borderRadius:12, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' }}>
              <CalendarPlus color="#fff" size={20} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'800', color:'#fff' }}>Agendar reunión</Text>
              <Text style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:1 }}>
                Crea una reunión confirmada entre dos empresas en 4 pasos
              </Text>
            </View>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('TecnicoAsistencia')}
            activeOpacity={0.85}
            style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#0f172a', borderRadius:16, padding:16, marginBottom:20 }}
          >
            <View style={{ width:40, height:40, borderRadius:12, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' }}>
              <QrCode color="#fff" size={20} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'800', color:'#fff' }}>Registrar asistencia</Text>
              <Text style={{ fontSize:11, color:'rgba(255,255,255,0.75)', marginTop:1 }}>Escanea la credencial QR del participante</Text>
            </View>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('TecnicoEventosVivo')} activeOpacity={0.85}
            style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#dc2626', borderRadius:16, padding:16, marginBottom:20 }}>
            <View style={{ width:40, height:40, borderRadius:12, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' }}><Radio color="#fff" size={20}/></View>
            <View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'800',color:'#fff'}}>Monitorear eventos en vivo</Text><Text style={{fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:1}}>Estados, transmisión y anuncios</Text></View><ChevronRight color="#fff" size={20}/>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('TecnicoGaleria')} activeOpacity={0.85} style={{ flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#2563eb', borderRadius:16, padding:16, marginBottom:20 }}><View style={{width:40,height:40,borderRadius:12,backgroundColor:'rgba(255,255,255,.15)',alignItems:'center',justifyContent:'center'}}><Images color="#fff" size={20}/></View><View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'800',color:'#fff'}}>Fotos del evento</Text><Text style={{fontSize:11,color:'rgba(255,255,255,.75)'}}>Cámara o galería</Text></View><ChevronRight color="#fff" size={20}/></TouchableOpacity>

          {/* Próximas reuniones */}
          <View style={{ marginBottom:8 }}>
            <Text style={{ fontSize:16, fontWeight:'800', color:'#0f172a', marginBottom:12 }}>
              Próximas reuniones
            </Text>
            {proximas.length === 0 ? (
              <View style={{ backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#f1f5f9', padding:32, alignItems:'center' }}>
                <CalendarCheck color="#d1d5db" size={36} />
                <Text style={{ color:'#9ca3af', marginTop:12, fontSize:14 }}>No hay reuniones próximas</Text>
              </View>
            ) : (
              proximas.map((r: any) => (
                <ReunionCard key={r.id} r={r} onEstadoChange={handleEstadoChange} />
              ))
            )}
          </View>
          <View style={{ height:20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
