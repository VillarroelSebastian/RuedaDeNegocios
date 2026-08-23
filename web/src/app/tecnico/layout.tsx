"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TecnicoSidebar from '@/components/tecnico/TecnicoSidebar';
import TecnicoHeader from '@/components/tecnico/TecnicoHeader';

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const raw = localStorage.getItem('tecnicoUser');
    if (!raw) { router.replace('/auth/login'); return; }
    try {
      const user = JSON.parse(raw);
      if (!['TECNICO', 'TECNICO_EVENTOS'].includes(user?.rolEvento)) {
        router.replace('/auth/login');
      } else if (user.rolEvento === 'TECNICO_EVENTOS' && !['/tecnico/cronograma-vivo', '/tecnico/contenido', '/tecnico/notificaciones', '/tecnico/eventos', '/tecnico/galeria', '/tecnico/perfil'].some((p) => pathname.startsWith(p))) {
        router.replace('/tecnico/cronograma-vivo');
      }
    } catch {
      router.replace('/auth/login');
    }
  }, [router, pathname]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <TecnicoSidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <TecnicoHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
