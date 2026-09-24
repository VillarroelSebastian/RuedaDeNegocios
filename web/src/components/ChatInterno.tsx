"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Users } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const POLL_MS = 6000;

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
}

export default function ChatInterno({ storageKey }: { storageKey: "adminUser" | "tecnicoUser" }) {
  const [user, setUser] = useState<any>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem(storageKey) || "null")); } catch { setUser(null); }
  }, [storageKey]);

  const cargar = useCallback(() => {
    fetch(`${API}/staff/chat-interno`)
      .then((r) => r.json())
      .then((d) => setMensajes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const iv = setInterval(cargar, POLL_MS);
    return () => clearInterval(iv);
  }, [cargar]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !user?.id || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/staff/chat-interno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: user.id, contenido: t }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Error al enviar"); }
      setTexto("");
      cargar();
    } catch (e: any) { setError(e.message); setTimeout(() => setError(null), 4000); }
    finally { setEnviando(false); }
  };

  let fechaAnterior = "";

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#449D3A]" /> Equipo del evento
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Canal compartido entre administración y técnicos para coordinarse</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>
      )}

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50/50">
          {cargando ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center h-full">
              <Users className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Aún no hay mensajes en el canal del equipo.</p>
            </div>
          ) : (
            mensajes.map((m) => {
              const esMio = m.usuario_id === user?.id;
              const dia = fmtFecha(m.fechaCreacion);
              const mostrarFecha = dia !== fechaAnterior;
              fechaAnterior = dia;
              return (
                <React.Fragment key={m.id}>
                  {mostrarFecha && (
                    <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide py-2">{dia}</p>
                  )}
                  <div className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed mb-1 ${
                      esMio ? "bg-[#449D3A] text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                    }`}>
                      {!esMio && (
                        <p className={`text-[10px] font-bold mb-0.5 ${m.autorRol === "ADMIN" ? "text-indigo-600" : "text-blue-600"}`}>
                          {m.autorNombre} · {m.autorRol === "ADMIN" ? "Organización" : "Técnico"}
                        </p>
                      )}
                      <p className="whitespace-pre-line break-words">{m.contenido}</p>
                      <p className={`text-[9px] mt-1 text-right ${esMio ? "text-white/60" : "text-gray-400"}`}>{fmtHora(m.fechaCreacion)}</p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-3 border-t border-gray-100 shrink-0 flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="Escribe algo para el equipo..."
            maxLength={1000}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || enviando}
            className="w-11 h-11 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
