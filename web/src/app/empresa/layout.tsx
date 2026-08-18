"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import EmpresaSidebar from '@/components/empresa/EmpresaSidebar';
import EmpresaHeader from '@/components/empresa/EmpresaHeader';
import AsistenteChat from '@/components/empresa/AsistenteChat';
import NotificacionToast from '@/components/empresa/NotificacionToast';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [esEncargado, setEsEncargado] = useState(false);
  const [eeId, setEeId] = useState<number | null>(null);
  const [euId, setEuId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        if (ctx?.empresaUsuarioId) setEuId(ctx.empresaUsuarioId);
      })
      .catch(() => {
        // silently ignore — sidebar defaults to no encargado items
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <EmpresaSidebar esEncargado={esEncargado} eeId={eeId} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <EmpresaHeader onMenuClick={() => setSidebarOpen(true)} eeId={eeId} />
        <main className="flex-1">{children}</main>
      </div>
      <NotificacionToast eeId={eeId} />
      {pathname !== '/empresa/mensajes' && <AsistenteChat eeId={eeId} euId={euId} />}
    </div>
  );
}
