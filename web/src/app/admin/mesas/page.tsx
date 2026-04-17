"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ToggleLeft, ToggleRight, RefreshCw, X } from 'lucide-react';
import { useModal } from '@/components/ui/Modal';

const API = 'http://localhost:3334';

export default function MesasPage() {
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerar, setShowGenerar] = useState(false);
  const [cantidad, setCantidad] = useState('10');
  const [capacidad, setCapacidad] = useState('4');
  const [generating, setGenerating] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/mesas`);
      setMesas(await res.json());
    } catch { setMesas([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggleMesa = async (mesa: any) => {
    const nuevoEstado = mesa.estaActivo === 1 ? 0 : 1;
    try {
      await fetch(`${API}/admin/mesas/${mesa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estaActivo: nuevoEstado }),
      });
      setMesas((prev) => prev.map((m) => m.id === mesa.id ? { ...m, estaActivo: nuevoEstado } : m));
    } catch { showError('Error', 'No se pudo cambiar el estado de la mesa.'); }
  };

  const handleGenerar = async () => {
    if (!cantidad || Number(cantidad) <= 0) {
      showError('Error', 'Ingresa una cantidad válida de mesas.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${API}/admin/mesas/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: Number(cantidad), capacidadPersonas: Number(capacidad) }),
      });
      const data = await res.json();
      showSuccess('Mesas generadas', data.mensaje);
      setShowGenerar(false);
      fetch_();
    } catch { showError('Error', 'No se pudieron generar las mesas.'); }
    finally { setGenerating(false); }
  };

  const activas = mesas.filter((m) => m.estaActivo === 1).length;
  const inactivas = mesas.filter((m) => m.estaActivo !== 1).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ModalComponent />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Mesas</h1>
          <p className="text-sm text-gray-500 mt-1">Administra las mesas del evento principal. Activa o desactiva según disponibilidad.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch_}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => setShowGenerar(true)}
            className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#367d2e] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Generar mesas
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total mesas', value: mesas.length, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Mesas activas', value: activas, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Mesas inhabilitadas', value: inactivas, color: 'text-gray-400', bg: 'bg-gray-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-5 shadow-sm`}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-4 h-4 rounded bg-[#449D3A] inline-block" /> Activa
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-4 h-4 rounded bg-gray-200 inline-block" /> Inhabilitada
        </div>
      </div>

      {/* Grid de mesas */}
      {loading ? (
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
          {[...Array(30)].map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      ) : mesas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400 text-sm mb-3">No hay mesas configuradas para este evento</p>
          <button onClick={() => setShowGenerar(true)}
            className="text-[#449D3A] font-semibold text-sm hover:underline">
            Generar mesas ahora →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {mesas.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMesa(m)}
                title={`Mesa ${m.numeroMesa} — ${m.estaActivo === 1 ? 'Activa (clic para desactivar)' : 'Inactiva (clic para activar)'}`}
                className={`relative flex items-center justify-center h-12 rounded-lg text-sm font-bold transition-all hover:scale-105 ${
                  m.estaActivo === 1
                    ? 'bg-[#449D3A] text-white shadow-sm'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {String(m.numeroMesa).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
            <span className="font-semibold text-[#449D3A]">{activas} Mesas activas</span>
            <span>{inactivas} Mesas inhabilitadas</span>
          </div>
        </div>
      )}

      {/* Modal generar mesas */}
      {showGenerar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Generar mesas</h2>
              <button onClick={() => setShowGenerar(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad de mesas a crear</label>
                <input type="number" min="1" max="100" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Capacidad por mesa (personas)</label>
                <input type="number" min="1" max="20" value={capacidad} onChange={(e) => setCapacidad(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A]" />
              </div>
              <p className="text-xs text-gray-400">Las mesas se numerarán de forma consecutiva a partir del número más alto existente.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowGenerar(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleGenerar} disabled={generating}
                className="flex-1 bg-[#449D3A] text-white font-semibold py-2.5 rounded-xl hover:bg-[#367d2e] disabled:opacity-50">
                {generating ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
