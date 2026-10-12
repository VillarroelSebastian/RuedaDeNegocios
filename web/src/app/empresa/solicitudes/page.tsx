"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, MapPin, Search, ArrowRight, CalendarDays } from "lucide-react";
import { paisConBandera } from "@/lib/pais";
import { NuevaSolicitudModal } from "@/components/empresa/NuevaSolicitudModal";
import { ModalExito } from "@/components/empresa/ModalExito";
import { ReunionesSection } from "@/components/empresa/ReunionesSection";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// Las antiguas pestañas "Enviadas"/"Recibidas" se eliminaron: toda la
// gestión de solicitudes (aceptar, rechazar, editar, cancelar) ahora vive
// directamente en "Reuniones", junto a las reuniones ya confirmadas.
function SolicitudesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ctx, setCtx] = useState<any>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busquedaEmpresa, setBusquedaEmpresa] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"empresas" | "reuniones">("empresas");
  const [modalNueva, setModalNueva] = useState<{ id: number; nombre: string; solicitud?: any } | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  const esEncargado = !!ctx?.esResponsable;

  const cargarEmpresas = (eeId: number) =>
    fetch(`${API}/empresa/directorio?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : []));

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => {
        setCtx(c);
        // Un participante (no encargado) no gestiona solicitudes ni ve el
        // directorio de empresas: solo le interesa su listado de reuniones.
        if (!c.esResponsable) { setTab("reuniones"); return; }
        return cargarEmpresas(c.empresaeventoId);
      })
      .catch(() => setError("No se pudo cargar las solicitudes."))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (ctx && !ctx.esResponsable) return;
    const tabSolicitada = searchParams.get("tab");
    if (tabSolicitada === "empresas" || tabSolicitada === "reuniones") setTab(tabSolicitada);
    // 'recibidas'/'enviadas' son destinos heredados de notificaciones viejas:
    // ahora ambas viven dentro de "Reuniones".
    else if (tabSolicitada === "recibidas" || tabSolicitada === "enviadas") setTab("reuniones");
    const nueva = searchParams.get("nueva");
    const rid = searchParams.get("receptoraId");
    const rnom = searchParams.get("receptoraNombre");
    if (nueva === "1" && rid && rnom) {
      setModalNueva({ id: Number(rid), nombre: decodeURIComponent(rnom) });
    }
  }, [searchParams, ctx]);

  // Solo se edita una solicitud que uno mismo envió (nunca una recibida), así
  // que la receptora siempre es sol.receptora.
  const handleEditarSolicitud = (sol: any) => {
    setModalNueva({ id: sol.receptoraEeId, nombre: sol.receptora?.nombre ?? "Empresa", solicitud: sol });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  const empresasFiltradas = empresas.filter((empresa) =>
    [empresa.nombre, empresa.rubro, empresa.ciudad, empresa.pais].some((valor) =>
      valor && String(valor).toLowerCase().includes(busquedaEmpresa.toLowerCase())
    )
  );

  return (
    <>
      {modalNueva && ctx && (
        <NuevaSolicitudModal ctx={ctx} receptoraId={modalNueva.id} receptoraNombre={modalNueva.nombre} solicitud={modalNueva.solicitud}
          onClose={() => setModalNueva(null)}
          onCreada={() => {
            setModalNueva(null);
            setTab("reuniones");
            // La lista de Reuniones ya puede estar montada: se le pide refrescar
            // de inmediato para que la solicitud editada cambie de día/posición.
            window.dispatchEvent(new CustomEvent("rueda:notificacion", { detail: { evento: "solicitud:actualizada" } }));
            setExitoMsg(modalNueva.solicitud ? "Tu solicitud fue actualizada correctamente." : "Tu solicitud de reunión fue enviada correctamente. Te avisaremos cuando la empresa responda.");
          }} />
      )}
      {exitoMsg && (
        <ModalExito titulo="¡Listo!" mensaje={exitoMsg} onClose={() => setExitoMsg(null)} />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Solicitudes y reuniones</h1>
            <p className="text-sm text-gray-400 mt-0.5">Agenda y gestiona tus reuniones con otras empresas.</p>
          </div>
        </div>

        {/* Tabs */}
        {esEncargado && (
          <div className="flex flex-wrap bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
            <button onClick={() => setTab("empresas")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                tab === "empresas" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <Building2 className="w-4 h-4" />Empresas ({empresas.length})
            </button>
            <button onClick={() => setTab("reuniones")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                tab === "reuniones" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <CalendarDays className="w-4 h-4" />Reuniones
            </button>
          </div>
        )}

        {!esEncargado || tab === "reuniones" ? (
          <ReunionesSection embedded onEditarSolicitud={handleEditarSolicitud} />
        ) : (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={busquedaEmpresa}
                onChange={(e) => setBusquedaEmpresa(e.target.value)}
                placeholder="Buscar empresa, rubro o ciudad..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#449D3A] focus:ring-2 focus:ring-[#449D3A]/20"
              />
            </div>
            {empresasFiltradas.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-400">
                No se encontraron empresas disponibles.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {empresasFiltradas.map((empresa) => (
                  <div key={empresa.empresaeventoId} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50">
                        <Building2 className="h-5 w-5 text-[#449D3A]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-gray-900">{empresa.nombre}</h3>
                        {empresa.rubro && <p className="mt-0.5 truncate text-xs text-gray-500">{empresa.rubro}</p>}
                        {(empresa.ciudad || empresa.pais) && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {[empresa.ciudad, paisConBandera(empresa.pais)].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setModalNueva({ id: empresa.empresaeventoId, nombre: empresa.nombre })}
                      className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#449D3A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#3a8531]"
                    >
                      Solicitar reunión
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function SolicitudesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" /></div>}>
      <SolicitudesContent />
    </Suspense>
  );
}
