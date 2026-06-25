"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TecnicoSidebar from '@/components/tecnico/TecnicoSidebar';
import TecnicoHeader from '@/components/tecnico/TecnicoHeader';

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('tecnicoUser');
    if (!raw) { router.replace('/auth/login'); return; }
    try {
      const user = JSON.parse(raw);
      if (user?.rolEvento !== 'TECNICO') {
        router.replace('/auth/login');
      }
    } catch {
      router.replace('/auth/login');
    }
  }, [router]);

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
