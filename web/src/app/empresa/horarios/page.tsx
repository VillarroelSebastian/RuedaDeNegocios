"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Info, RotateCcw, Plus, Trash2, CheckCircle2, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

interface Rango { desde: string; hasta: string }

function rangoEvento(evento?: any): Rango {
  const hora = (iso?: string) => iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "America/La_Paz", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  return { desde: hora(evento?.fechaInicioReuniones || evento?.fechaInicioEvento), hasta: hora(evento?.fechaFinReuniones || evento?.fechaFinEvento) };
}

export default function HorariosPage() {
  const router = useRouter();
  const [eeId, setEeId] = useState<number | null>(null);
  const [rangos, setRangos] = useState<Rango[]>([{ desde: "", hasta: "" }]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const [modal, setModal] = useState<{ tipo: "ok" | "err" | "confirm"; msg: string; onOk?: () => void } | null>(null);

  const cargarRangos = useCallback((id: number, evento?: any) => {
    fetch(`${API}/empresa/horarios-empresa/rangos?eeId=${id}`)
      .then((r) => r.json())
      .then((rs) => {
        if (Array.isArray(rs) && rs.length > 0) {
          setRangos(rs.map((r: any) => ({ desde: r.desde_hora, hasta: r.hasta_hora })));
        } else {
          setRangos([rangoEvento(evento)]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        if (!ctx?.esResponsable) { router.replace("/empresa/reuniones"); return; }
        setEeId(ctx.empresaeventoId);
        cargarRangos(ctx.empresaeventoId, ctx.evento);
      })
      .catch(() => setLoading(false));
  }, [router, cargarRangos]);

  const rangosValidos = rangos.filter((r) => r.desde && r.hasta && r.desde < r.hasta);

  const handleAplicar = async () => {
    if (!eeId) return;
    if (rangos.some((r) => r.desde && r.hasta && r.desde >= r.hasta)) {
      setModal({ tipo: "err", msg: "Verifica los rangos: la hora de inicio debe ser menor a la de fin." });
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/empresa/horarios-empresa/rangos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, rangos: rangosValidos.map((r) => ({ desde: r.desde, hasta: r.hasta })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudieron guardar los horarios.");
      if (Array.isArray(data.rangos)) setRangos(data.rangos);
      setModal({ tipo: data.huboChoque ? "err" : "ok", msg: data.mensaje });
    } catch {
      setModal({ tipo: "err", msg: "Error al guardar los horarios. Inténtalo de nuevo." });
    } finally {
      setGuardando(false);
    }
  };

  const handleResetear = () => {
    setModal({
      tipo: "confirm",
      msg: "¿Poner todos los horarios como disponibles? Se eliminarán todos los rangos configurados.",
      onOk: async () => {
        setModal(null);
        if (!eeId) return;
        setReseteando(true);
        try {
          const res = await fetch(`${API}/empresa/horarios-empresa/rangos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eeId, rangos: [] }),
          });
          if (!res.ok) throw new Error();
          // Recargar el estado real del backend para reflejar que quedó todo disponible.
          cargarRangos(eeId);
          setModal({ tipo: "ok", msg: "Listo: ahora estás disponible todo el día (sin restricciones de horario)." });
        } catch {
          setModal({ tipo: "err", msg: "Error al restablecer." });
        } finally {
          setReseteando(false);
        }
      },
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-xl space-y-5">
      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <p className={`text-sm font-semibold text-center ${modal.tipo === "err" ? "text-red-600" : "text-gray-800"}`}>
              {modal.msg}
            </p>
            <div className="flex gap-3 justify-center">
              {modal.tipo === "confirm" && (
                <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">
                  Cancelar
                </button>
              )}
              <button
                onClick={() => { if (modal.onOk) modal.onOk(); else setModal(null); }}
                className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white ${modal.tipo === "err" ? "bg-red-500" : "bg-[#449D3A]"}`}
              >
                {modal.tipo === "confirm" ? "Confirmar" : "Aceptar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Mis horarios disponibles</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Define en qué franjas horarias estás disponible para reuniones.
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Por defecto <strong>estás disponible durante todo el evento</strong>. Si tienes restricciones de horario,
          define tus rangos de disponibilidad. Puedes agregar múltiples rangos — por ejemplo, mañana (09:00–12:00)
          y tarde (14:00–18:00).
        </p>
      </div>

      {/* Rangos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="font-bold text-gray-800">Rangos de disponibilidad</h2>

        <div className="space-y-3">
          {rangos.map((rango, i) => {
            const invalido = !!(rango.desde && rango.hasta && rango.desde >= rango.hasta);
            return (
              <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-xs text-gray-500 font-medium w-12 shrink-0">Desde</span>
                <input
                  type="time"
                  value={rango.desde}
                  onChange={(e) => setRangos((prev) => prev.map((r, idx) => idx === i ? { ...r, desde: e.target.value } : r))}
                  className={`flex-1 min-w-0 border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#449D3A] ${invalido ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                <span className="text-xs text-gray-500 font-medium shrink-0">hasta</span>
                <input
                  type="time"
                  value={rango.hasta}
                  onChange={(e) => setRangos((prev) => prev.map((r, idx) => idx === i ? { ...r, hasta: e.target.value } : r))}
                  className={`flex-1 min-w-0 border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#449D3A] ${invalido ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                />
                {rangos.length > 1 && (
                  <button
                    onClick={() => setRangos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setRangos((prev) => [...prev, { desde: "", hasta: "" }])}
          className="flex items-center gap-2 text-sm text-[#449D3A] font-semibold hover:underline"
        >
          <Plus className="w-4 h-4" /> Agregar otro rango
        </button>

        {/* Resumen actual */}
        {rangosValidos.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs font-bold text-green-800 mb-1">Disponibilidad configurada:</p>
            {rangosValidos.map((r, i) => (
              <p key={i} className="text-xs text-green-700 font-mono">• {r.desde} – {r.hasta}</p>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleAplicar}
            disabled={guardando || reseteando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#449D3A] text-white text-sm font-bold hover:bg-[#3a8530] disabled:opacity-50"
          >
            {guardando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar horarios
          </button>
          <button
            onClick={handleResetear}
            disabled={guardando || reseteando}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <RotateCcw className={`w-4 h-4 ${reseteando ? "animate-spin" : ""}`} />
            Disponible todo el día
          </button>
        </div>
      </div>
    </div>
  );
}
