"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BadgeCheck, Building2, BriefcaseBusiness } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function CredencialAuspiciadorPage() {
  const { personaId } = useParams<{ personaId: string }>(); const query = useSearchParams();
  const [data, setData] = useState<any>(null); const [error, setError] = useState("");
  useEffect(() => { const token = query.get("t") || ""; fetch(`${API}/public/credencial-auspiciador/${personaId}?t=${encodeURIComponent(token)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.message || "Credencial no válida"); return d; }).then(setData).catch(e => setError(e.message)); }, [personaId, query]);
  return <main className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl p-6 text-center">
      {error ? <><h1 className="text-xl font-extrabold text-red-700">Credencial no válida</h1><p className="text-sm text-gray-500 mt-2">{error}</p></> : !data ? <p className="text-gray-500">Verificando credencial…</p> : <>
        <BadgeCheck className="w-16 h-16 text-green-600 mx-auto"/><p className="text-xs font-bold text-green-700 uppercase mt-3">Auspiciador habilitado</p><h1 className="text-2xl font-extrabold text-gray-900 mt-2 break-words">{data.nombreCompleto}</h1>
        <div className="mt-5 space-y-3 text-left"><div className="flex gap-3 bg-gray-50 rounded-xl p-3"><Building2 className="w-5 h-5 text-green-600 shrink-0"/><div className="min-w-0"><p className="text-xs text-gray-400">Empresa</p><p className="font-bold break-words">{data.empresa}</p></div></div><div className="flex gap-3 bg-gray-50 rounded-xl p-3"><BriefcaseBusiness className="w-5 h-5 text-green-600 shrink-0"/><div><p className="text-xs text-gray-400">Cargo</p><p className="font-bold">{data.cargo || "—"}</p></div></div></div>
        <p className="text-sm font-semibold text-gray-700 mt-5">{data.evento} {data.edicion}</p>
      </>}
    </div>
  </main>;
}
