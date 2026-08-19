"use client";
import { useState } from "react";
import AdminNoticiasPage from "@/app/admin/noticias/page";
import AdminEventosPage from "@/app/admin/eventos/page";
import CronogramaVivoPage from "@/app/tecnico/cronograma-vivo/page";

export default function ContenidoTecnicoPage() {
  const [tab, setTab] = useState<"comunicados" | "eventos" | "vivo">("comunicados");
  return <div>
    <div className="sticky top-0 z-10 flex gap-2 border-b bg-white px-6 py-3">
      {([['comunicados','Comunicados'], ['eventos','Eventos'], ['vivo','Eventos en vivo']] as const).map(([id, label]) =>
        <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? 'bg-[#449D3A] text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>)}
    </div>
    {tab === "comunicados" && <AdminNoticiasPage />}
    {tab === "eventos" && <AdminEventosPage />}
    {tab === "vivo" && <CronogramaVivoPage />}
  </div>;
}
