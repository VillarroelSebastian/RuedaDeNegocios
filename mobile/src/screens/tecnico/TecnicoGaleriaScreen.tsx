import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, X } from 'lucide-react-native';
import { API_URL, userStore } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';
export default function TecnicoGaleriaScreen() {
  const { show, modal } = useModal();
  const [fotos,setFotos]=useState<any[]>([]), [selector,setSelector]=useState(false), [subiendo,setSubiendo]=useState(false), [refreshing,setRefreshing]=useState(false), [ampliada,setAmpliada]=useState<string|null>(null);
  const cargar=useCallback(async()=>{try{const r=await fetch(`${API_URL}/public/galeria?soloTecnicos=1`);setFotos(r.ok?await r.json():[]);}finally{setRefreshing(false);}},[]);
  useFocusEffect(useCallback(()=>{cargar();},[cargar]));
  const elegir=async(origen:'camara'|'galeria')=>{
    setSelector(false);
    const permiso=origen==='camara'?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permiso.granted)return show({type:'warning',title:'Permiso requerido',message:`Autoriza el acceso a la ${origen}.`});
    const r=origen==='camara'?await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:.8}):await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8});
    if(r.canceled||!r.assets[0])return;
    const a=r.assets[0]; if(a.fileSize&&a.fileSize>5*1024*1024)return show({type:'warning',title:'Imagen muy grande',message:'La imagen no puede superar 5 MB.'});
    setSubiendo(true);
    try{const fd=new FormData();fd.append('file',{uri:a.uri,name:a.fileName||'foto-evento.jpg',type:a.mimeType||'image/jpeg'} as any);const up=await fetch(`${API_URL}/admin/imagenes/upload`,{method:'POST',body:fd});const ud=await up.json();if(!up.ok||!ud.url)throw new Error(ud.message||'No se pudo subir.');const u=userStore.get();const pub=await fetch(`${API_URL}/galeria`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urlFoto:ud.url,usuario_id:u?.id,autorNombre:`${u?.nombres||'Técnico'} ${u?.apellidoPaterno||''}`.trim()})});if(!pub.ok)throw new Error((await pub.json()).message||'No se pudo publicar.');show({type:'success',title:'Foto publicada',message:'Ya aparece en la galería del evento.'});cargar();}catch(e:any){show({type:'error',title:'Error',message:e.message||'No se pudo publicar.'});}finally{setSubiendo(false);}
  };
  return <View style={{flex:1,backgroundColor:'#f8fafc'}}>{modal}<FlatList data={fotos} numColumns={2} keyExtractor={x=>String(x.id)} contentContainerStyle={{padding:12}} columnWrapperStyle={{gap:10}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);cargar();}} tintColor={GREEN}/>} ListHeaderComponent={<><Text style={{fontSize:22,fontWeight:'800',marginBottom:4}}>Fotos del evento</Text><Text style={{fontSize:12,color:'#64748b',marginBottom:12}}>Estas fotografías se muestran en el landing.</Text><TouchableOpacity onPress={()=>setSelector(true)} disabled={subiendo} style={{backgroundColor:GREEN,borderRadius:12,padding:13,alignItems:'center',marginBottom:14}}>{subiendo?<ActivityIndicator color="#fff"/>:<Text style={{color:'#fff',fontWeight:'800'}}>Subir foto</Text>}</TouchableOpacity></>} renderItem={({item})=><TouchableOpacity onPress={()=>setAmpliada(item.urlFoto)} style={{flex:1,backgroundColor:'#fff',borderRadius:12,padding:5,marginBottom:10,borderWidth:1,borderColor:'#e2e8f0'}}><Image source={{uri:item.urlFoto}} style={{width:'100%',height:145,resizeMode:'contain'}}/><Text numberOfLines={1} style={{fontSize:10,color:'#64748b',padding:5}}>{item.autorNombre}</Text></TouchableOpacity>}/>
    <Modal visible={selector} transparent animationType="fade"><View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'center',padding:24}}><View style={{backgroundColor:'#fff',borderRadius:20,padding:20}}><Text style={{fontSize:17,fontWeight:'800',marginBottom:14}}>Seleccionar origen</Text><TouchableOpacity onPress={()=>elegir('camara')} style={{flexDirection:'row',gap:10,padding:14,backgroundColor:'#f0fdf4',borderRadius:12,marginBottom:8}}><Camera color={GREEN}/><Text style={{fontWeight:'700'}}>Abrir cámara</Text></TouchableOpacity><TouchableOpacity onPress={()=>elegir('galeria')} style={{flexDirection:'row',gap:10,padding:14,backgroundColor:'#eff6ff',borderRadius:12}}><Images color="#2563eb"/><Text style={{fontWeight:'700'}}>Elegir de galería</Text></TouchableOpacity><TouchableOpacity onPress={()=>setSelector(false)} style={{padding:12,alignItems:'center'}}><Text style={{color:'#64748b',fontWeight:'700'}}>Cancelar</Text></TouchableOpacity></View></View></Modal>
    <Modal visible={!!ampliada} transparent animationType="fade"><View style={{flex:1,backgroundColor:'rgba(0,0,0,.92)',justifyContent:'center',padding:12}}><TouchableOpacity onPress={()=>setAmpliada(null)} style={{position:'absolute',right:18,top:45,zIndex:2,padding:10}}><X color="#fff" size={28}/></TouchableOpacity>{ampliada&&<Image source={{uri:ampliada}} style={{width:'100%',height:'90%',resizeMode:'contain'}}/>}</View></Modal>
  </View>;
}
