"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Calendar, MapPin, Monitor, Table2,
  CheckCircle2, Clock, AlertCircle, Star, ArrowRight,
} from "lucide-react";

const API = "http://localhost:3334";

function formatDT(dt: string) {
  return new Date(dt).toLocaleString("es-BO", {
    weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

function estadoBadge(estado: string) {
  const map: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
    PROGRAMADA: { cls: "bg-blue-100 text-blue-700",   Icon: Clock, label: "Programada" },
    EN_CURSO:   { cls: "bg-green-100 text-green-700", Icon: Users, label: "En curso" },
    FINALIZADA: { cls: "bg-gray-100 text-gray-600",   Icon: CheckCircle2, label: "Finalizada" },
    CANCELADA:  { cls: "bg-red-100 text-red-600",     Icon: AlertCircle, label: "Cancelada" },
  };
  const { cls, Icon, label } = map[estado] ?? map.PROGRAMADA;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function ReunionesPage() {
  const router = useRouter();
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eeId, setEeId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "proximas" | "finalizadas">("todas");

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        setEeId(ctx.empresaeventoId);
        return fetch(`${API}/empresa/reuniones?eeId=${ctx.empresaeventoId}`);
      })
      .then((r) => r.json())
      .then((data) => setReuniones(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudo cargar las reuniones."))
      .finally(() => setLoading(false));
  }, [router]);

  const ahora = new Date();
  const filtradas = reuniones.filter((r) => {
    if (filtro === "proximas") return new Date(r.fin) > ahora && r.estado !== "CANCELADA";
    if (filtro === "finalizadas") return r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mis reuniones</h1>
          <p className="text-sm text-gray-400 mt-0.5">{reuniones.length} reuniones confirmadas</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["todas", "proximas", "finalizadas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                filtro === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "todas" ? "Todas" : f === "proximas" ? "Próximas" : "Finalizadas"}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-4">
            {filtro === "proximas" ? "No tienes reuniones próximas." :
             filtro === "finalizadas" ? "No tienes reuniones finalizadas." :
             "No tienes reuniones confirmadas aún."}
          </p>
          <Link href="/empresa/empresas" className="text-sm text-[#449D3A] font-bold hover:underline">
            Ver empresas y solicitar reunión →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map((r: any) => {
            const esFinalizada = r.estado === "FINALIZADA" || new Date(r.fin) <= ahora;
            const yaEvaluo = r.miResultado !== null;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {estadoBadge(r.estado)}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.tipo === "PRESENCIAL" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        }`}>
                          {r.tipo === "PRESENCIAL" ? <><MapPin className="w-3 h-3 inline mr-1" />Presencial</> : <><Monitor className="w-3 h-3 inline mr-1" />Virtual</>}
                        </span>
                        {r.mesa && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Table2 className="w-3 h-3" />
                            Mesa {r.mesa.numeroMesa}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-gray-900 text-sm mb-1">
                        Con: {r.contraparte?.nombre ?? "Empresa"}
                      </p>
                      {r.contraparte?.rubro && (
                        <p className="text-xs text-gray-500 mb-2">{r.contraparte.rubro}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDT(r.inicio)}
                        </span>
                        {r.enlace && (
                          <a href={r.enlace} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#449D3A] font-bold hover:underline">
                            <Monitor className="w-3.5 h-3.5" />
                            Unirse
                          </a>
                        )}
                      </div>
                    </div>

                    {esFinalizada && (
                      <div className="shrink-0">
                        {yaEvaluo ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-xl">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Evaluada: {r.miResultado.calificacionReunion}/5
                          </div>
                        ) : (
                          <Link
                            href={`/empresa/resultados?reunionId=${r.id}`}
                            className="flex items-center gap-1.5 text-xs text-white font-bold bg-[#449D3A] hover:bg-[#3a8531] px-3 py-2 rounded-xl transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Evaluar reunión
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {yaEvaluo && r.miResultado && (
                  <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                    <p className="text-xs text-gray-400 font-medium">
                      Acuerdo registrado: <span className="font-bold text-gray-700">{r.miResultado.rangoAcuerdoComercial}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
