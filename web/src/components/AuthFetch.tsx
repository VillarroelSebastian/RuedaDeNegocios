"use client";
import { useEffect } from "react";

// Sin timeout, una petición puede quedar colgada indefinidamente con mala
// conexión. Los uploads (FormData: fotos, comprobantes) llevan más tiempo
// en conexión lenta, así que tienen más margen.
const TIMEOUT_MS = 20000;
const TIMEOUT_MS_UPLOAD = 60000;

export default function AuthFetch() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334", window.location.origin);
      const target = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
      if (target.origin !== api.origin || !target.pathname.startsWith(api.pathname)) return original(input, init);
      let token = "";
      for (const key of ["adminUser", "tecnicoUser", "empresaUser", "foroUser"]) {
        try { token ||= JSON.parse(localStorage.getItem(key) || "null")?.token || ""; } catch {}
      }
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

      // Si el caller ya trae su propia señal de cancelación, se respeta tal
      // cual. Si no, se agrega un timeout por defecto y, si la red falla o
      // se agota el tiempo, se reemplaza el error nativo en inglés ("Failed
      // to fetch") por un mensaje claro en español — como fetch() solo
      // rechaza por fallas de red (nunca por un status HTTP como 404/500),
      // cualquier rechazo acá es realmente un problema de conexión.
      if (init.signal) return original(input, { ...init, headers });
      const esFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
      const controller = new AbortController();
      let agotado = false;
      const timer = setTimeout(() => { agotado = true; controller.abort(); }, esFormData ? TIMEOUT_MS_UPLOAD : TIMEOUT_MS);
      return original(input, { ...init, headers, signal: controller.signal })
        .catch(() => {
          throw new Error(agotado
            ? "La conexión tardó demasiado. Revisa tu internet e intenta de nuevo."
            : "No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.");
        })
        .then((res) => {
          // Si el servidor responde algo que no es JSON (p. ej. una página
          // de error del proxy), que falle res.json() en pantalla con un
          // "Unexpected token..." en inglés tampoco dice nada al usuario.
          const parseoOriginal = res.json.bind(res);
          res.json = () => parseoOriginal().catch(() => {
            throw new Error("El servidor no respondió correctamente. Intenta de nuevo en unos minutos.");
          });
          return res;
        })
        .finally(() => clearTimeout(timer));
    };
    return () => { window.fetch = original; };
  }, []);
  return null;
}
