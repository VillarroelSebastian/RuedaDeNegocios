"use client";

import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import GaleriaEvento from "@/components/GaleriaEvento";
import { useModal } from "@/components/ui/Modal";

export default function TecnicoGaleriaPage() {
  const { showError, showSuccess, ModalComponent } = useModal();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem("tecnicoUser") || "null")); } catch { setUser(null); }
  }, []);
  return <div className="p-4 sm:p-6 max-w-6xl mx-auto">
    <ModalComponent />
    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-1"><Images className="w-6 h-6 text-[#449D3A]" /> Fotos del evento</h1>
    <p className="text-sm text-gray-500 mb-6">Sube fotografías del evento; serán las que se muestran en el landing.</p>
    <GaleriaEvento usuarioId={user?.id} autorNombre={`${user?.nombres || "Técnico"} ${user?.apellidoPaterno || ""}`.trim()} puedeSubir esStaff
      onError={(m) => showError("No se pudo completar", m)} onOk={(t,m) => showSuccess(t,m)} />
  </div>;
}
