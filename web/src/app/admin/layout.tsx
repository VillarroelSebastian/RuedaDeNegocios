"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem('adminUser');
    if (!raw) { router.replace('/auth/login'); return; }
    try {
      const user = JSON.parse(raw);
      if (user?.rolEvento !== 'ADMINISTRADOR') {
        router.replace('/auth/login');
      }
    } catch {
      router.replace('/auth/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
