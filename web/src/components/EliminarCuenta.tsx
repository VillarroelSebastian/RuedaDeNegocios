"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Trash2, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// Privacidad y baja de la cuenta, accesible desde el perfil de cada rol.
export default function EliminarCuenta() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [contrasenia, setContrasenia] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const eliminar = async () => {
    if (enviandoRef.current) return;
    if (!contrasenia) { setError("Escribe tu contraseña para confirmar."); return; }
    enviandoRef.current = true;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`${API}/cuenta/eliminar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contrasenia }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? "No se pudo eliminar la cuenta.");
      await import("@/lib/push").then((m) => m.desactivarPush()).catch(() => {});
      localStorage.removeItem("adminUser");
      localStorage.removeItem("tecnicoUser");
      localStorage.removeItem("empresaUser");
      router.push("/auth/login");
    } catch (e: any) {
      setError(e.message || "No se pudo eliminar la cuenta.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-1">
      <Link href="/privacidad" target="_blank" className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
        <ShieldCheck className="w-4 h-4" /> Política de privacidad
      </Link>
      <button onClick={() => { setContrasenia(""); setError(""); setAbierto(true); }}
        className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-red-700 hover:text-red-800 w-fit">
        <Trash2 className="w-4 h-4" /> Eliminar mi cuenta
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-extrabold text-gray-900">Eliminar mi cuenta</h3>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600">
              Dejarás de poder ingresar con esta cuenta y se desactivarán tus dispositivos de notificaciones. Los registros del
              evento en los que participaste (pagos, reuniones y resultados) se conservan para el historial del evento.
            </p>
            <label className="block text-xs font-bold text-gray-700">Tu contraseña para confirmar <span className="text-red-500">*</span></label>
            <input type="password" value={contrasenia} onChange={(e) => setContrasenia(e.target.value)} autoComplete="current-password"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAbierto(false)} disabled={enviando}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
              <button onClick={eliminar} disabled={enviando || !contrasenia}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {enviando ? "Eliminando…" : "Eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
