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
    const removeItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key: string) {
      if (this === localStorage && ["adminUser","tecnicoUser","empresaUser","foroUser"].includes(key)) {
        let user: {token?:string}|null = null;
        try { user = JSON.parse(this.getItem(key) || "null"); } catch {}
        if (user?.token && "serviceWorker" in navigator) {
          const token = user.token;
          void navigator.serviceWorker.getRegistration().then(async reg => {
            const sub = await reg?.pushManager?.getSubscription();
            if (!sub) return;
            await sub.unsubscribe();
            await original((process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334") + "/push/suscripcion", {
              method: "DELETE", headers: {"Content-Type":"application/json",Authorization:"Bearer "+token},
              body: JSON.stringify({endpoint:sub.endpoint}), signal: AbortSignal.timeout(5000),
            });
          }).catch(()=>{});
        }
      }
      return removeItem.call(this,key);
    };
    return () => { window.fetch = original; Storage.prototype.removeItem = removeItem; };
  }, []);
  return null;
}
