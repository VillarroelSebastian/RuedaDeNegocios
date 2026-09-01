import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal as RNModal
} from 'react-native';
import { Search, Building2, Users, Eye, X, MessageSquare, KeyRound, CalendarClock } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';
import EnviarMensajeEmpresaModal from '../../components/EnviarMensajeEmpresaModal';

const GREEN = '#449D3A';

/* ── App Modal ───────────────────────────────────────────────── */
function AppModal({ visible, type, title, message, onClose, onConfirm }: any) {
  const colors: any = {
    confirm: { bg: '#fffbeb', border: '#fcd34d', btn: '#449D3A' },
    error:   { bg: '#fef2f2', border: '#fca5a5', btn: '#ef4444' },
    success: { bg: '#f0fdf4', border: '#86efac', btn: '#449D3A' },
  };
  const c = colors[type] ?? colors.error;
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>{title}</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {onConfirm && (
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={onClose}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ flex: 1, backgroundColor: c.btn, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }} onPress={onConfirm ?? onClose}>
              <Text style={{ fontWeight: '700', color: '#fff' }}>{onConfirm ? 'Confirmar' : 'Entendido'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

/* ── Participants Modal ───────────────────────────────────────── */
function ParticipantesModal({ empresa, onClose }: { empresa: { id: number; nombre: string } | null; onClose: () => void }) {
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [credencial, setCredencial] = useState<any>(null);
  const [reiniciando, setReiniciando] = useState<number | null>(null);

  const reiniciarPassword = async (p: any) => {
    setReiniciando(p.usuarioId);
    try {
      const res = await fetch(`${API_URL}/admin/participantes/${p.usuarioId}/password-temporal`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:'{}' });
      const data = await res.json();
      setCredencial(res.ok ? data : { correo:p.correo, nuevaContrasenia:`ERROR: ${data.message}` });
    } catch { setCredencial({ correo:p.correo, nuevaContrasenia:'ERROR: no se pudo generar' }); }
    finally { setReiniciando(null); }
  };

  useEffect(() => {
    if (!empresa) return;
    setLoading(true);
    fetch(`${API_URL}/admin/empresas/${empresa.id}/participantes`)
      .then(r => r.json())
      .then(d => setParticipantes(Array.isArray(d) ? d : []))
      .catch(() => setParticipantes([]))
      .finally(() => setLoading(false));
  }, [empresa?.id]);

  return (
    <RNModal visible={!!empresa} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Participantes</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{empresa?.nombre}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <X color="#6b7280" size={16} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {!!credencial && <View style={{backgroundColor:'#fffbeb',borderColor:'#fcd34d',borderWidth:1,borderRadius:14,padding:13,marginBottom:12}}><Text style={{fontWeight:'800',color:'#92400e'}}>Nueva contraseña temporal</Text><Text style={{fontSize:12,color:'#92400e',marginTop:4}}>{credencial.correo}</Text><Text selectable style={{fontSize:16,fontWeight:'800',color:'#111827',backgroundColor:'#fff',padding:9,borderRadius:8,marginTop:7}}>{credencial.nuevaContrasenia}</Text><Text style={{fontSize:10,color:'#92400e',marginTop:6}}>Cópiala ahora. La contraseña anterior está cifrada y no se puede mostrar.</Text></View>}
            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={GREEN} />
              </View>
            ) : participantes.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, paddingVertical: 32 }}>Sin participantes registrados</Text>
            ) : (
              participantes.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '700', color: '#166534', fontSize: 15 }}>{p.nombres?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{p.nombres} {p.apellidoPaterno}</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.cargo}</Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af' }}>{p.correo}</Text>
                    </View>
                  </View>
                  <View style={{alignItems:'flex-end',gap:5}}>{p.esResponsable && <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}><Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>Responsable</Text></View>}{p.estaActivo && <TouchableOpacity disabled={reiniciando===p.usuarioId} onPress={()=>reiniciarPassword(p)} style={{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1,borderColor:'#fcd34d',borderRadius:8,paddingHorizontal:7,paddingVertical:5,opacity:reiniciando===p.usuarioId?.5:1}}><KeyRound size={12} color="#b45309"/><Text style={{fontSize:10,fontWeight:'700',color:'#b45309'}}>Nueva clave</Text></TouchableOpacity>}</View>
                </View>
              ))
            )}
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{participantes.length} participante{participantes.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

function AgendaEmpresaModal({ empresa, onClose }: { empresa: { eeId:number; nombre:string } | null; onClose:()=>void }) {
  const [data,setData]=useState<any>(null);
  useEffect(()=>{ if(!empresa)return; setData(null); fetch(`${API_URL}/staff/empresas/${empresa.eeId}/agenda`).then(r=>r.json()).then(setData).catch(()=>setData({reuniones:[]})); },[empresa?.eeId]);
  return <RNModal visible={!!empresa} transparent animationType="slide" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'flex-end'}}><View style={{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'85%',padding:20}}><View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:14}}><View><Text style={{fontSize:17,fontWeight:'800'}}>Agenda de {empresa?.nombre}</Text><Text style={{fontSize:12,color:'#64748b'}}>Reuniones del evento activo</Text></View><TouchableOpacity onPress={onClose}><X size={20} color="#64748b"/></TouchableOpacity></View><ScrollView>{!data?<ActivityIndicator color={GREEN} style={{marginVertical:40}}/>:!data.reuniones?.length?<Text style={{textAlign:'center',color:'#94a3b8',marginVertical:40}}>Sin reuniones registradas.</Text>:data.reuniones.map((r:any)=>{const sol=r.solicitudreunion;const a=sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;const b=sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;const otra=sol?.empresaEvento_id===empresa?.eeId?b:a;return <View key={r.id} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:14,padding:12,marginBottom:9}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text style={{fontWeight:'800',flex:1}}>{otra?.nombre??'Empresa'}</Text><Text style={{fontSize:10,fontWeight:'800',color:GREEN}}>{r.estadoReunion}</Text></View><Text style={{fontSize:11,color:'#64748b',marginTop:4}}>{new Date(r.fechaHoraInicioReunion).toLocaleString('es-BO',{timeZone:'America/La_Paz'})} · {r.mesa?`Mesa ${r.mesa.numeroMesa}`:r.tipoReunion}</Text></View>})}</ScrollView></View></View></RNModal>;
}

/* ── Badge helpers ───────────────────────────────────────────── */
const badgePago = (estado: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    COMPLETADO: { bg: '#dcfce7', text: '#166534', label: 'Pagado' },
    PENDIENTE:  { bg: '#ffedd5', text: '#9a3412', label: 'Pendiente' },
    OBSERVADO:  { bg: '#fef9c3', text: '#854d0e', label: 'Observado' },
    SIN_REGISTRO: { bg: '#f3f4f6', text: '#6b7280', label: 'Sin registro' },
  };
  const b = map[estado] || map.SIN_REGISTRO;
  return (
    <View style={{ backgroundColor: b.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: b.text, fontSize: 10, fontWeight: '700' }}>{b.label}</Text>
    </View>
  );
};

/* ── Main Screen ─────────────────────────────────────────────── */
export default function EmpresasScreen({ navigation }: any) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [participantesEmpresa, setParticipantesEmpresa] = useState<{ id: number; nombre: string } | null>(null);
  const [mensajeEmpresa, setMensajeEmpresa] = useState<{ eeId: number; nombre: string } | null>(null);
  const [agendaEmpresa, setAgendaEmpresa] = useState<{ eeId:number; nombre:string } | null>(null);
  const [appModal, setAppModal] = useState<{ visible: boolean; type: string; title: string; message: string; onConfirm?: () => void }>({
    visible: false, type: 'confirm', title: '', message: '',
  });
  const limit = 20;

  const showModal = (type: string, title: string, message: string, onConfirm?: () => void) =>
    setAppModal({ visible: true, type, title, message, onConfirm });
  const closeModal = () => setAppModal(m => ({ ...m, visible: false }));

  const fetchEmpresas = useCallback(async (p = 1, s = search) => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit), ...(s && { search: s }) });
      const res = await fetch(`${API_URL}/admin/empresas?${params}`);
      const data = await res.json();
      if (p === 1) setEmpresas(data.data || []);
      else setEmpresas((prev) => [...prev, ...(data.data || [])]);
      setTotal(data.total || 0);
      setPage(p);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { setLoading(true); fetchEmpresas(1, search); }, [search]);

  const onRefresh = () => { setRefreshing(true); fetchEmpresas(1, search); };

  const handleDelete = (id: number, nombre: string) => {
    showModal('confirm', 'Eliminar empresa', `¿Desactivar a "${nombre}" del evento?`, async () => {
      closeModal();
      try {
        const res = await fetch(`${API_URL}/admin/empresas/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'No se pudo desactivar la empresa.');
        await fetchEmpresas(1, search);
      } catch (e: any) {
        showModal('error', 'No se pudo eliminar', e.message || 'Intenta nuevamente.');
      }
    });
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <AppModal {...appModal} onClose={closeModal} onConfirm={appModal.onConfirm} />
      <ParticipantesModal empresa={participantesEmpresa} onClose={() => setParticipantesEmpresa(null)} />
      <AgendaEmpresaModal empresa={agendaEmpresa} onClose={() => setAgendaEmpresa(null)} />
      {mensajeEmpresa && (
        <EnviarMensajeEmpresaModal
          receptorEeId={mensajeEmpresa.eeId}
          empresaNombre={mensajeEmpresa.nombre}
          onClose={() => setMensajeEmpresa(null)}
        />
      )}

      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Empresas</Text>
        <Text className="text-sm text-gray-500 mt-1">Empresas registradas en el evento</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mt-3">
          <Search color="#9ca3af" size={16} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar empresa..."
            className="flex-1 ml-2 py-2.5 text-sm text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {loading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        >
          <View className="px-4 pt-3 pb-2">
            <Text className="text-sm text-gray-500">{total} empresa(s)</Text>
          </View>

          {empresas.map((emp) => (
            <View key={emp.id} className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <View className="flex-row items-start gap-3">
                <View className="w-12 h-12 rounded-xl bg-green-50 items-center justify-center shrink-0">
                  <Building2 color={GREEN} size={22} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900 text-sm">{emp.nombre}</Text>
                  {emp.codigo && (
                    <Text style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: '600', color: GREEN, marginTop: 1 }}>{emp.codigo}</Text>
                  )}
                  <Text className="text-xs text-gray-500 mt-0.5">{emp.rubro} · {emp.ciudad}</Text>
                  <View className="flex-row items-center gap-3 mt-2">
                    {badgePago(emp.estadoVerificacionPago)}
                    <View className="flex-row items-center gap-1">
                      <Users color="#9ca3af" size={12} />
                      <Text className="text-xs text-gray-400">{emp.participantesRegistrados ?? 0}/{emp.numeroParticipantes} cupos</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                <TouchableOpacity
                  onPress={() => setParticipantesEmpresa({ id: emp.id, nombre: emp.nombre })}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 12 }}
                >
                  <Users color="#3b82f6" size={14} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#3b82f6' }}>Participantes</Text>
                </TouchableOpacity>
                {emp.empresaEventoId && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PagoDetail', { id: emp.empresaEventoId })}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#f0fdf4', borderRadius: 12 }}
                  >
                    <Eye color={GREEN} size={14} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: GREEN }}>Ver pago</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(emp.id, emp.nombre)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fef2f2', borderRadius: 12 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
              {emp.empresaEventoId && emp.estadoHabilitacionAcceso === 'HABILITADO' && (
                <TouchableOpacity
                  onPress={() => setMensajeEmpresa({ eeId: emp.empresaEventoId, nombre: emp.nombre })}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, marginTop: 8, borderWidth: 1.5, borderColor: GREEN, borderRadius: 12 }}
                >
                  <MessageSquare color={GREEN} size={14} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>Enviar mensaje</Text>
                </TouchableOpacity>
              )}
              {emp.empresaEventoId && <TouchableOpacity onPress={()=>setAgendaEmpresa({eeId:emp.empresaEventoId,nombre:emp.nombre})} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:9,marginTop:8,borderWidth:1,borderColor:'#c4b5fd',borderRadius:12}}><CalendarClock size={14} color="#7c3aed"/><Text style={{fontSize:12,fontWeight:'700',color:'#7c3aed'}}>Ver agenda</Text></TouchableOpacity>}
            </View>
          ))}

          {empresas.length < total && (
            <TouchableOpacity
              onPress={() => fetchEmpresas(page + 1)}
              className="mx-4 my-3 py-3 bg-white border border-gray-200 rounded-xl items-center"
            >
              <Text className="text-sm font-semibold text-gray-600">Cargar más</Text>
            </TouchableOpacity>
          )}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
