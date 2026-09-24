const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
export function sesionPush() {
  if (typeof window === "undefined") return null;
  for (const key of ["adminUser","tecnicoUser","empresaUser","foroUser"]) {
    try { const u=JSON.parse(localStorage.getItem(key)||"null"); if(u?.token) return u; } catch {}
  }
  return null;
}
export async function guardarSuscripcion(sub: PushSubscription) {
  const user=sesionPush(); if(!user) return;
  const res=await fetch(API+"/push/suscripcion",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+user.token},body:JSON.stringify({tipo:"web",...sub.toJSON()})});
  if(!res.ok) throw new Error((await res.json()).message||"No se pudo activar push.");
}
export async function activarPush() {
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window))
    throw new Error("Este navegador necesita HTTPS y soporte de notificaciones push.");
  const user=sesionPush();if(!user)throw new Error("Inicia sesión primero.");
  const res=await fetch(API+"/push/config",{headers:{Authorization:"Bearer "+user.token}});
  if(!res.ok)throw new Error("No se pudo consultar la configuración.");
  const {publicKey}=await res.json();
  if(!publicKey)throw new Error("El equipo aún debe habilitar las notificaciones web.");
  const permission=await Notification.requestPermission();
  if(permission!=="granted")throw new Error("Habilita las notificaciones en los permisos del navegador.");
  const reg=await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const raw=atob(publicKey.replace(/-/g,"+").replace(/_/g,"/"));
  const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await guardarSuscripcion(sub);return sub;
}
export async function desactivarPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg=await navigator.serviceWorker.getRegistration();
  const sub=await reg?.pushManager?.getSubscription();
  if(!sub)return;
  const user=sesionPush();
  // Primero revoca en el navegador para que cerrar sesión no deje alertas activas.
  await sub.unsubscribe();
  if(user)await fetch(API+"/push/suscripcion",{method:"DELETE",signal:AbortSignal.timeout(5000),headers:{"Content-Type":"application/json",Authorization:"Bearer "+user.token},body:JSON.stringify({endpoint:sub.endpoint})});
}
