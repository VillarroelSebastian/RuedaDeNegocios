import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthFetch from "@/components/AuthFetch";

// Color de la barra del navegador / status bar cuando se instala como app.
export const viewport: Viewport = {
  themeColor: "#449D3A",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// El favicon se toma del logo del evento principal (subido en la parte administrativa).
// Si no hay logo o la API no responde, se usa el ícono estático de /src/app/icon.png (si existe).
export async function generateMetadata(): Promise<Metadata> {
  const webUrl = process.env.WEB_URL ?? "https://app.ruedadenegocios.univalle.edu";
  const base: Metadata = {
    metadataBase: new URL(webUrl),
    title: "Rueda de Negocios",
    description: "Plataforma de la Rueda de Negocios del Beni — agenda reuniones, conoce empresas y gestiona tu participación en el evento.",
    // Necesario para que iPhone use el ícono correcto y se abra como app.
    appleWebApp: {
      capable: true,
      title: "Rueda de Negocios",
      statusBarStyle: "black-translucent",
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
  };
  try {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
    // El evento principal puede cambiar durante la operacion. No conservar su
    // titulo anterior en la pestana durante los primeros minutos de la sesion.
    const res = await fetch(`${api}/evento-principal`, { cache: "no-store" });
    if (res.ok) {
      const ev = await res.json();
      if (ev?.urlLogoEvento) {
        const title = ev.nombre || "Rueda de Negocios";
        return {
          ...base,
          title,
          icons: { icon: [{ url: ev.urlLogoEvento }], shortcut: [ev.urlLogoEvento], apple: ev.urlLogoEvento },
          openGraph: { title, description: String(base.description), type: "website", url: "/", images: [{ url: ev.urlLogoEvento, alt: `Logo de ${title}` }] },
          twitter: { card: "summary", title, description: String(base.description), images: [ev.urlLogoEvento] },
        };
      }
    }
  } catch {}
  return base;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthFetch />{children}</body>
    </html>
  );
}
