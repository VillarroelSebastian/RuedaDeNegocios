"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const GREEN = "#449D3A";

type Step = "correo" | "codigo" | "nueva" | "exito";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasenia, setNuevaContrasenia] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSolicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!correo) { setError("Ingresa tu correo electrónico."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/solicitar-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "No se pudo enviar el correo. Verifica tu dirección e intenta de nuevo.");
      }
      setStep("codigo");
    } catch (err: any) {
      setError(err.message || "No se pudo enviar el correo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!codigo || codigo.length !== 6) { setError("Ingresa el código de 6 dígitos."); return; }
    if (!nuevaContrasenia || nuevaContrasenia.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (nuevaContrasenia !== confirmar) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/confirmar-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, codigo, nuevaContrasenia }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Código incorrecto o expirado.");
      setStep("exito");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {/* Navbar */}
      <header className="w-full bg-white flex items-center justify-between px-8 py-4 shrink-0 border-b border-gray-100">
        <div className="relative h-12 w-48">
          <Image src="/assets/iconos/logo.png" alt="Rueda de Negocios" fill sizes="192px" className="object-contain object-left" priority />
        </div>
        <Link href="/auth/login" className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Volver al login
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Paso 1: Ingresar correo */}
          {step === "correo" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                  <Mail className="w-8 h-8" style={{ color: GREEN }} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">¿Olvidaste tu contraseña?</h1>
              <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
                Ingresa tu correo y te enviaremos un código de verificación de 6 dígitos.
              </p>
              <form onSubmit={handleSolicitarCodigo} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold text-center">{error}</div>}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
                      required placeholder="ejemplo@correo.com"
                      className="w-full rounded-xl border border-gray-200 py-3.5 pl-10 pr-4 text-sm bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A]"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                  style={{ backgroundColor: GREEN }}>
                  {loading ? "Enviando..." : "Enviar código"}
                </button>
              </form>
            </div>
          )}

          {/* Paso 2: Código + nueva contraseña */}
          {step === "codigo" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                  <KeyRound className="w-8 h-8" style={{ color: GREEN }} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">Revisa tu correo</h1>
              <p className="text-sm text-gray-500 text-center mb-1 leading-relaxed">
                Enviamos un código a <strong className="text-gray-700">{correo}</strong>
              </p>
              <p className="text-xs text-gray-400 text-center mb-8">Válido por 15 minutos. Revisa también tu carpeta de spam.</p>

              <form onSubmit={handleConfirmarReset} className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold text-center">{error}</div>}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Código de 6 dígitos</label>
                  <input
                    type="text" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6} placeholder="000000"
                    className="w-full rounded-xl border border-gray-200 py-3.5 px-4 text-center text-2xl font-bold tracking-[12px] bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPass ? "text" : "password"} value={nuevaContrasenia}
                      onChange={(e) => setNuevaContrasenia(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-gray-200 py-3.5 pl-10 pr-10 text-sm bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A]"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConf ? "text" : "password"} value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full rounded-xl border border-gray-200 py-3.5 pl-10 pr-10 text-sm bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A]"
                    />
                    <button type="button" onClick={() => setShowConf(!showConf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showConf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                  style={{ backgroundColor: GREEN }}>
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>

                <button type="button" onClick={() => { setStep("correo"); setError(""); }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cambiar correo
                </button>
              </form>
            </div>
          )}

          {/* Paso 3: Éxito */}
          {step === "exito" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" style={{ color: GREEN }} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Link href="/auth/login"
                className="block w-full py-3.5 rounded-xl text-white font-bold text-sm text-center transition-colors"
                style={{ backgroundColor: GREEN }}>
                Ir al login
              </Link>
            </div>
          )}

        </div>
      </main>

      <footer className="w-full text-center py-6">
        <p className="text-[11px] text-gray-400">© 2026 Rueda de Negocios del Beni. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
