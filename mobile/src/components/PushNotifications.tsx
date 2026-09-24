import React,{useEffect,useState} from 'react';
import {View,Text,TouchableOpacity} from 'react-native';
import {userStore,API_URL} from '../utils/userStore';
import {activarPush,desactivarPush,restaurarPush,escucharPush} from '../utils/push';
export default function PushNotifications({onOpen}:{onOpen:(data:any)=>void}){
 const [user,setUser]=useState(userStore.get()),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>userStore.subscribe(()=>setUser(userStore.get())),[]);
 useEffect(()=>{let alive=true;setMessage('');setActive(false);if(user?.token)restaurarPush(API_URL,user.token).then(v=>{if(alive)setActive(v);}).catch(()=>{});return()=>{alive=false;};},[user?.token]);
 useEffect(()=>{let stop:undefined|(()=>void),cancelled=false;escucharPush(onOpen).then(fn=>{if(cancelled)fn();else stop=fn;});return()=>{cancelled=true;stop?.();};},[onOpen]);
 if(!user?.token)return null;
 return <View style={{backgroundColor:'#f0fdf4',paddingHorizontal:12,paddingVertical:8,borderTopWidth:1,borderColor:'#dcfce7'}}>
  <TouchableOpacity disabled={busy} onPress={async()=>{setBusy(true);setMessage('');try{if(active){await desactivarPush(API_URL,user.token);setActive(false);}else{await activarPush(API_URL,user.token);setActive(true);}}catch(e:any){setMessage(e.message||'No se pudo configurar push.');}finally{setBusy(false);}}}><Text style={{textAlign:'center',color:'#166534',fontWeight:'600'}}>{busy?'Procesando…':active?'Desactivar notificaciones push':'Activar notificaciones push'}</Text></TouchableOpacity>
  {!!message&&<Text accessibilityRole="alert" style={{fontSize:12,marginTop:6,textAlign:'center'}}>{message}</Text>}
 </View>;
}
