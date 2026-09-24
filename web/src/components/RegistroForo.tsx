"use client";
import { useState } from "react";
import Link from "next/link";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
export default function RegistroForo() {
  const [form, setForm] = useState({ nombres: "", apellidoPaterno: "", telefono: "", correo: "", contrasenia: "", confirmar: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function registrar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (form.contrasenia !== form.confirmar) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      const res = await fetch(API + "/public/registro-foro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo registrar.");
      setDone(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error de conexión."); }
    finally { setBusy(false); }
  }
  if (done) return <section className="mx-auto max-w-lg p-6 text-center"><h1 className="text-2xl font-bold">Tu registro está listo</h1><p className="my-4">Ya puedes ingresar al foro con tu correo y contraseña.</p><Link className="text-green-700 underline" href="/auth/login">Iniciar sesión</Link></section>;
  return <form onSubmit={registrar} className="mx-auto w-full max-w-lg space-y-4 p-4 sm:p-8">
    <h1 className="text-2xl font-bold">Registro personal al foro</h1>
    <p className="text-sm text-gray-600">Accede al programa, noticias y galería del evento.</p>
    {([["nombres","Nombres",105],["apellidoPaterno","Apellido",65],["telefono","Teléfono",45],["correo","Correo electrónico",105],["contrasenia","Contraseña",72],["confirmar","Confirmar contraseña",72]] as const).map(([key,label,max]) =>
      <label key={key} className="block text-sm font-semibold">{label}
        <input required maxLength={max} minLength={key === "contrasenia" ? 8 : undefined}
          type={key === "correo" ? "email" : key === "telefono" ? "tel" : ["contrasenia","confirmar"].includes(key) ? "password" : "text"}
          autoComplete={["contrasenia","confirmar"].includes(key) ? "new-password" : key === "correo" ? "email" : undefined}
          value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}
          className="mt-1 block w-full rounded-xl border border-gray-300 p-3 text-base font-normal" />
      </label>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-[#449D3A] p-3 font-bold text-white disabled:opacity-50">{busy ? "Registrando…" : "Registrarme al foro"}</button>
    <Link href="/auth/login" className="block text-center text-sm text-green-700 underline">Ya tengo una cuenta</Link>
  </form>;
}
