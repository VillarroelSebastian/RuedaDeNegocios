import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Info, LayoutGrid, CreditCard, QrCode, Plus, Trash2, Save, CalendarCheck, Star, Edit2, Calendar, Image as ImageIcon, ChevronLeft } from 'lucide-react-native';

export default function EventConfigScreen() {
  const [viewState, setViewState] = useState<'lista' | 'formulario'>('lista');
  
  // List State
  const [eventos, setEventos] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // Form State
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | 'nuevo'>('nuevo');
  
  const [formData, setFormData] = useState({
    id: 0,
    nombre: '',
    edicion: '',
    descripcion: '',
    fechaInicioEvento: '',
    fechaFinEvento: '',
    duracionReunion: '20',
    tiempoEntreReuniones: '5',
    cantidadTotalMesasEvento: '50',
    capacidadPersonasPorMesa: '4',
    montoBaseIncripcionBolivianos: '500',
    cantidadParticipantesIncluidos: '2',
    costoParticipanteExtra: '100',
    urlImagenMapaRecinto: '',
    urlImagenCronogramaCharlas: '',
    urlLogoEvento: '',
    sobreElEvento: '',
    correoContacto: '',
    telefonoContacto: '',
    enlaceFacebook: '',
    enlaceInstagram: '',
    enlaceTwitterX: '',
  });

  const [reglasQR, setReglasQR] = useState([
    { rangoDesde: '1', rangoHasta: '2', monto: '500', urlQR: '' }
  ]);

  // Load List
  const fetchEventos = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('http://10.0.2.2:3334/admin/eventos');
      const data = await res.json();
      setEventos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, [viewState]);

  // List Actions
  const handleSetPrincipal = async (id: number) => {
    try {
      await fetch(`http://10.0.2.2:3334/admin/eventos/${id}/set-principal`, { method: 'PUT' });
      fetchEventos();
    } catch (err) {
      Alert.alert('Error', 'No se pudo cambiar a principal');
    }
  };

  const handleDelete = (id: number, esPrincipal: number) => {
    if (esPrincipal === 1) {
      Alert.alert('Denegado', 'No puedes eliminar el evento principal. Nombra a otro como principal primero.');
      return;
    }
    Alert.alert('Confirmar', '¿Seguro que deseas eliminar este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await fetch(`http://10.0.2.2:3334/admin/eventos/${id}`, { method: 'DELETE' });
            fetchEventos();
          } catch (err) {
            Alert.alert('Error', 'Error al eliminar');
          }
      }}
    ]);
  };

  // Open Form
  const openForm = async (id: number | 'nuevo') => {
    setEditingId(id);
    setViewState('formulario');
    
    if (id === 'nuevo') {
      setFormData({
        id: 0, nombre: '', edicion: '', descripcion: '', fechaInicioEvento: '', fechaFinEvento: '', 
        duracionReunion: '20', tiempoEntreReuniones: '5', cantidadTotalMesasEvento: '50', capacidadPersonasPorMesa: '4', 
        montoBaseIncripcionBolivianos: '500', cantidadParticipantesIncluidos: '2', costoParticipanteExtra: '100',
        urlImagenMapaRecinto: '', urlImagenCronogramaCharlas: '', urlLogoEvento: '', sobreElEvento: '',
        correoContacto: '', telefonoContacto: '', enlaceFacebook: '', enlaceInstagram: '', enlaceTwitterX: ''
      });
      setReglasQR([{ rangoDesde: '1', rangoHasta: '2', monto: '500', urlQR: '' }]);
      return;
    }

    setLoadingForm(true);
    try {
      const res = await fetch(`http://10.0.2.2:3334/admin/eventos/${id}`);
      const data = await res.json();
      if (data && data.id) {
        setFormData({
          id: data.id,
          nombre: data.nombre || '', edicion: data.edicion || '', descripcion: data.descripcion || '',
          fechaInicioEvento: data.fechaInicioEvento ? new Date(data.fechaInicioEvento).toISOString().split('T')[0] : '',
          fechaFinEvento: data.fechaFinEvento ? new Date(data.fechaFinEvento).toISOString().split('T')[0] : '',
          duracionReunion: String(data.duracionReunion || 20), tiempoEntreReuniones: String(data.tiempoEntreReuniones || 5),
          cantidadTotalMesasEvento: String(data.cantidadTotalMesasEvento || 50), capacidadPersonasPorMesa: String(data.capacidadPersonasPorMesa || 4),
          montoBaseIncripcionBolivianos: String(data.montoBaseIncripcionBolivianos || 500), cantidadParticipantesIncluidos: String(data.cantidadParticipantesIncluidos || 2),
          costoParticipanteExtra: String(data.costoParticipanteExtra || 100),
          urlImagenMapaRecinto: data.urlImagenMapaRecinto || '',
          urlImagenCronogramaCharlas: data.urlImagenCronogramaCharlas || '',
          urlLogoEvento: data.urlLogoEvento || '',
          sobreElEvento: data.sobreElEvento || '',
          correoContacto: data.correoContacto || '',
          telefonoContacto: data.telefonoContacto || '',
          enlaceFacebook: data.enlaceFacebook || '',
          enlaceInstagram: data.enlaceInstagram || '',
          enlaceTwitterX: data.enlaceTwitterX || ''
        });
        if (data.eventoreglaqr && data.eventoreglaqr.length > 0) {
          setReglasQR(data.eventoreglaqr.map((r: any) => ({
            rangoDesde: String(r.rangoDesde), rangoHasta: String(r.rangoHasta), monto: String(r.monto), urlQR: r.urlQR
          })));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleChange = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }));
  const handleQRChange = (index: number, field: string, value: string) => {
    const newRules = [...reglasQR];
    (newRules[index] as any)[field] = value;
    setReglasQR(newRules);
  };
  const addRule = () => setReglasQR([...reglasQR, { rangoDesde: '1', rangoHasta: '1', monto: '0', urlQR: '' }]);
  const removeRule = (index: number) => setReglasQR(reglasQR.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!formData.nombre || !formData.fechaInicioEvento || !formData.fechaFinEvento) {
      Alert.alert('Campos Obligatorios', 'Por favor completa: Nombre, Fecha Inicio y Fecha Fin.');
      return;
    }
    
    if (Number(formData.duracionReunion) <= 0 || Number(formData.cantidadTotalMesasEvento) <= 0) {
      Alert.alert('Datos Inválidos', 'La duración y número de mesas deben ser mayores a 0.');
      return;
    }

    setSaving(true);
    
    // Helper: convert empty strings to null for optional fields
    const orNull = (v: string) => (v === '' ? null : v);
    
    const payload: any = {
      nombre: formData.nombre,
      edicion: formData.edicion || '',
      descripcion: orNull(formData.descripcion),
      fechaInicioEvento: formData.fechaInicioEvento ? new Date(formData.fechaInicioEvento).toISOString() : new Date().toISOString(),
      fechaFinEvento: formData.fechaFinEvento ? new Date(formData.fechaFinEvento).toISOString() : new Date().toISOString(),
      duracionReunion: Number(formData.duracionReunion),
      tiempoEntreReuniones: Number(formData.tiempoEntreReuniones),
      cantidadTotalMesasEvento: Number(formData.cantidadTotalMesasEvento),
      capacidadPersonasPorMesa: Number(formData.capacidadPersonasPorMesa),
      montoBaseIncripcionBolivianos: Number(formData.montoBaseIncripcionBolivianos),
      cantidadParticipantesIncluidos: Number(formData.cantidadParticipantesIncluidos),
      costoParticipanteExtra: Number(formData.costoParticipanteExtra),
      urlImagenMapaRecinto: orNull(formData.urlImagenMapaRecinto),
      urlImagenCronogramaCharlas: orNull(formData.urlImagenCronogramaCharlas),
      urlLogoEvento: orNull(formData.urlLogoEvento),
      sobreElEvento: orNull(formData.sobreElEvento),
      correoContacto: orNull(formData.correoContacto),
      telefonoContacto: orNull(formData.telefonoContacto),
      enlaceFacebook: orNull(formData.enlaceFacebook),
      enlaceInstagram: orNull(formData.enlaceInstagram),
      enlaceTwitterX: orNull(formData.enlaceTwitterX),
      reglasQR: reglasQR.map(r => ({
        rangoDesde: Number(r.rangoDesde),
        rangoHasta: Number(r.rangoHasta),
        monto: Number(r.monto),
        urlQR: r.urlQR || '',
      })),
    };

    try {
      const url = editingId === 'nuevo' ? 'http://10.0.2.2:3334/admin/eventos' : `http://10.0.2.2:3334/admin/eventos/${formData.id}`;
      const method = editingId === 'nuevo' ? 'POST' : 'PUT';
      
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        Alert.alert('Éxito', 'Evento guardado exitosamente.');
        setViewState('lista');
      } else {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.message || 'Error desconocido del servidor.';
        Alert.alert('Error', `No se pudo guardar: ${msg}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER LIST ---
  if (viewState === 'lista') {
    return (
      <SafeAreaView className="flex-1 bg-[#F9FAFB]">
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="mb-6 mt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Eventos</Text>
              <Text className="text-sm text-gray-500 mt-1">Define la Rueda principal</Text>
            </View>
            <TouchableOpacity onPress={() => openForm('nuevo')} className="bg-[#5B9A27] px-4 py-2.5 rounded-lg flex-row items-center">
              <Plus color="#ffffff" size={16} />
              <Text className="text-white font-bold ml-2">Crear</Text>
            </TouchableOpacity>
          </View>

          {loadingList ? (
            <ActivityIndicator size="large" color="#449D3A" className="mt-10" />
          ) : (
            eventos.map((evento) => (
              <View key={evento.id} className={`bg-white rounded-xl shadow-sm border p-5 mb-4 ${evento.esPrincipal === 1 ? 'border-[#5B9A27]' : 'border-gray-100'}`}>
                {evento.esPrincipal === 1 && (
                  <View className="absolute top-0 right-0 bg-[#5B9A27] px-2 py-1 rounded-bl-lg rounded-tr-xl flex-row items-center">
                    <Star color="#ffffff" size={10} fill="#ffffff" />
                    <Text className="text-white text-[9px] font-bold ml-1">PRINCIPAL</Text>
                  </View>
                )}
                
                <View className="flex-row items-start gap-3 mb-3">
                  <View className={`p-3 rounded-lg ${evento.esPrincipal === 1 ? 'bg-[#f4f7ee]' : 'bg-gray-50'}`}>
                    <CalendarCheck color={evento.esPrincipal === 1 ? '#5B9A27' : '#9ca3af'} size={24} />
                  </View>
                  <View className="flex-1 pr-6">
                    <Text className="text-lg font-bold text-gray-900">{evento.nombre}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{evento.edicion ? `Edición: ${evento.edicion}` : 'Sin edición'}</Text>
                  </View>
                </View>

                <View className="flex-row items-center bg-gray-50 p-2.5 rounded-lg mb-4">
                   <Calendar color="#9ca3af" size={14} />
                   <Text className="text-xs text-gray-600 font-medium ml-2">
                     {new Date(evento.fechaInicioEvento).toLocaleDateString()} - {new Date(evento.fechaFinEvento).toLocaleDateString()}
                   </Text>
                </View>

                <View className="flex-row flex-wrap justify-between gap-y-2 gap-x-2">
                  {evento.esPrincipal === 0 ? (
                    <TouchableOpacity onPress={() => handleSetPrincipal(evento.id)} className="flex-1 bg-white border border-[#d3e5b5] py-2.5 rounded-lg flex-row items-center justify-center min-w-[45%]">
                      <Star color="#5B9A27" size={14} />
                      <Text className="text-[#5B9A27] font-bold text-xs ml-1.5">+ Principal</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity onPress={() => openForm(evento.id)} className={`bg-gray-50 py-2.5 rounded-lg flex-row items-center justify-center ${evento.esPrincipal === 1 ? 'flex-1' : 'flex-1 min-w-[45%]'}`}>
                    <Edit2 color="#374151" size={14} />
                    <Text className="text-gray-700 font-bold text-xs ml-1.5">Editar</Text>
                  </TouchableOpacity>
                  
                  {evento.esPrincipal === 0 && (
                    <TouchableOpacity onPress={() => handleDelete(evento.id, evento.esPrincipal)} className="bg-red-50 py-2.5 px-3 rounded-lg flex-row items-center justify-center">
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {(!loadingList && eventos.length === 0) && (
            <View className="items-center py-10">
               <CalendarCheck color="#d1d5db" size={48} />
               <Text className="text-lg font-medium text-gray-900 mt-4">Vacio</Text>
               <Text className="text-sm text-gray-500 text-center mt-1">Presiona "Crear" para añadir tu primer evento</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- RENDER FORM ---
  if (loadingForm) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F9FAFB]">
        <ActivityIndicator size="large" color="#449D3A" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center bg-white shadow-sm z-10">
        <TouchableOpacity onPress={() => setViewState('lista')} className="p-2 -ml-2">
           <ChevronLeft color="#374151" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-lg text-gray-900 ml-2">{editingId === 'nuevo' ? 'Nuevo Evento' : 'Editar Evento'}</Text>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5 mt-2">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Info color="#5B9A27" size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Información General</Text>
          </View>
          <Text className="text-xs font-bold text-gray-700 mb-2">Nombre del evento *</Text>
          <TextInput value={formData.nombre} onChangeText={t => handleChange('nombre', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="Requerido" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Edición</Text>
          <TextInput value={formData.edicion} onChangeText={t => handleChange('edicion', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="Ej. 2026" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Descripción</Text>
          <TextInput value={formData.descripcion} onChangeText={t => handleChange('descripcion', t)} multiline className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 h-24 text-top" placeholder="Historia o detalles" textAlignVertical="top" />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Inicia *</Text>
              <TextInput value={formData.fechaInicioEvento} onChangeText={t => handleChange('fechaInicioEvento', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="YYYY-MM-DD" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Termina *</Text>
              <TextInput value={formData.fechaFinEvento} onChangeText={t => handleChange('fechaFinEvento', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="YYYY-MM-DD" />
            </View>
          </View>
          
          <Text className="text-xs font-bold text-gray-700 mb-2">Mapa URL</Text>
          <TextInput value={formData.urlImagenMapaRecinto} onChangeText={t => handleChange('urlImagenMapaRecinto', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 text-blue-500" placeholder="https://" />
          
          <Text className="text-xs font-bold text-gray-700 mb-2">Cronograma URL</Text>
          <TextInput value={formData.urlImagenCronogramaCharlas} onChangeText={t => handleChange('urlImagenCronogramaCharlas', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-2 text-blue-500" placeholder="https://" />
        </View>

        {/* Información Pública */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Info color="#5B9A27" size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Información Pública</Text>
          </View>
          
          <Text className="text-xs font-bold text-gray-700 mb-2">Correo de Contacto</Text>
          <TextInput value={formData.correoContacto} onChangeText={t => handleChange('correoContacto', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="info@ejemplo.com" keyboardType="email-address" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Teléfono / WhatsApp</Text>
          <TextInput value={formData.telefonoContacto} onChangeText={t => handleChange('telefonoContacto', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" placeholder="+591 70000000" keyboardType="phone-pad" />

          <Text className="text-xs font-bold text-gray-700 mb-2">Logo del Evento (URL)</Text>
          <TextInput value={formData.urlLogoEvento} onChangeText={t => handleChange('urlLogoEvento', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 text-blue-500" placeholder="https://..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Facebook (URL)</Text>
          <TextInput value={formData.enlaceFacebook} onChangeText={t => handleChange('enlaceFacebook', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 text-blue-500" placeholder="https://facebook.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Instagram (URL)</Text>
          <TextInput value={formData.enlaceInstagram} onChangeText={t => handleChange('enlaceInstagram', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 text-blue-500" placeholder="https://instagram.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Twitter/X (URL)</Text>
          <TextInput value={formData.enlaceTwitterX} onChangeText={t => handleChange('enlaceTwitterX', t)} className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4 text-blue-500" placeholder="https://x.com/..." />

          <Text className="text-xs font-bold text-gray-700 mb-2">Sobre el Evento</Text>
          <TextInput value={formData.sobreElEvento} onChangeText={t => handleChange('sobreElEvento', t)} multiline className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm h-24 text-top" placeholder="Historia detallada..." textAlignVertical="top" />
        </View>

        {/* Logística */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <LayoutGrid color="#5B9A27" size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Logística de Reuniones</Text>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Total de mesas</Text>
              <TextInput value={formData.cantidadTotalMesasEvento} onChangeText={t => handleChange('cantidadTotalMesasEvento', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-700 mb-2">Capacidad p/mesa</Text>
              <TextInput value={formData.capacidadPersonasPorMesa} onChangeText={t => handleChange('capacidadPersonasPorMesa', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-700 mb-2">Reunión (min)</Text>
              <TextInput value={formData.duracionReunion} onChangeText={t => handleChange('duracionReunion', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-700 mb-2">Pausa (min)</Text>
              <TextInput value={formData.tiempoEntreReuniones} onChangeText={t => handleChange('tiempoEntreReuniones', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
          </View>
        </View>

        {/* Pagos */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <CreditCard color="#5B9A27" size={20} />
            <Text className="text-base font-bold text-gray-900 ml-1">Pagos y Tarifas</Text>
          </View>
          <Text className="text-xs font-bold text-gray-700 mb-2">Monto base (Bs.)</Text>
          <TextInput value={formData.montoBaseIncripcionBolivianos} onChangeText={t => handleChange('montoBaseIncripcionBolivianos', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4" />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-gray-700 mb-2">Pers. incluidas</Text>
              <TextInput value={formData.cantidadParticipantesIncluidos} onChangeText={t => handleChange('cantidadParticipantesIncluidos', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-gray-700 mb-2">Costo p. extra(Bs)</Text>
              <TextInput value={formData.costoParticipanteExtra} onChangeText={t => handleChange('costoParticipanteExtra', t)} keyboardType="numeric" className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 text-sm" />
            </View>
          </View>
        </View>

        {/* QR */}
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
             <View className="flex-row items-center gap-2">
              <QrCode color="#5B9A27" size={20} />
              <Text className="text-base font-bold text-gray-900 ml-1">Reglas QR</Text>
             </View>
             <TouchableOpacity onPress={addRule} className="bg-[#f4f7ee] p-2 rounded-lg border border-[#d3e5b5]">
                <Plus color="#4d8321" size={16} />
             </TouchableOpacity>
          </View>
          {reglasQR.map((regla, index) => (
            <View key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs font-bold text-gray-700">Participantes (Min - Max)</Text>
                <TouchableOpacity onPress={() => removeRule(index)} className="bg-red-50 p-1.5 rounded-full">
                  <Trash2 color="#ef4444" size={14} />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2 mb-2">
                <TextInput value={regla.rangoDesde} onChangeText={t => handleQRChange(index, 'rangoDesde', t)} keyboardType="numeric" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" />
                <Text className="self-center text-gray-500 font-bold">a</Text>
                <TextInput value={regla.rangoHasta} onChangeText={t => handleQRChange(index, 'rangoHasta', t)} keyboardType="numeric" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" />
              </View>
              <View className="flex-row gap-2">
                <TextInput value={regla.monto} onChangeText={t => handleQRChange(index, 'monto', t)} keyboardType="numeric" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Monto Bs." />
                <TouchableOpacity className="flex-1 bg-gray-200 justify-center items-center rounded-lg">
                  <Text className="text-gray-600 text-[10px] font-bold">CARGAR QR</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity disabled={saving} onPress={handleSave} className={`bg-[#5B9A27] py-4 rounded-xl items-center justify-center flex-row mb-12 shadow-sm ${saving ? 'opacity-70' : ''}`}>
          <Save color="#ffffff" size={20} />
          <Text className="text-white font-bold text-base ml-2">{saving ? 'Guardando...' : 'Guardar Evento'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
