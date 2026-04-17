"use client";
import React, { useState, useEffect } from 'react';
import { Armchair, Calendar, Clock } from 'lucide-react';

const API = 'http://localhost:3334';

export default function AgendaPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/admin/mesas/agenda`)
      .then((r) => r.json())
      .then((data) => { setMesas(Array.isArray(data) ? data : []); })
      .catch(() => setMesas([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const mesasConReuniones = mesas.filter((m) => m.reunion?.length > 0 || m.mesabloque?.length > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda de Mesas</h1>
        <p className="text-sm text-gray-500 mt-1">Vista de la ocupación y reuniones programadas en cada mesa del evento.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total mesas</p>
          <p className="text-3xl font-bold text-gray-900">{mesas.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Con reuniones</p>
          <p className="text-3xl font-bold text-[#449D3A]">{mesasConReuniones.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reuniones totales</p>
          <p className="text-3xl font-bold text-blue-600">{mesas.reduce((sum, m) => sum + (m.reunion?.length || 0), 0)}</p>
        </div>
      </div>

      {mesas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Armchair className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No hay mesas configuradas para el evento principal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mesas.map((mesa) => (
            <div key={mesa.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-gray-50">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${mesa.estaActivo === 1 ? 'bg-[#449D3A] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {String(mesa.numeroMesa).padStart(2, '0')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Mesa {mesa.numeroMesa}</p>
                  <p className="text-xs text-gray-400">
                    {mesa.reunion?.length || 0} reunión(es) · {mesa.capacidadPersonas} personas
                  </p>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mesa.estaActivo === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {mesa.estaActivo === 1 ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>

              {mesa.reunion && mesa.reunion.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {mesa.reunion.map((r: any) => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        r.estadoReunion === 'FINALIZADA' ? 'bg-green-500' :
                        r.estadoReunion === 'EN_CURSO' ? 'bg-orange-500 animate-pulse' :
                        'bg-blue-400'
                      }`} />
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.fechaHoraInicioReunion).toLocaleDateString('es-BO')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(r.fechaHoraInicioReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} - {new Date(r.fechaHoraFinReunion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        r.estadoReunion === 'FINALIZADA' ? 'bg-green-100 text-green-700' :
                        r.estadoReunion === 'EN_CURSO' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {r.estadoReunion}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-gray-400 italic">Sin reuniones programadas</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
