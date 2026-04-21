"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar, MapPin, Phone, Mail,
  Users, LayoutGrid, Layers, ChevronRight,
  Clock, Building2, ArrowRight
} from "lucide-react";

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
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
  enlaceTwitterX: string | null;
  urlLogoEvento: string | null;
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
  return new Date(iso).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
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
          fetch("http://localhost:3334/public/evento"),
          fetch("http://localhost:3334/public/actividades"),
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
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#sobre" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Sobre el Evento</a>
          <a href="#actividades" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Actividades</a>
          <a href="#contacto" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Contacto</a>
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
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Edición {evento.edicion}{evento.ciudadEvento ? ` — ${evento.ciudadEvento}` : ''}{evento.paisEvento ? `, ${evento.paisEvento}` : ''}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            {evento.nombre}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            {evento.descripcion ?? "El encuentro empresarial más importante del Beni"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 text-sm mb-10">
            <span className="flex items-center gap-1.5"><Calendar size={16} />{formatDate(evento.fechaInicioEvento)} – {formatDate(evento.fechaFinEvento)}</span>
            {(evento.ciudadEvento || evento.paisEvento) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={16} />
                {[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(' – ')}
              </span>
            )}
          </div>
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
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50 text-xs">
          <span>Desplaza</span>
          <div className="w-5 h-8 border border-white/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
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
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="text-green-600 font-semibold text-sm uppercase tracking-wider">Sobre el Evento</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-6 leading-tight">
                El encuentro empresarial del Beni
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                {evento.sobreElEvento ??
                  "La Rueda de Negocios del Beni es el espacio más importante de encuentro empresarial del departamento. Conectamos empresas, emprendedores y actores del sector productivo mediante reuniones previamente agendadas, facilitando oportunidades comerciales, alianzas estratégicas y el intercambio de servicios."}
              </p>
              <div className="space-y-3">
                {["Reuniones de negocios de 20 minutos", "Agenda previamente coordinada", "Empresas de todo el país", "Actividades y conferencias especializadas"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={evento.urlImagenMapaRecinto ?? "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80"}
                  alt="Recinto del evento"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 to-transparent" />
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
                    <p className="text-xs text-gray-500">Fecha del evento</p>
                    <p className="font-bold text-gray-800 text-sm">{formatDate(evento.fechaInicioEvento)}</p>
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
            <h2 className="text-3xl font-extrabold text-gray-900 mt-3 mb-8">Cronograma de Charlas</h2>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={evento.urlImagenCronogramaCharlas}
                alt="Cronograma de charlas"
                width={900}
                height={600}
                className="w-full h-auto object-contain"
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
                <div>
                  <p className="text-xs text-gray-400 mb-1">Correo Electrónico</p>
                  <p className="font-semibold text-gray-800 text-sm">{evento.correoContacto}</p>
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
          {(evento.enlaceFacebook || evento.enlaceInstagram || evento.enlaceTwitterX) && (
            <div className="flex justify-center gap-4 mt-10">
              {evento.enlaceFacebook && (
                <a href={evento.enlaceFacebook} target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconFacebook />
                </a>
              )}
              {evento.enlaceInstagram && (
                <a href={evento.enlaceInstagram} target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 bg-pink-600 hover:bg-pink-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconInstagram />
                </a>
              )}
              {evento.enlaceTwitterX && (
                <a href={evento.enlaceTwitterX} target="_blank" rel="noopener noreferrer"
                  className="w-12 h-12 bg-gray-900 hover:bg-gray-700 rounded-xl flex items-center justify-center text-white transition-colors">
                  <IconX />
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
