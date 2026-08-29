"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Copy, Info, Plus, Power, Trash2 } from "lucide-react";
import { useModal } from "@/components/ui/Modal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
type Rango = { desde: string; hasta: string };
type Dia = { fecha: string; habilitado: boolean; rangos: Rango[] };

export default function EmpresaHorariosPage() {
  const { showError, showSuccess, ModalComponent } = useModal();
  const [eeId, setEeId] = useState<number | null>(null);
  const [dias, setDias] = useState<Dia[]>([]);
  const [configurado, setConfigurado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (id: number) => {
    setCargando(true);
    try {
      const res = await fetch(`${API}/empresa/horarios-empresa/dias?eeId=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudieron cargar los horarios.");
      setDias(Array.isArray(data.dias) ? data.dias : []);
      setConfigurado(!!data.configurado);
    } catch (e: any) { showError("No se pudo cargar", e.message); }
    finally { setCargando(false); }
  // El modal expone callbacks nuevos en cada render; la carga depende solo del id.
  // Mantenerla estable evita volver a consultar indefinidamente al mostrar esta vista.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("empresaUser") || "null");
      if (!user?.id) { setCargando(false); return; }
      fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
        .then((r) => r.json()).then((ctx) => { setEeId(ctx.empresaeventoId); cargar(ctx.empresaeventoId); })
        .catch(() => setCargando(false));
    } catch { setCargando(false); }
  }, [cargar]);

  const actualizar = (indice: number, cambio: Partial<Dia>) =>
    setDias((actuales) => actuales.map((dia, i) => i === indice ? { ...dia, ...cambio } : dia));

  const actualizarRango = (diaIndex: number, rangoIndex: number, campo: keyof Rango, valor: string) =>
    setDias((actuales) => actuales.map((dia, i) => i === diaIndex ? {
      ...dia, rangos: dia.rangos.map((rango, j) => j === rangoIndex ? { ...rango, [campo]: valor } : rango),
    } : dia));

  const copiarPrimero = () => {
    if (!dias.length) return;
    const rangos = dias[0].rangos.map((r) => ({ ...r }));
    setDias((actuales) => actuales.map((dia) => ({ ...dia, habilitado: true, rangos: rangos.map((r) => ({ ...r })) })));
    showSuccess("Horario copiado", "Puedes modificar después cada día por separado.");
  };

  const guardar = async () => {
    if (!eeId) return;
    const invalido = dias.some((dia) => dia.habilitado && (
      dia.rangos.length === 0 || dia.rangos.some((r) => !r.desde || !r.hasta || r.desde >= r.hasta)
    ));
    if (invalido) return showError("Revisa tus horarios", "Cada día habilitado debe tener al menos un rango válido.");
    setGuardando(true);
    try {
      const res = await fetch(`${API}/empresa/horarios-empresa/dias`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eeId, dias }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudieron guardar los horarios.");
      setDias(data.dias); setConfigurado(true);
      showSuccess("Disponibilidad guardada", "Las demás empresas ya verán esta agenda al solicitarte una reunión.");
    } catch (e: any) { showError("No se pudo guardar", e.message); }
    finally { setGuardando(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
    <ModalComponent />
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><CalendarClock className="h-6 w-6 text-[#449D3A]" />Mi agenda disponible</h1>
      <p className="mt-1 text-sm text-gray-500">Elige los rangos en los que tu empresa acepta reuniones durante cada día del evento.</p>
    </div>
    {!configurado && !cargando && <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0" /><p>Aún no configuraste tu agenda. Mientras no cambies nada, se usarán todos los horarios definidos por el administrador.</p>
    </div>}
    {cargando ? <div className="py-20 text-center text-sm text-gray-400">Cargando agendaâ€¦</div> : <>
      <div className="flex justify-end"><button type="button" onClick={copiarPrimero} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-bold text-[#449D3A] hover:bg-green-50"><Copy className="h-4 w-4" />Copiar primer día a todos</button></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {dias.map((dia, diaIndex) => <section key={dia.fecha} className={`rounded-2xl border bg-white p-5 shadow-sm ${dia.habilitado ? "border-gray-100" : "border-red-100 bg-red-50/30"}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="font-extrabold capitalize text-gray-900">{new Date(`${dia.fecha}T12:00:00`).toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long" })}</p><p className="text-xs text-gray-400">{dia.habilitado ? "Disponible para recibir solicitudes" : "Día completo inhabilitado"}</p></div>
            <button type="button" onClick={() => actualizar(diaIndex, { habilitado: !dia.habilitado })} className={`rounded-xl p-2.5 ${dia.habilitado ? "bg-green-50 text-green-700" : "bg-red-100 text-red-700"}`} aria-label="Habilitar o inhabilitar día"><Power className="h-4 w-4" /></button>
          </div>
          {dia.habilitado && <div className="space-y-3">
            {dia.rangos.map((rango, rangoIndex) => <div key={rangoIndex} className="flex flex-wrap items-center gap-2">
              <input type="time" value={rango.desde} onChange={(e) => actualizarRango(diaIndex, rangoIndex, "desde", e.target.value)} className="min-w-28 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
              <span className="text-xs text-gray-400">hasta</span>
              <input type="time" value={rango.hasta} onChange={(e) => actualizarRango(diaIndex, rangoIndex, "hasta", e.target.value)} className="min-w-28 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
              {dia.rangos.length > 1 && <button type="button" onClick={() => actualizar(diaIndex, { rangos: dia.rangos.filter((_, i) => i !== rangoIndex) })} className="p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>}
            </div>)}
            <button type="button" onClick={() => actualizar(diaIndex, { rangos: [...dia.rangos, { desde: "", hasta: "" }] })} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#449D3A]"><Plus className="h-4 w-4" />Agregar otro rango</button>
          </div>}
        </section>)}
      </div>
      <button type="button" onClick={guardar} disabled={guardando} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#449D3A] px-5 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"><CheckCircle2 className="h-4 w-4" />{guardando ? "Guardandoâ€¦" : "Guardar mi agenda"}</button>
    </>}
  </div>;
}
