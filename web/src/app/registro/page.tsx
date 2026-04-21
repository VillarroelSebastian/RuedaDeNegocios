"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2, Users, CreditCard, CheckCircle2,
  ChevronRight, ChevronLeft, Plus, Trash2,
  Upload, QrCode, User,
  AlertCircle, X, Check,
} from "lucide-react";

const API = "http://localhost:3334";
const MAX_PARTICIPANTES = 5;

const RUBROS = [
  "Agropecuario y Ganadería",
  "Comercio y Distribución",
  "Construcción e Infraestructura",
  "Educación y Capacitación",
  "Finanzas y Seguros",
  "Gastronomía y Turismo",
  "Industria y Manufactura",
  "Minería e Hidrocarburos",
  "Salud y Bienestar",
  "Servicios Profesionales",
  "Tecnología e Innovación",
  "Transporte y Logística",
  "Artesanía y Cultura",
  "Medio Ambiente y Energía",
  "Inmobiliario",
  "Otro",
];

const SOUTH_AMERICA: Record<string, string[]> = {
  "Bolivia":   ["Trinidad","La Paz","Santa Cruz de la Sierra","Cochabamba","Sucre","Oruro","Potosí","Tarija","Cobija","Riberalta","Guayaramerín"],
  "Argentina": ["Buenos Aires","Córdoba","Rosario","Mendoza","Tucumán","La Plata","Mar del Plata","Salta","Santa Fe","San Juan"],
  "Brasil":    ["São Paulo","Río de Janeiro","Brasilia","Salvador","Fortaleza","Manaus","Curitiba","Recife","Porto Alegre","Belo Horizonte"],
  "Chile":     ["Santiago","Valparaíso","Concepción","Antofagasta","Viña del Mar","Temuco","Rancagua","Talca"],
  "Colombia":  ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira"],
  "Ecuador":   ["Quito","Guayaquil","Cuenca","Manta","Ambato","Portoviejo","Machala"],
  "Paraguay":  ["Asunción","Ciudad del Este","Encarnación","Luque","San Lorenzo"],
  "Perú":      ["Lima","Arequipa","Trujillo","Cusco","Piura","Chiclayo","Iquitos"],
  "Uruguay":   ["Montevideo","Salto","Paysandú","Las Piedras","Rivera"],
  "Venezuela": ["Caracas","Maracaibo","Valencia","Barquisimeto","Maracay"],
};

/* ─── Modal ──────────────────────────────────────────────────── */
function Modal({ open, type, title, message, onClose, onConfirm }: any) {
  if (!open) return null;
  const colors: any = {
    error:   { bg: "bg-red-50",    icon: "text-red-500",    btn: "bg-red-600 hover:bg-red-700" },
    warning: { bg: "bg-amber-50",  icon: "text-amber-500",  btn: "bg-amber-600 hover:bg-amber-700" },
    success: { bg: "bg-green-50",  icon: "text-green-500",  btn: "bg-[#449D3A] hover:bg-[#367d2e]" },
    confirm: { bg: "bg-amber-50",  icon: "text-amber-500",  btn: "bg-[#449D3A] hover:bg-[#367d2e]" },
  };
  const c = colors[type] || colors.error;
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className={`w-12 h-12 ${c.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          {onConfirm && (
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          )}
          <button onClick={onConfirm ?? onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white ${c.btn}`}>
            {onConfirm ? "Confirmar" : "Entendido"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lightbox ───────────────────────────────────────────────── */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 z-10"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={url}
        alt="Vista previa"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ─── Steps indicator ────────────────────────────────────────── */
const STEPS = [
  { label: "Información",   Icon: Building2 },
  { label: "Pago",          Icon: CreditCard },
  { label: "Participantes", Icon: Users },
  { label: "Confirmación",  Icon: CheckCircle2 },
];

function StepBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${done ? "bg-[#449D3A] text-white" : active ? "bg-[#449D3A] text-white ring-4 ring-green-100" : "bg-gray-100 text-gray-400"}`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block ${active ? "text-[#449D3A]" : done ? "text-green-700" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-gray-200 relative overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 bg-[#449D3A] transition-all ${done ? "w-full" : "w-0"}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
        <span>Progreso del Registro</span>
        <span className="font-bold text-[#449D3A]">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#449D3A] to-green-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Field components ───────────────────────────────────────── */
function Field({ label, required, children }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] bg-white placeholder:text-gray-400";

/* ════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function RegistroPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [evento, setEvento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  // Modal
  const [modal, setModal] = useState({ open: false, type: "error", title: "", message: "", onConfirm: undefined as any });
  const showModal = (type: string, title: string, message: string, onConfirm?: () => void) =>
    setModal({ open: true, type, title, message, onConfirm });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  // Step 1
  const [empresa, setEmpresa] = useState({
    nombre: "", rubro: "", pais: "", ciudad: "", sitioWeb: "",
    correoCorporativo: "", telefonoWhatsapp: "", descripcion: "",
  });
  const [participacion, setParticipacion] = useState({
    numeroParticipantes: 1, tipoParticipacion: "PRESENCIAL",
  });

  // Step 2
  const [urlComprobante, setUrlComprobante] = useState("");
  const [confirmadoPago, setConfirmadoPago] = useState(false);

  // Step 3
  const [responsable, setResponsable] = useState({
    nombreCompleto: "", cargo: "", correo: "", telefono: "", esResponsable: true,
  });
  const [adicionales, setAdicionales] = useState<any[]>([]);

  /* ─── Load data ─────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API}/public/evento`)
      .then((r) => r.json())
      .then((ev) => { if (ev?.id) setEvento(ev); })
      .finally(() => setLoading(false));
  }, []);

  /* ─── Calculations ──────────────────────────────────────────── */
  const costoBase = Number(evento?.montoBaseIncripcionBolivianos ?? 0);
  const incluidos = Number(evento?.cantidadParticipantesIncluidos ?? 2);
  const costoExtra = Number(evento?.costoParticipanteExtra ?? 0);
  const numExtra = Math.max(0, participacion.numeroParticipantes - incluidos);
  const total = costoBase + numExtra * costoExtra;

  const qrRule = evento?.eventoreglaqr?.find(
    (r: any) => participacion.numeroParticipantes >= r.rangoDesde && participacion.numeroParticipantes <= r.rangoHasta,
  ) ?? evento?.eventoreglaqr?.[0];

  /* ─── File upload ───────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showModal("error", "Archivo muy grande", "El archivo no debe superar los 10 MB."); return; }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/admin/imagenes/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setUrlComprobante(data.url);
      else throw new Error("Sin URL");
    } catch {
      showModal("error", "Error al subir", "No se pudo subir el comprobante. Intenta de nuevo.");
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  /* ─── Validations ───────────────────────────────────────────── */
  const validateStep1 = () => {
    if (!empresa.nombre.trim()) return "El nombre de la empresa es obligatorio.";
    if (!empresa.rubro) return "Selecciona un rubro.";
    if (!empresa.pais) return "Selecciona un país.";
    if (!empresa.ciudad) return "Selecciona una ciudad.";
    if (!empresa.correoCorporativo.trim()) return "El correo corporativo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresa.correoCorporativo)) return "El correo corporativo no es válido.";
    if (!empresa.telefonoWhatsapp.trim()) return "El teléfono/WhatsApp es obligatorio.";
    if (participacion.numeroParticipantes < 1) return "Debe haber al menos 1 participante.";
    return null;
  };
  const validateStep2 = () => {
    if (!urlComprobante) return "Debes subir el comprobante de pago.";
    if (!confirmadoPago) return "Debes confirmar que el pago se realizó correctamente.";
    return null;
  };
  const validateStep3 = () => {
    if (!responsable.nombreCompleto.trim()) return "El nombre completo del responsable es obligatorio.";
    if (!responsable.cargo.trim()) return "El cargo del responsable es obligatorio.";
    if (!responsable.correo.trim()) return "El correo del responsable es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsable.correo)) return "El correo del responsable no es válido.";
    if (!responsable.telefono.trim()) return "El teléfono del responsable es obligatorio.";
    for (const [i, p] of adicionales.entries()) {
      if (!p.nombreCompleto.trim()) return `El nombre del participante ${i + 2} es obligatorio.`;
      if (!p.cargo.trim()) return `El cargo del participante ${i + 2} es obligatorio.`;
      if (!p.correo.trim()) return `El correo del participante ${i + 2} es obligatorio.`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo)) return `El correo del participante ${i + 2} no es válido.`;
      if (!p.telefono.trim()) return `El teléfono del participante ${i + 2} es obligatorio.`;
    }
    const totalParticipantes = 1 + adicionales.length;
    if (totalParticipantes > participacion.numeroParticipantes) {
      return `Registraste ${totalParticipantes} participantes pero declaraste ${participacion.numeroParticipantes}. Ajusta el número en el paso 1.`;
    }
    return null;
  };

  const goNext = () => {
    let err: string | null = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { showModal("warning", "Campos requeridos", err); return; }
    if (step === 3) { handleSubmit(); return; }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goPrev = () => { setStep((s) => s - 1); window.scrollTo(0, 0); };

  /* ─── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        empresa: {
          nombre: empresa.nombre,
          rubro: empresa.rubro,
          paisNombre: empresa.pais,
          ciudadNombre: empresa.ciudad,
          sitioWeb: empresa.sitioWeb || null,
          correoCorporativo: empresa.correoCorporativo,
          telefonoWhatsapp: empresa.telefonoWhatsapp,
          descripcion: empresa.descripcion || null,
        },
        participacion,
        comprobante: { urlComprobante },
        participantes: [
          { ...responsable, esResponsable: true },
          ...adicionales.map((a) => ({ ...a, esResponsable: false })),
        ],
      };
      const res = await fetch(`${API}/public/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error al registrar.");
      setResult(data);
      setStep(4);
      window.scrollTo(0, 0);
    } catch (e: any) {
      showModal("error", "Error en el registro", e.message || "No se pudo completar el registro.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Loading / no event ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Cargando información del evento...</p>
        </div>
      </div>
    );
  }

  const ciudadesDePais = empresa.pais ? SOUTH_AMERICA[empresa.pais] ?? [] : [];

  /* ═══ RENDER ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <Modal {...modal} onClose={closeModal} />
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="w-full bg-white flex items-center justify-between px-8 py-4 border-b border-gray-100 shadow-sm shrink-0">
        <div className="relative h-12 w-48">
          <Image src="/assets/iconos/logo.png" alt="Logo" fill sizes="192px" className="object-contain object-left" priority />
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-900">← Inicio</Link>
          <Link href="/#actividades" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Actividades</Link>
          <Link href="/#contacto" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Contacto</Link>
          <Link href="/auth/login" className="text-sm font-semibold text-[#449D3A] hover:text-[#367d2e]">Iniciar Sesión</Link>
        </nav>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {step < 4 && (
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">Registro de Empresa</h1>
            <p className="text-sm text-gray-500 mt-1">Completa la información de tu empresa para participar.</p>
          </div>
        )}

        <StepBar step={step} />

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Información de la empresa */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 className="w-5 h-5 text-[#449D3A]" />
                <h2 className="font-bold text-gray-900">Información de la empresa</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Nombre de la Empresa" required>
                    <input value={empresa.nombre} onChange={(e) => setEmpresa((f) => ({ ...f, nombre: e.target.value }))}
                      className={inputCls} placeholder="Ej: Tech Solutions S.A." />
                  </Field>
                </div>
                <Field label="Rubro" required>
                  <select value={empresa.rubro} onChange={(e) => setEmpresa((f) => ({ ...f, rubro: e.target.value }))} className={inputCls}>
                    <option value="">Selecciona un rubro</option>
                    {RUBROS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="País" required>
                  <select
                    value={empresa.pais}
                    onChange={(e) => setEmpresa((f) => ({ ...f, pais: e.target.value, ciudad: "" }))}
                    className={inputCls}
                  >
                    <option value="">Selecciona un país</option>
                    {Object.keys(SOUTH_AMERICA).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Ciudad" required>
                  <select
                    value={empresa.ciudad}
                    onChange={(e) => setEmpresa((f) => ({ ...f, ciudad: e.target.value }))}
                    className={inputCls}
                    disabled={!empresa.pais}
                  >
                    <option value="">{empresa.pais ? "Selecciona una ciudad" : "Selecciona un país primero"}</option>
                    {ciudadesDePais.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Sitio Web">
                  <input value={empresa.sitioWeb} onChange={(e) => setEmpresa((f) => ({ ...f, sitioWeb: e.target.value }))}
                    className={inputCls} placeholder="https://www.tuempresa.com" />
                </Field>
                <Field label="Email Corporativo" required>
                  <input type="email" value={empresa.correoCorporativo} onChange={(e) => setEmpresa((f) => ({ ...f, correoCorporativo: e.target.value }))}
                    className={inputCls} placeholder="contacto@empresa.com" />
                </Field>
                <Field label="Teléfono / WhatsApp" required>
                  <input value={empresa.telefonoWhatsapp} onChange={(e) => setEmpresa((f) => ({ ...f, telefonoWhatsapp: e.target.value }))}
                    className={inputCls} placeholder="+591 70000000" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Descripción de la Empresa">
                    <textarea value={empresa.descripcion} onChange={(e) => setEmpresa((f) => ({ ...f, descripcion: e.target.value }))}
                      className={`${inputCls} resize-none h-24`} placeholder="Describe brevemente los productos o servicios que ofrece tu empresa..." />
                  </Field>
                </div>
              </div>
            </section>

            {/* Participación */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-[#449D3A]" />
                <h2 className="font-bold text-gray-900">Participación en el evento</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Field label="Número de personas" required>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setParticipacion((p) => ({ ...p, numeroParticipantes: Math.max(1, p.numeroParticipantes - 1) }))}
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg text-gray-600 hover:bg-gray-50">−</button>
                      <span className="w-12 text-center text-xl font-bold text-gray-900">{participacion.numeroParticipantes}</span>
                      <button type="button"
                        onClick={() => setParticipacion((p) => ({ ...p, numeroParticipantes: Math.min(MAX_PARTICIPANTES, p.numeroParticipantes + 1) }))}
                        disabled={participacion.numeroParticipantes >= MAX_PARTICIPANTES}
                        className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center font-bold text-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Máximo {MAX_PARTICIPANTES} participantes por empresa.</p>
                  </Field>
                </div>
                <div>
                  <Field label="Tipo de participación" required>
                    <div className="space-y-2">
                      {[
                        { val: "PRESENCIAL", label: "Presencial", desc: "Asistencia física en el recinto ferial" },
                        { val: "VIRTUAL",    label: "Virtual",    desc: "Reuniones a través de la plataforma online" },
                        { val: "HIBRIDO",    label: "Híbrido",    desc: "Combinación de presencial y acceso virtual" },
                      ].map((t) => (
                        <label key={t.val} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${participacion.tipoParticipacion === t.val ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <input type="radio" name="tipo" value={t.val} checked={participacion.tipoParticipacion === t.val}
                            onChange={() => setParticipacion((p) => ({ ...p, tipoParticipacion: t.val }))} className="mt-0.5 accent-[#449D3A]" />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                            <p className="text-xs text-gray-400">{t.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ══ STEP 2 ══ */}
        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-6">
              {/* Resumen */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">📋</span>
                  <h2 className="font-bold text-gray-900">1. Resumen de Inscripción</h2>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { k: "Empresa",      v: empresa.nombre },
                    { k: "País / Ciudad", v: `${empresa.pais} – ${empresa.ciudad}` },
                    { k: "Participantes", v: `${participacion.numeroParticipantes} persona${participacion.numeroParticipantes > 1 ? "s" : ""}` },
                    { k: "Costo base",   v: `${costoBase} bs` },
                    ...(numExtra > 0 ? [{ k: `Costo extra (${numExtra} adic.)`, v: `${numExtra * costoExtra} bs` }] : []),
                  ].map((row) => (
                    <div key={row.k} className="flex justify-between text-gray-600">
                      <span>{row.k}</span><span>{row.v}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
                    <span>Total a pagar</span>
                    <span className="text-[#449D3A]">{total} bs</span>
                  </div>
                </div>
              </section>

              {/* Comprobante */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-base">📄</span>
                  <h2 className="font-bold text-gray-900">3. Comprobante de Pago</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3">Subir comprobante (Imagen o PDF)</p>
                {urlComprobante ? (
                  <div className="relative">
                    <div
                      className="w-full h-40 rounded-xl border-2 border-[#449D3A] overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer"
                      onClick={() => setLightboxUrl(urlComprobante)}
                      title="Click para ampliar"
                    >
                      {urlComprobante.includes(".pdf") || urlComprobante.includes("/raw/upload/")
                        ? <div className="text-center"><span className="text-4xl">📄</span><p className="text-sm text-gray-600 mt-1 font-semibold">PDF subido — click para ver</p></div>
                        : <img src={urlComprobante} alt="Comprobante" className="w-full h-full object-contain" />
                      }
                    </div>
                    <button onClick={() => setUrlComprobante("")}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 text-center">Haz clic en la imagen para ampliar</p>
                  </div>
                ) : (
                  <label className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploadingFile ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-[#449D3A] hover:bg-green-50"}`}>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${uploadingFile ? "text-[#449D3A] animate-bounce" : "text-gray-400"}`} />
                    <p className={`text-sm font-semibold ${uploadingFile ? "text-[#449D3A]" : "text-gray-600"}`}>
                      {uploadingFile ? "Subiendo..." : "Haga clic para subir"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Imagen o PDF — Máximo 10MB</p>
                  </label>
                )}
                <label className="flex items-start gap-2 mt-4 cursor-pointer">
                  <input type="checkbox" checked={confirmadoPago} onChange={(e) => setConfirmadoPago(e.target.checked)} className="mt-0.5 accent-[#449D3A]" />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    Confirmo que el pago se ha realizado correctamente por el monto total especificado y adjunto el comprobante válido para su verificación.
                  </span>
                </label>
              </section>
            </div>

            {/* Right — QR */}
            <div>
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-[#449D3A]" />
                  <h2 className="font-bold text-gray-900">2. Pago con QR</h2>
                </div>
                {qrRule?.urlQR ? (
                  <div className="flex flex-col items-center">
                    <div
                      className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-gray-100 bg-white p-2 cursor-pointer hover:border-[#449D3A] transition-colors"
                      onClick={() => setLightboxUrl(qrRule.urlQR)}
                      title="Click para ampliar"
                    >
                      <img src={qrRule.urlQR} alt="QR Pago" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Haz clic para ampliar el QR</p>
                    <p className="text-sm font-semibold text-gray-700 mt-2 text-center">Escanea el código con tu app bancaria</p>
                    <div className="mt-4 w-full bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-700 font-semibold">Monto a pagar</p>
                      <p className="text-2xl font-extrabold text-[#449D3A]">{total} Bs.</p>
                      <p className="text-xs text-green-600">{participacion.numeroParticipantes} participante{participacion.numeroParticipantes > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-32 h-32 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                      <QrCode className="w-16 h-16 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-400 text-center">No hay QR configurado. Contacta al administrador.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ══ STEP 3 ══ */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Responsable */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-[#449D3A]" />
                <h2 className="font-bold text-gray-900">Responsable principal</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre completo" required>
                  <input value={responsable.nombreCompleto} onChange={(e) => setResponsable((r) => ({ ...r, nombreCompleto: e.target.value }))}
                    className={inputCls} placeholder="Carlos Eduardo Mendoza" />
                </Field>
                <Field label="Cargo" required>
                  <input value={responsable.cargo} onChange={(e) => setResponsable((r) => ({ ...r, cargo: e.target.value }))}
                    className={inputCls} placeholder="Director Ejecutivo" />
                </Field>
                <Field label="Correo electrónico" required>
                  <input type="email" value={responsable.correo} onChange={(e) => setResponsable((r) => ({ ...r, correo: e.target.value }))}
                    className={inputCls} placeholder="carlos.mendoza@empresa.com" />
                </Field>
                <Field label="Teléfono" required>
                  <input value={responsable.telefono} onChange={(e) => setResponsable((r) => ({ ...r, telefono: e.target.value }))}
                    className={inputCls} placeholder="+591 789 45612" />
                </Field>
              </div>
            </section>

            {/* Adicionales */}
            {adicionales.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="w-5 h-5 text-[#449D3A]" />
                  <h2 className="font-bold text-gray-900">Participantes adicionales</h2>
                </div>
                {adicionales.map((p, i) => (
                  <div key={i} className="relative border border-gray-100 rounded-xl p-4 mb-4">
                    <button onClick={() => setAdicionales((a) => a.filter((_, j) => j !== i))}
                      className="absolute top-3 right-3 w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Nombre completo" required>
                        <input value={p.nombreCompleto} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, nombreCompleto: e.target.value } : x))}
                          className={inputCls} placeholder="Ej: María López" />
                      </Field>
                      <Field label="Cargo" required>
                        <input value={p.cargo} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, cargo: e.target.value } : x))}
                          className={inputCls} placeholder="Ej: Gerente Comercial" />
                      </Field>
                      <Field label="Correo electrónico" required>
                        <input type="email" value={p.correo} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, correo: e.target.value } : x))}
                          className={inputCls} placeholder="maria.lopez@empresa.com" />
                      </Field>
                      <Field label="Teléfono" required>
                        <input value={p.telefono} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, telefono: e.target.value } : x))}
                          className={inputCls} placeholder="+591 7XX XXXXX" />
                      </Field>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => {
                if (1 + adicionales.length >= participacion.numeroParticipantes) {
                  showModal("warning", "Límite alcanzado", `Ya alcanzaste el número de participantes declarado (${participacion.numeroParticipantes}).`);
                  return;
                }
                setAdicionales((a) => [...a, { nombreCompleto: "", cargo: "", correo: "", telefono: "" }]);
              }}
                className="flex items-center gap-2 px-5 py-2.5 border border-[#449D3A] text-[#449D3A] rounded-xl text-sm font-semibold hover:bg-green-50 transition-colors">
                <Plus className="w-4 h-4" /> Agregar otro participante
              </button>
              <p className="text-xs text-gray-400">{1 + adicionales.length} / {participacion.numeroParticipantes} participantes</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-sm text-blue-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Cada participante recibirá credenciales de acceso a la plataforma del evento.</p>
            </div>
          </div>
        )}

        {/* ══ STEP 4 — CONFIRMACIÓN ══ */}
        {step === 4 && result && (
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-[#449D3A]" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Registro completado</h1>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Tu empresa ha sido registrada correctamente para participar en {evento?.nombre ?? "el evento"}.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { icon: "🏢", label: "EMPRESA",       value: result.empresa?.nombre },
                  { icon: "👥", label: "PARTICIPANTES", value: `${result.empresaevento?.numeroParticipantes} registrado${result.empresaevento?.numeroParticipantes > 1 ? "s" : ""}` },
                  { icon: "💳", label: "ESTADO PAGO",   value: "Pendiente verificación" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-2xl mb-1">{s.icon}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Nuestro equipo validará tu inscripción. Recibirás un correo cuando tu cuenta esté habilitada para comenzar a agendar citas.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Link href="/auth/login"
                  className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#367d2e] transition-colors">
                  Ir al Login
                </Link>
                <button onClick={() => setShowParticipants((v) => !v)}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Users className="w-4 h-4" /> {showParticipants ? "Ocultar participantes" : "Ver participantes"}
                </button>
              </div>

              {/* Participants list */}
              {showParticipants && result.participantes?.length > 0 && (
                <div className="mt-6 text-left border-t border-gray-100 pt-6">
                  <p className="text-sm font-bold text-gray-700 mb-3">Participantes registrados:</p>
                  <div className="space-y-2">
                    {result.participantes.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                            {(p.nombres ?? p.nombreCompleto ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{p.nombres ?? p.nombreCompleto} {p.apellidoPaterno ?? ""}</p>
                            <p className="text-xs text-gray-500">{p.cargo} · {p.correo}</p>
                          </div>
                        </div>
                        {p.esResponsable && (
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">Responsable</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evento banner */}
            {evento && (
              <div className="relative rounded-2xl overflow-hidden min-h-[160px] flex items-center">
                {evento.urlImagenMapaRecinto
                  ? <img src={evento.urlImagenMapaRecinto} alt="Recinto" className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-600" />
                }
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 p-8">
                  <h3 className="text-white text-xl font-extrabold leading-tight mb-2">{evento.nombre}</h3>
                  <p className="text-white/80 text-sm leading-relaxed max-w-lg">
                    {evento.sobreElEvento ?? evento.descripcion ?? "Conectando empresas, impulsando el desarrollo regional."}
                  </p>
                  {(evento.ciudadEvento || evento.paisEvento) && (
                    <p className="text-green-300 text-xs mt-3 font-semibold">
                      📍 {[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ──────────────────────────────────── */}
        {step < 4 && (
          <div className="flex justify-between mt-8">
            <button onClick={goPrev} disabled={step === 1}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button onClick={goNext} disabled={submitting}
              className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#367d2e] disabled:opacity-60 transition-colors shadow-sm">
              {submitting ? "Registrando..." : step === 3 ? "Finalizar registro" : "Continuar"}
              {!submitting && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="w-full text-center py-6 border-t border-gray-100 shrink-0">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} {evento?.nombre ?? "Rueda de Negocios del Beni"}. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
