import {Platform} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='rueda_push_token';
async function notifications(){
 if(Platform.OS==='web'||Constants.appOwnership==='expo')throw new Error('Las notificaciones push requieren una compilación de la aplicación.');
 return import('expo-notifications');
}
export async function activarPush(api:string,token:string){
 if(!Device.isDevice)throw new Error('Activa push desde un dispositivo físico.');
 const n=await notifications();
 if(Platform.OS==='android')await n.setNotificationChannelAsync('eventos',{name:'Eventos y mensajes',importance:n.AndroidImportance.HIGH});
 const permission=await n.requestPermissionsAsync();
 if(permission.status!=='granted')throw new Error('Habilita las notificaciones en los ajustes del dispositivo.');
 const projectId=Constants.expoConfig?.extra?.eas?.projectId||Constants.easConfig?.projectId;
 if(!projectId)throw new Error('Falta vincular esta compilación con el proyecto de notificaciones.');
 const pushToken=(await n.getExpoPushTokenAsync({projectId})).data;
 await registrar(api,token,pushToken);await AsyncStorage.setItem(KEY,pushToken);return pushToken;
}
async function registrar(api:string,token:string,pushToken:string){
 const res=await fetch(api+'/push/suscripcion',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({tipo:'expo',token:pushToken})});
 if(!res.ok)throw new Error('No se pudo registrar el dispositivo.');
}
export async function restaurarPush(api:string,token:string){
 const stored=await AsyncStorage.getItem(KEY);
 if(!stored)return false;
 const n=await notifications();const permission=await n.getPermissionsAsync();
 if(permission.status!=='granted'){await desactivarPush(api,token);return false;}
 // Renueva el token, ya que Expo puede cambiarlo después de una reinstalación.
 await activarPush(api,token);return true;
}
export async function desactivarPush(api:string,token:string){
 const stored=await AsyncStorage.getItem(KEY);if(!stored)return;
 const res=await fetch(api+'/push/suscripcion',{method:'DELETE',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({token:stored})});
 if(!res.ok)throw new Error('No se pudo desactivar push. Intenta de nuevo.');
 await AsyncStorage.removeItem(KEY);
}
export async function escucharPush(onOpen:(data:any)=>void){
 try{
  const n=await notifications();
  n.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
  const listener=n.addNotificationResponseReceivedListener(r=>onOpen(r.notification.request.content.data));
  const last=await n.getLastNotificationResponseAsync();
  if(last){onOpen(last.notification.request.content.data);await n.clearLastNotificationResponseAsync();}
  return ()=>listener.remove();
 }catch{return ()=>{};}
}
