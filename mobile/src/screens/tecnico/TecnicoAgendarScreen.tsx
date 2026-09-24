import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Search, Check, CheckCircle2, AlertCircle, Users, Video, ChevronLeft,
  CalendarPlus, Send, Building2,
} from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
function fmtSoloFecha(f: string) {
  return new Date(f + 'T00:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' });
}
function fechaISO(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function estadoInfo(estado: string | undefined) {
  if (estado === 'OCUPADO') return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'Una de las empresas ya tiene otra reunión confirmada a esta hora.' };
  if (estado === 'PENDIENTE') return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Hay una solicitud pendiente que se cruza con este horario.' };
  return { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', label: 'Disponible para ambas empresas.' };
}
function rangosDia(dias: any[], fecha: string | null) {
  if (!fecha) return null;
  const dia = dias.find((d: any) => d.fecha === fecha);
  if (!dia) return 'Sin datos declarados';
  if (dia.habilitado === false) return 'No declaró disponibilidad este día';
  if (!Array.isArray(dia.rangos) || dia.rangos.length === 0) return 'Todo el día';
  return dia.rangos.map((r: any) => `${r.desde}–${r.hasta}`).join(', ');
}

export default function TecnicoAgendarScreen() {
  const navigation = useNavigation<any>();

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [cargandoEmp, setCargandoEmp] = useState(true);

  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [empA, setEmpA] = useState<any>(null);
  const [empB, setEmpB] = useState<any>(null);
  const [eligiendo, setEligiendo] = useState<'A' | 'B' | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL');

  const [horarios, setHorarios] = useState<any[]>([]);
  const [duracionMin, setDuracionMin] = useState(0);
  const [cargandoH, setCargandoH] = useState(false);
  const [fechaSel, setFechaSel] = useState<string | null>(null);
  const [horaSel, setHoraSel] = useState<number | null>(null);
  const [minutosStr, setMinutosStr] = useState('');
  // Horarios que cada empresa declaró como su disponibilidad preferida — solo
  // de referencia, no restringen las fechas/horas que el técnico puede elegir.
  const [diasEmpA, setDiasEmpA] = useState<any[]>([]);
  const [diasEmpB, setDiasEmpB] = useState<any[]>([]);

  // Mesa (solo presencial) — se elige ANTES del horario porque la única razón
  // real por la que una hora no estaría disponible es que esa mesa ya tenga
  // otra reunión a esa hora (considerando duración + tiempo de limpieza).
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesa, setMesa] = useState<number | null>(null); // null = "Automática"
  const [cargandoM, setCargandoM] = useState(false);
  const [ocupacionMesa, setOcupacionMesa] = useState<{ inicio: string; fin: string }[]>([]);
  const [cargandoOcup, setCargandoOcup] = useState(false);

  const [enlace, setEnlace] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/tecnico/empresas-habilitadas`)
      .then((r) => r.json())
      .then((d) => setEmpresas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargandoEmp(false));
  }, []);

  // ── Derivados del horario ──
  const fechasDisponibles = useMemo(() =>
    [...new Set(horarios.map((h: any) => fechaISO(h.inicio)))].sort() as string[], [horarios]);
  const horariosDelDia = useMemo(() =>
    fechaSel ? horarios.filter((h: any) => fechaISO(h.inicio) === fechaSel) : [], [horarios, fechaSel]);
  const horasDisponibles = useMemo(() =>
    [...new Set(horariosDelDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[],
    [horariosDelDia]);
  const minutosParaHora = useMemo(() => {
    if (horaSel === null) return [];
    return horariosDelDia
      .filter((h: any) => new Date(h.inicio).getHours() === horaSel)
      .map((h: any) => new Date(h.inicio).getMinutes())
      .sort((a: number, b: number) => a - b);
  }, [horariosDelDia, horaSel]);
  const horario = useMemo(() => {
    if (horaSel === null || minutosStr === '') return null;
    const mins = parseInt(minutosStr);
    return horariosDelDia.find((h: any) => {
      const d = new Date(h.inicio);
      return d.getHours() === horaSel && d.getMinutes() === mins;
    }) ?? null;
  }, [horariosDelDia, horaSel, minutosStr]);

  const cargarHorarios = useCallback(() => {
    if (!empA || !empB) return;
    setCargandoH(true);
    setHorarios([]); setFechaSel(null); setHoraSel(null); setMinutosStr('');
    Promise.all([
      fetch(`${API_URL}/tecnico/horarios?eeId=${empA.eeId}&eeReceptoraId=${empB.eeId}`).then((r) => r.json()),
      fetch(`${API_URL}/empresa/horarios-empresa/dias?eeId=${empA.eeId}`).then((r) => r.json()).catch(() => null),
      fetch(`${API_URL}/empresa/horarios-empresa/dias?eeId=${empB.eeId}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([data, diasA, diasB]) => {
        // Se usan TODAS las franjas configuradas del evento (agenda), no solo
        // el cruce en que ambas empresas están libres: el técnico/admin puede
        // agendar a cualquier hora/fecha del evento; el estado de cada franja
        // (disponible, ocupada, pendiente) queda solo como referencia visual.
        const hrs: any[] = Array.isArray(data?.agenda)
          ? data.agenda.filter((h: any) => h.estado !== 'PASADO')
          : Array.isArray(data?.horarios) ? data.horarios : [];
        setHorarios(hrs);
        setDuracionMin(data?.duracionMinutos ?? 0);
        setDiasEmpA(Array.isArray(diasA?.dias) ? diasA.dias : []);
        setDiasEmpB(Array.isArray(diasB?.dias) ? diasB.dias : []);
        const fechas = [...new Set(hrs.map((h: any) => fechaISO(h.inicio)))].sort() as string[];
        const hoy = fechaISO(new Date().toISOString());
        const f = fechas.find((x) => x >= hoy) ?? fechas[0] ?? null;
        setFechaSel(f);
        if (f) {
          const delDia = hrs.filter((h: any) => fechaISO(h.inicio) === f);
          const hh = [...new Set(delDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
          const auto = hh[0];
          if (auto !== undefined) {
            setHoraSel(auto);
            const mins = delDia.filter((h: any) => new Date(h.inicio).getHours() === auto)
              .map((h: any) => new Date(h.inicio).getMinutes()).sort((a: number, b: number) => a - b);
            setMinutosStr(mins.length ? String(mins[0]).padStart(2, '0') : '');
          }
        }
      })
      .catch(() => setHorarios([]))
      .finally(() => setCargandoH(false));
  }, [empA, empB]);

  const cargarMesas = () => {
    setCargandoM(true);
    setMesas([]); setMesa(null);
    fetch(`${API_URL}/tecnico/mesas`)
      .then((r) => r.json())
      .then((d) => setMesas(Array.isArray(d?.mesas) ? d.mesas : []))
      .catch(() => {})
      .finally(() => setCargandoM(false));
  };

  // Ocupación real de la mesa elegida en la fecha elegida (ya incluye el
  // tiempo de limpieza configurado). Es la única restricción dura del paso 3.
  useEffect(() => {
    if (tipo !== 'PRESENCIAL' || mesa === null || !fechaSel) { setOcupacionMesa([]); return; }
    setCargandoOcup(true);
    fetch(`${API_URL}/tecnico/mesas/${mesa}/ocupacion?fecha=${fechaSel}`)
      .then((r) => r.json())
      .then((d) => setOcupacionMesa(Array.isArray(d?.ocupado) ? d.ocupado : []))
      .catch(() => setOcupacionMesa([]))
      .finally(() => setCargandoOcup(false));
  }, [tipo, mesa, fechaSel]);

  const slotBloqueadoPorMesa = useCallback((h: any) => {
    if (tipo !== 'PRESENCIAL' || mesa === null) return false;
    const ini = new Date(h.inicio).getTime();
    const fin = new Date(h.fin).getTime();
    return ocupacionMesa.some((o) => new Date(o.inicio).getTime() < fin && new Date(o.fin).getTime() > ini);
  }, [tipo, mesa, ocupacionMesa]);
  const horarioBloqueado = horario ? slotBloqueadoPorMesa(horario) : false;

  const crear = async () => {
    if (!empA || !empB || !horario) return;
    setErr('');
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/tecnico/reuniones/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eeAId: empA.eeId, eeBId: empB.eeId, tipo,
          inicio: horario.inicio,
          mesaId: tipo === 'PRESENCIAL' ? mesa ?? undefined : undefined,
          enlace: tipo === 'VIRTUAL' ? enlace || undefined : undefined,
          mensaje: mensaje || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Error al crear la reunión');
      setExito(`Reunión creada entre ${empA.nombre} y ${empB.nombre} para el ${fmtSoloFecha(fechaISO(horario.inicio))} a las ${fmtTime(horario.inicio)}. Ambas empresas fueron notificadas.`);
    } catch (e: any) { setErr(e.message || 'Error de red'); }
    finally { setEnviando(false); }
  };

  const reiniciar = () => {
    setExito(''); setErr(''); setPaso(1);
    setEmpA(null); setEmpB(null); setTipo('PRESENCIAL');
    setHorarios([]); setFechaSel(null); setHoraSel(null); setMinutosStr('');
    setDiasEmpA([]); setDiasEmpB([]);
    setMesas([]); setMesa(null); setOcupacionMesa([]); setEnlace(''); setMensaje('');
  };

  const filtradas = empresas.filter(
    (e: any) =>
      e.eeId !== (eligiendo === 'A' ? empB?.eeId : empA?.eeId) &&
      [e.nombre, e.rubro, e.codigo].some((v) => v && String(v).toLowerCase().includes(busqueda.toLowerCase()))
  );

  const pasoLabels = ['Empresas', 'Modalidad', tipo === 'PRESENCIAL' ? 'Mesa y horario' : 'Horario', 'Confirmar'];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Modal de éxito */}
      <Modal visible={!!exito} transparent animationType="fade">
        <View style={s.exitoOverlay}>
          <View style={s.exitoCard}>
            <View style={s.exitoIcon}><CheckCircle2 size={34} color={GREEN} /></View>
            <Text style={s.exitoTitle}>¡Reunión agendada!</Text>
            <Text style={s.exitoText}>{exito}</Text>
            <TouchableOpacity style={s.btnPrimary} onPress={reiniciar} activeOpacity={0.8}>
              <Text style={s.btnText}>Agendar otra reunión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSecondary, { marginTop: 8 }]} onPress={() => { reiniciar(); navigation.goBack(); }} activeOpacity={0.8}>
              <Text style={s.btnSecText}>Volver al panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal selector de empresa */}
      <Modal visible={!!eligiendo} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Elegir {eligiendo === 'A' ? 'Empresa 1' : 'Empresa 2'}</Text>
              <TouchableOpacity onPress={() => setEligiendo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#6b7280' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <View style={s.searchBox}>
              <Search size={15} color="#94a3b8" />
              <TextInput value={busqueda} onChangeText={setBusqueda} placeholder="Buscar empresa..."
                placeholderTextColor="#9ca3af" style={s.searchInput} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 10 }}>
              {filtradas.length === 0 ? (
                <Text style={s.sinResultados}>Sin resultados.</Text>
              ) : (
                filtradas.map((e: any) => (
                  <TouchableOpacity
                    key={e.eeId}
                    style={s.empRow}
                    onPress={() => {
                      if (eligiendo === 'A') setEmpA(e); else setEmpB(e);
                      setEligiendo(null); setBusqueda('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={s.empAvatar}><Text style={s.empAvatarText}>{(e.nombre ?? 'E')[0].toUpperCase()}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.empNombre} numberOfLines={1}>{e.nombre}</Text>
                      {!!e.codigo && <Text style={s.empCodigo}>{e.codigo}</Text>}
                      {!!e.rubro && <Text style={s.empRubro} numberOfLines={1}>{e.rubro}</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CalendarPlus size={22} color={GREEN} />
          <Text style={s.titulo}>Agendar reunión</Text>
        </View>
        <Text style={s.subtitulo}>
          Crea una reunión confirmada entre dos empresas en 4 pasos. Ambas serán notificadas automáticamente.
        </Text>

        {/* Stepper */}
        <View style={s.stepper}>
          {pasoLabels.map((label, i) => (
            <React.Fragment key={label}>
              <View style={[s.stepDot, paso >= i + 1 && s.stepDotActive]}>
                {paso > i + 1 ? <Check size={13} color="#fff" /> : <Text style={[s.stepNum, paso >= i + 1 && { color: '#fff' }]}>{i + 1}</Text>}
              </View>
              {i < pasoLabels.length - 1 && <View style={[s.stepLine, paso > i + 1 && { backgroundColor: GREEN }]} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={s.stepLabel}>Paso {paso} de 4 · {pasoLabels[paso - 1]}</Text>

        {!!err && (
          <View style={s.errorBox}>
            <AlertCircle size={14} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{err}</Text>
          </View>
        )}

        {/* ── Paso 1: empresas ── */}
        {paso === 1 && (
          <>
            {cargandoEmp ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color={GREEN} />
            ) : (
              <>
                {(['A', 'B'] as const).map((lado) => {
                  const emp = lado === 'A' ? empA : empB;
                  return (
                    <View key={lado} style={s.card}>
                      <Text style={s.cardLabel}>{lado === 'A' ? 'Empresa 1' : 'Empresa 2'}</Text>
                      {emp ? (
                        <View style={s.empSelRow}>
                          <View style={s.empAvatar}><Text style={s.empAvatarText}>{(emp.nombre ?? 'E')[0].toUpperCase()}</Text></View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.empNombre} numberOfLines={1}>{emp.nombre}</Text>
                            {!!emp.codigo && <Text style={s.empCodigo}>{emp.codigo}</Text>}
                            {!!emp.rubro && <Text style={s.empRubro} numberOfLines={1}>{emp.rubro}</Text>}
                          </View>
                          <TouchableOpacity onPress={() => (lado === 'A' ? setEmpA(null) : setEmpB(null))}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>Cambiar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={s.elegirBtn} onPress={() => { setEligiendo(lado); setBusqueda(''); }} activeOpacity={0.8}>
                          <Building2 size={16} color={GREEN} />
                          <Text style={s.elegirBtnText}>Elegir empresa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[s.btnPrimary, { marginTop: 8 }, (!empA || !empB) && { opacity: 0.4 }]}
                  onPress={() => setPaso(2)}
                  disabled={!empA || !empB}
                  activeOpacity={0.8}
                >
                  <Text style={s.btnText}>Siguiente: Modalidad</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ── Paso 2: modalidad ── */}
        {paso === 2 && (
          <>
            <TouchableOpacity style={s.backBtn} onPress={() => setPaso(1)} activeOpacity={0.7}>
              <ChevronLeft size={17} color="#64748b" />
              <Text style={s.backText}>Atrás</Text>
            </TouchableOpacity>
            {(['PRESENCIAL', 'VIRTUAL'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.modeCard, tipo === t && s.modeCardActive]}
                onPress={() => setTipo(t)}
                activeOpacity={0.8}
              >
                {t === 'PRESENCIAL'
                  ? <Users size={22} color={tipo === t ? '#fff' : '#64748b'} />
                  : <Video size={22} color={tipo === t ? '#fff' : '#64748b'} />}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[s.modeTitle, tipo === t && { color: '#fff' }]}>
                    {t === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
                  </Text>
                  <Text style={[s.modeSub, tipo === t && { color: 'rgba(255,255,255,0.8)' }]}>
                    {t === 'PRESENCIAL' ? 'En el evento, en una mesa' : 'Por videollamada'}
                  </Text>
                </View>
                {tipo === t && <Check size={18} color="#fff" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.btnPrimary, { marginTop: 12 }]} onPress={() => { setPaso(3); cargarHorarios(); if (tipo === 'PRESENCIAL') cargarMesas(); }} activeOpacity={0.8}>
              <Text style={s.btnText}>Siguiente: {tipo === 'PRESENCIAL' ? 'Elegir mesa y horario' : 'Elegir horario'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Paso 3: mesa (presencial) + horario ── */}
        {paso === 3 && (
          <>
            <TouchableOpacity style={s.backBtn} onPress={() => setPaso(2)} activeOpacity={0.7}>
              <ChevronLeft size={17} color="#64748b" />
              <Text style={s.backText}>Atrás</Text>
            </TouchableOpacity>

            {tipo === 'PRESENCIAL' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.pickerLabel}>Mesa</Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 16 }}>
                  Elige la mesa primero: así se marcan en rojo las horas en que esa mesa ya está ocupada.
                </Text>
                {cargandoM ? (
                  <ActivityIndicator color={GREEN} size="small" style={{ marginBottom: 8 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setMesa(null)}
                        style={[s.chip, mesa === null && s.chipActive]} activeOpacity={0.8}>
                        <Text style={[s.chipText, mesa === null && s.chipTextActive]}>Automática</Text>
                      </TouchableOpacity>
                      {mesas.map((m: any) => (
                        <TouchableOpacity key={m.id} onPress={() => setMesa(m.id)}
                          style={[s.chip, mesa === m.id && s.chipActive]} activeOpacity={0.8}>
                          <Text style={[s.chipText, mesa === m.id && s.chipTextActive]}>Mesa {m.numeroMesa}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                {mesa !== null && cargandoOcup && (
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Consultando ocupación de la mesa...</Text>
                )}
              </View>
            )}

            {cargandoH ? (
              <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
                <ActivityIndicator color={GREEN} size="small" />
                <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                  Cargando las franjas horarias del evento...
                </Text>
              </View>
            ) : horarios.length === 0 ? (
              <View style={s.warnCard}>
                <Text style={s.warnText}>El evento no tiene franjas de reuniones configuradas.</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 17 }}>
                  {tipo === 'PRESENCIAL'
                    ? 'Puedes elegir cualquier fecha y hora del evento; solo se bloquean los horarios en que la mesa elegida ya está ocupada.'
                    : 'Puedes elegir cualquier fecha y hora dentro de lo configurado para el evento.'}
                </Text>
                {duracionMin > 0 && (
                  <View style={s.durBanner}><Text style={s.durText}>Las reuniones duran {duracionMin} minutos</Text></View>
                )}

                <Text style={s.pickerLabel}>Fecha</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {fechasDisponibles.map((f) => (
                      <TouchableOpacity key={f} onPress={() => {
                        setFechaSel(f);
                        const delDia = horarios.filter((h: any) => fechaISO(h.inicio) === f);
                        const hh = [...new Set(delDia.map((h: any) => new Date(h.inicio).getHours()))].sort((a: any, b: any) => a - b) as number[];
                        setHoraSel(hh[0] ?? null);
                        const mins = hh.length ? delDia.filter((h: any) => new Date(h.inicio).getHours() === hh[0]).map((h: any) => new Date(h.inicio).getMinutes()).sort((a: number, b: number) => a - b) : [];
                        setMinutosStr(mins.length ? String(mins[0]).padStart(2, '0') : '');
                      }} style={[s.chip, fechaSel === f && s.chipActive]} activeOpacity={0.8}>
                        <Text style={[s.chipText, fechaSel === f && s.chipTextActive]}>{fmtSoloFecha(f)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={s.pickerLabel}>Hora</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {horasDisponibles.map((h) => (
                      <TouchableOpacity key={h} onPress={() => {
                        setHoraSel(h);
                        const mins = horariosDelDia.filter((x: any) => new Date(x.inicio).getHours() === h).map((x: any) => new Date(x.inicio).getMinutes()).sort((a: number, b: number) => a - b);
                        setMinutosStr(mins.length ? String(mins[0]).padStart(2, '0') : '');
                      }} style={[s.chip, horaSel === h && s.chipActive]} activeOpacity={0.8}>
                        <Text style={[s.chipText, horaSel === h && s.chipTextActive]}>{String(h).padStart(2, '0')}:00</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {horaSel !== null && (
                  <>
                    <Text style={s.pickerLabel}>Minutos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {minutosParaHora.map((m: number) => {
                          const mStr = String(m).padStart(2, '0');
                          const slot = horariosDelDia.find((h: any) => new Date(h.inicio).getHours() === horaSel && new Date(h.inicio).getMinutes() === m);
                          const bloqueado = slot ? slotBloqueadoPorMesa(slot) : false;
                          return (
                            <TouchableOpacity key={m} onPress={() => !bloqueado && setMinutosStr(mStr)} disabled={bloqueado}
                              style={[s.chip, minutosStr === mStr && s.chipActive, bloqueado && s.chipBloqueado]} activeOpacity={0.8}>
                              <Text style={[s.chipText, minutosStr === mStr && s.chipTextActive, bloqueado && s.chipTextBloqueado]}>:{mStr}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </>
                )}

                {/* Referencia: horarios que cada empresa declaró (no restringe la elección) */}
                {fechaSel && (
                  <View style={s.refBox}>
                    <Text style={s.refTitle}>Horarios declarados por las empresas (solo referencia)</Text>
                    <Text style={s.refLinea}><Text style={{ fontWeight: '800' }}>{empA?.nombre}:</Text> {rangosDia(diasEmpA, fechaSel)}</Text>
                    <Text style={s.refLinea}><Text style={{ fontWeight: '800' }}>{empB?.nombre}:</Text> {rangosDia(diasEmpB, fechaSel)}</Text>
                  </View>
                )}

                {horario && horarioBloqueado && (
                  <View style={[s.okBox, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                    <AlertCircle size={13} color="#dc2626" style={{ marginRight: 6 }} />
                    <Text style={[s.okText, { color: '#dc2626' }]}>
                      Esa mesa ya tiene otra reunión a esa hora (con el tiempo de limpieza incluido). Elige otro horario u otra mesa.
                    </Text>
                  </View>
                )}

                {horario && !horarioBloqueado && (() => {
                  const info = estadoInfo(horario.estado);
                  return (
                    <View style={[s.okBox, { backgroundColor: info.bg, borderColor: info.border }]}>
                      <CheckCircle2 size={13} color={info.color} style={{ marginRight: 6 }} />
                      <Text style={[s.okText, { color: info.color }]}>
                        {fmtSoloFecha(fechaISO(horario.inicio))} a las {fmtTime(horario.inicio)} — {info.label}
                      </Text>
                    </View>
                  );
                })()}
              </>
            )}

            <TouchableOpacity
              style={[s.btnPrimary, { marginTop: 12 }, (!horario || horarioBloqueado) && { opacity: 0.4 }]}
              onPress={() => { if (horario && !horarioBloqueado) setPaso(4); }}
              disabled={!horario || horarioBloqueado}
              activeOpacity={0.8}
            >
              <Text style={s.btnText}>Siguiente: Confirmar</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Paso 4: confirmar ── */}
        {paso === 4 && (
          <>
            <TouchableOpacity style={s.backBtn} onPress={() => setPaso(3)} activeOpacity={0.7}>
              <ChevronLeft size={17} color="#64748b" />
              <Text style={s.backText}>Atrás</Text>
            </TouchableOpacity>

            {/* Resumen */}
            <View style={s.card}>
              <Text style={s.cardLabel}>Resumen</Text>
              <Text style={s.resumenLinea}><Text style={{ fontWeight: '800' }}>{empA?.nombre}</Text> con <Text style={{ fontWeight: '800' }}>{empB?.nombre}</Text></Text>
              <Text style={s.resumenLinea}>
                {tipo === 'PRESENCIAL'
                  ? `Presencial · ${mesa !== null ? `Mesa ${mesas.find((m: any) => m.id === mesa)?.numeroMesa ?? ''}` : 'mesa automática'}`
                  : 'Virtual'}
              </Text>
              {horario && (
                <Text style={s.resumenLinea}>{fmtSoloFecha(fechaISO(horario.inicio))} · {fmtTime(horario.inicio)} – {fmtTime(horario.fin)}</Text>
              )}
            </View>

            {tipo === 'VIRTUAL' && (
              <View style={s.card}>
                <Text style={s.cardLabel}>Enlace de reunión (opcional)</Text>
                <TextInput
                  style={s.input}
                  placeholder="https://meet.google.com/..."
                  placeholderTextColor="#9ca3af"
                  value={enlace}
                  onChangeText={setEnlace}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            <View style={s.card}>
              <Text style={s.cardLabel}>Mensaje para las empresas (opcional)</Text>
              <TextInput
                style={[s.input, { height: 70 }]}
                placeholder="Ej: Reunión coordinada por el equipo del evento..."
                placeholderTextColor="#9ca3af"
                value={mensaje}
                onChangeText={setMensaje}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, { marginTop: 4 }, enviando && { opacity: 0.6 }]}
              onPress={crear}
              disabled={enviando}
              activeOpacity={0.8}
            >
              {enviando ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Send size={15} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.btnText}>Crear reunión confirmada</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  titulo: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitulo: { fontSize: 12, color: '#94a3b8', marginBottom: 14, lineHeight: 18 },

  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: GREEN },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#94a3b8' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 14 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12,
  },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1, lineHeight: 18 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },

  empSelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  empAvatarText: { fontSize: 15, fontWeight: '800', color: GREEN },
  empNombre: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  empCodigo: { fontSize: 10, fontWeight: '800', color: GREEN, marginTop: 1 },
  empRubro:  { fontSize: 11, color: '#94a3b8' },
  elegirBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14,
  },
  elegirBtnText: { fontSize: 13, fontWeight: '700', color: GREEN },

  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0',
    padding: 16, backgroundColor: '#f8fafc', marginBottom: 10,
  },
  modeCardActive: { backgroundColor: GREEN, borderColor: GREEN },
  modeTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  modeSub:   { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  durBanner: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  durText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  warnCard: {
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 12,
  },
  warnText: { fontSize: 13, color: '#d97706', lineHeight: 19 },
  pickerLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  chipActive: { borderColor: GREEN, backgroundColor: '#f0fdf4' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#166534' },
  chipBloqueado: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  chipTextBloqueado: { color: '#dc2626', textDecorationLine: 'line-through' },
  okBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  okText: { fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 },
  refBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  refTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  refLinea: { fontSize: 12, color: '#475569', marginBottom: 2 },

  resumenLinea: { fontSize: 13, color: '#374151', marginBottom: 4 },

  input: {
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 12, fontSize: 14, color: '#0f172a',
  },

  btnPrimary: {
    flexDirection: 'row', backgroundColor: GREEN, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderRadius: 14, height: 46, borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  btnSecText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: '#64748b', marginLeft: 2, fontWeight: '600' },

  // Modales
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 20, maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  sinResultados: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },

  exitoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  exitoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'stretch',
  },
  exitoIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14,
  },
  exitoTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  exitoText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
});
