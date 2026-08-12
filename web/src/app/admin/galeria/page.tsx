"use client";

import React from "react";
import { Images } from "lucide-react";
import GaleriaEvento from "@/components/GaleriaEvento";
import { useModal } from "@/components/ui/Modal";

export default function AdminGaleriaPage() {
  const { showError, showSuccess, ModalComponent } = useModal();

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <ModalComponent />
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Images className="w-6 h-6 text-[#449D3A]" /> Galería del evento
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fotos subidas por los participantes. Como administrador puedes retirar
          cualquier imagen que no corresponda.
        </p>
      </div>
      {/* esStaff habilita moderar: borrar fotos de cualquier participante. */}
      <GaleriaEvento
        esStaff
        onError={(m) => showError("No se pudo completar", m)}
        onOk={(t, m) => showSuccess(t, m)}
      />
    </div>
  );
}
