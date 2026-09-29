"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Control de Reuniones" se unificó dentro de /admin/mesas (pestaña
// "Control de reuniones"); esta ruta se conserva para no romper enlaces
// guardados.
export default function AdminReunionesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/mesas?tab=reuniones"); }, [router]);
  return null;
}
