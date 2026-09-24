"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
export default function ForoPage() {
  const router = useRouter();
  const [tab,setTab] = useState("Programa");
  const [data,setData] = useState<any>(null);
  const [perfil,setPerfil] = useState<any>(null);
  const [fotos,setFotos] = useState<any[]>([]);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const u = JSON.parse(localStorage.getItem("foroUser") || "null");
      if (u?.rolEvento !== "FORO") return router.replace("/auth/login");
      const headers = { Authorization: "Bearer " + u.token };
      const responses = await Promise.all(["foro/contenido","foro/perfil","galeria?limit=200"].map(p => fetch(API + "/" + p,{headers})));
      if (responses.some(r => r.status === 401 || r.status === 403)) return router.replace("/auth/login");
      if (responses.some(r => !r.ok)) throw new Error("No se pudo cargar el contenido.");
      const [d,p,f] = await Promise.all(responses.map(r=>r.json()));
      setData(d);setPerfil(p);setFotos(f);setError("");
    } catch(e: unknown) { setError(e instanceof Error ? e.message : "Error de conexión."); }
  },[router]);
  useEffect(()=>{void cargar(); const timer=setInterval(()=>void cargar(),30000);return()=>clearInterval(timer);},[cargar]);
  async function guardar(e: React.FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const res=await fetch(API+"/foro/perfil",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(perfil)});
      const p=await res.json();if(!res.ok)throw new Error(p.message||"No se pudo guardar.");
      setPerfil(p);setError("Perfil guardado.");
    }catch(e: unknown){setError(e instanceof Error?e.message:"Error de conexión.");}finally{setBusy(false);}
  }
  return <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-green-700">Participante del foro</p><h1 className="text-2xl font-bold">{data?.evento?.nombre || "Foro"}</h1></div>
      <button className="rounded-xl border p-3" onClick={async()=>{ await import("@/lib/push").then(m=>m.desactivarPush()).catch(()=>{});localStorage.removeItem("foroUser");router.replace("/auth/login"); }}>Cerrar sesión</button></header>
    <nav className="mb-6 flex flex-wrap gap-2">{["Programa","Noticias","Galería","Mi perfil"].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={"rounded-xl border px-4 py-3 "+(tab===t?"bg-green-700 text-white":"bg-white")}>{t}</button>)}</nav>
    {error&&<p role="status" className="mb-4 text-sm">{error} <button className="underline" onClick={()=>void cargar()}>Actualizar</button></p>}
    {!data&&!error&&<p>Cargando…</p>}
    {tab==="Programa"&&<section className="space-y-4">{data?.evento?.sobreElEvento&&<p>{data.evento.sobreElEvento}</p>}
      {data?.actividades?.length===0&&<p>Pronto publicaremos el programa.</p>}
      {data?.actividades?.map((a:any)=><article key={a.id} className="rounded-2xl border p-4"><h2 className="text-lg font-bold">{a.nombreActividad}</h2>
        <p className="text-sm text-green-700">{a.fechaActividad?.slice(0,10)} · {a.horaInicioActividad?.slice(11,16)} · {a.nombreSalaEspacio} · {a.estadoEnVivo}</p>
        <p className="mt-2 whitespace-pre-wrap">{a.descripcionActividad}</p>{a.notaEnVivo&&<p className="mt-2 font-semibold">{a.notaEnVivo}</p>}
        {a.linkReunionVirtual?.startsWith("https://")&&<a className="mt-3 inline-block text-green-700 underline" href={a.linkReunionVirtual} target="_blank" rel="noopener noreferrer">Acceder a la actividad</a>}
      </article>)}</section>}
    {tab==="Noticias"&&<section className="space-y-4">{data?.noticias?.length===0&&<p>No hay noticias publicadas.</p>}{data?.noticias?.map((n:any)=><article key={n.id} className="rounded-2xl border p-4"><h2 className="text-lg font-bold">{n.tituloNoticia}</h2><p className="mt-2 whitespace-pre-wrap">{n.contenidoNoticia}</p></article>)}</section>}
    {tab==="Galería"&&<section className="grid grid-cols-2 gap-3 sm:grid-cols-3">{fotos.length===0&&<p>No hay fotos todavía.</p>}{fotos.map(f=><figure key={f.id} className="min-w-0 rounded-xl border p-2"><img src={f.urlFoto} alt={f.descripcion||"Foto del evento"} className="aspect-square w-full object-contain"/><figcaption className="break-words text-sm">{f.descripcion||f.autorNombre}</figcaption></figure>)}</section>}
    {tab==="Mi perfil"&&perfil&&<form onSubmit={guardar} className="max-w-lg space-y-4"><p>{perfil.correo}</p>{[["nombres","Nombres",105],["apellidoPaterno","Apellido",65],["telefono","Teléfono",45]].map(([k,label,max])=><label key={k} className="block">{label}<input required maxLength={Number(max)} value={perfil[k]||""} onChange={e=>setPerfil({...perfil,[k]:e.target.value})} className="mt-1 w-full rounded-xl border p-3 text-base"/></label>)}<button disabled={busy} className="rounded-xl bg-green-700 p-3 text-white">{busy?"Guardando…":"Guardar perfil"}</button></form>}
  </main>;
}
