import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';

type Modo = 'date' | 'time';

function aFecha(modo: Modo, valor: string): Date {
  if (modo === 'date') {
    const [y, m, d] = valor.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return new Date();
  }
  const [h, min] = (valor || '08:00').split(':').map(Number);
  const fecha = new Date();
  fecha.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(min) ? min : 0, 0, 0);
  return fecha;
}

function aValor(modo: Modo, fecha: Date): string {
  if (modo === 'date') {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const h = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function aTexto(modo: Modo, valor: string): string {
  if (modo === 'time') return valor;
  const [y, m, d] = valor.split('-').map(Number);
  if (!y || !m || !d) return valor;
  return new Date(y, m - 1, d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Selector de fecha u hora con el picker nativo, en vez de digitarla a mano
 * (evita fechas/horas mal escritas). El valor entra y sale como texto
 * "YYYY-MM-DD" (modo date) o "HH:mm" (modo time), igual que antes con el
 * TextInput, para no tocar el resto del formulario.
 */
export default function FechaHoraInput({
  modo, valor, onCambiar, placeholder,
}: {
  modo: Modo; valor: string; onCambiar: (v: string) => void; placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const Icono = modo === 'date' ? Calendar : Clock;

  const manejarCambio = (evento: any, seleccionado?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (evento.type === 'dismissed' || !seleccionado) return;
    onCambiar(aValor(modo, seleccionado));
  };

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}
        className="bg-[#FAFAFA] border border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center">
        <Text style={{ fontSize: 14, color: valor ? '#0f172a' : '#9ca3af' }}>
          {valor ? aTexto(modo, valor) : (placeholder || 'Seleccionar')}
        </Text>
        <Icono color="#9ca3af" size={16} />
      </TouchableOpacity>
      {visible && (
        <DateTimePicker
          value={aFecha(modo, valor)}
          mode={modo}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={manejarCambio}
        />
      )}
      {Platform.OS === 'ios' && visible && (
        <TouchableOpacity onPress={() => setVisible(false)} className="self-end mt-1 mb-1">
          <Text style={{ color: '#449D3A', fontWeight: '700', fontSize: 13 }}>Listo</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
