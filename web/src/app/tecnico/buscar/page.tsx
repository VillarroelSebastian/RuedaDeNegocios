"use client";
import React, { useState, useCallback, useRef } from 'react';
import { Search, Building2, Armchair, CalendarCheck, Video, MapPin, X } from 'lucide-react';

const API = 'http://localhost:3334';

const ESTADO_CFG: Record<string, { badge: string; dot: string; label: string }> = {
  PROGRAMADA: { badge:'bg-blue-100 text-blue-700',    dot:'bg-blue-400',   label:'Programada' },
  EN_CURSO:   { badge:'bg-orange-100 text-orange-700',dot:'bg-orange-400', label:'En curso' },
  FINALIZADA: { badge:'bg-green-100 text-green-700',  dot:'bg-green-400',  label:'Finalizada' },
  CANCELADA:  { badge:'bg-gray-100 text-gray-500',    dot:'bg-gray-400',   label:'Cancelada' },
};
const TIPO_CFG: Record<string, { badge: string; label: string }> = {
  VIRTUAL:    { badge:'bg-blue-100 text-blue-700',      label:'Virtual' },
  PRESENCIAL: { badge:'bg-emerald-100 text-emerald-700', label:'Presencial' },
  MIXTA:      { badge:'bg-purple-100 text-purple-700',   label:'Mixta' },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-base font-bold text-gray-900 flex-1">{label}</h2>
      <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
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

export default function TecnicoBuscarPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/tecnico/buscar?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 400);
  };

  const empresas  = results?.empresas  ?? [];
  const reuniones = results?.reuniones ?? [];
  const mesas     = results?.mesas     ?? [];
  const total     = empresas.length + reuniones.length + mesas.length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Buscador</h1>
      <p className="text-sm text-gray-500 mb-6">Empresas, reuniones y mesas del evento</p>

      {/* Search bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar por nombre de empresa, número de mesa..."
          className="block w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-2xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#449D3A] focus:border-[#449D3A] text-sm transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#449D3A]" />
        </div>
      )}

      {!loading && query.trim().length < 2 && (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Escribe al menos 2 caracteres para buscar</p>
        </div>
      )}

      {!loading && results && total === 0 && (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">Sin resultados para "{query}"</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Empresas */}
          {empresas.length > 0 && (
            <div>
              <SectionHeader icon={<Building2 className="w-5 h-5 text-[#449D3A]" />} label="Empresas" count={empresas.length} />
              <div className="space-y-2">
                {empresas.map((e: any) => (
                  <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    {e.urlFotoPerfil
                      ? <img src={e.urlFotoPerfil} className="w-12 h-12 rounded-full object-contain shrink-0" />
                      : <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-green-700" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{e.nombre}</p>
                      {e.rubro && <p className="text-xs text-gray-500 mt-0.5">{e.rubro}</p>}
                      {e.correoEmpresa && <p className="text-xs text-gray-400">{e.correoEmpresa}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${e.estaActivo === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reuniones */}
          {reuniones.length > 0 && (
            <div>
              <SectionHeader icon={<CalendarCheck className="w-5 h-5 text-blue-600" />} label="Reuniones" count={reuniones.length} />
              <div className="space-y-2">
                {reuniones.map((r: any) => {
                  const sol        = r.solicitudreunion;
                  const ea         = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
                  const eb         = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
                  const est        = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
                  const tip        = TIPO_CFG[r.tipoReunion]    ?? TIPO_CFG.PRESENCIAL;
                  const link       = sol?.enlaceReunionVirtual;
                  const mapsUrl    = getMapsUrl(sol);
                  const esVirtual  = r.tipoReunion === 'VIRTUAL'    || r.tipoReunion === 'MIXTA';
                  const esPresencial = r.tipoReunion === 'PRESENCIAL' || r.tipoReunion === 'MIXTA';

                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${est.dot}`} />
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {ea?.nombre ?? '—'} ↔ {eb?.nombre ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap ml-4">
                        <span className="text-xs text-gray-500">
                          Mesa {r.mesa?.numeroMesa} · {fmtDate(r.fechaHoraInicioReunion)} {fmtTime(r.fechaHoraInicioReunion)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tip.badge}`}>{tip.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.badge}`}>{est.label}</span>
                      </div>
                      {((esVirtual && link) || (esPresencial && mapsUrl)) && (
                        <div className="flex gap-2 mt-3 ml-4">
                          {esVirtual && link && (
                            <a href={link} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
                              <Video className="w-3 h-3" /> Virtual
                            </a>
                          )}
                          {esPresencial && mapsUrl && (
                            <a href={mapsUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                              <MapPin className="w-3 h-3" /> Maps
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mesas */}
          {mesas.length > 0 && (
            <div>
              <SectionHeader icon={<Armchair className="w-5 h-5 text-purple-600" />} label="Mesas" count={mesas.length} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mesas.map((m: any) => (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 text-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg ${
                      m.estaActivo === 1 ? 'bg-[#449D3A] text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {String(m.numeroMesa).padStart(2, '0')}
                    </div>
                    <p className="text-sm font-bold text-gray-900">Mesa {m.numeroMesa}</p>
                    <p className="text-xs text-gray-400">{m._count?.reunion ?? 0} reunión(es)</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.estaActivo === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                    </span>
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
