"use client";

import React, { useEffect, useState, useRef } from "react";
import { Package, Check, Users, Armchair, Star, Globe, X as XIcon, TrendingUp, AlertCircle, Upload, FileText, Clock } from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type MiPaquete = {
  paqueteId: number | null;
  paqueteNombre: string | null;
  paqueteCosto: number | null;
  beneficios: string[];
  maxParticipantes: number;
  credencialesIncluidas: number;
  nivelMesa: "NORMAL" | "PREFERENCIAL" | "VIP";
  apareceEnCatalogo: boolean;
  logoEnWeb: boolean;
  destacadoEnListados: boolean;
  participantesUsados: number;
  participantesDisponibles: number;
};

type Mejora = {
  id: number; nombre: string; costo: number; credencialesIncluidas: number;
  maxParticipantes: number; nivelMesa: string; costoMejora: number; urlQRMejora: string;
  beneficios: string[];
};

const ETIQUETA_MESA: Record<string, string> = {
  NORMAL: "Mesa estándar",
  PREFERENCIAL: "Mesa preferencial",
  VIP: "Mesa VIP",
};

function MejorarPaqueteModal({ eeId, euEncargadoId, mejoras, onClose, onOk }: {
  eeId: number; euEncargadoId: number; mejoras: Mejora[]; onClose: () => void; onOk: (msg: string) => void;
}) {
  const [seleccionado, setSeleccionado] = useState<Mejora | null>(mejoras.length === 1 ? mejoras[0] : null);
  const [urlComprobante, setUrlComprobante] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr("El archivo no debe superar 5 MB."); return; }
    setUploading(true); setErr(null); setPreviewUrl(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/public/imagenes/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!data.url) throw new Error("No se obtuvo URL del archivo");
      setUrlComprobante(data.url);
      setPreviewUrl(data.url);
    } catch (e: any) {
      setErr(e.message || "Error al subir el comprobante");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    if (enviandoRef.current) return;
    setErr(null);
    if (!seleccionado) { setErr("Selecciona el paquete al que quieres mejorar"); return; }
    if (!urlComprobante.trim()) { setErr("Debes subir el comprobante de pago"); return; }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/empresa/mi-paquete/mejorar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, euEncargadoId, paqueteId: seleccionado.id, urlComprobante }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      onOk("Solicitud de mejora de paquete enviada. Pendiente de aprobación por el administrador.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const isPdf = previewUrl && (previewUrl.includes(".pdf") || previewUrl.includes("/raw/upload/"));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#449D3A]" /> Mejorar paquete
        </h3>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Elige el nuevo paquete</label>
          <div className="space-y-2">
            {mejoras.map((m) => (
              <button
                key={m.id}
                onClick={() => setSeleccionado(m)}
                className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
                  seleccionado?.id === m.id ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-bold text-gray-900 text-sm">{m.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.credencialesIncluidas} credenciales · {ETIQUETA_MESA[m.nivelMesa] ?? m.nivelMesa}
                </p>
                <p className="text-sm font-extrabold text-[#449D3A] mt-1">Costo de mejora: Bs {m.costoMejora.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {seleccionado && (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Comprobante de pago *</label>
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-center">
              <p className="text-xs font-bold text-green-800 mb-2">QR de pago · Bs {seleccionado.costoMejora.toFixed(2)}</p>
              <ImagenLightbox src={seleccionado.urlQRMejora} alt="QR de mejora de paquete" className="mx-auto h-48 w-full" />
              <p className="mt-1 text-[11px] text-green-700">Toca la imagen para verla completa.</p>
            </div>

            {previewUrl && (
              <div className="mb-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-40 flex items-center justify-center">
                {isPdf ? (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <FileText className="w-10 h-10 text-[#449D3A]" />
                    <p className="text-xs font-semibold">Archivo PDF adjunto</p>
                  </div>
                ) : (
                  <ImagenLightbox src={previewUrl} alt="Comprobante" className="w-full h-full" />
                )}
              </div>
            )}

            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${uploading ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-[#449D3A] hover:bg-green-50"}`}>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
              <Upload className={`w-6 h-6 mb-1.5 ${uploading ? "text-[#449D3A] animate-bounce" : "text-gray-400"}`} />
              <p className={`text-sm font-semibold ${uploading ? "text-[#449D3A]" : "text-gray-600"}`}>
                {uploading ? "Subiendo..." : previewUrl ? "Reemplazar comprobante" : "Subir comprobante"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Imagen o PDF — Máx. 5 MB</p>
            </label>
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={enviando || uploading || !urlComprobante || !seleccionado} className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
            {enviando ? "Enviando..." : "Solicitar mejora"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiPaquetePage() {
  const [datos, setDatos] = useState<MiPaquete | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ctx, setCtx] = useState<any>(null);
  const [mejoras, setMejoras] = useState<Mejora[]>([]);
  const [tieneSolicitudPendiente, setTieneSolicitudPendiente] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);

  const cargar = () => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { setCargando(false); return; }
    const user = JSON.parse(raw);
    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (c) => {
        setCtx(c);
        if (!c?.empresaeventoId) return null;
        const [p, m] = await Promise.all([
          fetch(`${API}/empresa/mi-paquete?eeId=${c.empresaeventoId}`).then((r) => (r.ok ? r.json() : null)),
          c.esResponsable
            ? fetch(`${API}/empresa/mi-paquete/mejoras?eeId=${c.empresaeventoId}`).then((r) => (r.ok ? r.json() : null))
            : null,
        ]);
        setDatos(p);
        if (m) {
          setMejoras(m.mejoras ?? []);
          setTieneSolicitudPendiente(!!m.tieneSolicitudPendiente);
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <p className="p-6 text-center text-gray-400">Cargando tu paquete…</p>;

  if (!datos) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-16">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">No pudimos cargar tu paquete</p>
        <p className="text-sm text-gray-400 mt-1">Vuelve a intentarlo en unos momentos.</p>
      </div>
    );
  }

  // Las empresas inscritas antes de que existieran los paquetes no tienen uno.
  const sinPaquete = !datos.paqueteId;

  const capacidades = [
    { ok: true, Icon: Users, texto: `${datos.credencialesIncluidas} credenciales incluidas (hasta ${datos.maxParticipantes} personas)` },
    { ok: datos.nivelMesa !== "NORMAL", Icon: Armchair, texto: ETIQUETA_MESA[datos.nivelMesa] },
    { ok: datos.apareceEnCatalogo, Icon: Globe, texto: "Visible en el catálogo de participantes" },
    { ok: datos.destacadoEnListados, Icon: Star, texto: "Destacada en los listados" },
    { ok: datos.logoEnWeb, Icon: Globe, texto: "Logo en la web del evento" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {modalAbierto && ctx?.empresaeventoId && (
        <MejorarPaqueteModal
          eeId={ctx.empresaeventoId}
          euEncargadoId={ctx.empresaUsuarioId}
          mejoras={mejoras}
          onClose={() => setModalAbierto(false)}
          onOk={(msg) => { setModalAbierto(false); setMensajeOk(msg); cargar(); }}
        />
      )}

      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#449D3A]" /> Mi paquete
          </h1>
          <p className="text-sm text-gray-500 mt-1">Lo que tu inscripción te habilita en el evento.</p>
        </div>
        {!sinPaquete && mejoras.length > 0 && (
          <button
            onClick={() => setModalAbierto(true)}
            disabled={tieneSolicitudPendiente}
            className="inline-flex items-center gap-2 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" /> Mejorar paquete
          </button>
        )}
      </div>

      {mensajeOk && (
        <div role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {mensajeOk}
        </div>
      )}

      {tieneSolicitudPendiente && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <Clock className="w-4 h-4 shrink-0" /> Ya tienes una solicitud de mejora de paquete pendiente de revisión por el administrador.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {sinPaquete ? (
          <p className="text-gray-600">
            Tu empresa se inscribió con la tarifa general del evento, sin paquete asignado.
          </p>
        ) : (
          <>
            <p className="text-xs font-bold text-[#449D3A] uppercase tracking-wide">Paquete contratado</p>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{datos.paqueteNombre}</h2>
            <p className="text-lg font-bold text-gray-500">Bs. {datos.paqueteCosto}</p>
          </>
        )}

        {/* Uso de credenciales */}
        <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Participantes registrados</span>
            <span className="font-extrabold text-gray-900">
              {datos.participantesUsados} / {datos.maxParticipantes}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-[#449D3A] transition-all"
              style={{ width: `${Math.min(100, (datos.participantesUsados / Math.max(1, datos.maxParticipantes)) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {datos.participantesDisponibles > 0
              ? `Puedes registrar ${datos.participantesDisponibles} persona(s) más.`
              : "Alcanzaste el máximo de tu paquete."}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">
            Qué incluye en la plataforma
          </p>
          <ul className="space-y-2">
            {capacidades.map(({ ok, Icon, texto }) => (
              <li key={texto} className={`flex items-center gap-2.5 text-sm ${ok ? "text-gray-800" : "text-gray-400"}`}>
                {ok
                  ? <Check className="w-4 h-4 text-[#449D3A] flex-shrink-0" strokeWidth={3} />
                  : <XIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                <Icon className={`w-4 h-4 flex-shrink-0 ${ok ? "text-gray-500" : "text-gray-300"}`} />
                <span className={ok ? "" : "line-through"}>{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {datos.beneficios.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">
              Beneficios de difusión
            </p>
            {/* Se entregan fuera de la plataforma; aquí solo se listan. */}
            <ul className="space-y-1.5">
              {datos.beneficios.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-[#449D3A] flex-shrink-0 mt-1" strokeWidth={3} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-400 mt-3">
              La organización coordina contigo la entrega de estos beneficios.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
