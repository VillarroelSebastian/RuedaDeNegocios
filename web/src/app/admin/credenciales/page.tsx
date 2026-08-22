"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function CredencialesPage() {
  const [data, setData] = useState<any>({ credenciales: [] });
  const [buscar, setBuscar] = useState("");
  useEffect(() => { fetch(`${API}/admin/credenciales-imprimibles`).then((r) => r.json()).then(setData); }, []);
  const lista = useMemo(() => data.credenciales.filter((c: any) => `${c.nombre} ${c.empresa}`.toLowerCase().includes(buscar.toLowerCase())), [data, buscar]);
  return <main className="p-4 sm:p-6 max-w-7xl mx-auto">
    <style jsx global>{`@media print { aside, header, .no-print { display:none!important } main { margin:0!important;padding:0!important } .credencial-print { break-inside:avoid; width:85.6mm!important; height:54mm!important; box-shadow:none!important } }`}</style>
    <div className="no-print flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
      <div><h1 className="text-2xl font-extrabold">Credenciales QR</h1><p className="text-sm text-gray-500">Formato CR80: 85,6 × 54 mm. Filtra para imprimir una persona o deja vacío para imprimir todas.</p></div>
      <button onClick={() => window.print()} className="w-full sm:w-auto bg-[#449D3A] text-white rounded-xl px-5 py-3 font-bold flex justify-center gap-2"><Printer className="w-5 h-5"/>Generar / imprimir</button>
    </div>
    <label className="no-print mb-6 flex items-center gap-2 bg-white border rounded-xl px-3 max-w-lg"><Search className="w-5 h-5 text-gray-400"/><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o empresa" className="w-full py-3 outline-none"/></label>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print:block">
      {lista.map((c: any) => <section key={c.id} className="credencial-print relative bg-white border-2 border-[#449D3A] rounded-2xl overflow-hidden p-4 flex gap-4 items-center print:mb-2">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#449D3A]"/>
        <div className="flex-1 min-w-0 text-center">
          {data.evento?.urlLogoEvento && <img src={data.evento.urlLogoEvento} alt="Logo" className="h-12 w-full object-contain mb-2"/>}
          <h2 className="font-extrabold text-lg leading-tight break-words">{c.nombre}</h2><p className="text-sm font-bold text-[#449D3A] break-words">{c.empresa}</p><p className="text-xs text-gray-500">{c.cargo || "Participante"}</p>
        </div>
        {c.qr && <img src={c.qr} alt={`QR de ${c.nombre}`} className="w-32 h-32 object-contain shrink-0"/>}
      </section>)}
    </div>
  </main>;
}
