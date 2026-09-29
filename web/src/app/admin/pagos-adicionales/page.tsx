"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Pagos Adicionales" se unificó dentro de /admin/pagos (pestaña
// "Adicionales"); esta ruta se conserva para no romper enlaces guardados.
export default function AdminPagosAdicionalesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/pagos?tab=adicionales"); }, [router]);
  return null;
}
