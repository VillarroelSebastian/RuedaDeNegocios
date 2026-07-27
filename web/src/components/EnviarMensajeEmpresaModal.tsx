"use client";

import React, { useState } from "react";
import { MessageSquare, X, Send, CheckCircle2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

// Modal para que admin/técnico envíe un mensaje directo a una empresa.
// El mensaje aparece en la sección Mensajes de la empresa como "Equipo del evento".
export function EnviarMensajeEmpresaModal({ usuarioId, receptorEeId, empresaNombre, onClose }: {
  usuarioId: number; receptorEeId: number; empresaNombre: string; onClose: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/staff/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, receptorEeId, contenido: texto.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error al enviar el mensaje");
      setOk(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        {ok ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#449D3A]" />
            </div>
            <h3 className="font-extrabold text-gray-900 mb-1">Mensaje enviado</h3>
            <p className="text-sm text-gray-500 mb-5">La empresa <span className="font-semibold">{empresaNombre}</span> verá tu mensaje en su sección de Mensajes.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#449D3A]" />
                Enviar mensaje a la empresa
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Para: <span className="font-bold text-gray-700">{empresaNombre}</span>. Lo verá como un mensaje del equipo del evento (no puede responder por ahí).
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={1000}
              autoFocus
              placeholder="Escribe el mensaje para la empresa..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#449D3A]/30 focus:border-[#449D3A] resize-none mb-3"
            />
            {err && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 mb-3"><AlertCircle className="w-3.5 h-3.5" />{err}</p>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={enviar} disabled={enviando || !texto.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5">
                {enviando ? "Enviando..." : <><Send className="w-4 h-4" />Enviar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
