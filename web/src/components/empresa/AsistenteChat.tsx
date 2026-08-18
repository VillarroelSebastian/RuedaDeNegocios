"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import ImagenLightbox from "@/components/ui/ImagenLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

interface Msg {
  role: "user" | "bot";
  text: string;
  imageUrl?: string;
  opciones?: string[];
}

const SUGERENCIAS = [
  "Agendar una reunión",
  "¿Cuándo es mi próxima reunión?",
  "¿En qué mesa me toca?",
  "¿Cuál es el estado de mi pago?",
];

export default function AsistenteChat({ eeId, euId }: { eeId: number | null; euId?: number | null }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "¡Hola! Soy tu asistente virtual. ¿En qué te puedo ayudar hoy?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contexto, setContexto] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = async (texto: string) => {
    const escrito = texto.trim();
    const ultimasOpciones = [...msgs].reverse().find((m) => m.role === 'bot' && m.opciones?.length)?.opciones;
    const indice = /^\d+$/.test(escrito) ? Number(escrito) - 1 : -1;
    const t = indice >= 0 && ultimasOpciones?.[indice] ? ultimasOpciones[indice] : escrito;
    if (!t || loading || !eeId) return;
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text: t }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/empresa/asistente`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eeId, euId: euId ?? undefined, mensaje: t, contexto }),
      });
      const data = await res.json();
      setContexto(data.contexto ?? null);
      setMsgs((prev) => [...prev, { role: "bot", text: data.respuesta, imageUrl: data.imageUrl, opciones: data.opciones }]);
    } catch {
      setMsgs((prev) => [...prev, { role: "bot", text: "Lo siento, no pude conectarme al servidor. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button — solo visible con el chat cerrado; el cierre vive en el header del chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#449D3A] hover:bg-[#3a8531] text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Abrir asistente virtual"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden" style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-[#449D3A] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Asistente Virtual</p>
              <p className="text-[10px] text-white/70">Pregúntame sobre el evento</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors"
              aria-label="Cerrar asistente virtual"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-[#449D3A]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#449D3A]" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2 ${m.role === "user" ? "" : "flex-1"}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-line leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#449D3A] text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}>
                    {m.text}
                  </div>
                  {m.imageUrl && (
                    <ImagenLightbox
                      src={m.imageUrl}
                      className="w-full h-40 rounded-xl overflow-hidden border border-gray-200"
                    />
                  )}
                  {/* Quick replies: solo en el último mensaje del bot */}
                  {m.role === "bot" && m.opciones && m.opciones.length > 0 && i === msgs.length - 1 && !loading && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.opciones.map((op, optionIndex) => (
                        <button
                          key={op}
                          onClick={() => send(op)}
                          className="text-[11px] bg-white border border-[#449D3A]/40 text-[#449D3A] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[#449D3A]/10 transition-colors"
                        >
                          {optionIndex + 1}. {op}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-[#449D3A]/10 flex items-center justify-center shrink-0 ml-2 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#449D3A]" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#449D3A]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#449D3A]" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions — shown only on first message */}
          {msgs.length === 1 && (
            <div className="px-4 py-2 border-t border-gray-100 shrink-0">
              <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Preguntas frecuentes</p>
              <div className="flex flex-wrap gap-1">
                {SUGERENCIAS.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[10px] bg-[#449D3A]/10 text-[#449D3A] font-semibold px-2 py-1 rounded-lg hover:bg-[#449D3A]/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 shrink-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Escribe tu pregunta..."
              disabled={loading || !eeId}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading || !eeId}
              className="w-9 h-9 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
