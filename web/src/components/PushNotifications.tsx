"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {activarPush,desactivarPush,guardarSuscripcion,sesionPush} from "@/lib/push";
export default function PushNotifications(){
 const pathname=usePathname();
 const [visible,setVisible]=useState(false),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{
  let alive=true;
  setMessage("");
  const enabled=/^\/(admin|tecnico|empresa|foro)(\/|$)/.test(pathname)&&!!sesionPush();
  setVisible(enabled);
  if(enabled&&"serviceWorker" in navigator&&"PushManager" in window){
   navigator.serviceWorker.getRegistration().then(r=>r?.pushManager.getSubscription()).then(async sub=>{
     if(sub){await guardarSuscripcion(sub);if(alive)setActive(true);}else if(alive)setActive(false);
   }).catch(()=>{if(alive)setActive(false);});
  }else setActive(false);
  return()=>{alive=false;};
 },[pathname]);
 if(!visible)return null;
 return <aside className="flex flex-wrap items-center justify-center gap-2 border-b bg-green-50 px-3 py-2 text-xs">
  <button disabled={busy} onClick={async()=>{setBusy(true);setMessage("");try{if(active){await desactivarPush();setActive(false);}else{await activarPush();setActive(true);}}catch(e:unknown){setMessage(e instanceof Error?e.message:"No se pudo cambiar la configuración.");}finally{setBusy(false);}}} className="rounded-lg border border-green-700 px-3 py-2 font-semibold text-green-800 disabled:opacity-50">{busy?"Procesando…":active?"Desactivar notificaciones push":"Activar notificaciones push"}</button>
  {!!message&&<span role="status" className="max-w-xl">{message}</span>}
 </aside>;
}
