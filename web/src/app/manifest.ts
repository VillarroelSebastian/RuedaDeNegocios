import type { MetadataRoute } from "next";

// Web App Manifest — hace que la web sea instalable como app (PWA).
// En Android/Chrome muestra el instalador nativo; en iPhone se agrega a la
// pantalla de inicio (Compartir → Añadir a pantalla de inicio) y se abre a
// pantalla completa como una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rueda de Negocios del Beni",
    short_name: "Rueda de Negocios",
    description:
      "Agenda reuniones, conoce empresas y gestiona tu participación en la Rueda de Negocios del Beni.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#449D3A",
    lang: "es",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
