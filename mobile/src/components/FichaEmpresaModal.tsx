import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Building2, ExternalLink, X } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';
import ImagenLightbox from './ImagenLightbox';

const GREEN = '#449D3A';

function Dato({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ marginTop: 3, fontSize: 13, color: '#1f2937', lineHeight: 19 }}>{String(value)}</Text>
    </View>
  );
}

function Bloque({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function FichaEmpresaModal({ empresaId, onClose }: { empresaId: number | null; onClose: () => void }) {
  const [datos, setDatos] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    fetch(`${API_URL}/admin/empresas/${empresaId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'No se pudo cargar la empresa.');
        return data;
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [empresaId]);

  const ficha = datos?.ficha;
  return (
    <Modal visible={Boolean(empresaId)} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {datos?.urlFotoPerfil
                ? <ImagenLightbox uri={datos.urlFotoPerfil} style={{ width: 48, height: 48 }} />
                : <Building2 color={GREEN} size={24} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{datos?.nombre || 'Ficha de empresa'}</Text>
              {!!datos?.codigo && <Text style={{ fontSize: 11, fontWeight: '700', color: GREEN }}>{datos.codigo}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <X color="#64748b" size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {loading && <ActivityIndicator color={GREEN} style={{ marginVertical: 48 }} />}
            {!!error && <Text style={{ color: '#dc2626', textAlign: 'center', marginVertical: 40 }}>{error}</Text>}
            {datos && ficha && !loading && (
              <>
                <Bloque title="Estado de inscripción">
                  <Dato label="Pago" value={ficha.estadoVerificacionPago} />
                  <Dato label="Acceso" value={ficha.estadoHabilitacionAcceso} />
                  <Dato label="Modalidad" value={ficha.tipoParticipacion} />
                  <Dato label="Cupos pagados" value={ficha.numeroParticipantes} />
                  <Dato label="Monto pagado" value={ficha.montoPagado != null ? `Bs. ${ficha.montoPagado}` : null} />
                  <Dato label="Paquete" value={ficha.paquete ? `${ficha.paquete.nombre} · Bs. ${ficha.paquete.costo}` : 'Tarifa general'} />
                </Bloque>

                <Bloque title="Datos de la empresa">
                  <Dato label="Rubro" value={datos.rubro} />
                  <Dato label="Ubicación" value={[ficha.ciudad, ficha.pais].filter(Boolean).join(', ')} />
                  <Dato label="Correo corporativo" value={datos.correoCorporativo} />
                  <Dato label="WhatsApp" value={datos.telefonoWhatsapp} />
                  <Dato label="Sitio web" value={datos.sitioWeb} />
                  <Dato label="Descripción" value={datos.descripcion} />
                  <Dato label="Qué ofrece" value={datos.oferta} />
                  <Dato label="Qué busca" value={datos.demanda} />
                  <Dato label="Sectores de interés" value={datos.interesesBusqueda} />
                  {!!datos.urlPdf && (
                    <TouchableOpacity onPress={() => Linking.openURL(datos.urlPdf)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <ExternalLink color={GREEN} size={15} />
                      <Text style={{ color: GREEN, fontSize: 13, fontWeight: '700' }}>Abrir documento de la empresa</Text>
                    </TouchableOpacity>
                  )}
                </Bloque>

                <Bloque title={`Participantes (${ficha.participantes?.length ?? 0})`}>
                  {(ficha.participantes ?? []).map((p: any) => (
                    <View key={p.id} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f2937' }}>
                        {[p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')}{p.esResponsable ? ' · Encargado' : ''}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{[p.cargo, p.correo, p.telefono].filter(Boolean).join(' · ')}</Text>
                    </View>
                  ))}
                </Bloque>

                <Bloque title={`Comprobantes (${ficha.comprobantes?.length ?? 0})`}>
                  {(ficha.comprobantes ?? []).map((c: any) => (
                    <View key={c.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      {!!c.url && (/\.(jpg|jpeg|png|webp)$/i.test(c.url)
                        ? <ImagenLightbox uri={c.url} style={{ width: 58, height: 58, borderRadius: 10, backgroundColor: '#f1f5f9' }} />
                        : <TouchableOpacity onPress={() => Linking.openURL(c.url)}><ExternalLink color={GREEN} size={22} /></TouchableOpacity>)}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f2937' }}>{c.tipoPago === 'ADICIONAL' ? 'Cupos adicionales' : 'Inscripción'}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{[c.estadoPago, c.montoPago != null ? `Bs. ${c.montoPago}` : null].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  ))}
                </Bloque>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
