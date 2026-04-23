"use client";
import React, { useState, useEffect } from 'react';
import { Armchair, Calendar, Clock, Building2, Video, MapPin, Link2, Star, FileText, ChevronDown, ChevronUp, ExternalLink, Navigation } from 'lucide-react';

const API = 'http://localhost:3334';

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  VIRTUAL:   { label: 'Virtual',    color: '#2563eb', bg: '#dbeafe', icon: <Video className="w-3 h-3" /> },
  PRESENCIAL:{ label: 'Presencial', color: '#059669', bg: '#d1fae5', icon: <MapPin className="w-3 h-3" /> },
  MIXTA:     { label: 'Mixta',      color: '#7c3aed', bg: '#ede9fe', icon: <Link2 className="w-3 h-3" /> },
};

const ESTADO_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

function CompanyChip({ empresa }: { empresa: any }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 min-w-0">
      {empresa?.urlFotoPerfil ? (
        <img src={empresa.urlFotoPerfil} alt={empresa.nombre} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#449D3A]/10 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-[#449D3A]" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-900 truncate">{empresa?.nombre ?? '—'}</p>
        <p className="text-[10px] text-gray-500 truncate">{empresa?.rubro ?? ''}</p>
      </div>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function ReunionCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const estado = ESTADO_CONFIG[r.estadoReunion] ?? ESTADO_CONFIG.PROGRAMADA;
  const tipo = TIPO_CONFIG[r.tipoReunion] ?? TIPO_CONFIG.PRESENCIAL;
  const sol = r.solicitudreunion;
  const empresaA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const empresaB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const resultados = r.resultadoreunion ?? [];
  const linkVirtual = sol?.enlaceReunionVirtual;
  const direccion = sol?.direccionTexto;
  const mapsUrl = getMapsUrl(sol);
  const esVirtual = r.tipoReunion === 'VIRTUAL' || r.tipoReunion === 'MIXTA';
  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Row principal */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Dot estado */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${r.estadoReunion === 'EN_CURSO' ? 'animate-pulse' : ''}`} style={{ backgroundColor: estado.dot }} />

        {/* Empresas */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CompanyChip empresa={empresaA} />
          <span className="text-gray-300 font-bold text-sm shrink-0">↔</span>
          <CompanyChip empresa={empresaB} />
        </div>

        {/* Tipo */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0"
          style={{ backgroundColor: tipo.bg, color: tipo.color }}>
          {tipo.icon}
          {tipo.label}
        </div>

        {/* Fecha/Hora */}
        <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(r.fechaHoraInicioReunion).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {new Date(r.fechaHoraInicioReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
          {' – '}
          {new Date(r.fechaHoraFinReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Estado */}
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
          style={{ backgroundColor: estado.bg, color: estado.color }}>
          {r.estadoReunion}
        </span>

        {/* Expandir */}
        <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-gray-100 rounded-lg shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      {/* Detalles expandidos */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-4 bg-gray-50/50 space-y-3">
          {/* Asistentes */}
          {r.cantidadAsistentesRegistrados > 0 && (
            <p className="text-xs text-gray-500">
              <span className="font-semibold">Asistentes registrados:</span> {r.cantidadAsistentesRegistrados}
            </p>
          )}

          {/* Botones de acción principales */}
          {(esVirtual && linkVirtual) || (esPresencial && mapsUrl) ? (
            <div className="flex gap-2 flex-wrap">
              {esVirtual && linkVirtual && (
                <a
                  href={linkVirtual}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  <Video className="w-4 h-4" />
                  Entrar a reunión virtual
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
              {esPresencial && mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#059669' }}
                >
                  <Navigation className="w-4 h-4" />
                  Ver ubicación en Google Maps
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
            </div>
          ) : null}

          {/* Dirección texto (siempre visible si hay) */}
          {esPresencial && direccion && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600">{direccion}</p>
            </div>
          )}

          {/* Observaciones */}
          {r.observacionesReunion && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gray-500" /> Observaciones
              </p>
              <p className="text-xs text-gray-600">{r.observacionesReunion}</p>
            </div>
          )}

          {/* Mensaje de la solicitud */}
          {sol?.mensajeParaEmpresaReceptora && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Mensaje al receptor</p>
              <p className="text-xs text-gray-600 italic">&ldquo;{sol.mensajeParaEmpresaReceptora}&rdquo;</p>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-700 mb-2">Resultados de la reunión</p>
              <div className="space-y-2">
                {resultados.map((res: any) => (
                  <div key={res.id} className="bg-white rounded-lg border border-gray-100 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating value={res.calificacionReunion} />
                      {res.rangoAcuerdoComercial && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Acuerdo: {res.rangoAcuerdoComercial}
                        </span>
                      )}
                    </div>
                    {res.observacionesPuntosTratados && (
                      <p className="text-xs text-gray-500">{res.observacionesPuntosTratados}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  useEffect(() => {
    fetch(`${API}/admin/mesas/agenda`)
      .then((r) => r.json())
      .then((data) => setMesas(Array.isArray(data) ? data : []))
      .catch(() => setMesas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const todasReuniones = mesas.flatMap((m) => m.reunion ?? []);
  const mesasConReuniones = mesas.filter((m) => (m.reunion?.length ?? 0) > 0);
  const estados = ['TODOS', 'PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'];

  const mesasFiltradas = mesas.map((m) => ({
    ...m,
    reunion: (m.reunion ?? []).filter((r: any) =>
      filtroEstado === 'TODOS' || r.estadoReunion === filtroEstado
    ),
  })).filter((m) => filtroEstado === 'TODOS' || m.reunion.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda de Mesas</h1>
        <p className="text-sm text-gray-500 mt-1">Vista de reuniones programadas en cada mesa del evento.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total mesas', value: mesas.length, color: 'text-gray-900' },
          { label: 'Mesas ocupadas', value: mesasConReuniones.length, color: 'text-[#449D3A]' },
          { label: 'Reuniones totales', value: todasReuniones.length, color: 'text-blue-600' },
          { label: 'Finalizadas', value: todasReuniones.filter((r) => r.estadoReunion === 'FINALIZADA').length, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtro de estado */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {estados.map((e) => {
          const cfg = e !== 'TODOS' ? ESTADO_CONFIG[e] : null;
          return (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filtroEstado === e
                  ? 'bg-[#449D3A] text-white border-[#449D3A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {e === 'TODOS' ? 'Todos' : e}
            </button>
          );
        })}
      </div>

      {mesas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Armchair className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No hay mesas configuradas para el evento principal</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mesasFiltradas.map((mesa) => (
            <div key={mesa.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header de la mesa */}
              <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                  mesa.estaActivo === 1 ? 'bg-[#449D3A] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {String(mesa.numeroMesa).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Mesa {mesa.numeroMesa}</p>
                  <p className="text-xs text-gray-400">
                    {mesa.reunion?.length ?? 0} reunión(es) · {mesa.capacidadPersonas} personas max.
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  mesa.estaActivo === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* Reuniones */}
              {mesa.reunion && mesa.reunion.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {mesa.reunion.map((r: any) => (
                    <ReunionCard key={r.id} r={r} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-4 text-xs text-gray-400 italic text-center">Sin reuniones programadas</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
