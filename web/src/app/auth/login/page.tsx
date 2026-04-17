"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, Check } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3334/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasenia }),
      });

      if (!res.ok) {
        throw new Error("Credenciales inválidas");
      }

      const user = await res.json();
      if (user.rolEvento === "Administrador" || user.rolEvento === "TECNICO") {
        localStorage.setItem("adminUser", JSON.stringify(user));
        router.push("/admin/dashboard");
      } else {
        throw new Error("Acceso denegado: no tienes permisos de administrador");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="w-full bg-white flex items-center justify-between px-8 py-4 shrink-0">
        <div className="flex items-center">
          <div className="relative h-12 w-48">
             {/* Logo placeholder - replace with actual logo */}
            <Image 
              src="/assets/iconos/logo.png" 
              alt="Rueda de Negocios del Beni" 
              fill
              sizes="(max-width: 768px) 100vw, 192px"
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="#" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Inicio</Link>
          <Link href="#" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Sobre el Evento</Link>
          <Link href="#" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Contacto</Link>
          <button className="rounded-md bg-[#EEF5E5] px-4 py-2 text-sm font-semibold text-[#5B9A27] hover:bg-[#e4ecc] transition-colors">
            Registrarse
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 shrink-0">
        {/* Card Container that holds both the form and the promo section */}
        <div className="flex flex-col lg:flex-row w-full max-w-[1000px] min-h-[600px] bg-white rounded-2xl shadow-[0px_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          
          {/* Left Side: Form */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center px-10 py-12 lg:px-14">
            
            <div className="w-full max-w-sm mx-auto">
              <h1 className="text-3xl font-extrabold text-[#111827]">
                Iniciar sesión
              </h1>
              <p className="mt-3 text-sm text-[#6B7280] leading-relaxed">
                Accede a tu cuenta para gestionar reuniones, participantes y actividades del evento.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold text-center border border-red-200">
                    {error}
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-sm font-bold text-[#374151] mb-2"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      autoComplete="email"
                      required
                      className="block w-full rounded-xl border border-gray-200 py-3.5 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-[#66A124] focus:ring-1 focus:ring-[#66A124] sm:text-sm bg-[#FAFAFA]"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label 
                    htmlFor="password" 
                    className="block text-sm font-bold text-[#374151] mb-2"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={contrasenia}
                      onChange={(e) => setContrasenia(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="block w-full rounded-xl border border-gray-200 py-3.5 pl-10 pr-10 text-gray-900 placeholder:text-gray-400 focus:border-[#66A124] focus:ring-1 focus:ring-[#66A124] sm:text-sm bg-[#FAFAFA]"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-[#5B9A27] focus:ring-[#5B9A27]"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-600">
                      Recordarme
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link href="/auth/forgot-password" className="font-bold text-[#66A124] hover:text-[#528a1d]">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="mt-8 space-y-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-xl bg-[#5B9A27] px-3 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#4d8321] transition-colors disabled:opacity-50"
                  >
                    {loading ? "Cargando..." : "Iniciar sesión"}
                  </button>
                  
                  <button
                    type="button"
                    className="flex w-full justify-center rounded-xl bg-[#FAFAFA] border border-gray-200 px-3 py-3.5 text-sm font-bold text-[#374151] shadow-sm hover:bg-gray-100 transition-colors"
                  >
                    Crear cuenta nueva
                  </button>
                </div>
              </form>
              
              <div className="mt-12 text-center border-t border-gray-100 pt-6">
                <p className="text-[11px] text-[#9CA3AF] leading-relaxed max-w-[280px] mx-auto">
                  Si tu empresa ya está registrada, inicia sesión con tus credenciales. 
                  Si aún no estás inscrito, crea tu registro para participar en el evento.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Promo Image & Stats */}
          <div className="hidden lg:flex lg:w-1/2 bg-[#0F1629] relative flex-col items-center justify-center p-12">
            
            <div className="relative w-full max-w-[340px] z-10 flex flex-col items-center">
              
              {/* The Inner Glass Card */}
              <div className="relative w-full rounded-3xl bg-white/5 border border-white/10 p-4 pb-8 backdrop-blur-sm">
                {/* Glow effects (optional, minimal) */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-white/20 blur-xl rounded-full"></div>
                <div className="absolute top-1/2 -right-4 w-10 h-10 bg-white/10 blur-xl rounded-full"></div>
                
                {/* Image placeholder inside the glass card */}
                <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-gray-800">
                  <Image
                    src="/assets/iconos/reunion.png"
                    alt="Impulsando el Beni"
                    fill
                    sizes="(max-width: 768px) 100vw, 340px"
                    priority
                    className="object-cover"
                  />
                </div>
                
                <div className="mt-6 text-center text-white px-2">
                  <h2 className="text-2xl font-bold tracking-tight">Impulsando el Beni</h2>
                  <p className="mt-3 text-xs text-gray-300 leading-relaxed font-light px-2">
                    Conectando empresas, generando oportunidades y fortaleciendo la economía regional.
                  </p>
                </div>
              </div>

              {/* Stats below the card, perfectly aligned with the line connectors */}
              <div className="w-[85%] mt-8 z-10">
                {/* We create a thin line wrapper across if needed, or just borders */}
                <div className="flex justify-between items-end border-t border-white/20 pt-4 pb-2 relative">
                  
                  {/* Circle decoration connecting card and line */}
                  <div className="absolute right-0 -top-[30px] w-0.5 h-[30px] bg-white/20"></div>
                  <div className="absolute right-[-4px] top-[-30px] w-2 h-4 rounded-full bg-white blur-[2px]"></div>
                  
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-2xl font-extrabold text-white">200+</span>
                    <span className="text-[9px] font-bold tracking-widest text-[#9CA3AF] uppercase mt-1">Empresas</span>
                  </div>
                  
                  <div className="w-px h-8 bg-white/20" />
                  
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-2xl font-extrabold text-white">1k+</span>
                    <span className="text-[9px] font-bold tracking-widest text-[#9CA3AF] uppercase mt-1">Reuniones</span>
                  </div>
                  
                  <div className="w-px h-8 bg-white/20" />
                  
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-2xl font-extrabold text-white">$5M+</span>
                    <span className="text-[9px] font-bold tracking-widest text-[#9CA3AF] uppercase mt-1">En Negocios</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 shrink-0">
        <p className="text-[11px] text-[#9CA3AF]">
          © 2026 Rueda de Negocios del Beni. Todos los derechos reservados.
        </p>
      </footer>

    </div>
  );
}
