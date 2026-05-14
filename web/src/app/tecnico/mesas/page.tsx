"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Armchair, Building2, Clock, Video, MapPin, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

const API = 'http://localhost:3334';

const ESTADO_CFG: Record<string, { badge: string; dot: string; label: string }> = {
  PROGRAMADA: { badge:'bg-blue-100 text-blue-700',    dot:'bg-blue-400',   label:'Programada' },
  EN_CURSO:   { badge:'bg-orange-100 text-orange-700',dot:'bg-orange-400', label:'En curso' },
  FINALIZADA: { badge:'bg-green-100 text-green-700',  dot:'bg-green-400',  label:'Finalizada' },
  CANCELADA:  { badge:'bg-gray-100 text-gray-500',    dot:'bg-gray-400',   label:'Cancelada' },
};

function getMapsUrl(sol: any): string | null {
  if (sol?.ubicacionGoogleMapsReunion) return sol.ubicacionGoogleMapsReunion;
  if (sol?.latitudPresencial && sol?.longitudPresencial)
    return `https://www.google.com/maps?q=${sol.latitudPresencial},${sol.longitudPresencial}`;
  if (sol?.direccionTexto)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sol.direccionTexto)}`;
  return null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function ReunionSlot({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const sol  = r.solicitudreunion;
  const ea   = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb   = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est  = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const link = sol?.enlaceReunionVirtual;
  const mapsUrl = getMapsUrl(sol);
  const esVirtual   = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
  const esPresencial= r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';
  const repsA = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa_usuario ?? [];
  const repsB = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa_usuario ?? [];

  const nombreEmpresas = `${ea?.nombre ?? '—'} / ${eb?.nombre ?? '—'}`;
  // filter company names for search
  const searchText = nombreEmpresas.toLowerCase();

  return (
    <div className="border-t border-gray-50" data-search={searchText}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
        {/* Time */}
        <div className="w-24 shrink-0">
          <p className="text-xs font-bold text-gray-800">
            {fmtTime(r.fechaHoraInicioReunion)} – {fmtTime(r.fechaHoraFinReunion)}
          </p>
        </div>

        {/* Companies */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {ea?.urlFotoPerfil
            ? <img src={ea.urlFotoPerfil} className="w-7 h-7 rounded-full object-cover shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-green-700" /></div>
          }
          <span className="text-sm font-semibold text-gray-900 truncate">{ea?.nombre ?? '—'}</span>
          <span className="text-gray-300 font-bold text-sm shrink-0">·</span>
          {eb?.urlFotoPerfil
            ? <img src={eb.urlFotoPerfil} className="w-7 h-7 rounded-full object-cover shrink-0" />
            : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Building2 className="w-3 h-3 text-blue-700" /></div>
          }
          <span className="text-sm font-semibold text-gray-900 truncate">{eb?.nombre ?? '—'}</span>
        </div>

        {/* Estado */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 hidden sm:inline ${est.badge}`}>
          {est.label === 'Programada' ? 'OCUPADA' : est.label.toUpperCase()}
        </span>

        {/* Ver detalles */}
        <Link href={`/tecnico/reuniones/${r.id}`}
          className="text-xs font-semibold text-[#449D3A] hover:underline shrink-0 hidden sm:block">
          Ver detalles
        </Link>

        <button onClick={() => setOpen(!open)} className="shrink-0 text-gray-400 hover:text-gray-600">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            {/* Tema */}
            {sol?.mensajeParaEmpresaReceptora && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tema de reunión</p>
                <p className="text-xs text-gray-600 italic">"{sol.mensajeParaEmpresaReceptora}"</p>
              </div>
            )}
            {/* Representantes */}
            {(repsA.length > 0 || repsB.length > 0) && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Representantes</p>
                <div className="flex flex-wrap gap-2">
                  {repsA.slice(0,1).map((eu: any) => (
                    <span key={eu.usuario?.id} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      {eu.usuario?.nombres} {eu.usuario?.apellidoPaterno} · {ea?.nombre}
                    </span>
                  ))}
                  {repsB.slice(0,1).map((eu: any) => (
                    <span key={eu.usuario?.id} className="text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      {eu.usuario?.nombres} {eu.usuario?.apellidoPaterno} · {eb?.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {esVirtual && link && (
              <a href={link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                <Video className="w-3 h-3" /> Reunión virtual
              </a>
            )}
            {esPresencial && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">
                <MapPin className="w-3 h-3" /> Google Maps
              </a>
            )}
            <Link href={`/tecnico/reuniones/${r.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors">
              Ver detalles completos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TecnicoMesasPage() {
  const [mesas,   setMesas]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [search,  setSearch]  = useState('');

  const fetchMesas = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/tecnico/mesas`);
      const data = await res.json();
      setMesas(data.mesas ?? []);
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  const mesasFiltradas = mesas.filter((m) => {
    const passFiltro = filtro === 'activas' ? m.estaActivo === 1 : filtro === 'inactivas' ? m.estaActivo === 0 : true;
    if (!passFiltro) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(m.numeroMesa).includes(q) ||
      m.reunion?.some((r: any) => {
        const sol = r.solicitudreunion;
        const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
        const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
        return ea?.nombre?.toLowerCase().includes(q) || eb?.nombre?.toLowerCase().includes(q);
      })
    );
  });

  const total    = mesas.length;
  const activas  = mesas.filter((m) => m.estaActivo === 1).length;
  const ocupadas = mesas.filter((m) => (m.reunion?.length ?? 0) > 0).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Agenda de mesas</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta qué empresas se reúnen en cada mesa y en qué horario.</p>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Número de mesa</p>
          <div className="relative">
            <select value={filtro === 'todas' ? 'todas' : filtro}
              onChange={(e) => setFiltro(e.target.value as any)}
              className="appearance-none text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-1 focus:ring-[#449D3A]">
              <option value="todas">Todas las mesas</option>
              <option value="activas">Solo activas</option>
              <option value="inactivas">Solo inactivas</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Buscar empresa</p>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa participante..."
              className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500 shrink-0 self-end pb-1">
          {total} mesas · {activas} activas · {ocupadas} ocupadas
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#449D3A]" />
        </div>
      ) : (
        <div className="space-y-4">
          {mesasFiltradas.map((mesa) => (
            <div key={mesa.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Mesa header */}
              <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 ${
                  mesa.estaActivo === 1 ? 'bg-[#449D3A] text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {String(mesa.numeroMesa).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-900">Mesa {mesa.numeroMesa}</p>
                  <p className="text-xs text-gray-400">{mesa._count?.reunion ?? 0} reunión(es) · {mesa.capacidadPersonas} personas</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                  mesa.estaActivo === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Armchair className="w-3 h-3" />
                  {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                </div>
              </div>

              {/* Reuniones / slots */}
              {mesa.reunion && mesa.reunion.length > 0 ? (
                mesa.reunion.map((r: any) => <ReunionSlot key={r.id} r={r} />)
              ) : (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <p className="text-sm text-gray-400 font-medium">Disponible</p>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">DISPONIBLE</span>
                </div>
              )}
            </div>
          ))}
          {mesasFiltradas.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Armchair className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 font-medium">Sin mesas con ese filtro</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
