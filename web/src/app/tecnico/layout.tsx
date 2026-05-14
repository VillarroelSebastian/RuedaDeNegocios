import React from 'react';
import TecnicoSidebar from '@/components/tecnico/TecnicoSidebar';
import TecnicoHeader from '@/components/tecnico/TecnicoHeader';

export default function TecnicoLayout({ children }: { children: React.ReactNode }) {
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
