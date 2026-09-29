"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "Actividades del cronograma" se unificó dentro de /tecnico/cronograma-vivo
// (mismas pestañas "Programa" / "En vivo"); esta ruta se conserva para no
// romper enlaces guardados.
export default function TecnicoEventosRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/tecnico/cronograma-vivo"); }, [router]);
  return null;
}
