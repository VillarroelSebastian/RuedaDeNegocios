"use client";
import { useEffect } from "react";

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
      if (!token) return original(input, init);
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return original(input, { ...init, headers });
    };
    return () => { window.fetch = original; };
  }, []);
  return null;
}
