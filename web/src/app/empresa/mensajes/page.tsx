"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  MessageSquare, Send, Search, X, Building2, ChevronLeft, AlertCircle, Plus,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";
const SOCKET_URL = API.replace(/\/api\/?$/, "");
const POLL_MS = 5000;

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
function fmtFechaCorta(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return fmtHora(iso);
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
}

// Modal para iniciar una conversación nueva eligiendo empresa del directorio
function NuevaConversacionModal({ eeId, onClose, onElegir }: {
  eeId: number; onClose: () => void; onElegir: (ee: { eeId: number; nombre: string }) => void;
}) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API}/empresa/directorio?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [eeId]);

  const filtradas = empresas.filter((e) =>
    [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-extrabold text-gray-900">Nueva conversación</h2>
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
            <p className="text-sm text-gray-400 text-center py-8">Sin resultados.</p>
          ) : (
            filtradas.map((e) => (
              <button
                key={e.empresaeventoId}
                onClick={() => onElegir({ eeId: e.empresaeventoId, nombre: e.nombre })}
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

function MensajesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ctx, setCtx] = useState<any>(null);
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

  const cargarConvs = useCallback((eeId: number) => {
    fetch(`${API}/empresa/mensajes/conversaciones?eeId=${eeId}`)
      .then((r) => r.json())
      .then((d) => setConvs(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const cargarMensajes = useCallback((eeId: number, otroEeId: number) => {
    fetch(`${API}/empresa/mensajes?eeId=${eeId}&otroEeId=${otroEeId}`)
      .then((r) => r.json())
      .then((d) => setMensajes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Contexto de empresa + carga inicial
  useEffect(() => {
    const raw = localStorage.getItem("empresaUser");
    if (!raw) { router.replace("/auth/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/auth/login"); return; }
    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((c) => { setCtx(c); cargarConvs(c.empresaeventoId); })
      .catch(() => setError("No se pudo cargar la mensajería."))
      .finally(() => setCargando(false));
  }, [router, cargarConvs]);

  // Abrir conversación desde query param (?con=eeId&nombre=...)
  useEffect(() => {
    const con = searchParams.get("con");
    const nombre = searchParams.get("nombre");
    if (con && nombre) setActiva({ eeId: Number(con), nombre: decodeURIComponent(nombre) });
  }, [searchParams]);

  // Socket: refrescar en tiempo real cuando llega un mensaje
  useEffect(() => {
    if (!ctx?.empresaeventoId) return;
    const socket: Socket = io(`${SOCKET_URL}/notificaciones`, { transports: ["websocket"] });
    socket.on("connect", () => socket.emit("unirse", { eeId: ctx.empresaeventoId }));
    socket.on("mensaje:nuevo", () => {
      cargarConvs(ctx.empresaeventoId);
      const act = activaRef.current;
      if (act) cargarMensajes(ctx.empresaeventoId, act.eeId);
    });
    return () => { socket.disconnect(); };
  }, [ctx?.empresaeventoId, cargarConvs, cargarMensajes]);

  // Polling de respaldo
  useEffect(() => {
    if (!ctx?.empresaeventoId) return;
    const iv = setInterval(() => {
      cargarConvs(ctx.empresaeventoId);
      const act = activaRef.current;
      if (act) cargarMensajes(ctx.empresaeventoId, act.eeId);
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [ctx?.empresaeventoId, cargarConvs, cargarMensajes]);

  // Al abrir una conversación, cargar sus mensajes
  useEffect(() => {
    if (ctx?.empresaeventoId && activa) {
      cargarMensajes(ctx.empresaeventoId, activa.eeId);
      cargarConvs(ctx.empresaeventoId);
    }
  }, [ctx?.empresaeventoId, activa, cargarMensajes, cargarConvs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !ctx || !activa || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${API}/empresa/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eeId: ctx.empresaeventoId, euId: ctx.empresaUsuarioId,
          receptorEeId: activa.eeId, contenido: t,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Error al enviar"); }
      setTexto("");
      cargarMensajes(ctx.empresaeventoId, activa.eeId);
      cargarConvs(ctx.empresaeventoId);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(null), 4000); }
    finally { setEnviando(false); }
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const esEncargado = !!ctx?.esResponsable;
  const activaEsStaff = activa?.eeId === 0; // conversación con el equipo del evento (solo lectura)

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col">
      {modalNueva && ctx && (
        <NuevaConversacionModal
          eeId={ctx.empresaeventoId}
          onClose={() => setModalNueva(false)}
          onElegir={(e) => { setModalNueva(false); setActiva(e); }}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mensajes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {esEncargado ? "Conversa directamente con otras empresas del evento" : "Conversaciones de tu empresa (solo el encargado puede escribir)"}
          </p>
        </div>
        {esEncargado && (
          <button
            onClick={() => setModalNueva(true)}
            className="flex items-center gap-2 bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva conversación</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex overflow-hidden">
        {/* Lista de conversaciones */}
        <div className={`w-full md:w-80 border-r border-gray-100 flex-col ${activa ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto p-2">
            {convs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aún no tienes conversaciones.</p>
                <p className="text-xs text-gray-400 mt-1">Usa "Nueva conversación" para escribirle a una empresa.</p>
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
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0 font-bold text-[#449D3A] relative">
                    {(c.nombre ?? "E")[0].toUpperCase()}
                    {c.noLeidos > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.noLeidos > 9 ? "9+" : c.noLeidos}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${c.noLeidos > 0 ? "font-extrabold text-gray-900" : "font-bold text-gray-800"}`}>{c.nombre}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{fmtFechaCorta(c.fecha)}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${c.noLeidos > 0 ? "text-gray-700 font-semibold" : "text-gray-400"}`}>
                      {c.esMio ? "Tú: " : ""}{c.ultimoMensaje}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversación activa */}
        <div className={`flex-1 flex-col min-w-0 ${activa ? "flex" : "hidden md:flex"}`}>
          {!activa ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Elige una conversación o inicia una nueva.</p>
            </div>
          ) : (
            <>
              {/* Header conversación */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
                <button onClick={() => setActiva(null)} className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activaEsStaff ? "bg-indigo-50 text-indigo-600" : "bg-green-50 text-[#449D3A]"}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <p className="font-bold text-gray-900 text-sm truncate">{activa.nombre}</p>
                {activaEsStaff && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Organización</span>}
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                {mensajes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Escribe el primer mensaje para iniciar la conversación con {activa.nombre}.
                  </p>
                )}
                {mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.esMio ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.esMio ? "bg-[#449D3A] text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                    }`}>
                      {!m.esMio && m.autor && (
                        <p className="text-[10px] font-bold text-[#449D3A] mb-0.5">{m.autor}</p>
                      )}
                      <p className="whitespace-pre-line break-words">{m.contenido}</p>
                      <p className={`text-[9px] mt-1 text-right ${m.esMio ? "text-white/60" : "text-gray-400"}`}>{fmtHora(m.fecha)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input — solo el encargado puede escribir; la conversación con la organización es de solo lectura */}
              {activaEsStaff ? (
                <div className="px-4 py-3 border-t border-gray-100 shrink-0 text-center text-xs text-gray-400 bg-gray-50/50">
                  Mensajes del equipo del evento — no puedes responder por aquí.
                </div>
              ) : !esEncargado ? (
                <div className="px-4 py-3 border-t border-gray-100 shrink-0 text-center text-xs text-gray-400 bg-gray-50/50">
                  Solo el encargado de la empresa puede enviar mensajes.
                </div>
              ) : (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" /></div>}>
      <MensajesContent />
    </Suspense>
  );
}
