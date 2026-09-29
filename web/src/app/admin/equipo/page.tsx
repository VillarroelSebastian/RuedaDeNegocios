"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Equipo del evento" se unificó dentro de /admin/mensajes (pestaña "Equipo
// del evento"); esta ruta se conserva para no romper enlaces guardados.
export default function AdminEquipoRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/mensajes"); }, [router]);
  return null;
}
