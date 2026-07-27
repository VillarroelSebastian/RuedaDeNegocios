// Service worker mínimo — solo habilita la instalación como app (PWA) en Android.
// NO cachea nada: cada petición va directo a la red, así la app siempre muestra
// datos frescos (sin riesgo de contenido viejo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
