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
