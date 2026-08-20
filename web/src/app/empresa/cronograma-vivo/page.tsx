"use client";

import React, { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import CronogramaVivo from "@/components/CronogramaVivo";

export default function EmpresaCronogramaVivoPage() {
  const [eeId, setEeId] = useState<number | null>(null);
  useEffect(() => {
    let usuarioId: number | null = null;
    try { usuarioId = JSON.parse(localStorage.getItem('empresaUser') || 'null')?.id ?? null; } catch {}
    if (!usuarioId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334'}/empresa/mi-empresa?usuarioId=${usuarioId}`)
      .then((r) => r.json()).then((ctx) => setEeId(ctx?.empresaeventoId ?? null)).catch(() => {});
  }, []);
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-600" /> Cronograma en vivo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Sigue el programa del evento minuto a minuto. Se actualiza solo.
        </p>
      </div>
      {/* Solo lectura: el staff es quien mueve los estados. */}
      <CronogramaVivo eeId={eeId} />
    </div>
  );
}
