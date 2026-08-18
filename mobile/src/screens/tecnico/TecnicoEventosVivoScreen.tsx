import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Radio, ExternalLink, Megaphone } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

export default function TecnicoEventosVivoScreen() {
  const { show, modal } = useModal();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [textos, setTextos] = useState<Record<number,string>>({});
  const cargar = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/public/cronograma-vivo`); const d = await r.json(); setItems(d.actividades || []); }
    catch { show({ type: 'error', title: 'Sin conexión', message: 'No se pudo cargar el cronograma.' }); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  const estado = async (id:number, estadoEnVivo:string) => {
    const r = await fetch(`${API_URL}/staff/cronograma-vivo/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ estadoEnVivo }) });
    if (!r.ok) return show({ type:'error', title:'Error', message:(await r.json()).message || 'No se pudo actualizar.' });
    cargar();
  };
  const anunciar = async (id:number) => {
    const mensaje = (textos[id] || '').trim();
    if (!mensaje) return show({ type:'warning', title:'Anuncio requerido', message:'Escribe el anuncio.' });
    const r = await fetch(`${API_URL}/staff/cronograma-vivo/${id}/anuncios`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ usuarioId:userStore.get()?.id, mensaje }) });
    if (!r.ok) return show({ type:'error', title:'Error', message:(await r.json()).message || 'No se pudo publicar.' });
    setTextos((x) => ({...x,[id]:''})); cargar();
  };
  return <View style={{ flex:1, backgroundColor:'#f8fafc' }}>{modal}<FlatList data={items} keyExtractor={(x)=>String(x.id)} contentContainerStyle={{padding:16}}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);cargar();}} tintColor={GREEN}/>} ListHeaderComponent={<Text style={{fontSize:22,fontWeight:'800',marginBottom:14}}>Cronograma en vivo</Text>}
    renderItem={({item}) => <View style={{backgroundColor:'#fff',borderRadius:16,padding:15,marginBottom:12,borderWidth:1,borderColor:item.estadoEnVivo==='EN_VIVO'?'#fca5a5':'#e2e8f0'}}>
      <Text style={{fontWeight:'800',fontSize:15}}>{item.nombreActividad}</Text><Text style={{color:'#64748b',fontSize:12,marginTop:3}}>{item.descripcionActividad}</Text>
      {!!item.linkReunionVirtual && <TouchableOpacity onPress={()=>Linking.openURL(item.linkReunionVirtual)} style={{flexDirection:'row',gap:5,marginTop:9}}><ExternalLink size={14} color={GREEN}/><Text style={{color:GREEN,fontWeight:'700',fontSize:12}}>Abrir transmisión</Text></TouchableOpacity>}
      <View style={{flexDirection:'row',gap:6,marginTop:12}}>{[['PENDIENTE','Pendiente'],['EN_VIVO','En vivo'],['FINALIZADA','Finalizada']].map(([v,l])=><TouchableOpacity key={v} onPress={()=>estado(item.id,v)} style={{flex:1,paddingVertical:9,borderRadius:9,backgroundColor:item.estadoEnVivo===v?(v==='EN_VIVO'?'#dc2626':GREEN):'#f1f5f9'}}><Text style={{textAlign:'center',fontSize:10,fontWeight:'700',color:item.estadoEnVivo===v?'#fff':'#475569'}}>{l}</Text></TouchableOpacity>)}</View>
      {!!item.anuncios?.length && item.anuncios.map((a:any)=><View key={a.id} style={{backgroundColor:'#fffbeb',padding:8,borderRadius:8,marginTop:7,flexDirection:'row',gap:5}}><Megaphone size={13} color="#92400e"/><Text style={{fontSize:11,color:'#92400e',flex:1}}>{a.mensaje}</Text></View>)}
      <TextInput value={textos[item.id]||''} onChangeText={(v)=>setTextos((x)=>({...x,[item.id]:v}))} placeholder="Anuncio para suscritos" placeholderTextColor="#94a3b8" style={{borderWidth:1,borderColor:'#d1d5db',borderRadius:10,padding:10,fontSize:12,marginTop:10}}/>
      <TouchableOpacity onPress={()=>anunciar(item.id)} style={{backgroundColor:'#f59e0b',borderRadius:10,padding:10,marginTop:7}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'700',fontSize:12}}>Publicar anuncio</Text></TouchableOpacity>
    </View>}/></View>;
}
