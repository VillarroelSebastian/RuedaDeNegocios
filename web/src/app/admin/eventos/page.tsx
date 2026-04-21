"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarCheck, Star, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal, { useModal } from '@/components/ui/Modal';

export default function EventosListPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { modal, showModal, closeModal } = useModal();

  const fetchEventos = async () => {
    try {
      const res = await fetch('http://localhost:3334/admin/eventos');
      if (res.ok) {
        const data = await res.json();
        setEventos(Array.isArray(data) ? data : []);
      } else {
        setEventos([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const handleSetPrincipal = (id: number) => {
    showModal(
      'confirm',
      '⚠️ Cambiar evento principal',
      'Al cambiar el evento principal, TODOS los módulos del sistema (empresas, pagos, mesas, técnicos, estadísticas) mostrarán únicamente datos de este evento. ¿Deseas continuar?',
      async () => {
        try {
          await fetch(`http://localhost:3334/admin/eventos/${id}/set-principal`, { method: 'PUT' });
          fetchEventos();
        } catch {
          showModal('error', 'Error', 'No se pudo cambiar el evento principal. Intenta de nuevo.');
        }
      },
    );
  };

  const handleDelete = (id: number, esPrincipal: number) => {
    if (esPrincipal === 1) {
      showModal('warning', 'Acción Denegada', 'No puedes eliminar el evento principal. Nombra a otro evento como principal primero.');
      return;
    }
    showModal('confirm', 'Eliminar Evento', '¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.', async () => {
      try {
        await fetch(`http://localhost:3334/admin/eventos/${id}`, { method: 'DELETE' });
        fetchEventos();
      } catch (err) {
        showModal('error', 'Error', 'No se pudo eliminar el evento. Intenta de nuevo.');
      }
    });
  };

  if (loading) {
    return <div className="p-8">Cargando eventos...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 pb-1">Eventos Disponibles</h1>
          <p className="text-sm text-gray-500">Administra todos los eventos y define la Rueda principal activa</p>
        </div>
        <button 
          onClick={() => router.push('/admin/eventos/nuevo')}
          className="flex items-center gap-2 bg-[#5B9A27] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#4d8321] transition-colors"
        >
          <Plus className="w-4 h-4" /> Crear nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventos.map((evento) => (
          <div key={evento.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col relative ${evento.esPrincipal === 1 ? 'border-[#5B9A27] ring-1 ring-[#5B9A27]' : 'border-gray-100'}`}>
            
            {evento.esPrincipal === 1 && (
              <div className="absolute top-0 right-0 bg-[#5B9A27] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" /> PRINCIPAL
              </div>
            )}
            
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-3 rounded-lg ${evento.esPrincipal === 1 ? 'bg-[#f4f7ee]' : 'bg-gray-50'}`}>
                <CalendarCheck className={`w-6 h-6 ${evento.esPrincipal === 1 ? 'text-[#5B9A27]' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{evento.nombre}</h3>
                <p className="text-xs text-gray-500 mt-1">{evento.edicion ? `Edición: ${evento.edicion}` : 'Sin edición'}</p>
              </div>
            </div>

            <div className="flex gap-2 items-center text-xs text-gray-600 mb-6 bg-gray-50 p-2.5 rounded-lg">
               <Calendar className="w-4 h-4 text-gray-400" />
               <span className="font-medium">
                 {new Date(evento.fechaInicioEvento).toLocaleDateString('es-BO')} al {new Date(evento.fechaFinEvento).toLocaleDateString('es-BO')}
               </span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2">
              {evento.esPrincipal === 0 ? (
                <button 
                  onClick={() => handleSetPrincipal(evento.id)}
                  className="col-span-2 flex items-center justify-center gap-2 border border-[#d3e5b5] bg-white text-[#5B9A27] px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#f4f7ee] transition-colors mb-2"
                >
                  <Star className="w-3.5 h-3.5" /> Hacer Principal
                </button>
              ) : (
                <div className="col-span-2 mb-2 text-center text-[10px] text-gray-400 font-medium italic">Todo el sistema opera sobre este evento.</div>
              )}

              <button 
                onClick={() => router.push(`/admin/eventos/${evento.id}`)}
                className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              
              <button 
                onClick={() => handleDelete(evento.id, evento.esPrincipal)}
                disabled={evento.esPrincipal === 1}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${evento.esPrincipal === 1 ? 'bg-gray-50 text-gray-300' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {eventos.length === 0 && (
          <div className="col-span-3 text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
             <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             <h3 className="text-lg font-medium text-gray-900">No hay eventos configurados</h3>
             <p className="text-sm text-gray-500 mt-1">Crea tu primera rueda de negocios para comenzar.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}
