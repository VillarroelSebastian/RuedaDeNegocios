"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmpresaEventosRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/empresa/cronograma-vivo");
  }, [router]);
  return null;
}
