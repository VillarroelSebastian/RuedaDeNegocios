"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, Plus, X, Smartphone } from "lucide-react";

// Botón para instalar la web como aplicación (PWA).
// - Android / Chrome / Edge: dispara el instalador nativo (beforeinstallprompt).
// - iPhone / iPad (Safari): muestra las instrucciones para "Añadir a pantalla de inicio".
// - Si ya está instalada (abierta en modo app), el botón no se muestra.
export default function InstalarAppButton({
  className = "",
  label = "Instalar app",
}: { className?: string; label?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [modalIOS, setModalIOS] = useState(false);

  useEffect(() => {
    // ¿Ya está instalada / abierta como app?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setInstalada(!!standalone);

    // Detectar iOS (iPhone/iPad) — no soporta beforeinstallprompt
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    setEsIOS(iOS);

    // Registrar el service worker (habilita la instalación como app en Android).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setInstalada(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ya instalada: no mostrar nada
  if (instalada) return null;
  // En navegadores de escritorio sin soporte y que no son iOS, no mostrar
  // (evita un botón que no hace nada). En iOS siempre mostramos (con instrucciones).
  if (!esIOS && !deferredPrompt) return null;

  const onClick = async () => {
    if (esIOS) { setModalIOS(true); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      <button onClick={onClick} className={className}>
        <Download size={16} />
        {label}
      </button>

      {modalIOS && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setModalIOS(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-[#449D3A]" />
                </div>
                <h3 className="font-extrabold text-gray-900">Instalar en tu iPhone</h3>
              </div>
              <button onClick={() => setModalIOS(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Para usar la Rueda de Negocios como una app en tu iPhone, agrégala a tu pantalla de inicio:
            </p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#449D3A] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-sm text-gray-700">
                  Toca el botón <span className="font-bold">Compartir</span>
                  <Share className="w-4 h-4 inline mx-1 text-blue-500" />
                  en la barra de Safari.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#449D3A] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-sm text-gray-700">
                  Elige <span className="font-bold">"Añadir a pantalla de inicio"</span>
                  <Plus className="w-4 h-4 inline mx-1 text-gray-500" />.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#449D3A] text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <p className="text-sm text-gray-700">
                  Toca <span className="font-bold">"Añadir"</span> y listo — el ícono aparecerá en tu inicio.
                </p>
              </li>
            </ol>
            <p className="text-xs text-gray-400 mt-4 bg-gray-50 rounded-xl px-3 py-2">
              Nota: en iPhone debe abrirse en <span className="font-semibold">Safari</span> para poder instalarla.
            </p>
            <button
              onClick={() => setModalIOS(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#449D3A] hover:bg-[#3a8531] text-white text-sm font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
