"use client";

// Inicio del rol FORO: versión resumida del landing público, pensada para
// quien ya entró a la plataforma. Reúne lo del landing que le sirve —de qué va
// el evento, cuándo y dónde, las cifras y las próximas actividades— sin las
// secciones de venta ni los accesos de empresa, que no le aplican.
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, MapPin, Building2, Users, Armchair, Sparkles,
  Images, Radio, ArrowRight, Clock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3334";

type Evento = {
  id: number;
  nombre: string;
  edicion?: string | null;
  descripcion?: string | null;
  ciudadEvento?: string | null;
  paisEvento?: string | null;
  fechaInicioEvento: string;
  fechaFinEvento: string;
  urlImagenBannerEvento?: string | null;
  urlLogoForo?: string | null;
  stats?: { empresasCount: number; actividadesCount: number; mesasCount: number; tecnicosCount: number };
};

type Actividad = {
  id: number;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  fechaActividad: string;
  horaInicioActividad: string;
  horaFinActividad: string;
};

// Las horas del programa son "de reloj de pared": se muestran tal cual se
// guardaron, sin convertir de zona horaria.
const hora = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString("es-BO", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false }) : "";

const fechaCorta = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("es-BO", { timeZone: "UTC", day: "numeric", month: "long" }) : "";

export default function ForoInicioPage() {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [ev, act] = await Promise.all([
          fetch(`${API}/public/evento`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/public/actividades`).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!vivo) return;
        setEvento(ev);
        setActividades(Array.isArray(act) ? act : []);
      } catch {
        // Sin conexión: la pantalla queda con el aviso de "no disponible".
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  if (cargando) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-amber-800">
          <p className="font-semibold">No se pudo cargar la información del evento</p>
          <p className="mt-1 text-sm">Revisa tu conexión e intenta nuevamente.</p>
        </div>
      </div>
    );
  }

  const stats = evento.stats;
  const lugar = [evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(", ");
  const proximas = actividades.slice(0, 4);

  const cifras = [
    { icono: Building2, valor: stats?.empresasCount, etiqueta: "Empresas" },
    { icono: Sparkles,  valor: stats?.actividadesCount, etiqueta: "Actividades" },
    { icono: Armchair,  valor: stats?.mesasCount, etiqueta: "Mesas" },
    { icono: Users,     valor: stats?.tecnicosCount, etiqueta: "Equipo" },
  ];

  const accesos = [
    { href: "/empresa/cronograma-vivo", icono: Radio,      titulo: "Cronograma en vivo", texto: "Sigue el evento minuto a minuto" },
    { href: "/empresa/comunicados",     icono: CalendarDays, titulo: "Comunicados",      texto: "Avisos de la organización" },
    { href: "/empresa/galeria",         icono: Images,     titulo: "Galería",            texto: "Fotos del evento" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Portada */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-800 to-emerald-700 text-white">
        {evento.urlImagenBannerEvento && (
          <Image
            src={evento.urlImagenBannerEvento}
            alt={evento.nombre}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-contain opacity-20"
          />
        )}
        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          {evento.urlLogoForo && (
            <img src={evento.urlLogoForo} alt="Logo del Foro" className="h-12 object-contain mb-3" />
          )}
          {evento.edicion && (
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              {evento.edicion}
            </span>
          )}
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">{evento.nombre}</h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {fechaCorta(evento.fechaInicioEvento)} – {fechaCorta(evento.fechaFinEvento)}
            </span>
            {!!lugar && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{lugar}</span>
            )}
          </div>
        </div>
      </section>

      {/* Cifras del evento */}
      {!!stats && (
        <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cifras.map(({ icono: Icono, valor, etiqueta }) => (
            <div key={etiqueta} className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
              <Icono className="mx-auto h-5 w-5 text-[#449D3A]" />
              <p className="mt-2 text-2xl font-extrabold text-gray-900">{valor ?? 0}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{etiqueta}</p>
            </div>
          ))}
        </section>
      )}

      {/* Sobre el evento */}
      {!!evento.descripcion && (
        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-gray-900">Sobre el evento</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{evento.descripcion}</p>
        </section>
      )}

      {/* Próximas actividades */}
      {proximas.length > 0 && (
        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900">Próximas actividades</h2>
            <Link href="/empresa/cronograma-vivo" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#449D3A] hover:underline">
              Ver todo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-3">
            {proximas.map((a) => (
              <li key={a.id} className="rounded-xl border border-gray-100 p-3 sm:p-4">
                <p className="font-semibold text-gray-900">{a.nombreActividad}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fechaCorta(a.fechaActividad)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{hora(a.horaInicioActividad)} – {hora(a.horaFinActividad)}</span>
                  {!!a.nombreSalaEspacio && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.nombreSalaEspacio}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Accesos rápidos */}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {accesos.map(({ href, icono: Icono, titulo, texto }) => (
          <Link key={href} href={href}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-[#449D3A]">
            <Icono className="h-5 w-5 text-[#449D3A]" />
            <p className="mt-2 font-bold text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-500">{texto}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
