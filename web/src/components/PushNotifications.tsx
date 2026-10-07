"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {activarPush,guardarSuscripcion,sesionPush} from "@/lib/push";

// Notificaciones push: sin interfaz propia.
//
// Antes mostraba una barra fija sobre cada página, con un botón para activar o
// desactivar. Ahora el permiso se pide al entrar con sesión iniciada y la
// suscripción se guarda en segundo plano; el usuario no ve nada y, si algo
// falla (permiso denegado, sin conexión), simplemente no hay push.
export default function PushNotifications(){
 const pathname=usePathname();
 useEffect(()=>{
  const enSesion=/^\/(admin|tecnico|empresa|foro)(\/|$)/.test(pathname)&&!!sesionPush();
  if(!enSesion||!("serviceWorker" in navigator)||!("PushManager" in window))return;
  let alive=true;
  void (async()=>{
   try{
    const registro=await navigator.serviceWorker.getRegistration();
    const suscripcion=await registro?.pushManager.getSubscription();
    if(!alive)return;
    // Ya suscrito: solo se refresca en el backend. Si no, se pide el permiso
    // del navegador una vez; denegarlo no vuelve a preguntar.
    if(suscripcion)await guardarSuscripcion(suscripcion);
    else if(Notification.permission!=="denied")await activarPush();
   }catch{/* sin permiso o sin conexión: se reintenta en la próxima visita */}
  })();
  return()=>{alive=false;};
 },[pathname]);
 return null;
}
