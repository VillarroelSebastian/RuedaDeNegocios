"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Agenda de Mesas" se unificó dentro de /admin/mesas (filtro "Agenda",
// que además es el que se ve por defecto); esta ruta se conserva para no
// romper enlaces guardados.
export default function AdminAgendaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/mesas"); }, [router]);
  return null;
}
