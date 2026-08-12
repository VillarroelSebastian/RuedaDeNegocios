"use client";

import React from "react";
import { Radio } from "lucide-react";
import CronogramaVivo from "@/components/CronogramaVivo";
import { useModal } from "@/components/ui/Modal";

export default function TecnicoCronogramaVivoPage() {
  const { showError, ModalComponent } = useModal();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <ModalComponent />
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-600" /> Cronograma en vivo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Actualiza en tiempo real qué está pasando en el evento.
        </p>
      </div>
      <CronogramaVivo staff onError={(m) => showError("No se pudo actualizar", m)} />
    </div>
  );
}
