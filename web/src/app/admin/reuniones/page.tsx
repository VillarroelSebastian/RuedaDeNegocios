"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Control de Reuniones" se unificó dentro de /admin/mesas (cada reunión,
// en cualquier filtro, tiene ahora editar horario/cancelar/eliminar); esta
// ruta se conserva para no romper enlaces guardados.
export default function AdminReunionesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/mesas"); }, [router]);
  return null;
}
