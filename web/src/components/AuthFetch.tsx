"use client";
import { useEffect } from "react";

export default function AuthFetch() {
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
      let token = "";
      for (const key of ["adminUser", "tecnicoUser", "empresaUser"]) {
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
