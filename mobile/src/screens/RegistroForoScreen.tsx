import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { API_URL } from '../utils/userStore';
export default function RegistroForoScreen({ navigation }: any) {
  const [form,setForm]=useState({nombres:'',apellidoPaterno:'',telefono:'',correo:'',contrasenia:'',confirmar:''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
  async function registrar(){
    if(form.contrasenia!==form.confirmar)return setError('Las contraseñas no coinciden.');
    setBusy(true);setError('');
    try{
      const res=await fetch(API_URL+'/public/registro-foro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await res.json();if(!res.ok)throw new Error(data.message||'No se pudo registrar.');
      setDone(true);
    }catch(e:any){setError(e.message||'Error de conexión.');}finally{setBusy(false);}
  }
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,flexGrow:1}}>
      <Text style={{fontSize:24,fontWeight:'800',marginBottom:12}}>{done?'Tu registro está listo':'Registro personal al foro'}</Text>
      {done?<><Text>Ya puedes ingresar con tu correo y contraseña.</Text><TouchableOpacity onPress={()=>navigation.replace('Login')} style={{padding:16}}><Text style={{color:'#449D3A'}}>Iniciar sesión</Text></TouchableOpacity></>:<>
      <Text style={{marginBottom:16}}>Accede al programa, noticias y galería del evento.</Text>
      {([['nombres','Nombres',105],['apellidoPaterno','Apellido',65],['telefono','Teléfono',45],['correo','Correo electrónico',105],['contrasenia','Contraseña (mínimo 8 caracteres)',72],['confirmar','Confirmar contraseña',72]] as const).map(([key,label,max])=><View key={key} style={{marginBottom:14}}><Text style={{fontWeight:'600',marginBottom:6}}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} maxLength={max} onChangeText={v=>setForm({...form,[key]:v})} secureTextEntry={key==='contrasenia'||key==='confirmar'} autoCapitalize={key==='correo'?'none':undefined} keyboardType={key==='correo'?'email-address':key==='telefono'?'phone-pad':'default'} style={{borderWidth:1,borderColor:'#d1d5db',borderRadius:12,padding:12,fontSize:16}}/></View>)}
      {!!error&&<Text accessibilityRole="alert" style={{color:'#b91c1c',marginBottom:12}}>{error}</Text>}
      <TouchableOpacity disabled={busy} onPress={registrar} style={{backgroundColor:'#449D3A',padding:16,borderRadius:12,opacity:busy?.5:1}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'700'}}>{busy?'Registrando…':'Registrarme al foro'}</Text></TouchableOpacity></>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
