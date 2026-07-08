"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmpresaSidebar from '@/components/empresa/EmpresaSidebar';
import EmpresaHeader from '@/components/empresa/EmpresaHeader';
import AsistenteChat from '@/components/empresa/AsistenteChat';
import NotificacionToast from '@/components/empresa/NotificacionToast';

const API = 'http://localhost:3334';

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [esEncargado, setEsEncargado] = useState(false);
  const [eeId, setEeId] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('empresaUser');
    if (!raw) { router.replace('/auth/login'); return; }
    let user: any;
    try {
      user = JSON.parse(raw);
      if (user?.rolEvento !== 'EMPRESA') { router.replace('/auth/login'); return; }
    } catch {
      router.replace('/auth/login');
      return;
    }

    // Load mi-empresa to check esResponsable
    fetch(`${API}/empresa/mi-empresa?usuarioId=${user.id}`)
      .then((r) => r.json())
      .then((ctx) => {
        if (ctx?.esResponsable) setEsEncargado(true);
        if (ctx?.empresaeventoId) setEeId(ctx.empresaeventoId);
      })
      .catch(() => {
        // silently ignore — sidebar defaults to no encargado items
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <EmpresaSidebar esEncargado={esEncargado} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <EmpresaHeader />
        <main className="flex-1">{children}</main>
      </div>
      <NotificacionToast eeId={eeId} />
      <AsistenteChat />
    </div>
  );
}
