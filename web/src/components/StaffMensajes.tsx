"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Send, Search, X, Building2, ChevronLeft, AlertCircle, Plus,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const POLL_MS = 8000;

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtFechaCorta(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return fmtHora(iso);
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
}

function NuevaConversacionModal({ onClose, onElegir }: {
  onClose: () => void; onElegir: (ee: { eeId: number; nombre: string }) => void;
}) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API}/tecnico/empresas-habilitadas`)
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-extrabold text-gray-900">Nuevo mensaje</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {cargando ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin empresas habilitadas.</p>
          ) : (
            filtradas.map((e) => (
              <button
                key={e.eeId}
                onClick={() => onElegir({ eeId: e.eeId, nombre: e.nombre })}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0 font-bold text-[#449D3A]">
                  {(e.nombre ?? "E")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{e.nombre}</p>
                  {e.rubro && <p className="text-xs text-gray-400 truncate">{e.rubro}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffMensajes({ storageKey }: { storageKey: "adminUser" | "tecnicoUser" }) {
  const [user, setUser] = useState<any>(null);
  const [convs, setConvs] = useState<any[]>([]);
  const [activa, setActiva] = useState<{ eeId: number; nombre: string } | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activaRef = useRef(activa);
  useEffect(() => { activaRef.current = activa; }, [activa]);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem(storageKey) || "null")); } catch { setUser(null); }
  }, [storageKey]);

  const cargarConvs = useCallback(() => {
    fetch(`${API}/staff/mensajes/conversaciones`)
      .then((r) => r.json())
      .then((d) => setConvs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const cargarMensajes = useCallback((eeId: number) => {
    fetch(`${API}/staff/mensajes?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setMensajes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => { cargarConvs(); }, [cargarConvs]);

  useEffect(() => {
    const iv = setInterval(() => {
      cargarConvs();
      const act = activaRef.current;
      if (act) cargarMensajes(act.eeId);
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [cargarConvs, cargarMensajes]);

  useEffect(() => {
    if (activa) cargarMensajes(activa.eeId);
  }, [activa, cargarMensajes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !user?.id || !activa || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/staff/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: user.id, receptorEeId: activa.eeId, contenido: t }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Error al enviar"); }
      setTexto("");
      cargarMensajes(activa.eeId);
      cargarConvs();
    } catch (e: any) { setError(e.message); setTimeout(() => setError(null), 4000); }
    finally { setEnviando(false); }
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
      {modalNueva && (
        <NuevaConversacionModal
          onClose={() => setModalNueva(false)}
          onElegir={(e) => { setModalNueva(false); setActiva(e); }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mensajes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Escríbele directamente a cualquier empresa habilitada del evento</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo mensaje</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex overflow-hidden">
        <div className={`w-full md:w-80 border-r border-gray-100 flex-col ${activa ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto p-2">
            {convs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aún no se ha enviado ningún mensaje.</p>
                <p className="text-xs text-gray-400 mt-1">Usa "Nuevo mensaje" para escribirle a una empresa.</p>
              </div>
            ) : (
              convs.map((c) => (
                <button
                  key={c.eeId}
                  onClick={() => setActiva({ eeId: c.eeId, nombre: c.nombre })}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    activa?.eeId === c.eeId ? "bg-green-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0 font-bold text-[#449D3A]">
                    {(c.nombre ?? "E")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-800 truncate">{c.nombre}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{fmtFechaCorta(c.fecha)}</span>
                    </div>
                    <p className="text-xs truncate mt-0.5 text-gray-400">{c.ultimoMensaje}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 flex-col min-w-0 ${activa ? "flex" : "hidden md:flex"}`}>
          {!activa ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Elige una conversación o escribe un mensaje nuevo.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
                <button onClick={() => setActiva(null)} className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-green-50 text-[#449D3A]">
                  <Building2 className="w-4 h-4" />
                </div>
                <p className="font-bold text-gray-900 text-sm truncate">{activa.nombre}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                {mensajes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Escribe el primer mensaje para {activa.nombre}.
                  </p>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-[#449D3A] text-white rounded-tr-sm">
                      {!!m.autor && <p className="text-[10px] font-bold text-white/80 mb-0.5">{m.autor}</p>}
                      <p className="whitespace-pre-line break-words">{m.contenido}</p>
                      <p className="text-[9px] mt-1 text-right text-white/60">{fmtHora(m.fecha)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="px-3 py-3 border-t border-gray-100 shrink-0 flex gap-2">
                <input
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  placeholder="Escribe un mensaje..."
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
