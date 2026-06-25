"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmpresaSidebar from '@/components/empresa/EmpresaSidebar';
import EmpresaHeader from '@/components/empresa/EmpresaHeader';

const API = 'http://localhost:3334';

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [esEncargado, setEsEncargado] = useState(false);

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
    </div>
  );
}
