"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, CheckCircle2, AlertCircle, Calendar, Building2 } from "lucide-react";

const API = "http://localhost:3334";

const RANGOS = [
  "Sin acuerdo",
  "Hasta $us 5.000",
  "Hasta $us 10.000",
  "Hasta $us 25.000",
  "Hasta $us 50.000",
  "Hasta $us 100.000",
  "Más de $us 100.000",
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              n <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDT(dt: string) {
  return new Date(dt).toLocaleDateString("es-BO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ResultadosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ctx, setCtx] = useState<any>(null);
  const [reuniones, setReuniones] = useState<any[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de nuevo resultado
  const [formulario, setFormulario] = useState<{
    reunionId: number | null;
    calificacion: number;
    rango: string;
    observaciones: string;
  }>({ reunionId: null, calificacion: 0, rango: "", observaciones: "" });
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [errForm, setErrForm] = useState<string | null>(null);

  const cargar = (eeId: number) =>
    Promise.all([
      fetch(`${API}/empresa/reuniones?eeId=${eeId}`).then((r) => r.json()),
      fetch(`${API}/empresa/resultados?eeId=${eeId}`).then((r) => r.json()),
    ]).then(([reu, res]) => {
      setReuniones(Array.isArray(reu) ? reu : []);
      setResultados(Array.isArray(res) ? res : []);
    });

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => { setCtx(c); return cargar(c.empresaeventoId); })
      .catch(() => setError("No se pudo cargar los datos."))
      .finally(() => setLoading(false));
  }, [router]);

  // Pre-seleccionar reunión si viene desde reuniones page
  useEffect(() => {
    const rid = searchParams.get("reunionId");
    if (rid) setFormulario((f) => ({ ...f, reunionId: Number(rid) }));
  }, [searchParams]);

  // Reuniones finalizadas que aún no evalué
  const ahora = new Date();
  const pendientesEvaluar = reuniones.filter((r) => {
    const fin = new Date(r.fin);
    return (r.estado === "FINALIZADA" || fin <= ahora) && r.miResultado === null;
  });
  const yaEvaluadas = reuniones.filter((r) => r.miResultado !== null);

  const handleGuardar = async () => {
    setErrForm(null); setExito(null);
    if (!formulario.reunionId) { setErrForm("Selecciona una reunión."); return; }
    if (formulario.calificacion === 0) { setErrForm("Selecciona una calificación (1-5 estrellas)."); return; }
    if (!formulario.rango) { setErrForm("Selecciona el rango de acuerdo comercial."); return; }

    setGuardando(true);
    try {
      const res = await fetch(`${API}/empresa/resultados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eeId: ctx.empresaeventoId,
          euId: ctx.empresaUsuarioId,
          reunionId: formulario.reunionId,
          calificacion: formulario.calificacion,
          rango: formulario.rango,
          observaciones: formulario.observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al guardar");
      setExito("Resultado registrado correctamente.");
      setFormulario({ reunionId: null, calificacion: 0, rango: "", observaciones: "" });
      await cargar(ctx.empresaeventoId);
    } catch (e: any) { setErrForm(e.message); }
    finally { setGuardando(false); }
  };

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

  const reunionSeleccionada = reuniones.find((r) => r.id === formulario.reunionId);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Resultados de reuniones</h1>

      {/* Formulario */}
      {pendientesEvaluar.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-gray-900">Registrar resultado</h2>

          {exito && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {exito}
            </div>
          )}

          {/* Selección de reunión */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
              Reunión a evaluar
            </label>
            <div className="space-y-2">
              {pendientesEvaluar.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setFormulario((f) => ({ ...f, reunionId: r.id }))}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                    formulario.reunionId === r.id
                      ? "border-[#449D3A] bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-bold text-gray-900">{r.contraparte?.nombre ?? "Empresa"}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {formatDT(r.inicio)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {formulario.reunionId && (
            <>
              {/* Calificación */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                  Calificación de la reunión
                </label>
                <StarRating
                  value={formulario.calificacion}
                  onChange={(v) => setFormulario((f) => ({ ...f, calificacion: v }))}
                />
                {formulario.calificacion > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    {["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"][formulario.calificacion]}
                  </p>
                )}
              </div>

              {/* Rango de acuerdo */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Rango de acuerdo comercial
                </label>
                <div className="flex flex-wrap gap-2">
                  {RANGOS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setFormulario((f) => ({ ...f, rango: r }))}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        formulario.rango === r
                          ? "border-[#449D3A] bg-green-50 text-[#449D3A]"
                          : "border-gray-200 text-gray-600 hover:border-green-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                  Puntos tratados / Observaciones
                </label>
                <textarea
                  value={formulario.observaciones}
                  onChange={(e) => setFormulario((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Describe brevemente los temas discutidos y los compromisos alcanzados..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none"
                />
              </div>

              {errForm && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errForm}
                </div>
              )}

              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full py-3 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
                Guardar resultado
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-2">Registrar resultado</h2>
          <p className="text-sm text-gray-400">
            {reuniones.length === 0
              ? "No tienes reuniones confirmadas aún."
              : yaEvaluadas.length === 0
                ? "Aún no tienes reuniones finalizadas para evaluar. Podrás registrar el resultado cuando una reunión termine."
                : "Has evaluado todas tus reuniones finalizadas."}
          </p>
        </div>
      )}

      {/* Historial */}
      {yaEvaluadas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="font-bold text-gray-900">Mis evaluaciones</h2>
            <span className="ml-auto text-xs text-gray-400">{yaEvaluadas.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {yaEvaluadas.map((r: any) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{r.contraparte?.nombre ?? "Empresa"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDT(r.inicio)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= r.miResultado.calificacionReunion ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.miResultado.rangoAcuerdoComercial}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResultadosContent />
    </Suspense>
  );
}
