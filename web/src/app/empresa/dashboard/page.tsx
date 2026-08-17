"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, User, CreditCard, Calendar,
  CheckCircle2, Clock, AlertCircle, MapPin,
  Send, Users, Star, ArrowRight, AlertTriangle,
  Megaphone, Activity, VideoIcon,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type EstadoPago = "PENDIENTE" | "COMPLETADO" | "OBSERVADO" | "RECHAZADO";

function estadoPagoBadge(estado: EstadoPago) {
  const map: Record<EstadoPago, { label: string; cls: string; Icon: React.ElementType }> = {
    COMPLETADO: { label: "Verificado",  cls: "bg-green-100  text-green-700  border-green-200",  Icon: CheckCircle2 },
    PENDIENTE:  { label: "Pendiente",   cls: "bg-amber-100  text-amber-700  border-amber-200",  Icon: Clock },
    OBSERVADO:  { label: "Observado",   cls: "bg-orange-100 text-orange-700 border-orange-200", Icon: AlertCircle },
    RECHAZADO:  { label: "Rechazado",   cls: "bg-red-100    text-red-700    border-red-200",    Icon: AlertCircle },
  };
  const { label, cls, Icon } = map[estado] ?? map.PENDIENTE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </span>
  );
}

function formatDT(dt: string) {
  return new Date(dt).toLocaleString("es-BO", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function formatFecha(dt: string) {
  return new Date(dt).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EmpresaDashboardPage() {
  const router = useRouter();
  const [info, setInfo]   = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => { if (!r.ok) throw new Error("No se pudo obtener la información de tu empresa."); return r.json(); })
      .then(async (data) => {
        setInfo(data);
        // Cargar estadísticas reales
        const sRes = await fetch(`${API}/empresa/dashboard-stats?eeId=${data.empresaeventoId}`);
        if (sRes.ok) setStats(await sRes.json());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !info) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error ?? "No se encontró información de tu empresa."}</p>
    </div>
  );

  const { usuario, empresa, esResponsable, evento, estadoPago, tipoParticipacion, numeroParticipantes } = info;
  const habilitada = estadoPago === "COMPLETADO";

  return (
    <div className="p-6 space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#449D3A] to-emerald-500 rounded-2xl p-6 text-white">
        <p className="text-sm font-semibold text-green-100 mb-1">Bienvenido/a</p>
        <h1 className="text-2xl font-extrabold">{usuario.nombres} {usuario.apellidoPaterno}</h1>
        <p className="text-green-100 text-sm mt-1">{empresa.nombre}</p>
        {esResponsable && (
          <span className="inline-block mt-3 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
            Encargado principal
          </span>
        )}
      </div>

      {!habilitada && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Pago en verificación</p>
            <p className="text-xs text-amber-700 mt-0.5">
              El equipo está revisando tu comprobante. Una vez aprobado, tendrás acceso completo.
            </p>
          </div>
        </div>
      )}

      {/* Alerta solicitudes pendientes recibidas — solo encargado */}
      {esResponsable && stats?.pendientesRecibidas > 0 && (
        <Link href="/empresa/solicitudes" className="block">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:border-amber-300 transition-colors cursor-pointer">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                Tienes {stats.pendientesRecibidas} solicitud{stats.pendientesRecibidas > 1 ? "es" : ""} de reunión pendiente{stats.pendientesRecibidas > 1 ? "s" : ""} por responder
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500" />
          </div>
        </Link>
      )}

      {esResponsable && stats?.pendientesEvaluar > 0 && (
        <Link href="/empresa/resultados" className="block">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 hover:border-green-300 transition-colors">
            <Star className="w-5 h-5 text-[#449D3A] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">
                Tienes {stats.pendientesEvaluar} reunión{stats.pendientesEvaluar > 1 ? "es" : ""} finalizada{stats.pendientesEvaluar > 1 ? "s" : ""} pendiente{stats.pendientesEvaluar > 1 ? "s" : ""} de calificar
              </p>
              <p className="text-xs text-green-700 mt-0.5">Registra el acuerdo, la calificación y tus observaciones.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#449D3A]" />
          </div>
        </Link>
      )}

      {/* Stats counters */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            esResponsable && {
              label: "Sol. recibidas pendientes",
              value: stats.pendientesRecibidas,
              Icon: AlertTriangle,
              color: stats.pendientesRecibidas > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400",
              href: "/empresa/solicitudes",
            },
            esResponsable && {
              label: "Sol. enviadas pendientes",
              value: stats.pendientesEnviadas,
              Icon: Send,
              color: stats.pendientesEnviadas > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400",
              href: "/empresa/solicitudes",
            },
            {
              label: "Reuniones confirmadas",
              value: stats.reunionesTotal,
              Icon: CheckCircle2,
              color: stats.reunionesTotal > 0 ? "bg-green-50 text-[#449D3A]" : "bg-gray-50 text-gray-400",
              href: "/empresa/reuniones",
            },
            estadoPago !== "COMPLETADO" && {
              label: "Estado de participación",
              badge: estadoPago,
              Icon: CreditCard,
              color: "bg-purple-50 text-purple-600",
              href: null,
            },
          ].filter(Boolean).map((c: any, i) => (
            c.href ? (
              <Link key={i} href={c.href}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-green-200 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                  <c.Icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 mb-0.5">{c.value}</p>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
              </Link>
            ) : (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                  <c.Icon className="w-4 h-4" />
                </div>
                {c.badge ? estadoPagoBadge(c.badge) : <p className="text-2xl font-extrabold text-gray-900 mb-0.5">{c.value}</p>}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{c.label}</p>
              </div>
            )
          ))}
        </div>
      )}

      {/* Próxima reunión */}
      {stats?.proximaReunion && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Próxima reunión</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">
                Con: {stats.proximaReunion.contraparte?.nombre ?? "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />{formatDT(stats.proximaReunion.inicio)}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stats.proximaReunion.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                }`}>
                  {stats.proximaReunion.tipo === "PRESENCIAL" ? "Presencial" : "Virtual"}
                </span>
                {stats.proximaReunion.mesa && (
                  <span className="text-xs text-gray-400">Mesa {stats.proximaReunion.mesa.numeroMesa}</span>
                )}
                {stats.proximaReunion.enlace && (
                  <a href={stats.proximaReunion.enlace} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <VideoIcon className="w-3 h-3" />Unirse
                  </a>
                )}
              </div>
            </div>
            <Link href="/empresa/reuniones"
              className="flex items-center gap-1.5 text-xs font-bold text-[#449D3A] hover:underline shrink-0">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Comunicados recientes + Próximas actividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comunicados */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Comunicados recientes</h2>
            </div>
            <Link href="/empresa/comunicados" className="text-xs text-[#449D3A] font-bold hover:underline">
              Ver todos
            </Link>
          </div>
          {!stats?.comunicados?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin comunicados aún.</p>
          ) : (
            <div className="space-y-3">
              {stats.comunicados.map((c: any) => (
                <div key={c.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                    <Megaphone className="w-3.5 h-3.5 text-[#449D3A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{c.titulo}</p>
                    <p className="text-xs text-gray-400">{formatFecha(c.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas actividades */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Próximas actividades</h2>
            </div>
            <Link href="/empresa/eventos" className="text-xs text-[#449D3A] font-bold hover:underline">
              Ver programa
            </Link>
          </div>
          {!stats?.actividades?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin actividades próximas.</p>
          ) : (
            <div className="space-y-3">
              {stats.actividades.map((a: any) => (
                <div key={a.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{a.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {formatFecha(a.fecha)}{a.hora ? ` · ${a.hora}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empresa y evento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Empresa</h2>
          </div>
          <dl className="space-y-2.5 text-sm">
            {[
              { k: "Nombre",             v: empresa.nombre },
              { k: "Rubro",              v: empresa.rubro },
              { k: "Email corporativo",  v: empresa.correoCorporativo || "—" },
              { k: "Tipo participación", v: tipoParticipacion ?? "—" },
              { k: "Participantes",      v: numeroParticipantes ? String(numeroParticipantes) : "—" },
            ].map(({ k, v }) => (
              <div key={k} className="flex gap-2">
                <dt className="w-40 shrink-0 text-gray-400">{k}</dt>
                <dd className="font-semibold text-gray-800 truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Evento</h2>
          </div>
          {evento ? (
            <dl className="space-y-2.5 text-sm">
              {[
                { k: "Nombre",  v: evento.nombre },
                { k: "Edición", v: evento.edicion ?? "—" },
                { k: "Ciudad",  v: evento.ciudadEvento ?? "—" },
                { k: "País",    v: evento.paisEvento ?? "—" },
              ].map(({ k, v }) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-40 shrink-0 text-gray-400">{k}</dt>
                  <dd className="font-semibold text-gray-800">{v}</dd>
                </div>
              ))}
              {(evento.ciudadEvento || evento.paisEvento) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No hay evento asignado.</p>
          )}
        </div>
      </div>

      {/* Quick access */}
      {habilitada && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Acceso rápido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/empresa/empresas",   Icon: Building2,   label: "Ver empresas",  desc: "Perfiles de participantes",   soloEncargado: false },
              { href: "/empresa/solicitudes",Icon: Send,        label: "Solicitudes",   desc: "Gestión de reuniones",        soloEncargado: true },
              { href: "/empresa/reuniones",  Icon: Users,       label: "Mis reuniones", desc: "Citas confirmadas",           soloEncargado: false },
              { href: "/empresa/resultados", Icon: Star,        label: "Resultados",    desc: "Registra acuerdos",           soloEncargado: true },
              { href: "/empresa/eventos",    Icon: Calendar,    label: "Programa",      desc: "Actividades del evento",      soloEncargado: false },
              { href: "/empresa/comunicados",Icon: Megaphone,   label: "Comunicados",   desc: "Noticias y anuncios",         soloEncargado: false },
            ].filter((item) => esResponsable || !item.soloEncargado).map(({ href, Icon, label, desc }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all group">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 shrink-0">
                  <Icon className="w-4 h-4 text-[#449D3A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-[#449D3A] shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
