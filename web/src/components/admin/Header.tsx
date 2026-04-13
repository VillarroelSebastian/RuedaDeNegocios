import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex-1 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Rueda de Negocios del Beni</h1>
      </div>

      <div className="flex items-center space-x-6 flex-1 justify-end shrink-0">
        {/* Search */}
        <div className="relative max-w-md w-full hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A] sm:text-sm transition-colors"
            placeholder="Buscar empresa o mesa..."
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
          
          <button className="h-9 w-9 rounded-full bg-[#E5D7B5] flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-gray-200">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Profile" className="w-full h-full rounded-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
}
