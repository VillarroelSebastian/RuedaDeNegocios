"use client";

import React, { useState } from "react";
import { Building2, Users } from "lucide-react";
import StaffMensajes from "@/components/StaffMensajes";
import ChatInterno from "@/components/ChatInterno";

// Unifica "Mensajes" (empresa <-> staff) y "Equipo del evento" (chat interno
// admin <-> técnicos): son dos canales distintos, pero no tenía sentido que
// vivieran en secciones separadas del menú.
export default function AdminMensajesPage() {
  const [tab, setTab] = useState<"empresas" | "equipo">("empresas");

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-4 sm:px-6 pt-4">
        <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setTab("empresas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "empresas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Building2 className="w-4 h-4" /> Empresas
          </button>
          <button
            onClick={() => setTab("equipo")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "equipo" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" /> Equipo del evento
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {tab === "empresas" ? <StaffMensajes storageKey="adminUser" embedded /> : <ChatInterno storageKey="adminUser" embedded />}
      </div>
    </div>
  );
}
