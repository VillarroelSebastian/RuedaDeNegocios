import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowDown, Ban, CalendarDays, CheckCircle2, Clock, History, Inbox, Send, XCircle } from 'lucide-react-native';
import { API_URL } from '../utils/userStore';

const GREEN = '#449D3A';

const fmtDia = (iso: string) => new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/La_Paz' });
const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' });
const fmtTipo = (t: string) => (t === 'VIRTUAL' ? 'Virtual' : 'Presencial');

const ESTADO: Record<string, { label: string; bg: string; color: string; Icon: any }> = {
  PENDIENTE: { label: 'Esperando respuesta', bg: '#fef3c7', color: '#92400e', Icon: Clock },
  ACEPTADA:  { label: 'Aceptado', bg: '#dcfce7', color: '#166534', Icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b', Icon: XCircle },
  CANCELADA: { label: 'Cancelado', bg: '#f3f4f6', color: '#4b5563', Icon: Ban },
  VENCIDA:   { label: 'Vencido', bg: '#f3f4f6', color: '#6b7280', Icon: History },
};

function Tarjeta({ c, ocupado, onAceptar, onRechazar, onCancelar, onReintentar }: any) {
  const est = ESTADO[c.estado] ?? ESTADO.PENDIENTE;
  const recibida = c.direccion === 'recibida';
  const pendRecibida = c.estado === 'PENDIENTE' && recibida;
  const aplicado = c.estado === 'ACEPTADA';
  const cambiaMesa = c.propuesto.tipo === 'PRESENCIAL' && c.actual.tipo === 'PRESENCIAL' && c.actual.mesa !== c.propuesto.mesa;
  // La reunión se modifica al aceptar: en el historial el primer bloque es el
  // "antes" y el segundo el "ahora".
  const etiquetaActual = c.estado === 'PENDIENTE' ? 'ACTUAL' : aplicado ? 'ANTES' : 'SE MANTIENE';
  const etiquetaPropuesto = c.estado === 'PENDIENTE' ? 'PROPUESTO' : aplicado ? 'AHORA' : 'PROPUESTO (NO SE APLICÓ)';
  const lugar = (x: any) => `${fmtTipo(x.tipo)}${x.tipo === 'PRESENCIAL' && x.mesa ? ` · Mesa ${x.mesa}` : ''}`;
  const colorPropuesto = aplicado || c.estado === 'PENDIENTE';
  return (
    <View style={{ backgroundColor: pendRecibida ? '#fffbeb' : '#fff', borderRadius: 16, borderWidth: 1, borderColor: pendRecibida ? '#fcd34d' : '#e2e8f0', padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: est.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <est.Icon size={11} color={est.color} /><Text style={{ color: est.color, fontSize: 10, fontWeight: '800' }}>{est.label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: recibida ? '#fffbeb' : '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          {recibida ? <Inbox size={10} color="#d97706" /> : <Send size={10} color="#4f46e5" />}
          <Text style={{ color: recibida ? '#d97706' : '#4f46e5', fontSize: 10, fontWeight: '800' }}>{recibida ? 'Recibida' : 'Enviada por ti'}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>{c.contraparte?.nombre ?? 'Empresa'}</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{recibida ? `${c.proponente} propone cambiar la reunión` : 'Propusiste cambiar la reunión'}</Text>

      <View style={{ marginTop: 10, gap: 6 }}>
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8' }}>{etiquetaActual}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <CalendarDays size={13} color="#475569" /><Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>{fmtDia(c.actual.inicio)} · {fmtHora(c.actual.inicio)}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{lugar(c.actual)}</Text>
        </View>
        <View style={{ alignItems: 'center' }}><ArrowDown size={14} color={GREEN} /></View>
        <View style={{ backgroundColor: colorPropuesto ? '#f0fdf4' : '#f8fafc', borderRadius: 12, padding: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colorPropuesto ? '#15803d' : '#94a3b8' }}>{etiquetaPropuesto}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <CalendarDays size={13} color="#166534" /><Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{fmtDia(c.propuesto.inicio)} · {fmtHora(c.propuesto.inicio)}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#475569' }}>{lugar(c.propuesto)}{c.actual.tipo !== c.propuesto.tipo ? ' (cambia la modalidad)' : cambiaMesa ? ' (cambia la mesa)' : ''}</Text>
        </View>
      </View>

      {!!c.mensaje && <Text style={{ marginTop: 10, fontSize: 12, color: '#475569' }}>“{c.mensaje}”</Text>}
      {c.estado === 'RECHAZADA' && !!c.motivoRechazo && (
        <View style={{ marginTop: 10, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: 12, color: '#991b1b' }}><Text style={{ fontWeight: '800' }}>Motivo del rechazo: </Text>{c.motivoRechazo}</Text>
        </View>
      )}
      {c.estado === 'ACEPTADA' && <Text style={{ marginTop: 10, fontSize: 12, fontWeight: '700', color: '#15803d' }}>La reunión ya quedó en el nuevo horario.</Text>}
      {c.estado === 'VENCIDA' && <Text style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>No se respondió a tiempo: la reunión sigue con su horario original.</Text>}

      <Text style={{ marginTop: 10, fontSize: 10, color: '#94a3b8' }}>
        {c.fechaRespuesta ? `Respondido el ${fmtDia(c.fechaRespuesta)} ${fmtHora(c.fechaRespuesta)}` : `Enviado el ${fmtDia(c.fechaCreacion)} ${fmtHora(c.fechaCreacion)}`}
      </Text>

      {pendRecibida && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity disabled={ocupado} onPress={onRechazar} style={{ flex: 1, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: ocupado ? 0.5 : 1 }}>
            <Text style={{ color: '#b91c1c', fontWeight: '800', fontSize: 12 }}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={ocupado} onPress={onAceptar} style={{ flex: 1, backgroundColor: GREEN, borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: ocupado ? 0.5 : 1 }}>
            {ocupado ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Aceptar cambio</Text>}
          </TouchableOpacity>
        </View>
      )}
      {c.estado === 'PENDIENTE' && !recibida && (
        <TouchableOpacity disabled={ocupado} onPress={onCancelar} style={{ marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 11, alignItems: 'center', opacity: ocupado ? 0.5 : 1 }}>
          <Text style={{ color: '#475569', fontWeight: '800', fontSize: 12 }}>Cancelar solicitud</Text>
        </TouchableOpacity>
      )}
      {c.puedeReintentar && (
        <TouchableOpacity onPress={onReintentar} style={{ marginTop: 10, borderWidth: 1, borderColor: GREEN, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: GREEN, fontWeight: '800', fontSize: 12 }}>Proponer otro horario</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Pestaña "Cambios" de Reuniones: propuestas de cambio de horario/modalidad
// recibidas (por responder), enviadas (en espera) e historial con su resultado.
export default function CambiosPanelMobile({ eeId, cambios, refreshing, onRefresh, onActualizado, onMensaje, onReintentar }: {
  eeId: number; cambios: any[]; refreshing: boolean; onRefresh: () => void; onActualizado: () => void;
  onMensaje: (tipo: 'ok' | 'err', msg: string) => void; onReintentar: (reunionId: number) => void;
}) {
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);
  const ocupadoRef = useRef(false);
  const [rechazando, setRechazando] = useState<any>(null);
  const [motivo, setMotivo] = useState('');

  const llamar = async (c: any, ruta: string, body: any, exito: string) => {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true;
    setOcupadoId(c.id);
    try {
      const res = await fetch(`${API_URL}/empresa/reuniones/cambios/${c.id}/${ruta}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eeId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? 'No se pudo completar la acción');
      setRechazando(null); setMotivo('');
      onMensaje('ok', exito);
      onActualizado();
    } catch (e: any) {
      onMensaje('err', e.message || 'No se pudo completar la acción');
    } finally {
      ocupadoRef.current = false;
      setOcupadoId(null);
    }
  };

  const porResponder = cambios.filter((c) => c.estado === 'PENDIENTE' && c.direccion === 'recibida');
  const enEspera = cambios.filter((c) => c.estado === 'PENDIENTE' && c.direccion === 'enviada');
  const historial = cambios.filter((c) => c.estado !== 'PENDIENTE');

  const render = (c: any) => (
    <Tarjeta key={c.id} c={c} ocupado={ocupadoId === c.id}
      onAceptar={() => llamar(c, 'responder', { aceptar: true }, 'Cambio aceptado: la agenda ya se actualizó y se avisó a la otra empresa.')}
      onRechazar={() => { setRechazando(c); setMotivo(''); }}
      onCancelar={() => llamar(c, 'cancelar', {}, 'Solicitud de cambio cancelada; se avisó a la otra empresa.')}
      onReintentar={() => onReintentar(c.reunionId)} />
  );
  const titulo = (txt: string, color = '#0f172a') => <Text style={{ fontSize: 13, fontWeight: '800', color, marginBottom: 8, marginTop: 4 }}>{txt}</Text>;

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}>
        {cambios.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <History size={46} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, textAlign: 'center' }}>Aún no hay solicitudes de cambio.</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' }}>Abre una reunión confirmada y elige “Solicitar cambios” para proponer otro horario.</Text>
          </View>
        ) : (
          <>
            {porResponder.length > 0 && <>{titulo(`Por responder (${porResponder.length})`, '#b45309')}{porResponder.map(render)}</>}
            {enEspera.length > 0 && <>{titulo(`Enviadas · esperando respuesta (${enEspera.length})`)}{enEspera.map(render)}</>}
            {historial.length > 0 && <>{titulo(`Historial (${historial.length})`, '#94a3b8')}{historial.map(render)}</>}
          </>
        )}
      </ScrollView>

      <Modal visible={!!rechazando} transparent animationType="slide" onRequestClose={() => setRechazando(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>Rechazar cambio</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 }}>
                Cuéntale a {rechazando?.contraparte?.nombre ?? 'la otra empresa'} por qué no te sirve el nuevo horario. La reunión se mantiene como estaba y podrá proponerte otro.
              </Text>
              <TextInput value={motivo} onChangeText={setMotivo} multiline maxLength={500} placeholder="Ej.: A esa hora ya tengo otra reunión; prefiero por la tarde." placeholderTextColor="#9ca3af"
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 14 }} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity onPress={() => setRechazando(null)} style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                  <Text style={{ color: '#475569', fontWeight: '800' }}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={motivo.trim().length < 3 || ocupadoId === rechazando?.id}
                  onPress={() => llamar(rechazando, 'responder', { aceptar: false, motivo: motivo.trim() }, 'Cambio rechazado; se avisó a la otra empresa con tu motivo.')}
                  style={{ flex: 1, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: motivo.trim().length < 3 ? 0.5 : 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Rechazar cambio</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
