import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  const base: Metadata = {
    title: "Rueda de Negocios",
    description: "Plataforma de la Rueda de Negocios del Beni — agenda reuniones, conoce empresas y gestiona tu participación en el evento.",
  };
  try {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
    const res = await fetch(`${api}/evento-principal`, { next: { revalidate: 300 } });
    if (res.ok) {
      const ev = await res.json();
      if (ev?.urlLogoEvento) {
        return { ...base, icons: { icon: ev.urlLogoEvento } };
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
