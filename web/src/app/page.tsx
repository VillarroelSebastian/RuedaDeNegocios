"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar, MapPin, Phone, Mail,
  Users, LayoutGrid, Layers, ChevronRight,
  Clock, Building2, ArrowRight, HelpCircle
} from "lucide-react";
import InstalarAppButton from "@/components/InstalarAppButton";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

const IconFacebook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21H9z" />
  </svg>
);
const IconTikTok = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06v-3.2a5.74 5.74 0 0 0-.77-.05A5.71 5.71 0 1 0 15.54 15V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.31 4.31 0 0 1-3.24-1.48z" />
  </svg>
);

interface EventoPublico {
  id: number;
  nombre: string;
  edicion: string;
  descripcion: string | null;
  sobreElEvento: string | null;
  fechaInicioEvento: string;
  fechaFinEvento: string;
  correoContacto: string | null;
  telefonoContacto: string | null;
  enlaceFacebook: string | null;
  enlaceInstagram: string | null;
  enlaceLinkedIn: string | null;
  enlaceTiktok: string | null;
  urlLogoEvento: string | null;
  urlVideoEvento: string | null;
  pilaresEvento: string | null;
  urlImagenMapaRecinto: string | null;
  urlImagenCronogramaCharlas: string | null;
  ciudadEvento: string | null;
  paisEvento: string | null;
  stats: { empresasCount: number; mesasCount: number; actividadesCount: number; tecnicosCount: number };
}

interface Actividad {
  id: number;
  tipoActividad: string;
  nombreActividad: string;
  descripcionActividad: string;
  nombreSalaEspacio: string;
  fechaActividad: string;
  horaInicioActividad: string;
  horaFinActividad: string;
  nombreCompletoPilaExpositor: string | null;
  organizacionDelExpositor: string | null;
}

const tipoColors: Record<string, string> = {
  CONFERENCIA: "bg-blue-100 text-blue-700",
  TALLER:      "bg-green-100 text-green-700",
  PANEL:       "bg-purple-100 text-purple-700",
  Seminario:   "bg-amber-100 text-amber-700",
};

function formatDate(iso: string) {
  if (!iso) return '';
  // Extraer YYYY-MM-DD sin conversión UTC para evitar que el timezone local muestre el día anterior
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function HomePage() {
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [evRes, actsRes] = await Promise.all([
          fetch(`${API}/public/evento`),
          fetch(`${API}/public/actividades`),
        ]);
        const ev = evRes.ok ? await evRes.json() : null;
        const acts = actsRes.ok ? await actsRes.json() : [];
        // Validate response is a real evento object (not a 404 error JSON)
        if (ev && ev.id && ev.nombre && ev.stats) {
          setEvento(ev);
        }
        setActividades(Array.isArray(acts) ? acts.slice(0, 4) : []);
      } catch {
        // Backend not available
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-900">
        <div className="text-white text-xl animate-pulse">Cargando evento…</div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700">No hay evento activo</h2>
          <p className="text-gray-500 mt-2">Contacta al administrador.</p>
          <Link href="/auth/login" className="mt-6 inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  const pilares = (evento.pilaresEvento ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white flex items-center justify-between px-8 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center">
          <div className="relative h-12 w-48">
            <Image
              src="/assets/iconos/logo.png"
              alt="Rueda de Negocios del Beni"
              fill
              sizes="192px"
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#sobre" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Sobre el Evento</a>
          <a href="#actividades" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Actividades</a>
          <a href="#contacto" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Contacto</a>
          <InstalarAppButton className="flex items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-[#449D3A] hover:text-[#449D3A] transition-colors" />
          <Link href="/registro" className="rounded-md border border-[#449D3A] px-5 py-2 text-sm font-semibold text-[#449D3A] hover:bg-green-50 transition-colors">
            Registrarse
          </Link>
          <Link href="/auth/login" className="rounded-md bg-[#449D3A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#367d2e] transition-colors">
            Iniciar Sesión
          </Link>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80"
            alt="Rueda de Negocios"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-br from-green-950/90 via-green-900/80 to-emerald-800/70" />
        </div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-green-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white/90 text-sm px-4 py-1.5 rounded-full mb-6">
            <Calendar size={13} className="text-green-400" />
            Edición {evento.edicion}{evento.ciudadEvento ? ` · ${evento.ciudadEvento}` : ''}{evento.paisEvento ? `, ${evento.paisEvento}` : ''} · {formatDate(evento.fechaInicioEvento)} – {formatDate(evento.fechaFinEvento)}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-10">
            {evento.nombre}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#sobre" className="bg-white text-green-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-all shadow-lg shadow-black/20 flex items-center gap-2">
              Conocer más <ChevronRight size={18} />
            </a>
            <Link href="/registro" className="bg-white/15 border-2 border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/25 transition-all backdrop-blur-sm">
              Registrar mi empresa
            </Link>
            <Link href="/auth/login" className="border-2 border-white/20 text-white/70 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm">
              Iniciar Sesión
            </Link>
          </div>
          <div className="mt-5 flex justify-center">
            <InstalarAppButton
              label="Instalar app en tu teléfono"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold underline underline-offset-4 decoration-white/40 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <section className="bg-green-800 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Building2,  label: "Empresas Inscritas",  value: evento.stats.empresasCount },
              { icon: LayoutGrid, label: "Mesas de Negocios",   value: evento.stats.mesasCount },
              { icon: Layers,     label: "Actividades",          value: evento.stats.actividadesCount },
              { icon: Users,      label: "Técnicos Asignados",  value: evento.stats.tecnicosCount },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="flex justify-center mb-2"><Icon size={28} className="text-green-300" /></div>
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-green-200 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOBRE EL EVENTO ────────────────────────────────────────── */}
      <section id="sobre" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Logo del evento + botón flotante al video */}
            <div className="relative">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                <Image
                  src={evento.urlLogoEvento ?? "/assets/iconos/logo.png"}
                  alt={evento.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 520px"
                  className="object-contain p-6"
                  unoptimized
                />
              </div>
              {evento.urlVideoEvento && (
                <a
                  href={evento.urlVideoEvento}
                  target="_blank"
                  rel="noopener noreferrer"
                  /* El bloque amarillo desplazado imita la tarjeta del diseño aprobado */
                  className="group absolute -bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-[-2rem]"
                >
                  <span className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-[#F5B921]" aria-hidden="true" />
                  <span className="relative flex flex-col items-center gap-1 rounded-xl bg-[#4A7C2A] px-7 py-4 text-center text-white shadow-lg transition-transform group-hover:-translate-y-0.5">
                    <span className="flex items-center gap-2 text-base font-bold">
                      <HelpCircle size={18} /> ¿Qué es la rueda?
                    </span>
                    <span className="text-xs text-white/85">Mira nuestro video</span>
                  </span>
                </a>
              )}
            </div>

            {/* Texto + ejes del evento */}
            <div className={evento.urlVideoEvento ? "mt-10 md:mt-0" : ""}>
              <span className="text-sm font-bold text-gray-800">Sobre el evento</span>
              <h2 className="mt-3 mb-5 text-3xl sm:text-4xl font-extrabold uppercase leading-tight text-[#4A7C2A]">
                {evento.nombre}
              </h2>
              {evento.sobreElEvento && (
                <p className="text-[#6B8F4E] text-base leading-relaxed">
                  {evento.sobreElEvento}
                </p>
              )}
              {pilares.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {pilares.map((pilar) => (
                      <p key={pilar} className="text-gray-700 text-[15px]">{pilar}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECINTO Y FECHAS ───────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-green-600 font-semibold text-sm uppercase tracking-wider">Dónde y cuándo</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-6 leading-tight">
                {evento.ciudadEvento ? `Te esperamos en ${evento.ciudadEvento}` : "Te esperamos"}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                {formatDate(evento.fechaInicioEvento)} – {formatDate(evento.fechaFinEvento)}
                {evento.ciudadEvento ? ` · ${evento.ciudadEvento}` : ''}{evento.paisEvento ? `, ${evento.paisEvento}` : ''}
              </p>
            </div>
            <div className="relative">
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
                <Image
                  src={evento.urlImagenMapaRecinto ?? "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80"}
                  alt="Recinto del evento"
                  fill
                  className={evento.urlImagenMapaRecinto ? "object-contain" : "object-cover"}
                  unoptimized
                />
                {!evento.urlImagenMapaRecinto && (
                  <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 to-transparent" />
                )}
                {evento.urlImagenMapaRecinto && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-xs text-gray-600 font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                    <MapPin size={11} className="text-green-700" /> Mapa del recinto
                  </div>
                )}
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar size={24} className="text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fechas del evento</p>
                    <p className="font-bold text-gray-800 text-sm">{formatDate(evento.fechaInicioEvento)} – {formatDate(evento.fechaFinEvento)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACTIVIDADES ────────────────────────────────────────────── */}
      {actividades.length > 0 && (
        <section id="actividades" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-green-600 font-semibold text-sm uppercase tracking-wider">Programa</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">Actividades del Evento</h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">Conferencias, talleres y paneles diseñados para potenciar tu negocio.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {actividades.map((act) => (
                <div key={act.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tipoColors[act.tipoActividad] ?? "bg-gray-100 text-gray-700"}`}>
                      {act.tipoActividad}
                    </span>
                    <div className="flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
                      <Clock size={12} />{formatTime(act.horaInicioActividad)} – {formatTime(act.horaFinActividad)}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base leading-snug mb-2">{act.nombreActividad}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-4">{act.descripcionActividad}</p>
                  {act.nombreCompletoPilaExpositor && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 border-t border-gray-200 pt-3">
                      <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                        {act.nombreCompletoPilaExpositor[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-xs">{act.nombreCompletoPilaExpositor}</p>
                        {act.organizacionDelExpositor && <p className="text-gray-400 text-xs">{act.organizacionDelExpositor}</p>}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={11} />{act.nombreSalaEspacio}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CRONOGRAMA ─────────────────────────────────────────────── */}
      {evento.urlImagenCronogramaCharlas && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="text-green-600 font-semibold text-sm uppercase tracking-wider">Programa</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-3 mb-8">Cronograma de Actividades</h2>
            <div className="relative w-full h-[420px] sm:h-[560px] rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
              <Image
                src={evento.urlImagenCronogramaCharlas}
                alt="Cronograma de actividades"
                fill
                sizes="(max-width: 640px) 100vw, 900px"
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </section>
      )}

      {/* ── BANNER CTA ─────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-green-800 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=50"
            alt=""
            fill
            className="object-cover object-center opacity-10"
            unoptimized
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">¿Tu empresa ya está inscrita?</h2>
          <p className="text-white/80 text-lg mb-8">Accede al panel de administración para gestionar el evento, empresas y pagos.</p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 bg-white text-green-800 font-bold px-10 py-4 rounded-xl hover:bg-green-50 transition-all shadow-lg text-lg">
            Iniciar Sesión <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── CONTACTO ───────────────────────────────────────────────── */}
      <section id="contacto" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-green-600 font-semibold text-sm uppercase tracking-wider">Información</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">Contacto</h2>
            <p className="text-gray-500 mt-3">¿Tienes dudas? Comunícate con nosotros.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {evento.telefonoContacto && (
              <a href={`tel:${evento.telefonoContacto}`} className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone size={22} className="text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Teléfono / WhatsApp</p>
                  <p className="font-semibold text-gray-800">{evento.telefonoContacto}</p>
                </div>
              </a>
            )}
            {evento.correoContacto && (
              <a href={`mailto:${evento.correoContacto}`} className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail size={22} className="text-blue-700" />
                </div>
                {/* min-w-0 + break-all: sin esto un correo largo desborda la tarjeta */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 mb-1">Correo Electrónico</p>
                  <p className="font-semibold text-gray-800 text-sm break-all leading-snug">{evento.correoContacto}</p>
                </div>
              </a>
            )}
            {(evento.ciudadEvento || evento.paisEvento) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={22} className="text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Ubicación</p>
                  {evento.ciudadEvento && <p className="font-semibold text-gray-800">{evento.ciudadEvento}</p>}
                  {evento.paisEvento && <p className="text-xs text-gray-400">{evento.paisEvento}</p>}
                </div>
              </div>
            )}
          </div>
          {(evento.enlaceFacebook || evento.enlaceInstagram || evento.enlaceLinkedIn || evento.enlaceTiktok) && (
            <div className="flex flex-wrap justify-center gap-4 mt-10">
              {evento.enlaceFacebook && (
                <a href={evento.enlaceFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                  className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconFacebook />
                </a>
              )}
              {evento.enlaceInstagram && (
                <a href={evento.enlaceInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="w-12 h-12 bg-pink-600 hover:bg-pink-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconInstagram />
                </a>
              )}
              {evento.enlaceLinkedIn && (
                <a href={evento.enlaceLinkedIn} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                  className="w-12 h-12 bg-[#0A66C2] hover:bg-[#08528f] rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconLinkedIn />
                </a>
              )}
              {evento.enlaceTiktok && (
                <a href={evento.enlaceTiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                  className="w-12 h-12 bg-gray-900 hover:bg-gray-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconTikTok />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="bg-green-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-36 opacity-80">
                <Image src="/assets/iconos/logo.png" alt="Logo" fill sizes="144px" className="object-contain object-left" />
              </div>
              <p className="text-green-400 text-xs">Edición {evento.edicion}{evento.ciudadEvento ? ` · ${evento.ciudadEvento}` : ''}{evento.paisEvento ? `, ${evento.paisEvento}` : ''}</p>
            </div>
            <div className="flex items-center gap-6 text-green-300 text-sm">
              <a href="#sobre" className="hover:text-white transition-colors">Sobre el Evento</a>
              <a href="#actividades" className="hover:text-white transition-colors">Actividades</a>
              <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
              <Link href="/auth/login" className="hover:text-white transition-colors">Admin</Link>
            </div>
          </div>
          <div className="border-t border-green-800 mt-8 pt-6 text-center text-green-500 text-xs">
            © {new Date().getFullYear()} {evento.nombre}. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
