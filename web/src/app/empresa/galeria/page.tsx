"use client";

import React, { useEffect, useState } from "react";
import { Images } from "lucide-react";
import GaleriaEvento from "@/components/GaleriaEvento";
import { useModal } from "@/components/ui/Modal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function EmpresaGaleriaPage() {
  const { showError, showSuccess, ModalComponent } = useModal();
  const [ctx, setCtx] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { setCargando(false); return; }
    const user = JSON.parse(raw);
    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCtx(d))
      .catch(() => showError("Sin conexión", "No se pudo cargar tu información."))
      .finally(() => setCargando(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Solo las empresas habilitadas alimentan el repositorio; el resto solo mira.
  const habilitado = ctx?.estadoAcceso === "HABILITADO";
  const nombre = ctx?.usuario
    ? `${ctx.usuario.nombres} ${ctx.usuario.apellidoPaterno}`.trim()
    : "Participante";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <ModalComponent />
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Images className="w-6 h-6 text-[#449D3A]" /> Galería del evento
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fotos compartidas por los participantes. Sube las tuyas y sé parte del recuerdo.
        </p>
      </div>

      {!cargando && ctx && !habilitado && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Podrás subir fotos cuando tu empresa esté habilitada. Mientras tanto puedes ver las de todos.
        </div>
      )}

      <GaleriaEvento
        empresaUsuarioId={ctx?.empresaUsuarioId ?? null}
        autorNombre={nombre}
        puedeSubir={habilitado}
        onError={(m) => showError("No se pudo completar", m)}
        onOk={(t, m) => showSuccess(t, m)}
      />
    </div>
  );
}
