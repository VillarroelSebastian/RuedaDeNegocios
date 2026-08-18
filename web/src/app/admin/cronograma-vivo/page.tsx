"use client";

import React, { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import CronogramaVivo from "@/components/CronogramaVivo";
import { useModal } from "@/components/ui/Modal";
import ActividadesPage from "../actividades/page";

export default function AdminCronogramaVivoPage() {
  const { showError, ModalComponent } = useModal();
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  useEffect(() => { try { setUsuarioId(JSON.parse(localStorage.getItem('adminUser') || 'null')?.id ?? null); } catch {} }, []);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <ModalComponent />
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-600" /> Cronograma en vivo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Marca qué actividad está ocurriendo ahora. Los participantes lo ven al instante
          desde la web y la app.
        </p>
      </div>
      <CronogramaVivo staff usuarioId={usuarioId} onError={(m) => showError("No se pudo actualizar", m)} />
      <div className="mt-10 border-t border-gray-200 pt-8">
        <ActividadesPage />
      </div>
    </div>
  );
}
