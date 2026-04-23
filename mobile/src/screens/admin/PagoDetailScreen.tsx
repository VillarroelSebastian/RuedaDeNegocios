import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Linking, Image
} from 'react-native';
import { CheckCircle, AlertCircle, FileText, Download, Info } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import { useModal } from '../../components/AppModal';

const GREEN = '#449D3A';

export default function PagoDetailScreen({ route, navigation }: any) {
  const { show, modal } = useModal();
  const { id } = route.params;
  const [pago, setPago] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPago = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/pagos/${id}`);
      setPago(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPago(); }, [id]);

  const handleAprobar = () => {
    show({
      type: 'confirm',
      title: 'Aprobar pago',
      message: 'Esto habilitará a la empresa y sus participantes en el sistema del evento.',
      confirmText: 'Aprobar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await fetch(`${API_URL}/admin/pagos/${id}/aprobar`, { method: 'PUT' });
          show({ type: 'success', title: '¡Aprobado!', message: 'El pago fue aprobado correctamente.' });
          fetchPago();
        } catch { show({ type: 'error', title: 'Error', message: 'No se pudo aprobar el pago.' }); }
        finally { setSubmitting(false); }
      },
    });
  };

  const handleObservar = async () => {
    if (!observacion.trim()) {
      show({ type: 'warning', title: 'Requerido', message: 'Escribe una observación antes de continuar.' });
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/admin/pagos/${id}/observar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacion }),
      });
      show({ type: 'success', title: '¡Enviado!', message: 'Se solicitó nueva evidencia a la empresa.' });
      setObservacion('');
      fetchPago();
    } catch { show({ type: 'error', title: 'Error', message: 'No se pudo enviar la observación.' }); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return <><>{modal}</><View className="flex-1 justify-center items-center bg-[#F9FAFB]"><ActivityIndicator color={GREEN} size="large" /></View></>;
  }

  if (!pago) {
    return <><>{modal}</><View className="flex-1 justify-center items-center"><Text className="text-gray-400">Pago no encontrado</Text></View></>;
  }

  const comprobante = pago.empresaeventocomprobantes?.[0];
  const estadoColors: Record<string, string> = {
    COMPLETADO: '#dcfce7', PENDIENTE: '#ffedd5', OBSERVADO: '#fef9c3', RECHAZADO: '#fee2e2'
  };
  const estadoTextColors: Record<string, string> = {
    COMPLETADO: '#166534', PENDIENTE: '#9a3412', OBSERVADO: '#854d0e', RECHAZADO: '#991b1b'
  };

  return (
    <>
    {modal}
    <ScrollView className="flex-1 bg-[#F9FAFB]">
      <View className="p-4 space-y-4">
        {/* Resumen */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <View className="flex-row items-center gap-2 mb-4">
            <Info color={GREEN} size={18} />
            <Text className="font-bold text-gray-900">Resumen del Registro</Text>
          </View>
          {[
            { label: 'Empresa', value: pago.empresa?.nombre },
            { label: 'Ciudad', value: pago.empresa?.ciudad?.nombre },
            { label: 'Participantes', value: String(pago.numeroParticipantes) },
            { label: 'Monto pagado', value: pago.montoPagado ? `${Number(pago.montoPagado).toLocaleString()} BOB` : 'No especificado' },
            { label: 'Fecha de envío', value: pago.fechaHoraEnvioComprobante ? new Date(pago.fechaHoraEnvioComprobante).toLocaleDateString('es-BO') : '—' },
          ].map((item) => (
            <View key={item.label} className="flex-row justify-between items-center py-2.5 border-b border-gray-50">
              <Text className="text-sm text-gray-500">{item.label}</Text>
              <Text className="text-sm font-semibold text-gray-900">{item.value}</Text>
            </View>
          ))}
          <View className="flex-row justify-between items-center pt-2.5">
            <Text className="text-sm text-gray-500">Estado actual</Text>
            <View style={{ backgroundColor: estadoColors[pago.estadoVerificacionPago] || '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: estadoTextColors[pago.estadoVerificacionPago] || '#6b7280', fontSize: 11, fontWeight: '700' }}>
                {pago.estadoVerificacionPago}
              </Text>
            </View>
          </View>
        </View>

        {/* Comprobante */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <View className="flex-row items-center gap-2 mb-4">
            <FileText color={GREEN} size={18} />
            <Text className="font-bold text-gray-900">Comprobante de pago</Text>
          </View>
          {comprobante ? (
            <>
              {comprobante.urlComprobantePagoInscripcion.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <Image
                  source={{ uri: comprobante.urlComprobantePagoInscripcion }}
                  className="w-full h-48 rounded-xl mb-3"
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                onPress={() => Linking.openURL(comprobante.urlComprobantePagoInscripcion)}
                className="flex-row items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl"
              >
                <Download color={GREEN} size={16} />
                <Text className="text-sm font-semibold" style={{ color: GREEN }}>Ver comprobante completo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText color="#d1d5db" size={32} />
              <Text className="text-sm text-gray-400 mt-2">Sin comprobante adjunto</Text>
            </View>
          )}
        </View>

        {/* Observación */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <Text className="font-bold text-gray-900 mb-1">Solicitar nueva evidencia</Text>
          <Text className="text-sm text-gray-500 mb-3">Escribe por qué necesitas que la empresa reenvíe su comprobante.</Text>
          <TextInput
            value={observacion}
            onChangeText={setObservacion}
            placeholder="Ej: El archivo es ilegible, por favor suba una imagen más clara..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Botones */}
        {pago.estadoVerificacionPago !== 'COMPLETADO' && (
          <View className="space-y-3">
            <TouchableOpacity
              onPress={handleAprobar}
              disabled={submitting}
              style={{ backgroundColor: submitting ? '#9ca3af' : GREEN }}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl shadow-sm"
            >
              <CheckCircle color="white" size={20} />
              <Text className="text-white font-bold text-base">Aprobar pago</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleObservar}
              disabled={submitting || !observacion.trim()}
              className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border border-gray-300 bg-white"
            >
              <AlertCircle color="#6b7280" size={20} />
              <Text className="text-gray-700 font-semibold text-base">Solicitar nueva evidencia</Text>
            </TouchableOpacity>
          </View>
        )}

        {pago.estadoVerificacionPago === 'COMPLETADO' && (
          <View className="flex-row items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4">
            <CheckCircle color={GREEN} size={22} />
            <Text className="text-sm text-green-800 font-semibold flex-1">Este pago ya fue aprobado. La empresa tiene acceso habilitado.</Text>
          </View>
        )}

        <View className="h-8" />
      </View>
    </ScrollView>
    </>
  );
}
