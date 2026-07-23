"use client";

import React from "react";
import { CheckCircle2, X } from "lucide-react";

// Modal de confirmación de éxito, cerrable con la X, el botón o clic afuera.
export function ModalExito({ titulo = "¡Listo!", mensaje, onClose }: {
  titulo?: string; mensaje: string; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#449D3A]" />
        </div>
        <h3 className="font-extrabold text-gray-900 mb-1">{titulo}</h3>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">{mensaje}</p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
