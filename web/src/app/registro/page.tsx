"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2, Users, CreditCard, CheckCircle2,
  ChevronRight, ChevronLeft, Plus, Trash2,
  Upload, QrCode, User, MapPin, FileText, ClipboardList,
  AlertCircle, X, Check, RefreshCw,
} from "lucide-react";

import { LIMITES, correoValido, validarNombreEmpresa, limpiarEspacios } from "@/lib/validaciones";
import { RUBROS, RUBROS_CON_OTRO, OTRO } from "@/lib/rubros";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

const ETIQUETA_MESA: Record<string, string> = {
  NORMAL: "Mesa de negocios estándar",
  PREFERENCIAL: "Mesa preferencial",
  VIP: "Mesa VIP",
};

// Los rubros viven en @/lib/rubros para no repetirlos en registro y perfil.

const SOUTH_AMERICA: Record<string, string[]> = {
  "Bolivia":   ["Trinidad","Beni","La Paz","Santa Cruz de la Sierra","Cochabamba","Sucre","Oruro","Potosí","Tarija","Cobija","Riberalta","Guayaramerín"],
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
  const [correoError, setCorreoError] = useState<string | null>(null);
  const [checkingCorreo, setCheckingCorreo] = useState(false);

  // Modal
  const [modal, setModal] = useState({ open: false, type: "error", title: "", message: "", onConfirm: undefined as any });
  const showModal = (type: string, title: string, message: string, onConfirm?: () => void) =>
    setModal({ open: true, type, title, message, onConfirm });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  // Step 1
  const [empresa, setEmpresa] = useState({
    nombre: "", rubro: "", pais: "", ciudad: "", paisOtro: "", ciudadOtro: "", sitioWeb: "",
    correoCorporativo: "", telefonoWhatsapp: "", descripcion: "",
    oferta: "", demanda: "",
  });
  const [interesesBusqueda, setInteresesBusqueda] = useState<string[]>([]);
  const toggleInteres = (rubro: string) =>
    setInteresesBusqueda((prev) => prev.includes(rubro) ? prev.filter((r) => r !== rubro) : [...prev, rubro]);
  const [participacion, setParticipacion] = useState({
    numeroParticipantes: 1, tipoParticipacion: "PRESENCIAL",
  });
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [paqueteId, setPaqueteId] = useState<number | null>(null);

  // Step 2
  const [urlComprobante, setUrlComprobante] = useState("");
  const [confirmadoPago, setConfirmadoPago] = useState(false);

  // Step 3
  const [responsable, setResponsable] = useState({
    nombres: "", apellidoPaterno: "", apellidoMaterno: "",
    cargo: "", correo: "", telefono: "", esResponsable: true,
  });
  const [adicionales, setAdicionales] = useState<any[]>([]);

  /* ─── Load data ─────────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      fetch(`${API}/public/evento`).then((r) => r.json()).catch(() => null),
      fetch(`${API}/public/paquetes`).then((r) => r.json()).catch(() => []),
    ])
      .then(([ev, pqs]) => {
        if (ev?.id) setEvento(ev);
        const lista = Array.isArray(pqs) ? pqs : [];
        setPaquetes(lista);
        // Se preselecciona el más económico para que el paso 2 ya muestre un monto.
        if (lista.length) {
          setPaqueteId(lista[0].id);
          setParticipacion({
            numeroParticipantes: lista[0].credencialesIncluidas,
            tipoParticipacion: lista[0].tipoParticipacion ?? "PRESENCIAL",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* ─── Calculations ──────────────────────────────────────────── */
  // El paquete manda: fija el costo, las credenciales incluidas y el QR de pago.
  // Si aún no hay paquetes cargados se cae al monto base del evento.
  const paquete = paquetes.find((p) => p.id === paqueteId) ?? null;
  const costoBase = paquete
    ? Number(paquete.costo)
    : Number(evento?.montoBaseIncripcionBolivianos ?? 0);
  const incluidos = paquete
    ? Number(paquete.credencialesIncluidas)
    : Number(evento?.cantidadParticipantesIncluidos ?? 2);
  const costoExtra = Number(evento?.costoParticipanteExtra ?? 0);
  const numExtra = Math.max(0, participacion.numeroParticipantes - incluidos);
  const total = costoBase + numExtra * costoExtra;

  const qrRule = paquete?.urlQR
    ? { urlQR: paquete.urlQR }
    : (evento?.eventoreglaqr?.find(
        (r: any) => participacion.numeroParticipantes >= r.rangoDesde && participacion.numeroParticipantes <= r.rangoHasta,
      ) ?? evento?.eventoreglaqr?.[0]);

  // El paquete define cuántas personas entran y en qué modalidad. Para sumar
  // más gente se piden cupos adicionales después, ya inscrita la empresa.
  const elegirPaquete = (p: any) => {
    setPaqueteId(p.id);
    setParticipacion({
      numeroParticipantes: p.credencialesIncluidas,
      tipoParticipacion: p.tipoParticipacion ?? "PRESENCIAL",
    });
  };

  /* ─── Verificar correo duplicado ───────────────────────────── */
  const verificarCorreo = async (correo: string): Promise<string | null> => {
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return null;
    setCheckingCorreo(true);
    setCorreoError(null);
    try {
      const res = await fetch(`${API}/public/verificar-empresa?correo=${encodeURIComponent(correo)}`);
      const data = await res.json();
      if (data.existe) {
        const msg = `La empresa "${data.nombreEmpresa}" ya está registrada con este correo para el evento actual.`;
        setCorreoError(msg);
        return msg;
      }
      return null;
    } catch { return null; }
    finally { setCheckingCorreo(false); }
  };

  const verificarTelefono = async (telefono: string, tipo: "empresa" | "participante", etiqueta: string): Promise<string | null> => {
    if (!validTel(telefono)) return null;
    try {
      const params = new URLSearchParams({ telefono, tipo });
      const res = await fetch(`${API}/public/verificar-empresa?${params}`);
      const data = await res.json();
      if (!data.existe) return null;
      return tipo === "empresa"
        ? `Este teléfono/WhatsApp ya está registrado por la empresa "${data.nombreEmpresa || "existente"}".`
        : `El teléfono de ${etiqueta} ya está asociado a una cuenta.`;
    } catch { return null; }
  };

  /* ─── File upload ───────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showModal("error", "Archivo muy grande", "El archivo no debe superar los 5 MB."); return; }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/public/imagenes/upload`, { method: "POST", body: fd });
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

  /* ─── Helpers ──────────────────────────────────────────────── */
  const sanitizeTel = (v: string) => v.replace(/[^\d\s+\-()]/g, "").slice(0, 20);
  const validTel = (v: string) => /^[+]?\d[\d\s\-()]{5,19}$/.test(v.trim());

  /* ─── Validations ───────────────────────────────────────────── */
  const validateStep1 = () => {
    const nombreErr = validarNombreEmpresa(empresa.nombre);
    if (nombreErr) return nombreErr;
    if (!empresa.rubro) return "Selecciona un rubro.";
    if (!empresa.pais) return "Selecciona un país.";
    if (empresa.pais === OTRO && !empresa.paisOtro.trim()) return "Escribe el nombre del país.";
    if (empresa.pais !== OTRO && !empresa.ciudad) return "Selecciona una ciudad.";
    if ((empresa.pais === OTRO || empresa.ciudad === OTRO) && !empresa.ciudadOtro.trim())
      return "Escribe el nombre de la ciudad.";
    if (!empresa.correoCorporativo.trim()) return "El correo corporativo es obligatorio.";
    if (!correoValido(empresa.correoCorporativo)) return "El correo corporativo no es válido.";
    if (!empresa.telefonoWhatsapp.trim()) return "El teléfono/WhatsApp es obligatorio.";
    if (!validTel(empresa.telefonoWhatsapp)) return "El teléfono/WhatsApp no es válido. Usa solo dígitos, espacios, +, - o ().";
    if (participacion.numeroParticipantes < 1) return "Debe haber al menos 1 participante.";
    return null;
  };
  const validateStep2 = () => {
    if (!urlComprobante) return "Debes subir el comprobante de pago.";
    if (!confirmadoPago) return "Debes confirmar que el pago se realizó correctamente.";
    return null;
  };
  const validateStep3 = () => {
    if (!responsable.nombres.trim()) return "El nombre del responsable es obligatorio.";
    if (!responsable.apellidoPaterno.trim()) return "El apellido paterno del responsable es obligatorio.";
    if (!responsable.cargo.trim()) return "El cargo del responsable es obligatorio.";
    if (!responsable.correo.trim()) return "El correo del responsable es obligatorio.";
    if (!correoValido(responsable.correo)) return "El correo del responsable no es válido.";
    if (!responsable.telefono.trim()) return "El teléfono del responsable es obligatorio.";
    if (!validTel(responsable.telefono)) return "El teléfono del responsable no es válido. Usa solo dígitos, espacios, +, - o ().";
    for (const [i, p] of adicionales.entries()) {
      if (!p.nombres?.trim()) return `El nombre del participante ${i + 2} es obligatorio.`;
      if (!p.apellidoPaterno?.trim()) return `El apellido paterno del participante ${i + 2} es obligatorio.`;
      if (!p.cargo.trim()) return `El cargo del participante ${i + 2} es obligatorio.`;
      if (!p.correo.trim()) return `El correo del participante ${i + 2} es obligatorio.`;
      if (!correoValido(p.correo)) return `El correo del participante ${i + 2} no es válido.`;
      if (!p.telefono.trim()) return `El teléfono del participante ${i + 2} es obligatorio.`;
      if (!validTel(p.telefono)) return `El teléfono del participante ${i + 2} no es válido. Usa solo dígitos, +, - o ().`;
    }
    const totalParticipantes = 1 + adicionales.length;
    if (totalParticipantes > participacion.numeroParticipantes) {
      return paquete
        ? `Tu ${paquete.nombre} incluye ${participacion.numeroParticipantes} credencial(es) y cargaste ${totalParticipantes} personas. Quita las que sobran o elige otro paquete en el paso 1.`
        : `Registraste ${totalParticipantes} participantes pero declaraste ${participacion.numeroParticipantes}. Ajusta el número en el paso 1.`;
    }
    return null;
  };

  const goNext = async () => {
    if (step === 1) {
      // Validate fields first
      const fieldErr = validateStep1();
      if (fieldErr) { showModal("warning", "Campos requeridos", fieldErr); return; }
      // Always verify email against DB when clicking Continuar
      const emailErr = await verificarCorreo(empresa.correoCorporativo);
      if (emailErr) return; // error already shown inline below the email field
      const telefonoErr = await verificarTelefono(empresa.telefonoWhatsapp, "empresa", "la empresa");
      if (telefonoErr) { showModal("warning", "Teléfono ya registrado", telefonoErr); return; }
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { showModal("warning", "Campos requeridos", err); return; }
    } else if (step === 3) {
      const err = validateStep3();
      if (err) { showModal("warning", "Campos requeridos", err); return; }
      const responsableErr = await verificarTelefono(responsable.telefono, "participante", "el encargado");
      if (responsableErr) { showModal("warning", "Teléfono del encargado ya registrado", responsableErr); return; }
      for (let i = 0; i < adicionales.length; i++) {
        const participanteErr = await verificarTelefono(adicionales[i].telefono, "participante", `el participante ${i + 2}`);
        if (participanteErr) { showModal("warning", "Teléfono ya registrado", participanteErr); return; }
      }
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goPrev = () => { setStep((s) => s - 1); window.scrollTo(0, 0); };

  /* ─── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Limpieza de espacios en todo lo que escribe el usuario antes de enviar.
      const limpiarPersona = (p: any) => ({
        ...p,
        nombres: limpiarEspacios(p.nombres),
        apellidoPaterno: limpiarEspacios(p.apellidoPaterno),
        apellidoMaterno: limpiarEspacios(p.apellidoMaterno),
        cargo: limpiarEspacios(p.cargo),
        correo: (p.correo || "").trim(),
        telefono: (p.telefono || "").trim(),
      });
      const payload = {
        empresa: {
          nombre: limpiarEspacios(empresa.nombre),
          rubro: empresa.rubro,
          paisNombre: paisFinal,
          ciudadNombre: ciudadFinal,
          sitioWeb: empresa.sitioWeb.trim() || null,
          correoCorporativo: empresa.correoCorporativo.trim(),
          telefonoWhatsapp: empresa.telefonoWhatsapp.trim(),
          descripcion: empresa.descripcion.trim() || null,
          oferta: empresa.oferta.trim() || null,
          demanda: empresa.demanda.trim() || null,
          interesesBusqueda: interesesBusqueda.length ? interesesBusqueda.join(", ") : null,
        },
        participacion: { ...participacion, paquete_id: paqueteId },
        comprobante: { urlComprobante },
        participantes: [
          { ...limpiarPersona(responsable), esResponsable: true },
          ...adicionales.map((a) => ({ ...limpiarPersona(a), esResponsable: false })),
        ],
      };
      const res = await fetch(`${API}/public/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error al registrar.");
      setResult({ ...data, empresaeventoId: data.empresaeventoId ?? data.empresaevento?.id });
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

  // "Otro" abre un campo de texto: la lista fija no cubre todos los países.
  // Si el país es "Otro", la ciudad también se escribe (no hay lista que ofrecer).
  const paisEsOtro = empresa.pais === OTRO;
  const ciudadesDePais = empresa.pais && !paisEsOtro ? SOUTH_AMERICA[empresa.pais] ?? [] : [];
  const ciudadEsOtra = paisEsOtro || empresa.ciudad === OTRO;
  // Lo que realmente se guarda: el texto escrito cuando eligieron "Otro".
  const paisFinal = (paisEsOtro ? empresa.paisOtro : empresa.pais).trim();
  const ciudadFinal = (ciudadEsOtra ? empresa.ciudadOtro : empresa.ciudad).trim();

  /* ═══ RENDER ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <Modal {...modal} onClose={closeModal} />
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="w-full bg-white flex items-center justify-between px-8 py-4 border-b border-gray-100 shadow-sm shrink-0">
        <Link href="/" aria-label="Volver a la pagina principal" className="relative block h-12 w-48">
          <Image src="/assets/iconos/logo.png" alt="Logo" fill sizes="192px" className="object-contain object-left" priority />
        </Link>
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
                    <input value={empresa.nombre} maxLength={LIMITES.nombreEmpresa}
                      onChange={(e) => setEmpresa((f) => ({ ...f, nombre: e.target.value }))}
                      className={inputCls} placeholder="Ej: Tech Solutions S.A." />
                  </Field>
                </div>
                <Field label="Rubro" required>
                  <select value={empresa.rubro} onChange={(e) => setEmpresa((f) => ({ ...f, rubro: e.target.value }))} className={inputCls}>
                    <option value="">Selecciona un rubro</option>
                    {RUBROS_CON_OTRO.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="País" required>
                  <select
                    value={empresa.pais}
                    onChange={(e) => setEmpresa((f) => ({ ...f, pais: e.target.value, ciudad: "", paisOtro: "", ciudadOtro: "" }))}
                    className={inputCls}
                  >
                    <option value="">Selecciona un país</option>
                    {Object.keys(SOUTH_AMERICA).map((p) => <option key={p} value={p}>{p}</option>)}
                    <option value={OTRO}>Otro (escribir)</option>
                  </select>
                  {paisEsOtro && (
                    <input
                      value={empresa.paisOtro}
                      maxLength={60}
                      onChange={(e) => setEmpresa((f) => ({ ...f, paisOtro: e.target.value }))}
                      className={inputCls + " mt-2"}
                      placeholder="Escribe el nombre del país"
                    />
                  )}
                </Field>
                <Field label="Ciudad" required>
                  {paisEsOtro ? (
                    <input
                      value={empresa.ciudadOtro}
                      maxLength={60}
                      onChange={(e) => setEmpresa((f) => ({ ...f, ciudadOtro: e.target.value }))}
                      className={inputCls}
                      placeholder="Escribe el nombre de la ciudad"
                    />
                  ) : (
                    <>
                      <select
                        value={empresa.ciudad}
                        onChange={(e) => setEmpresa((f) => ({ ...f, ciudad: e.target.value, ciudadOtro: "" }))}
                        className={inputCls}
                        disabled={!empresa.pais}
                      >
                        <option value="">{empresa.pais ? "Selecciona una ciudad" : "Selecciona un país primero"}</option>
                        {ciudadesDePais.map((c) => <option key={c} value={c}>{c}</option>)}
                        {empresa.pais && <option value={OTRO}>Otra (escribir)</option>}
                      </select>
                      {ciudadEsOtra && (
                        <input
                          value={empresa.ciudadOtro}
                          maxLength={60}
                          onChange={(e) => setEmpresa((f) => ({ ...f, ciudadOtro: e.target.value }))}
                          className={inputCls + " mt-2"}
                          placeholder="Escribe el nombre de la ciudad"
                        />
                      )}
                    </>
                  )}
                </Field>
                <Field label="Sitio Web">
                  <input value={empresa.sitioWeb} onChange={(e) => setEmpresa((f) => ({ ...f, sitioWeb: e.target.value }))}
                    className={inputCls} placeholder="https://www.tuempresa.com" />
                </Field>
                <Field label="Email Corporativo" required>
                  <input
                    type="email"
                    value={empresa.correoCorporativo}
                    onChange={(e) => { setEmpresa((f) => ({ ...f, correoCorporativo: e.target.value })); setCorreoError(null); }}
                    onBlur={(e) => verificarCorreo(e.target.value)}
                    className={`${inputCls} ${correoError ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                    placeholder="contacto@empresa.com"
                  />
                  {checkingCorreo && <p className="text-xs text-gray-400 mt-1">Verificando...</p>}
                  {correoError && (
                    <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-semibold">{correoError}</p>
                    </div>
                  )}
                </Field>
                <Field label="Teléfono / WhatsApp" required>
                  <input
                    value={empresa.telefonoWhatsapp}
                    onChange={(e) => setEmpresa((f) => ({ ...f, telefonoWhatsapp: sanitizeTel(e.target.value) }))}
                    className={inputCls} placeholder="+591 70000000"
                    inputMode="tel" maxLength={20}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Descripción de la Empresa">
                    <textarea value={empresa.descripcion} maxLength={LIMITES.descripcion}
                      onChange={(e) => setEmpresa((f) => ({ ...f, descripcion: e.target.value.slice(0, LIMITES.descripcion) }))}
                      className={`${inputCls} resize-none h-24`} placeholder="Describe brevemente los productos o servicios que ofrece tu empresa..." />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">{empresa.descripcion.length}/{LIMITES.descripcion}</p>
                  </Field>
                </div>
                <Field label="¿Qué ofrece tu empresa?">
                  <textarea value={empresa.oferta} maxLength={LIMITES.oferta}
                    onChange={(e) => setEmpresa((f) => ({ ...f, oferta: e.target.value.slice(0, LIMITES.oferta) }))}
                    className={`${inputCls} resize-none h-20`} placeholder="Ej: exportación de café orgánico, servicios de logística..." />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{empresa.oferta.length}/{LIMITES.oferta}</p>
                </Field>
                <Field label="¿Qué busca tu empresa?">
                  <textarea value={empresa.demanda} maxLength={LIMITES.demanda}
                    onChange={(e) => setEmpresa((f) => ({ ...f, demanda: e.target.value.slice(0, LIMITES.demanda) }))}
                    className={`${inputCls} resize-none h-20`} placeholder="Ej: proveedores de insumos, socios de distribución..." />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{empresa.demanda.length}/{LIMITES.demanda}</p>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="¿Con qué sectores te interesa reunirte? (opcional)">
                    <div className="flex flex-wrap gap-2">
                      {RUBROS.map((r) => (
                        <button
                          key={r} type="button"
                          onClick={() => toggleInteres(r)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                            interesesBusqueda.includes(r)
                              ? "bg-[#449D3A] text-white border-[#449D3A]"
                              : "bg-white text-gray-600 border-gray-200 hover:border-[#449D3A]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Usaremos esto para sugerirte empresas afines en el apartado de Oportunidades.</p>
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

              {/* Paquetes de inscripción */}
              {paquetes.length > 0 && (
                <div className="mb-6">
                  <Field label="Paquete de inscripción" required>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {paquetes.map((p) => {
                        const activo = paqueteId === p.id;
                        const beneficios = String(p.contenido ?? "").split("\n").filter(Boolean);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => elegirPaquete(p)}
                            aria-pressed={activo}
                            className={`text-left rounded-2xl border-2 p-4 transition-all flex flex-col ${
                              activo
                                ? "border-[#449D3A] bg-green-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-extrabold text-gray-900 leading-tight">{p.nombre}</p>
                                {p.objetivo && <p className="text-xs text-[#449D3A] font-semibold mt-0.5">{p.objetivo}</p>}
                              </div>
                              <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${activo ? "border-[#449D3A] bg-[#449D3A]" : "border-gray-300"}`}>
                                {activo && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </span>
                            </div>
                            <p className="text-2xl font-extrabold text-gray-900 mt-3">
                              Bs. {Number(p.costo)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Incluye {p.credencialesIncluidas} credencial{p.credencialesIncluidas > 1 ? "es" : ""}
                            </p>
                            {p.descripcion && (
                              <p className="text-xs text-gray-500 mt-2 leading-snug">{p.descripcion}</p>
                            )}
                            {beneficios.length > 0 && (
                              <ul className="mt-3 space-y-1 border-t border-gray-200 pt-3">
                                {beneficios.map((b, i) => (
                                  <li key={i} className="flex gap-1.5 text-xs text-gray-600 leading-snug">
                                    <Check className="w-3 h-3 text-[#449D3A] flex-shrink-0 mt-0.5" strokeWidth={3} />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              )}

              {/* El paquete define cuántas personas entran y en qué modalidad,
                  así que aquí solo se confirma; no hay nada que elegir a mano. */}
              {paquete && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">
                    Lo que incluye tu {paquete.nombre}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-[#449D3A]" />
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-gray-900 leading-none">
                          {incluidos} persona{incluidos > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Credenciales incluidas en el paquete</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-[#449D3A]" />
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-gray-900 leading-none capitalize">
                          {String(paquete.tipoParticipacion ?? "PRESENCIAL").toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ETIQUETA_MESA[paquete.nivelMesa] ?? "Mesa estándar"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ══ STEP 2 ══
            En móvil (1 columna) el orden de lectura es 1→2→3 gracias a las clases
            order-*; en escritorio se coloca el QR a la derecha (col 2) abarcando
            ambas filas, con Resumen arriba-izq y Comprobante abajo-izq. */}
        {step === 2 && (
          <div className="grid md:grid-cols-2 md:grid-rows-[auto_auto] gap-6 md:items-start">
            {/* Resumen */}
            <section className="order-1 md:col-start-1 md:row-start-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-[#449D3A]" />
                <h2 className="font-bold text-gray-900">1. Resumen de Inscripción</h2>
              </div>
                <div className="space-y-2 text-sm">
                  {[
                    { k: "Empresa",      v: empresa.nombre },
                    { k: "País / Ciudad", v: `${paisFinal} – ${ciudadFinal}` },
                    ...(paquete ? [{ k: "Paquete", v: paquete.nombre }] : []),
                    { k: "Participantes", v: `${participacion.numeroParticipantes} persona${participacion.numeroParticipantes > 1 ? "s" : ""}` },
                    { k: paquete ? "Costo del paquete" : "Costo base", v: `${costoBase} bs` },
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

            {/* Pago con QR — a la derecha en escritorio, segundo paso en móvil */}
            <section className="order-2 md:col-start-2 md:row-start-1 md:row-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:sticky md:top-6">
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

            {/* Comprobante — tercer paso, debajo del resumen en escritorio */}
            <section className="order-3 md:col-start-1 md:row-start-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[#449D3A]" />
                  <h2 className="font-bold text-gray-900">3. Comprobante de Pago</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3">Subir comprobante (Imagen o PDF)</p>
                {urlComprobante ? (
                  <div>
                    <div
                      className="w-full h-40 rounded-xl border-2 border-[#449D3A] overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer"
                      onClick={() => setLightboxUrl(urlComprobante)}
                      title="Click para ampliar"
                    >
                      {urlComprobante.includes(".pdf") || urlComprobante.includes("/raw/upload/")
                        ? <div className="text-center"><FileText className="w-10 h-10 text-[#449D3A] mx-auto mb-1" /><p className="text-sm text-gray-600 font-semibold">PDF subido — clic para ver</p></div>
                        : <img src={urlComprobante} alt="Comprobante" className="w-full h-full object-contain" />
                      }
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400">Clic en la imagen para ampliar</p>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[#449D3A] cursor-pointer hover:text-[#367d2e] transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Cambiar comprobante
                        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { setUrlComprobante(""); handleFileUpload(e); }} />
                      </label>
                    </div>
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
                <Field label="Nombre(s)" required>
                  <input value={responsable.nombres} onChange={(e) => setResponsable((r) => ({ ...r, nombres: e.target.value }))}
                    className={inputCls} placeholder="Carlos Eduardo" />
                </Field>
                <Field label="Apellido paterno" required>
                  <input value={responsable.apellidoPaterno} onChange={(e) => setResponsable((r) => ({ ...r, apellidoPaterno: e.target.value }))}
                    className={inputCls} placeholder="Mendoza" />
                </Field>
                <Field label="Apellido materno">
                  <input value={responsable.apellidoMaterno} onChange={(e) => setResponsable((r) => ({ ...r, apellidoMaterno: e.target.value }))}
                    className={inputCls} placeholder="Quispe (opcional)" />
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
                  <input
                    value={responsable.telefono}
                    onChange={(e) => setResponsable((r) => ({ ...r, telefono: sanitizeTel(e.target.value) }))}
                    className={inputCls} placeholder="+591 789 45612"
                    inputMode="tel" maxLength={20}
                  />
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
                      <Field label="Nombre(s)" required>
                        <input value={p.nombres} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, nombres: e.target.value } : x))}
                          className={inputCls} placeholder="Ej: María" />
                      </Field>
                      <Field label="Apellido paterno" required>
                        <input value={p.apellidoPaterno} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, apellidoPaterno: e.target.value } : x))}
                          className={inputCls} placeholder="Ej: López" />
                      </Field>
                      <Field label="Apellido materno">
                        <input value={p.apellidoMaterno} onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, apellidoMaterno: e.target.value } : x))}
                          className={inputCls} placeholder="Opcional" />
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
                        <input
                          value={p.telefono}
                          onChange={(e) => setAdicionales((a) => a.map((x, j) => j === i ? { ...x, telefono: sanitizeTel(e.target.value) } : x))}
                          className={inputCls} placeholder="+591 7XX XXXXX"
                          inputMode="tel" maxLength={20}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => {
                if (1 + adicionales.length >= participacion.numeroParticipantes) {
                  showModal("warning", "Límite alcanzado", paquete
                    ? `Tu ${paquete.nombre} incluye ${participacion.numeroParticipantes} credencial(es). Podrás sumar más personas desde tu panel, solicitando cupos adicionales.`
                    : `Ya alcanzaste el número de participantes declarado (${participacion.numeroParticipantes}).`);
                  return;
                }
                setAdicionales((a) => [...a, { nombres: "", apellidoPaterno: "", apellidoMaterno: "", cargo: "", correo: "", telefono: "" }]);
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  { Icon: Building2,  color: "bg-green-50 text-[#449D3A]",  label: "EMPRESA",       value: result.empresa?.nombre },
                  { Icon: Users,      color: "bg-blue-50 text-blue-600",     label: "PARTICIPANTES", value: `${result.empresaevento?.numeroParticipantes} registrado${result.empresaevento?.numeroParticipantes > 1 ? "s" : ""}` },
                  { Icon: CreditCard, color: "bg-amber-50 text-amber-600",   label: "ESTADO PAGO",   value: "Pendiente verificación" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 mx-auto ${s.color}`}>
                      <s.Icon className="w-4 h-4" />
                    </div>
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
                {result.empresaeventoId && (
                  <Link href={`/seguimiento?ee=${result.empresaeventoId}&t=${encodeURIComponent(result.seguimientoToken || '')}`}
                    className="flex items-center gap-2 border border-[#449D3A] text-[#449D3A] font-semibold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> Ver estado de inscripción
                  </Link>
                )}
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
                            <p className="text-sm font-semibold text-gray-800">{[p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')}</p>
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
                  ? <img src={evento.urlImagenMapaRecinto} alt="Recinto" className="absolute inset-0 w-full h-full object-contain" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-600" />
                }
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 p-8">
                  <h3 className="text-white text-xl font-extrabold leading-tight mb-2">{evento.nombre}</h3>
                  <p className="text-white/80 text-sm leading-relaxed max-w-lg">
                    {evento.sobreElEvento ?? evento.descripcion ?? "Conectando empresas, impulsando el desarrollo regional."}
                  </p>
                  {(evento.ciudadEvento || evento.paisEvento) && (
                    <p className="text-green-300 text-xs mt-3 font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {[evento.ciudadEvento, evento.paisEvento].filter(Boolean).join(", ")}
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
            <button onClick={goNext} disabled={submitting || checkingCorreo}
              className="flex items-center gap-2 bg-[#449D3A] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#367d2e] disabled:opacity-60 transition-colors shadow-sm">
              {submitting ? "Registrando..." : checkingCorreo ? "Verificando..." : step === 3 ? "Finalizar registro" : "Continuar"}
              {!submitting && !checkingCorreo && <ChevronRight className="w-4 h-4" />}
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
