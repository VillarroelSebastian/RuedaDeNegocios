"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Cronograma en vivo" se unificó dentro de /admin/actividades (pestaña "En
// vivo"); esta ruta se conserva para no romper enlaces guardados.
export default function AdminCronogramaVivoRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/actividades"); }, [router]);
  return null;
}
