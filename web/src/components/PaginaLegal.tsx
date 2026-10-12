"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export type ContactoEvento = { nombre: string; correo: string; telefono: string };

// Datos de contacto del evento principal (configurables por el administrador).
export function useContactoEvento(): ContactoEvento {
  const [contacto, setContacto] = useState<ContactoEvento>({ nombre: "Rueda de Negocios del Beni", correo: "", telefono: "" });
  useEffect(() => {
    fetch(`${API}/public/evento`)
      .then((r) => (r.ok ? r.json() : null))
      .then((e) => {
        if (e) setContacto({ nombre: e.nombre || "Rueda de Negocios del Beni", correo: e.correoContacto || "", telefono: e.telefonoContacto || "" });
      })
      .catch(() => {});
  }, []);
  return contacto;
}

// Estructura común de las páginas públicas de texto legal (privacidad y baja de cuenta).
export default function PaginaLegal({ titulo, actualizado, children }: { titulo: string; actualizado: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
        <Link href="/" className="text-sm font-semibold text-[#449D3A] hover:underline">← Volver al inicio</Link>
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900">{titulo}</h1>
        <p className="mt-1 text-sm text-gray-500">Última actualización: {actualizado}</p>
        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-gray-700 [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </main>
  );
}
