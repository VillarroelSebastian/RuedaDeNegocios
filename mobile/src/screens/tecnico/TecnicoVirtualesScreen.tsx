import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, TextInput, Linking, Modal,
} from 'react-native';
import {
  AlertTriangle, Building2, Clock, Video, Armchair, Search, Link2, X, CheckCircle2,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short' });
}

const ESTADO_CFG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  PROGRAMADA: { color: '#1d4ed8', bg: '#dbeafe', dot: '#60a5fa', label: 'Programada' },
  EN_CURSO:   { color: '#c2410c', bg: '#ffedd5', dot: '#f97316', label: 'En curso'   },
  FINALIZADA: { color: '#15803d', bg: '#dcfce7', dot: '#22c55e', label: 'Finalizada' },
  CANCELADA:  { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: 'Cancelada'  },
};

const TIPO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  VIRTUAL: { color: '#2563eb', bg: '#dbeafe', label: 'Virtual' },
  MIXTA:   { color: '#7c3aed', bg: '#ede9fe', label: 'Mixta'   },
};

const FILTROS = [
  { key: 'TODOS',      label: 'Todas'       },
  { key: 'EN_CURSO',   label: 'En curso'    },
  { key: 'PROGRAMADA', label: 'Programadas' },
  { key: 'FINALIZADA', label: 'Finalizadas' },
  { key: 'CANCELADA',  label: 'Canceladas'  },
];

function VirtualCard({ r, onEditLink }: { r: any; onEditLink: (r: any) => void }) {
  const sol = r.solicitudreunion;
  const ea  = sol?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento?.empresa;
  const eb  = sol?.empresaevento_solicitudreunion_empresaEventorReceptora_idToempresaevento?.empresa;
  const est = ESTADO_CFG[r.estadoReunion] ?? ESTADO_CFG.PROGRAMADA;
  const tip = TIPO_CFG[r.tipoReunion]    ?? TIPO_CFG.VIRTUAL;
  const link = sol?.enlaceReunionVirtual;
  const cancelada = r.estadoReunion === 'CANCELADA';
  const canceladaPorEmpresa = cancelada && /^Cancelada por /i.test(r.observacionesReunion ?? '');

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
      marginBottom: 10, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    }}>
      <View style={{ padding: 14 }}>
        {/* Status + empresas */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: est.dot }} />
          {ea?.urlFotoPerfil
            ? <Image source={{ uri: ea.urlFotoPerfil }} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
            : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 color={GREEN} size={12} />
              </View>
          }
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 }} numberOfLines={1}>
            {ea?.nombre ?? '—'}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginHorizontal: 2 }}>↔</Text>
          {eb?.urlFotoPerfil
            ? <Image source={{ uri: eb.urlFotoPerfil }} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
            : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 color="#2563eb" size={12} />
              </View>
          }
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 }} numberOfLines={1}>
            {eb?.nombre ?? '—'}
          </Text>
        </View>

        {/* Mesa + hora + badges */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginLeft: 14 }}>
          {!!r.mesa?.numeroMesa && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Armchair color="#9ca3af" size={11} />
              <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '600' }}>Mesa {r.mesa.numeroMesa}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Clock color="#9ca3af" size={11} />
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              {fmtDate(r.fechaHoraInicioReunion)} · {fmtTime(r.fechaHoraInicioReunion)}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: tip.bg }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: tip.color }}>{tip.label}</Text>
          </View>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: est.bg }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: est.color }}>{est.label}</Text>
          </View>
        </View>

        {/* Enlace virtual */}
        {canceladaPorEmpresa && (
          <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8, marginTop:12,
            borderWidth:1, borderColor:'#fecaca', backgroundColor:'#fef2f2', borderRadius:12, padding:10 }}>
            <AlertTriangle color="#dc2626" size={16}/>
            <Text style={{ flex:1, color:'#991b1b', fontSize:12, lineHeight:17 }}>{r.observacionesReunion}</Text>
          </View>
        )}

        {!cancelada && (link ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(link)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, marginTop: 12, paddingVertical: 10, borderRadius: 12,
              backgroundColor: '#2563eb',
            }}
          >
            <Video color="#fff" size={14} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Abrir enlace</Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            marginTop: 12, paddingVertical: 10, borderRadius: 12,
            backgroundColor: '#f3f4f6', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Sin enlace disponible</Text>
          </View>
        ))}

        {/* Cambiar / agregar enlace */}
        {!cancelada && <TouchableOpacity
          onPress={() => onEditLink(r)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 12,
            borderWidth: 1.5, borderColor: GREEN,
          }}
        >
          <Link2 color={GREEN} size={13} />
          <Text style={{ color: GREEN, fontWeight: '700', fontSize: 12 }}>
            {link ? 'Cambiar enlace' : 'Agregar enlace'}
          </Text>
        </TouchableOpacity>}
      </View>
    </View>
  );
}

// Modal para agregar/cambiar el enlace de una reunión virtual
function LinkModal({ reunion, onClose, onGuardado }: { reunion: any; onClose: () => void; onGuardado: () => void }) {
  const [enlace, setEnlace] = useState(reunion?.solicitudreunion?.enlaceReunionVirtual ?? '');
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  const guardar = async () => {
    setErr('');
    const limpio = enlace.trim();
    try {
      const url = new URL(limpio);
      if (url.protocol !== 'https:') throw new Error();
    } catch {
      setErr('El enlace debe ser una URL segura que comience con https://');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/${reunion.id}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enlace: limpio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'No se pudo guardar el enlace.');
      onGuardado();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'No se pudo guardar el enlace.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Link2 color={GREEN} size={18} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Enlace de la reunión</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X color="#6b7280" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
            Reunión #{reunion.id} · las empresas verán este enlace en su sección de Reuniones.
          </Text>
          <TextInput
            value={enlace}
            onChangeText={setEnlace}
            placeholder="https://meet.google.com/..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
            style={{
              borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#0f172a',
            }}
          />
          {!!err && <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{err}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#64748b' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={guardar} disabled={guardando}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, opacity: guardando ? 0.6 : 1 }}>
              {guardando ? <ActivityIndicator color="#fff" size="small" /> : <CheckCircle2 color="#fff" size={16} />}
              <Text style={{ fontWeight: '700', color: '#fff' }}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TecnicoVirtualesScreen() {
  const [reuniones,  setReuniones]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEst,  setFiltroEst]  = useState('TODOS');
  const [search,     setSearch]     = useState('');
  const [linkModal,  setLinkModal]  = useState<any>(null);

  const fetchReuniones = useCallback(async () => {
    try {
      const [resV, resM] = await Promise.all([
        fetch(`${API_URL}/tecnico/reuniones?tipo=VIRTUAL`),
        fetch(`${API_URL}/tecnico/reuniones?tipo=MIXTA`),
      ]);
      const [dataV, dataM] = await Promise.all([resV.json(), resM.json()]);
      const virtual  = Array.isArray(dataV) ? dataV : [];
      const mixta    = Array.isArray(dataM) ? dataM : [];
      // merge + deduplicate by id
      const map = new Map<number, any>();
      [...virtual, ...mixta].forEach((r) => map.set(r.id, r));
      setReuniones(Array.from(map.values()));
    } catch {
      setReuniones([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReuniones();
    const timer = setInterval(fetchReuniones, 15_000);
    return () => clearInterval(timer);
  }, [fetchReuniones]);

  const filtered = reuniones.filter((r) => {
    const matchEst = filtroEst === 'TODOS' || r.estadoReunion === filtroEst;
    const empresa  = r.solicitudreunion
      ?.empresaevento_solicitudreunion_empresaEvento_idToempresaevento
      ?.empresa?.nombre ?? '';
    const matchSearch = search.trim() === '' || empresa.toLowerCase().includes(search.trim().toLowerCase());
    return matchEst && matchSearch;
  });
  const canceladasPorEmpresa = reuniones.filter((r) =>
    r.estadoReunion === 'CANCELADA' && /^Cancelada por /i.test(r.observacionesReunion ?? ''),
  );
  const sinEnlace = reuniones.filter((r) =>
    ['PROGRAMADA', 'REPROGRAMADA', 'EN_CURSO'].includes(r.estadoReunion) &&
    !r.solicitudreunion?.enlaceReunionVirtual,
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Reuniones Virtuales</Text>
        <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
          {filtered.length} reunión(es) virtual(es) o mixta(s)
        </Text>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {FILTROS.map((f) => {
              const cfg    = f.key !== 'TODOS' ? ESTADO_CFG[f.key] : null;
              const activo = filtroEst === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFiltroEst(f.key)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                    backgroundColor: activo ? (cfg?.bg ?? '#0f172a') : '#fff',
                    borderColor:     activo ? (cfg?.dot ?? '#0f172a') : '#e5e7eb',
                  }}
                >
                  <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: activo ? (cfg?.color ?? '#fff') : '#6b7280',
                  }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Búsqueda */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1,
          borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 9,
          marginTop: 10,
        }}>
          <Search color="#9ca3af" size={15} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por empresa..."
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, fontSize: 13, color: '#111827' }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReuniones(); }}
              tintColor={GREEN}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {sinEnlace.length > 0 && (
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:12,
              borderWidth:1, borderColor:'#fcd34d', backgroundColor:'#fffbeb', borderRadius:16, padding:14 }}>
              <AlertTriangle color="#d97706" size={19}/>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#92400e', fontSize:13, fontWeight:'800' }}>
                  {sinEnlace.length} reunión(es) pendiente(s) de enlace
                </Text>
                <Text style={{ color:'#a16207', fontSize:11, lineHeight:16, marginTop:3 }}>
                  Abre la reunión y agrega un enlace HTTPS antes de su hora programada.
                </Text>
              </View>
            </View>
          )}
          {canceladasPorEmpresa.length > 0 && (
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:12,
              borderWidth:1, borderColor:'#fecaca', backgroundColor:'#fef2f2', borderRadius:16, padding:14 }}>
              <AlertTriangle color="#dc2626" size={19}/>
              <View style={{ flex:1 }}>
                <Text style={{ color:'#991b1b', fontSize:13, fontWeight:'800' }}>
                  {canceladasPorEmpresa.length} reunión(es) virtual(es) cancelada(s) por empresas
                </Text>
                <Text style={{ color:'#b91c1c', fontSize:11, lineHeight:16, marginTop:3 }}>
                  El motivo aparece directamente en la reunión cancelada.
                </Text>
              </View>
            </View>
          )}
          {filtered.length === 0 ? (
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
              padding: 40, alignItems: 'center',
            }}>
              <Video color="#d1d5db" size={36} />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>
                Sin reuniones virtuales
              </Text>
            </View>
          ) : (
            filtered.map((r) => <VirtualCard key={r.id} r={r} onEditLink={setLinkModal} />)
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {linkModal && (
        <LinkModal
          reunion={linkModal}
          onClose={() => setLinkModal(null)}
          onGuardado={() => { setLinkModal(null); fetchReuniones(); }}
        />
      )}
    </View>
  );
}
