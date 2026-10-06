"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReunionesRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const reunionId = searchParams.get("reunionId");
    const destino = reunionId
      ? `/empresa/solicitudes?tab=reuniones&reunionId=${reunionId}`
      : "/empresa/solicitudes?tab=reuniones";
    router.replace(destino);
  }, [router, searchParams]);
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ReunionesRedirectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#449D3A] border-t-transparent rounded-full animate-spin" /></div>}>
      <ReunionesRedirectContent />
    </Suspense>
  );
}
