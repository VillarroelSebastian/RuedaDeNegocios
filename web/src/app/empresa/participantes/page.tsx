"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ParticipantesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/empresa/perfil");
  }, [router]);
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
