"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Pagos Adicionales" se unificó dentro de /admin/pagos (pestaña
// "Adicionales"); esta ruta se conserva para no romper enlaces guardados.
export default function AdminPagosAdicionalesRedirect() {
  const router = useRouter();
  useEffect(() => {
    const sub = new URLSearchParams(window.location.search).get("sub");
    router.replace(`/admin/pagos?tab=adicionales${sub === "mejoras" ? "&sub=mejoras" : ""}`);
  }, [router]);
  return null;
}
