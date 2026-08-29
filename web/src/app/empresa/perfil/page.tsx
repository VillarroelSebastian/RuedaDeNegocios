"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User, Building2, Save, AlertCircle, CheckCircle2, Edit3,
  Users, UserPlus, UserX, CreditCard, AlertTriangle,
  KeyRound, Shield, X, Upload, FileText, Download, Camera,
} from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";
import { LIMITES } from "@/lib/validaciones";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoPagoBadge(estado: string) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDIENTE:  { cls: "bg-amber-100 text-amber-700",  label: "Pendiente" },
    COMPLETADO: { cls: "bg-green-100 text-green-700",  label: "Aprobado" },
    RECHAZADO:  { cls: "bg-red-100 text-red-700",      label: "Rechazado" },
    OBSERVADO:  { cls: "bg-orange-100 text-orange-700",label: "Observado" },
  };
  const { cls, label } = map[estado] ?? map.PENDIENTE;
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

// ─── Modal: Agregar participante ──────────────────────────────────────────────

function AgregarParticipanteModal({ eeId, euEncargadoId, slotsDisponibles, maxPermitidos, slotsUsados, onClose, onOk }: any) {
  const [form, setForm] = useState({ nombres: "", apellidoPaterno: "", correo: "", telefono: "", cargo: "" });
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!form.nombres || !form.apellidoPaterno || !form.correo) {
      setErr("Nombre, apellido y correo son requeridos");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/empresa/participantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, euEncargadoId, ...form }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      onOk(`Participante agregado. Credenciales generadas para ${form.correo}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-extrabold text-gray-900">Agregar participante</h3>
        <p className="text-xs text-gray-500">
          Cupos disponibles: <span className="font-bold text-[#449D3A]">{slotsDisponibles}</span> de {slotsUsados} usados / {maxPermitidos} máximo
        </p>
        {[
          { label: "Nombres *",             key: "nombres",         type: "text" },
          { label: "Apellido paterno *",     key: "apellidoPaterno", type: "text" },
          { label: "Correo electrónico *",   key: "correo",          type: "email" },
          { label: "Teléfono",               key: "telefono",        type: "tel" },
          { label: "Cargo",                  key: "cargo",           type: "text" },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
            <input
              type={type}
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
            />
          </div>
        ))}
        {err && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{err}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={enviando} className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
            {enviando ? "Agregando..." : "Agregar participante"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Pago adicional ────────────────────────────────────────────────────

function PagoAdicionalModal({ eeId, euEncargadoId, maxPermitidos, slotsPagados, onClose, onOk }: any) {
  const [cantidad, setCantidad] = useState(1);
  const [urlComprobante, setUrlComprobante] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qrPago, setQrPago] = useState<string | null>(null);
  const [montoCalculado, setMontoCalculado] = useState<number>(0);

  const maxAdicionales = maxPermitidos - slotsPagados;

  useEffect(() => {
    fetch(`${API}/empresa/pagos-adicionales/qr?eeId=${eeId}&cantidad=${cantidad}`).then((r) => r.json()).then((d) => { setQrPago(d.urlQR || null); setMontoCalculado(Number(d.monto || 0)); }).catch(() => setQrPago(null));
  }, [eeId, cantidad]);

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
    setErr(null);
    if (!urlComprobante.trim()) { setErr("Debes subir el comprobante de pago"); return; }
    if (cantidad < 1) { setErr("La cantidad debe ser al menos 1"); return; }
    setEnviando(true);
    try {
      const res = await fetch(`${API}/empresa/pagos-adicionales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, euEncargadoId, cantidadParticipantes: cantidad, urlComprobante }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      onOk("Solicitud de cupos adicionales enviada. Pendiente de aprobación por el administrador.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const isPdf = previewUrl && (previewUrl.includes(".pdf") || previewUrl.includes("/raw/upload/"));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-extrabold text-gray-900">Solicitar cupos adicionales</h3>
        {maxAdicionales <= 0 ? (
          <>
            <div className="bg-amber-50 text-amber-700 rounded-xl p-4 text-sm">
              Has alcanzado el máximo de {maxPermitidos} participantes permitidos. No puedes solicitar más cupos.
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cerrar</button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Cupos actuales: {slotsPagados} pagados. Máximo: {maxPermitidos}. Puedes agregar hasta{" "}
              <span className="font-bold text-[#449D3A]">{maxAdicionales}</span> cupos más.
            </p>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Cantidad de cupos adicionales</label>
              <input
                type="number" min={1} max={maxAdicionales} value={cantidad}
                onChange={(e) => setCantidad(Math.min(maxAdicionales, Math.max(1, Number(e.target.value))))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Comprobante de pago *</label>
              {qrPago && <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-center"><p className="text-xs font-bold text-green-800 mb-2">QR para {cantidad} participante{cantidad > 1 ? 's' : ''} adicional{cantidad > 1 ? 'es' : ''} · Bs {montoCalculado.toFixed(2)}</p><a href={qrPago} target="_blank" rel="noreferrer"><img src={qrPago} alt="QR de pago adicional" className="mx-auto h-48 w-full object-contain" /></a><p className="mt-1 text-[11px] text-green-700">Toca la imagen para verla completa.</p></div>}

              {/* Preview */}
              {previewUrl && (
                <div className="mb-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 h-40 flex items-center justify-center">
                  {isPdf ? (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <FileText className="w-10 h-10 text-[#449D3A]" />
                      <p className="text-xs font-semibold">Archivo PDF adjunto</p>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Comprobante" className="w-full h-full object-contain" />
                  )}
                </div>
              )}

              {/* Upload zone */}
              <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${uploading ? "border-[#449D3A] bg-green-50" : "border-gray-200 hover:border-[#449D3A] hover:bg-green-50"}`}>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
                <Upload className={`w-6 h-6 mb-1.5 ${uploading ? "text-[#449D3A] animate-bounce" : "text-gray-400"}`} />
                <p className={`text-sm font-semibold ${uploading ? "text-[#449D3A]" : "text-gray-600"}`}>
                  {uploading ? "Subiendo..." : previewUrl ? "Reemplazar comprobante" : "Subir comprobante"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Imagen o PDF — Máx. 5 MB</p>
              </label>
            </div>
            {err && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{err}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={submit} disabled={enviando || uploading || !urlComprobante} className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
                {enviando ? "Enviando..." : "Solicitar cupos"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmpresaPerfilPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Personal profile state
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombres: "", apellidoPaterno: "", apellidoMaterno: "", telefono: "" });
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [errForm, setErrForm] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  // Sube la foto y la guarda de inmediato en el perfil del usuario.
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ctx) return;
    if (file.size > 5 * 1024 * 1024) { setErrForm("La imagen no debe superar 5 MB."); return; }
    setSubiendoFoto(true);
    setErrForm(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`${API}/public/imagenes/upload`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!upData.url) throw new Error("No se pudo subir la imagen");

      const res = await fetch(`${API}/empresa/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euId: ctx.empresaUsuarioId, urlFotoPerfil: upData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "No se pudo guardar la foto");

      setCtx((prev: any) => ({ ...prev, usuario: { ...prev.usuario, urlFotoPerfil: upData.url } }));
      const raw = localStorage.getItem("empresaUser");
      if (raw) {
        const u = JSON.parse(raw);
        localStorage.setItem("empresaUser", JSON.stringify({ ...u, urlFotoPerfil: upData.url }));
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }
      setExito("Foto de perfil actualizada.");
      setTimeout(() => setExito(null), 4000);
    } catch (err: any) {
      setErrForm(err.message ?? "Error al subir la foto");
    } finally {
      setSubiendoFoto(false);
      e.target.value = "";
    }
  };

  const handleLogoEmpresaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ctx?.esResponsable) return;
    if (file.size > 5 * 1024 * 1024) { setErrForm("La imagen no debe superar 5 MB."); return; }
    setSubiendoLogo(true);
    setErrForm(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`${API}/public/imagenes/upload`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData.url) throw new Error(upData?.message || "No se pudo subir la imagen");
      const res = await fetch(`${API}/empresa/ficha/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euId: ctx.empresaUsuarioId, urlFotoPerfil: upData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar la imagen de la empresa");
      setCtx((prev: any) => ({ ...prev, empresa: { ...prev.empresa, urlFotoPerfil: upData.url } }));
      setExito("Imagen de la empresa actualizada.");
      setTimeout(() => setExito(null), 4000);
    } catch (err: any) {
      setErrForm(err.message || "Error al cambiar la imagen de la empresa");
    } finally {
      setSubiendoLogo(false);
      e.target.value = "";
    }
  };

  // Participant management state (encargado only)
  const [dataParticipantes, setDataParticipantes] = useState<any>(null);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [desactivando, setDesactivando] = useState<number | null>(null);
  const [modalDesactivarEu, setModalDesactivarEu] = useState<number | null>(null);
  const [mensajeP, setMensajeP] = useState<string | null>(null);
  const [mensajeErrP, setMensajeErrP] = useState<string | null>(null);

  // Ficha comercial (oferta/demanda/intereses) — solo encargado edita
  const [editandoComercial, setEditandoComercial] = useState(false);
  const [formComercial, setFormComercial] = useState({ oferta: "", demanda: "", interesesBusqueda: "" });
  const [guardandoComercial, setGuardandoComercial] = useState(false);
  const [errComercial, setErrComercial] = useState<string | null>(null);
  const [exitoComercial, setExitoComercial] = useState<string | null>(null);

  const handleGuardarComercial = async () => {
    if (!ctx) return;
    setErrComercial(null);
    setGuardandoComercial(true);
    try {
      const res = await fetch(`${API}/empresa/perfil-comercial`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euId: ctx.empresaUsuarioId, ...formComercial }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "No se pudo guardar");
      setCtx((c: any) => ({ ...c, empresa: { ...c.empresa, ...d } }));
      setEditandoComercial(false);
      setExitoComercial("Ficha comercial actualizada.");
      setTimeout(() => setExitoComercial(null), 4000);
    } catch (e: any) {
      setErrComercial(e.message);
    } finally {
      setGuardandoComercial(false);
    }
  };

  // Password reset via email (code flow)
  const [resetStep,    setResetStep]    = useState<"idle"|"sending"|"code"|"success">("idle");
  const [resetModal,   setResetModal]   = useState(false);
  const [resetCodigo,  setResetCodigo]  = useState("");
  const [resetNueva,   setResetNueva]   = useState("");
  const [resetConf,    setResetConf]    = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErr,     setResetErr]     = useState<string | null>(null);

  const handleEnviarCodigo = async () => {
    const correo = ctx?.usuario?.correo;
    if (!correo) return;
    setResetStep("sending");
    try {
      await fetch(`${API}/auth/solicitar-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      setResetCodigo(""); setResetNueva(""); setResetConf(""); setResetErr(null);
      setResetStep("code");
      setResetModal(true);
    } catch {
      setResetStep("idle");
    }
  };

  const handleConfirmarReset = async () => {
    setResetErr(null);
    if (resetCodigo.length !== 6) { setResetErr("Ingresa el código de 6 dígitos."); return; }
    if (resetNueva.length < 6)    { setResetErr("La contraseña debe tener al menos 6 caracteres."); return; }
    if (resetNueva !== resetConf)  { setResetErr("Las contraseñas no coinciden."); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`${API}/auth/confirmar-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: ctx?.usuario?.correo, codigo: resetCodigo, nuevaContrasenia: resetNueva }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message || "Código incorrecto o expirado.");
      setResetStep("success");
    } catch (e: any) {
      setResetErr(e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetModal(false);
    setResetStep("idle");
    setResetCodigo(""); setResetNueva(""); setResetConf(""); setResetErr(null);
  };

  const cargarParticipantes = useCallback(async (eeId: number) => {
    setLoadingParticipantes(true);
    try {
      const r = await fetch(`${API}/empresa/participantes?eeId=${eeId}`);
      if (r.ok) setDataParticipantes(await r.json());
    } finally {
      setLoadingParticipantes(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }

    fetch(`${API}/empresa/perfil?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCtx(data);
        setForm({
          nombres:         data.usuario?.nombres ?? "",
          apellidoPaterno: data.usuario?.apellidoPaterno ?? "",
          apellidoMaterno: data.usuario?.apellidoMaterno ?? "",
          telefono:        data.usuario?.telefono ?? "",
        });
        setFormComercial({
          oferta:            data.empresa?.oferta ?? "",
          demanda:           data.empresa?.demanda ?? "",
          interesesBusqueda: data.empresa?.interesesBusqueda ?? "",
        });
        if (data.esResponsable && data.empresaeventoId) {
          cargarParticipantes(data.empresaeventoId);
        }
      })
      .catch(() => setError("No se pudo cargar el perfil."))
      .finally(() => setLoading(false));
  }, [router, cargarParticipantes]);

  const handleGuardar = async () => {
    setErrForm(null); setExito(null);
    if (!form.nombres.trim()) { setErrForm("El nombre es requerido."); return; }
    if (!form.apellidoPaterno.trim()) { setErrForm("El apellido paterno es requerido."); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/empresa/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ euId: ctx.empresaUsuarioId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al guardar");
      setCtx((prev: any) => ({ ...prev, usuario: { ...prev.usuario, ...data } }));
      setExito("Perfil actualizado correctamente.");
      setEditando(false);
      const raw = localStorage.getItem("empresaUser");
      if (raw) {
        const u = JSON.parse(raw);
        localStorage.setItem("empresaUser", JSON.stringify({
          ...u, nombres: data.nombres, apellidoPaterno: data.apellidoPaterno,
          apellidoMaterno: data.apellidoMaterno, telefono: data.telefono,
        }));
      }
    } catch (e: any) {
      setErrForm(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!ctx || !modalDesactivarEu) return;
    const euId = modalDesactivarEu;
    setModalDesactivarEu(null);
    setDesactivando(euId);
    try {
      const res = await fetch(`${API}/empresa/participantes/${euId}/desactivar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId: ctx.empresaeventoId, euEncargadoId: ctx.empresaUsuarioId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setMensajeP("Participante desactivado correctamente.");
      setTimeout(() => setMensajeP(null), 4000);
      cargarParticipantes(ctx.empresaeventoId);
    } catch (e: any) {
      setMensajeErrP(e.message);
      setTimeout(() => setMensajeErrP(null), 4000);
    } finally {
      setDesactivando(null);
    }
  };

  const handleDesactivar = (euId: number) => {
    if (!ctx) return;
    setModalDesactivarEu(euId);
  };

  // ─── Loading / error states ───────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !ctx) return (
    <div className="p-8 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600">{error ?? "No se encontró el perfil."}</p>
    </div>
  );

  const { usuario, empresa, cargo, esResponsable } = ctx;
  const initials = `${(usuario.nombres ?? "?")[0]}${(usuario.apellidoPaterno ?? "")[0] ?? ""}`.toUpperCase();

  const {
    slotsUsados = 0, slotsPagados = 0, slotsDisponibles = 0,
    maxPermitidos = 5, participantes = [], pagos = [],
  } = dataParticipantes ?? {};

  return (
    <>
      {/* Modals */}
      {modalAgregar && slotsDisponibles > 0 && (
        <AgregarParticipanteModal
          eeId={ctx.empresaeventoId} euEncargadoId={ctx.empresaUsuarioId}
          slotsDisponibles={slotsDisponibles} maxPermitidos={maxPermitidos} slotsUsados={slotsUsados}
          onClose={() => setModalAgregar(false)}
          onOk={(msg: string) => {
            setModalAgregar(false);
            setMensajeP(msg);
            setTimeout(() => setMensajeP(null), 6000);
            cargarParticipantes(ctx.empresaeventoId);
          }}
        />
      )}
      {modalPago && (
        <PagoAdicionalModal
          eeId={ctx.empresaeventoId} euEncargadoId={ctx.empresaUsuarioId}
          maxPermitidos={maxPermitidos} slotsPagados={slotsPagados} slotsUsados={slotsUsados}
          onClose={() => setModalPago(false)}
          onOk={(msg: string) => {
            setModalPago(false);
            setMensajeP(msg);
            setTimeout(() => setMensajeP(null), 6000);
            cargarParticipantes(ctx.empresaeventoId);
          }}
        />
      )}
      {modalDesactivarEu && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900">Desactivar participante</h3>
                <p className="text-sm text-gray-500">Ya no podrá acceder al evento.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalDesactivarEu(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarDesactivar}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-900">Mi Perfil</h1>
          {!editando && (
            <button
              onClick={() => { setEditando(true); setExito(null); }}
              className="flex items-center gap-2 text-sm font-bold text-[#449D3A] hover:bg-green-50 px-4 py-2 rounded-xl transition-colors border border-[#449D3A]/30"
            >
              <Edit3 className="w-4 h-4" />
              Editar datos personales
            </button>
          )}
        </div>

        {/* Avatar banner */}
        <div className="bg-gradient-to-r from-[#449D3A] to-emerald-500 rounded-2xl p-6 text-white flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-extrabold border-2 border-white/40 overflow-hidden">
              {usuario.urlFotoPerfil
                ? <img src={usuario.urlFotoPerfil} alt="Tu foto de perfil" className="w-full h-full object-contain" />
                : initials}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-green-50 transition-colors" title="Cambiar foto de perfil">
              {subiendoFoto
                ? <div className="w-4 h-4 border-2 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-4 h-4 text-[#449D3A]" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} disabled={subiendoFoto} />
            </label>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold">{usuario.nombres} {usuario.apellidoPaterno}</h2>
            <p className="text-green-100 text-sm truncate">{usuario.correo}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {esResponsable && (
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                  Encargado principal
                </span>
              )}
              {cargo && (
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                  {cargo}
                </span>
              )}
            </div>
          </div>
        </div>

        {exito && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-4 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{exito}
          </div>
        )}

        {/* Personal + Company — two column on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal data */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Datos personales</h2>
            </div>

            {editando ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Nombres <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={form.nombres}
                      onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Apellido paterno <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={form.apellidoPaterno}
                      onChange={(e) => setForm((f) => ({ ...f, apellidoPaterno: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Apellido materno
                    </label>
                    <input type="text" value={form.apellidoMaterno}
                      onChange={(e) => setForm((f) => ({ ...f, apellidoMaterno: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Teléfono
                    </label>
                    <input type="tel" value={form.telefono}
                      onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Correo electrónico
                  </label>
                  <input type="email" value={usuario.correo} disabled
                    className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                  <p className="text-xs text-gray-400 mt-1">El correo no puede modificarse.</p>
                </div>

                {errForm && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{errForm}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button onClick={() => { setEditando(false); setErrForm(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button onClick={handleGuardar} disabled={guardando}
                    className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {guardando ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : <Save className="w-4 h-4" />}
                    Guardar cambios
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  { k: "Nombres",          v: usuario.nombres },
                  { k: "Apellido paterno", v: usuario.apellidoPaterno },
                  { k: "Apellido materno", v: usuario.apellidoMaterno || "—" },
                  { k: "Correo",           v: usuario.correo },
                  { k: "Teléfono",         v: usuario.telefono || "—" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-44 shrink-0 text-gray-400 font-medium">{k}</dt>
                    <dd className="font-semibold text-gray-800 break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Company info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Mi empresa</h2>
            </div>
            <div className="flex items-center gap-4 mb-5 rounded-xl bg-gray-50 p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                {empresa?.urlFotoPerfil
                  ? <img src={empresa.urlFotoPerfil} alt={`Imagen de ${empresa.nombre || "la empresa"}`} className="h-full w-full object-contain" />
                  : <Building2 className="h-7 w-7 text-gray-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800">Imagen de la empresa</p>
                <p className="text-xs text-gray-500">Se muestra completa en el directorio y el perfil.</p>
                {esResponsable && (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#449D3A]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#449D3A] hover:bg-green-50">
                    {subiendoLogo ? "Subiendo..." : "Cambiar imagen"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoEmpresaUpload} disabled={subiendoLogo} />
                  </label>
                )}
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                { k: "Código",       v: empresa?.codigo || "—" },
                { k: "Nombre",       v: empresa?.nombre },
                { k: "Rubro",        v: empresa?.rubro },
                { k: "Correo corp.", v: empresa?.correoCorporativo || "—" },
                { k: "Sitio web",    v: empresa?.sitioWeb || "—" },
                { k: "Descripción",  v: empresa?.descripcion || "—" },
              ].map(({ k, v }) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-36 shrink-0 text-gray-400 font-medium">{k}</dt>
                  <dd className="font-semibold text-gray-800 break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
              Los datos de la empresa son gestionados por el equipo organizador.
            </p>
          </div>
        </div>

        {/* Ficha comercial: oferta / demanda / intereses — visible a todos, editable solo por el encargado */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Ficha comercial</h2>
            </div>
            {esResponsable && !editandoComercial && (
              <button
                onClick={() => setEditandoComercial(true)}
                className="flex items-center gap-2 text-xs font-bold text-[#449D3A] hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-[#449D3A]/30"
              >
                <Edit3 className="w-3.5 h-3.5" />Editar
              </button>
            )}
          </div>

          {exitoComercial && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{exitoComercial}
            </div>
          )}

          {editandoComercial ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">¿Qué ofrece tu empresa?</label>
                <textarea value={formComercial.oferta} maxLength={LIMITES.oferta}
                  onChange={(e) => setFormComercial((f) => ({ ...f, oferta: e.target.value.slice(0, LIMITES.oferta) }))}
                  rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none" />
                <p className="text-[11px] text-gray-400 mt-1 text-right">{formComercial.oferta.length}/{LIMITES.oferta}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">¿Qué busca tu empresa?</label>
                <textarea value={formComercial.demanda} maxLength={LIMITES.demanda}
                  onChange={(e) => setFormComercial((f) => ({ ...f, demanda: e.target.value.slice(0, LIMITES.demanda) }))}
                  rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none" />
                <p className="text-[11px] text-gray-400 mt-1 text-right">{formComercial.demanda.length}/{LIMITES.demanda}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Sectores de interés (separados por coma)</label>
                <input value={formComercial.interesesBusqueda} onChange={(e) => setFormComercial((f) => ({ ...f, interesesBusqueda: e.target.value }))}
                  placeholder="Ej: Agroindustria, Logística, Transporte y Comercio Exterior"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]" />
              </div>
              {errComercial && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{errComercial}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setEditandoComercial(false); setErrComercial(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleGuardarComercial} disabled={guardandoComercial}
                  className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50">
                  {guardandoComercial ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Ofrece</p>
                <p className="text-sm text-green-800">{empresa?.oferta || "Sin definir"}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Busca</p>
                <p className="text-sm text-blue-800">{empresa?.demanda || "Sin definir"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Sectores de interés</p>
                <p className="text-sm text-gray-700">{empresa?.interesesBusqueda || "Sin definir"}</p>
              </div>
            </div>
          )}
          {!esResponsable && (
            <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
              Solo el encargado de la empresa puede editar la ficha comercial.
            </p>
          )}
        </div>

        {/* Credencial digital (QR) */}
        {ctx.urlCredencialQR && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-[#449D3A]" />
              <h2 className="font-bold text-gray-900">Tu credencial digital</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <ImagenLightbox src={ctx.urlCredencialQR} className="w-40 h-40 rounded-xl border border-gray-100 overflow-hidden shrink-0" />
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-600 mb-3">Presenta este código QR en el evento como tu credencial de acceso.</p>
                <a
                  href={ctx.urlCredencialQR}
                  download={`credencial-${empresa?.codigo ?? "rueda"}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />Descargar credencial
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SECTION: Gestión de Participantes (Encargado only) ═══════════════ */}
        {esResponsable && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Gestión de Participantes</h2>
                <p className="text-sm text-gray-500 mt-0.5">Administra los participantes y cupos de tu empresa en este evento.</p>
              </div>
              {!loadingParticipantes && dataParticipantes && (
                <div className="flex gap-2 flex-wrap shrink-0">
                  {slotsDisponibles > 0 && (
                    <button
                      onClick={() => setModalAgregar(true)}
                      className="flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl"
                    >
                      <UserPlus className="w-4 h-4" />Agregar participante
                    </button>
                  )}
                  {slotsPagados < maxPermitidos && (
                    <button
                      onClick={() => setModalPago(true)}
                      className="flex items-center gap-2 border border-[#449D3A] text-[#449D3A] hover:bg-green-50 text-sm font-bold px-4 py-2.5 rounded-xl"
                    >
                      <CreditCard className="w-4 h-4" />Solicitar más cupos
                    </button>
                  )}
                </div>
              )}
            </div>

            {mensajeP && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />{mensajeP}
              </div>
            )}
            {mensajeErrP && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{mensajeErrP}
              </div>
            )}

            {loadingParticipantes ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dataParticipantes ? (
              <>
                {/* Slot summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Máx. permitidos",  value: maxPermitidos,   color: "text-gray-700" },
                    { label: "Cupos pagados",     value: slotsPagados,    color: "text-blue-700" },
                    { label: "Cupos usados",      value: slotsUsados,     color: "text-amber-700" },
                    {
                      label: "Cupos disponibles",
                      value: slotsDisponibles,
                      color: slotsDisponibles > 0 ? "text-[#449D3A]" : "text-gray-500",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {slotsDisponibles === 0 && slotsPagados < maxPermitidos && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Sin cupos disponibles</p>
                      <p className="text-xs text-amber-700 mt-0.5">Solicita cupos adicionales para agregar más participantes.</p>
                    </div>
                  </div>
                )}

                {slotsPagados >= maxPermitidos && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Has alcanzado el límite máximo de <strong>{maxPermitidos}</strong> participantes permitidos por el evento.
                    </p>
                  </div>
                )}

                {/* Participant list */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                    <Users className="w-5 h-5 text-[#449D3A]" />
                    <h3 className="font-bold text-gray-900">Participantes registrados ({slotsUsados})</h3>
                  </div>
                  {participantes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">Sin participantes registrados.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {participantes.map((p: any) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-sm font-extrabold text-[#449D3A] shrink-0">
                              {(p.usuario.nombres?.[0] ?? "?") + (p.usuario.apellidoPaterno?.[0] ?? "")}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{p.usuario.nombres} {p.usuario.apellidoPaterno}</p>
                              <p className="text-xs text-gray-400">{p.usuario.correo}</p>
                              {p.cargo && <p className="text-xs text-gray-400">{p.cargo}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {p.esResponsable ? (
                              <span className="text-xs font-bold bg-green-100 text-[#449D3A] px-2.5 py-1 rounded-full">Encargado</span>
                            ) : (
                              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">Participante</span>
                            )}
                            {!p.esResponsable && (
                              <button
                                onClick={() => handleDesactivar(p.id)}
                                disabled={desactivando === p.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold disabled:opacity-50"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                {desactivando === p.id ? "..." : "Desactivar"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment history */}
                {pagos.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                      <CreditCard className="w-5 h-5 text-[#449D3A]" />
                      <h3 className="font-bold text-gray-900">Historial de pagos</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {pagos.map((p: any) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                          <div>
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.tipoPago === "INICIAL" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                                {p.tipoPago === "INICIAL" ? "Registro inicial" : `+${p.cantidadParticipantes} cupos adicionales`}
                              </span>
                              {estadoPagoBadge(p.estadoPago)}
                            </div>
                            {p.montoPago && (
                              <p className="text-xs text-gray-400">Monto: Bs. {Number(p.montoPago).toFixed(2)}</p>
                            )}
                            {p.observacion && (
                              <p className="text-xs text-amber-600 mt-0.5">Observación: {p.observacion}</p>
                            )}
                            <p className="text-xs text-gray-400">{new Date(p.fechaCreacion).toLocaleDateString("es-BO")}</p>
                          </div>
                          {p.urlComprobante && (
                            <a href={p.urlComprobante} target="_blank" rel="noreferrer"
                              className="text-xs text-[#449D3A] font-bold hover:underline shrink-0">
                              Ver comprobante
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {/* Cambiar contraseña */}
        {ctx && (
          <>
            {/* Modal reset por código */}
            {resetModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                        {resetStep === "success"
                          ? <CheckCircle2 className="w-5 h-5 text-[#449D3A]" />
                          : <KeyRound className="w-5 h-5 text-[#449D3A]" />}
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {resetStep === "success" ? "¡Contraseña actualizada!" : "Cambiar contraseña"}
                      </h3>
                    </div>
                    <button onClick={closeResetModal} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {resetStep === "success" ? (
                      <div className="text-center space-y-4 py-4">
                        <CheckCircle2 className="w-12 h-12 text-[#449D3A] mx-auto" />
                        <p className="text-gray-600">Tu contraseña fue actualizada correctamente.</p>
                        <button onClick={closeResetModal}
                          className="px-6 py-2.5 bg-[#449D3A] hover:bg-[#3a8531] text-white font-bold rounded-xl text-sm transition-colors">
                          Cerrar
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">
                          Ingresa el código de 6 dígitos que enviamos a <strong>{ctx.usuario?.correo}</strong>.
                        </p>
                        {resetErr && (
                          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />{resetErr}
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Código de verificación</label>
                          <input
                            type="text" maxLength={6} value={resetCodigo}
                            onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, ""))}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] tracking-[0.5em] font-bold text-center"
                            placeholder="000000"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nueva contraseña</label>
                          <input type="password" value={resetNueva} onChange={(e) => setResetNueva(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
                            placeholder="••••••••" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Confirmar contraseña</label>
                          <input type="password" value={resetConf} onChange={(e) => setResetConf(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
                            placeholder="••••••••" />
                        </div>
                        <button onClick={handleConfirmarReset} disabled={resetLoading}
                          className="w-full py-2.5 bg-[#449D3A] hover:bg-[#3a8531] text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                          {resetLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                          {resetLoading ? "Verificando..." : "Confirmar cambio"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <Shield className="w-5 h-5 text-[#449D3A]" />
                <h3 className="font-bold text-gray-900">Seguridad</h3>
              </div>
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Contraseña</p>
                  <p className="text-xs text-gray-400 mt-0.5">Te enviaremos un código a tu correo para verificar tu identidad.</p>
                </div>
                <button
                  onClick={handleEnviarCodigo}
                  disabled={resetStep === "sending"}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors sm:shrink-0"
                >
                  {resetStep === "sending"
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</>
                    : <><KeyRound className="w-4 h-4" />Cambiar contraseña</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
