// Service worker mínimo — solo existe para permitir instalar la web como app (PWA).
// NO intercepta ninguna petición: al no llamar a respondWith, el navegador maneja
// TODO tal cual (login, mensajes, llamadas al backend), sin ningún riesgo de romper
// peticiones POST ni servir contenido viejo.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Passthrough: intencionalmente vacío. Tener el listener basta para la
  // instalación en navegadores antiguos, sin interferir con la red.
});

self.addEventListener("push", event => {
  if (!event.data) return;
  let data; try { data=event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(data.title || "Rueda de Negocios", {
    body:data.body || "Tienes una nueva actualización.", tag:data.tag,
    icon:"/icons/apple-touch-icon.png", data:data.data || {}
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  let url=new URL(event.notification.data?.url || "/",self.location.origin);
  if(url.origin!==self.location.origin)url=new URL("/",self.location.origin);
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{
    const existing=clients.find(c=>new URL(c.url).origin===self.location.origin);
    if(existing){await existing.navigate(url.href);return existing.focus();}
    return self.clients.openWindow(url.href);
  }));
});
