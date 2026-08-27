"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Building2, BriefcaseBusiness, CheckCircle2, MapPin } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function CredencialAuspiciadorPage() {
  const { personaId } = useParams<{ personaId: string }>(); const query = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null); const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false); const [resultado, setResultado] = useState("");
  const [tecnico, setTecnico] = useState<any>(null);
  const puedeRegistrar = ["TECNICO", "TECNICO_EVENTOS"].includes(tecnico?.rolEvento);
  useEffect(() => {
    let sesion: any = null;
    try { sesion = JSON.parse(localStorage.getItem("tecnicoUser") || "null"); } catch {}
    if (!sesion?.token || !["TECNICO", "TECNICO_EVENTOS"].includes(sesion.rolEvento)) {
      const siguiente = `${window.location.pathname}${window.location.search}`;
      router.replace(`/auth/login?next=${encodeURIComponent(siguiente)}`);
      return;
    }
    setTecnico(sesion);
    const token = query.get("t") || "";
    fetch(`${API}/tecnico/credenciales-auspiciador/verificar?personaId=${personaId}&token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.message || "Credencial no válida"); return d; }).then(setData).catch(e => setError(e.message));
  }, [personaId, query, router]);
  const registrar = async () => {
    setRegistrando(true); setResultado("");
    try {
      const token = query.get("t") || "";
      const ver = await fetch(`${API}/tecnico/credenciales-auspiciador/verificar?personaId=${personaId}&token=${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${tecnico.token}` } });
      if (!ver.ok) throw new Error((await ver.json())?.message || "No se pudo verificar la credencial.");
      const res = await fetch(`${API}/tecnico/asistencias-auspiciadores`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tecnico.token}` }, body: JSON.stringify({ personaId: Number(personaId), token }) });
      const r = await res.json(); if (!res.ok) throw new Error(r?.message || "No se pudo registrar la asistencia.");
      setData((actual: any) => ({ ...actual, asistencia: { registrada: r.usosRestantes === 0, fechaHoraAsistencia: r.fechaHoraAsistencia, usosHoy: r.usosHoy, usosRestantes: r.usosRestantes, limiteDiario: r.limiteDiario } }));
      setResultado(`Asistencia registrada. Uso ${r.usosHoy} de ${r.limiteDiario}; ${r.usosRestantes ? `queda ${r.usosRestantes} registro hoy` : "límite diario alcanzado"}.`);
    } catch (e: any) { setResultado(e.message); } finally { setRegistrando(false); }
  };
  return <main className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl p-6 text-center">
      {error ? <><h1 className="text-xl font-extrabold text-red-700">Credencial no válida</h1><p className="text-sm text-gray-500 mt-2">{error}</p></> : !data ? <p className="text-gray-500">Verificando credencial…</p> : <>
        <BadgeCheck className="w-16 h-16 text-green-600 mx-auto"/><p className="text-xs font-bold text-green-700 uppercase mt-3">Auspiciador habilitado</p><h1 className="text-2xl font-extrabold text-gray-900 mt-2 break-words">{data.nombreCompleto}</h1>
        <div className="mt-5 space-y-3 text-left"><div className="flex gap-3 bg-gray-50 rounded-xl p-3"><Building2 className="w-5 h-5 text-green-600 shrink-0"/><div className="min-w-0"><p className="text-xs text-gray-400">Empresa</p><p className="font-bold break-words">{data.empresa}</p></div></div><div className="flex gap-3 bg-gray-50 rounded-xl p-3"><BriefcaseBusiness className="w-5 h-5 text-green-600 shrink-0"/><div><p className="text-xs text-gray-400">Cargo</p><p className="font-bold">{data.cargo || "—"}</p></div></div></div>
        <p className="text-sm font-semibold text-gray-700 mt-5">{data.evento} {data.edicion}</p>
        {data.lugar && <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1"><MapPin className="w-4 h-4"/>{data.lugar}</p>}
        {puedeRegistrar && !data.asistencia?.registrada && <button onClick={registrar} disabled={registrando} className="mt-5 w-full rounded-xl bg-[#449D3A] text-white font-bold px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-5 h-5"/>{registrando ? "Registrando…" : "Registrar asistencia"}</button>}
        {(resultado || data.asistencia?.fechaHoraAsistencia) && <div className="mt-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold p-3 break-words">{resultado || `Último registro: ${new Date(data.asistencia.fechaHoraAsistencia).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}. Usos de hoy: ${data.asistencia.usosHoy} de ${data.asistencia.limiteDiario || 2}.`}</div>}
      </>}
    </div>
  </main>;
}
