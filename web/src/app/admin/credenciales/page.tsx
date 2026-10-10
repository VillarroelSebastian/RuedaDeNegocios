"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Printer, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// Cada tipo de participante tiene su propio color de credencial para
// distinguirlos de un vistazo en el control de acceso: foro (amarillo),
// empresa/encargado normal (verde) y auspiciador (azul).
const COLOR_TIPO: Record<string, { borde: string; franja: string; texto: string }> = {
  FORO:        { borde: "border-amber-400",  franja: "bg-amber-400",  texto: "text-amber-600" },
  AUSPICIADOR: { borde: "border-blue-500",   franja: "bg-blue-500",   texto: "text-blue-600" },
  EMPRESA:     { borde: "border-[#449D3A]",  franja: "bg-[#449D3A]",  texto: "text-[#449D3A]" },
};

export default function CredencialesPage() {
  const [data, setData] = useState<any>({ credenciales: [] });
  const [buscar, setBuscar] = useState("");
  const [imprimirId, setImprimirId] = useState<number | null>(null);
  useEffect(() => { fetch(`${API}/admin/credenciales-imprimibles`).then((r) => r.json()).then(setData); }, []);
  useEffect(() => {
    const limpiar = () => setImprimirId(null);
    window.addEventListener("afterprint", limpiar);
    return () => window.removeEventListener("afterprint", limpiar);
  }, []);
  const lista = useMemo(() => data.credenciales.filter((c: any) => `${c.nombre} ${c.empresa}`.toLowerCase().includes(buscar.toLowerCase())), [data, buscar]);
  const imprimir = (id: number | null) => {
    setImprimirId(id);
    window.setTimeout(() => window.print(), 100);
  };
  return <div className="p-4 sm:p-6 max-w-7xl mx-auto">
    <style jsx global>{`
      @page { size: letter portrait; margin: 10mm; }
      @media print {
        aside, header, .no-print { display:none!important }
        main { margin:0!important; padding:0!important; max-width:none!important }
        .contenedor-credenciales { display:flex!important; flex-wrap:wrap!important; align-items:flex-start!important; gap:4mm!important }
        .credencial-print { break-inside:avoid!important; page-break-inside:avoid!important; box-sizing:border-box!important; flex:0 0 90mm!important; width:90mm!important; min-width:90mm!important; max-width:90mm!important; height:130mm!important; min-height:130mm!important; max-height:130mm!important; margin:0!important; box-shadow:none!important }
        .credencial-print.no-seleccionada { display:none!important }
      }
    `}</style>
    <div className="no-print flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
      <div><h1 className="text-2xl font-extrabold">Credenciales QR</h1><p className="text-sm text-gray-500">Formato 9 × 13 cm. Filtra para imprimir una persona o deja vacío para imprimir todas.</p></div>
      <button onClick={() => imprimir(null)} className="w-full sm:w-auto bg-[#449D3A] text-white rounded-xl px-5 py-3 font-bold flex justify-center gap-2"><Printer className="w-5 h-5"/>Imprimir todas las visibles</button>
    </div>
    <label className="no-print mb-6 flex items-center gap-2 bg-white border rounded-xl px-3 max-w-lg"><Search className="w-5 h-5 text-gray-400"/><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o empresa" className="w-full py-3 outline-none"/></label>
    <div className="contenedor-credenciales grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {lista.map((c: any) => {
        const color = COLOR_TIPO[c.tipo] ?? COLOR_TIPO.EMPRESA;
        const logo = c.tipo === "FORO" && data.evento?.urlLogoForo ? data.evento.urlLogoForo : data.evento?.urlLogoEvento;
        return <section key={c.id} className={`credencial-print relative bg-white border-2 ${color.borde} rounded-2xl overflow-hidden p-4 flex flex-col items-center text-center mx-auto ${imprimirId !== null && imprimirId !== c.id ? "no-seleccionada" : ""}`} style={{ width: "90mm", height: "130mm" }}>
          <div className={`absolute top-0 left-0 right-0 h-2 ${color.franja}`}/>
          {logo && <img src={logo} alt="Logo" className="h-14 w-full object-contain mt-2 mb-3"/>}
          <h2 className="font-extrabold text-lg leading-tight break-words">{c.nombre}</h2>
          <p className={`text-sm font-bold break-words ${color.texto}`}>{c.empresa}</p>
          <p className="text-xs text-gray-500">{c.cargo || "Participante"}</p>
          <div className="flex-1" />
          {c.qr && <img src={c.qr} alt={`QR de ${c.nombre}`} className="w-40 h-40 object-contain shrink-0"/>}
          <p className="text-[10px] text-gray-400 mt-2">{data.evento?.nombre} {data.evento?.edicion}</p>
          <button onClick={() => imprimir(c.id)} className="no-print mt-3 w-full rounded-lg border border-[#449D3A] text-[#449D3A] px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5"><Printer className="w-4 h-4"/>Imprimir esta credencial</button>
        </section>;
      })}
    </div>
  </div>;
}
