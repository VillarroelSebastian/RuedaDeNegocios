"use client";

import React, { useEffect, useState } from 'react';
import { Building2, X, MapPin, Mail, Phone, Globe, Handshake } from 'lucide-react';

import { API } from "@/lib/api";

export default function PerfilEmpresaStaffModal({ empresaEventoId, onClose }: { empresaEventoId: number | null; onClose: () => void }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!empresaEventoId) return;
    setEmpresa(null); setError('');
    fetch(`${API}/directory/${empresaEventoId}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json())?.message || 'No se pudo cargar el perfil.'); return r.json(); })
      .then(setEmpresa).catch((e) => setError(e.message));
  }, [empresaEventoId]);

  if (!empresaEventoId) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white p-5">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-green-50 p-3"><Building2 className="h-6 w-6 text-[#449D3A]" /></span><div><h2 className="font-extrabold text-gray-900">{empresa?.nombre ?? 'Perfil de empresa'}</h2><p className="text-xs font-mono text-[#449D3A]">{empresa?.codigo}</p></div></div>
        <button onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 p-5">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : !empresa ? <p className="py-12 text-center text-sm text-gray-400">Cargando perfil…</p> : <>
          <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm"><Handshake className="h-4 w-4 text-gray-400" /><strong>Rubro:</strong> {empresa.rubro}</p>
            <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400" />{[empresa.ciudad, empresa.pais].filter(Boolean).join(', ')}</p>
            <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-gray-400" />{empresa.correoCorporativo}</p>
            <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gray-400" />{empresa.telefonoWhatsapp}</p>
            {empresa.sitioWeb && <a href={empresa.sitioWeb} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#449D3A]"><Globe className="h-4 w-4" />{empresa.sitioWeb}</a>}
          </div>
          {empresa.descripcion && <section><h3 className="text-xs font-bold uppercase text-gray-400">Descripción</h3><p className="mt-1 text-sm text-gray-700">{empresa.descripcion}</p></section>}
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-green-100 bg-green-50 p-4"><h3 className="text-xs font-bold uppercase text-green-700">Qué ofrece</h3><p className="mt-1 text-sm text-gray-700">{empresa.oferta || 'Sin información'}</p></section>
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="text-xs font-bold uppercase text-blue-700">Qué busca</h3><p className="mt-1 text-sm text-gray-700">{empresa.demanda || 'Sin información'}</p></section>
          </div>
          {empresa.interesesBusqueda && <section><h3 className="text-xs font-bold uppercase text-gray-400">Sectores de interés</h3><p className="mt-1 text-sm text-gray-700">{empresa.interesesBusqueda}</p></section>}
        </>}
      </div>
    </div>
  </div>;
}
