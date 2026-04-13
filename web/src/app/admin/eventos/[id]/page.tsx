"use client";

import React, { useState, useEffect } from 'react';
import { Info, LayoutGrid, CreditCard, QrCode, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function EventConfigPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'nuevo';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    nombre: '',
    edicion: '',
    descripcion: '',
    fechaInicioEvento: '',
    fechaFinEvento: '',
    duracionReunion: 20,
    tiempoEntreReuniones: 5,
    cantidadTotalMesasEvento: 50,
    capacidadPersonasPorMesa: 4,
    montoBaseIncripcionBolivianos: 500,
    cantidadParticipantesIncluidos: 2,
    costoParticipanteExtra: 100,
    urlImagenMapaRecinto: '',
    urlImagenCronogramaCharlas: '',
  });

  const [reglasQR, setReglasQR] = useState([
    { rangoDesde: 1, rangoHasta: 2, monto: 500, urlQR: '' }
  ]);

  useEffect(() => {
    if (isNew) return;
    
    fetch(`http://localhost:3334/admin/eventos/${params.id}`)
      .then(res => res.text())
      .then(text => text ? JSON.parse(text) : {})
      .then(data => {
        if (data && data.id) {
          setFormData({
            id: data.id,
            nombre: data.nombre || '',
            edicion: data.edicion || '',
            descripcion: data.descripcion || '',
            fechaInicioEvento: data.fechaInicioEvento ? new Date(data.fechaInicioEvento).toISOString().split('T')[0] : '',
            fechaFinEvento: data.fechaFinEvento ? new Date(data.fechaFinEvento).toISOString().split('T')[0] : '',
            duracionReunion: data.duracionReunion || 20,
            tiempoEntreReuniones: data.tiempoEntreReuniones || 5,
            cantidadTotalMesasEvento: data.cantidadTotalMesasEvento || 50,
            capacidadPersonasPorMesa: data.capacidadPersonasPorMesa || 4,
            montoBaseIncripcionBolivianos: Number(data.montoBaseIncripcionBolivianos) || 500,
            cantidadParticipantesIncluidos: data.cantidadParticipantesIncluidos || 2,
            costoParticipanteExtra: data.costoParticipanteExtra || 100,
            urlImagenMapaRecinto: data.urlImagenMapaRecinto || '',
            urlImagenCronogramaCharlas: data.urlImagenCronogramaCharlas || '',
          });
          if (data.eventoreglaqr && data.eventoreglaqr.length > 0) {
            setReglasQR(data.eventoreglaqr.map((r: any) => ({
              rangoDesde: r.rangoDesde,
              rangoHasta: r.rangoHasta,
              monto: Number(r.monto),
              urlQR: r.urlQR
            })));
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleQRChange = (index: number, field: string, value: any) => {
    const newRules = [...reglasQR];
    (newRules[index] as any)[field] = value;
    setReglasQR(newRules);
  };

  const addRule = () => {
    setReglasQR([...reglasQR, { rangoDesde: 1, rangoHasta: 1, monto: 0, urlQR: '' }]);
  };

  const removeRule = (index: number) => {
    setReglasQR(reglasQR.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.fechaInicioEvento || !formData.fechaFinEvento) {
      alert('Por favor, completa los campos obligatorios (*).');
      return;
    }
    
    if (formData.duracionReunion <= 0 || formData.cantidadTotalMesasEvento <= 0) {
      alert('La duración de reunión y cantidad de mesas deben ser mayores a 0.');
      return;
    }

    setSaving(true);
    const payload = {
      ...formData,
      fechaInicioEvento: formData.fechaInicioEvento ? new Date(formData.fechaInicioEvento).toISOString() : new Date().toISOString(),
      fechaFinEvento: formData.fechaFinEvento ? new Date(formData.fechaFinEvento).toISOString() : new Date().toISOString(),
      reglasQR
    };

    try {
      const url = isNew ? 'http://localhost:3334/admin/eventos' : `http://localhost:3334/admin/eventos/${formData.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Evento guardado exitosamente.');
        router.push('/admin/eventos');
      } else {
        alert('Error guardando el evento.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Cargando evento...</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-sans pb-24">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 pb-1">{isNew ? 'Crear Nuevo Evento' : 'Editar Evento'}</h1>
          <p className="text-sm text-gray-500">Gestione los detalles y parámetros completos del evento en la base de datos.</p>
        </div>
        <button className="hidden text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-3" onClick={() => router.push('/admin/eventos')}>Volver a la lista</button>
      </div>

      <div className="space-y-6">
        
        {/* Información General */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 text-gray-900">
            <Info className="w-5 h-5 text-[#5B9A27]" />
            <h2 className="text-lg font-bold">Información General</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Nombre del evento *</label>
              <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" placeholder="Rueda de Negocios del Beni" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Edición</label>
              <input type="text" name="edicion" value={formData.edicion} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" placeholder="Ej. 2026" />
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Descripción General</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27] min-h-[100px]" placeholder="Añada historia o detalles del evento..." />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Fecha Inicio *</label>
              <input required type="date" name="fechaInicioEvento" value={formData.fechaInicioEvento} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Fecha Fin *</label>
              <input required type="date" name="fechaFinEvento" value={formData.fechaFinEvento} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div></div>

            <div className="col-span-1 md:col-span-3 border-t border-gray-100 pt-6 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
               <div className="col-span-1 md:col-span-3 flex items-center gap-2 mb-2">
                 <ImageIcon className="w-4 h-4 text-[#5B9A27]" />
                 <h3 className="text-sm font-bold text-gray-900">Imágenes y Mapas</h3>
               </div>
               <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-2">URL del Mapa del Recinto</label>
                  <input type="text" name="urlImagenMapaRecinto" value={formData.urlImagenMapaRecinto} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27]" placeholder="https://..." />
               </div>
               <div></div>
               <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-2">URL del Cronograma de Charlas</label>
                  <input type="text" name="urlImagenCronogramaCharlas" value={formData.urlImagenCronogramaCharlas} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27]" placeholder="https://..." />
               </div>
            </div>

          </div>
        </div>

        {/* Logística de Mesas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 text-gray-900">
            <LayoutGrid className="w-5 h-5 text-[#5B9A27]" />
            <h2 className="text-lg font-bold">Logística de Reuniones</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Mesa Total Evento</label>
              <input type="number" name="cantidadTotalMesasEvento" value={formData.cantidadTotalMesasEvento} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Capacidad por mesa</label>
              <input type="number" name="capacidadPersonasPorMesa" value={formData.capacidadPersonasPorMesa} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Duración de reunión (min)</label>
              <input type="number" name="duracionReunion" value={formData.duracionReunion} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Tiempo entre citas (min)</label>
              <input type="number" name="tiempoEntreReuniones" value={formData.tiempoEntreReuniones} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
          </div>
        </div>

        {/* Pagos y Tarifas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 text-gray-900">
            <CreditCard className="w-5 h-5 text-[#5B9A27]" />
            <h2 className="text-lg font-bold">Pagos y Tarifas</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Monto base de inscripción (Bs.)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 py-3 text-sm font-bold text-[#5B9A27]">Bs.</span>
                <input type="number" name="montoBaseIncripcionBolivianos" value={formData.montoBaseIncripcionBolivianos} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Participantes incluidos</label>
              <input type="number" name="cantidadParticipantesIncluidos" value={formData.cantidadParticipantesIncluidos} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">Costo por participante extra (Bs.)</label>
               <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 py-3 text-sm font-bold text-[#5B9A27]">Bs.</span>
                <input type="number" name="costoParticipanteExtra" value={formData.costoParticipanteExtra} onChange={handleChange} className="w-full bg-[#FAFAFA] border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-sm focus:border-[#5B9A27] focus:ring-1 focus:ring-[#5B9A27]" />
              </div>
            </div>
          </div>
        </div>

        {/* Configuración de QR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-900">
              <QrCode className="w-5 h-5 text-[#5B9A27]" />
              <h2 className="text-lg font-bold">Configuración de QR de pago</h2>
            </div>
            <button onClick={addRule} className="flex items-center gap-2 bg-[#f4f7ee] text-[#4d8321] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#e4eccf] transition-colors border border-[#d3e5b5]">
              <Plus className="w-4 h-4" /> Agregar nueva regla de QR
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-2 text-[11px] font-bold text-gray-500 w-1/3">Rango de participantes</th>
                  <th className="py-3 px-2 text-[11px] font-bold text-gray-500 w-1/4">Monto correspondiente</th>
                  <th className="py-3 px-2 text-[11px] font-bold text-gray-500 w-1/4">Imagen QR</th>
                  <th className="py-3 px-2 text-[11px] font-bold text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reglasQR.map((regla, index) => (
                  <tr key={index} className="border-b border-gray-50">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <input type="number" value={regla.rangoDesde} onChange={(e) => handleQRChange(index, 'rangoDesde', Number(e.target.value))} className="w-16 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" />
                        <span className="text-xs text-gray-500">a</span>
                        <input type="number" value={regla.rangoHasta} onChange={(e) => handleQRChange(index, 'rangoHasta', Number(e.target.value))} className="w-16 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="relative max-w-[150px]">
                        <span className="absolute inset-y-0 left-0 pl-3 py-2 text-xs font-bold text-[#5B9A27]">Bs.</span>
                        <input type="number" value={regla.monto} onChange={(e) => handleQRChange(index, 'monto', Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm" />
                      </div>
                    </td>
                    <td className="py-4 px-2">
                       <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-[#4d8321] px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-colors w-full">
                         <QrCode className="w-3.5 h-3.5 text-gray-400" /> 
                         {regla.urlQR ? "QR Cargado" : "Cargar imagen"}
                       </button>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <button onClick={() => removeRule(index)} className="text-red-400 hover:text-red-500 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 sm:static bg-white border-t border-gray-200 p-4 sm:p-0 sm:border-0 sm:bg-transparent flex flex-col sm:flex-row justify-end items-center gap-4 mt-8 z-50">
          <button className="text-sm font-bold text-gray-600 hover:text-gray-900 order-2 sm:order-1 px-4 py-3" onClick={() => router.push('/admin/eventos')}>Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#5B9A27] text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-[#4d8321] transition-colors order-1 sm:order-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Procesando..." : "Guardar Evento"}
          </button>
        </div>

      </div>
    </div>
  );
}
