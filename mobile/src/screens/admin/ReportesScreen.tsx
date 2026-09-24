import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, RefreshCw } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';
const TIPOS = [
  ['empresas', 'Empresas'], ['reuniones', 'Reuniones'], ['resultados', 'Resultados'], ['ranking', 'Ranking'], ['asistencia', 'Asistencia QR'],
];

export default function ReportesScreen() {
  const [tipo, setTipo] = useState('empresas');
  const [filas, setFilas] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [orden, setOrden] = useState('reuniones');
  const [loading, setLoading] = useState(true);
  const cargar = async () => { setLoading(true); try { const r = await fetch(`${API_URL}/admin/reportes?tipo=${tipo}`); const d = await r.json(); setFilas(r.ok && Array.isArray(d.filas) ? d.filas : []); } catch { setFilas([]); } finally { setLoading(false); } };
  useEffect(() => { setFiltro(''); cargar(); }, [tipo]);
  const visibles = useMemo(() => {
    const base = filtro.trim() ? filas.filter((f) => Object.values(f).some((v) => String(v).toLowerCase().includes(filtro.toLowerCase()))) : filas;
    if (tipo !== 'ranking') return base;
    return [...base].sort((a, b) => orden === 'estrellas' ? Number(b.EstrellasDadas) - Number(a.EstrellasDadas) : orden === 'dinero' ? Number(b.DineroGeneradoAproxBs) - Number(a.DineroGeneradoAproxBs) : Number(b.Reuniones) - Number(a.Reuniones));
  }, [filas, filtro, orden, tipo]);
  const compartir = async () => {
    if (!visibles.length) return;
    const columnas = Object.keys(visibles[0]);
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<html><head><meta charset="utf-8"><style>@page{size:landscape;margin:12mm}body{font-family:Arial;color:#1f2937}h1{color:#166534}table{border-collapse:collapse;width:100%;font-size:9px}th,td{border:1px solid #d1d5db;padding:5px;text-align:left;overflow-wrap:anywhere}th{background:#f0fdf4}</style></head><body><h1>Reporte: ${esc(TIPOS.find(t => t[0] === tipo)?.[1])}</h1><p>${new Date().toLocaleDateString('es-BO')} · ${visibles.length} registros</p><table><thead><tr>${columnas.map(c => `<th>${esc(c.replace(/([A-Z])/g, ' $1'))}</th>`).join('')}</tr></thead><tbody>${visibles.map(f => `<tr>${columnas.map(c => `<td>${esc(f[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    const archivo = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf', dialogTitle: `Reporte ${tipo}` });
  };
  const columnas = visibles[0] ? Object.keys(visibles[0]) : [];
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ fontSize: 21, fontWeight: '900', color: '#0f172a' }}>Reportes del evento</Text><Text style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{visibles.length} registro(s)</Text></View><View style={{ flexDirection: 'row', gap: 8 }}><TouchableOpacity onPress={cargar} style={{ padding: 10, borderRadius: 11, borderWidth: 1, borderColor: '#cbd5e1' }}><RefreshCw size={19} color="#475569" /></TouchableOpacity><TouchableOpacity onPress={compartir} disabled={!visibles.length} style={{ padding: 10, borderRadius: 11, backgroundColor: GREEN, opacity: visibles.length ? 1 : .4 }}><Download size={19} color="#fff" /></TouchableOpacity></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginTop: 14 }}>{TIPOS.map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTipo(key)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, backgroundColor: tipo === key ? GREEN : '#f1f5f9' }}><Text style={{ color: tipo === key ? '#fff' : '#475569', fontWeight: '800', fontSize: 12 }}>{label}</Text></TouchableOpacity>)}</ScrollView>
      <TextInput value={filtro} onChangeText={setFiltro} placeholder="Filtrar por cualquier dato..." style={{ marginTop: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 }} />
      {tipo === 'ranking' && <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>{[['reuniones','Reuniones'],['estrellas','Estrellas'],['dinero','Dinero']].map(([k,l]) => <TouchableOpacity key={k} onPress={() => setOrden(k)} style={{ flex: 1, padding: 8, borderRadius: 9, borderWidth: 1, borderColor: orden === k ? GREEN : '#e2e8f0', alignItems: 'center' }}><Text style={{ fontSize: 11, color: orden === k ? GREEN : '#64748b', fontWeight: '700' }}>{l}</Text></TouchableOpacity>)}</View>}
    </View>
    {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 45 }} /> : <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 14, gap: 10 }}>
      {tipo === 'ranking' && visibles.length > 0 && (() => {
        const campo = orden === 'estrellas' ? 'EstrellasDadas' : orden === 'dinero' ? 'DineroGeneradoAproxBs' : 'Reuniones';
        const top10 = visibles.slice(0, 10);
        const max = Math.max(...top10.map((f) => Number(f[campo])), 1);
        return (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 15, marginBottom: 4 }}>
            <Text style={{ fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>Top 10 — {orden === 'estrellas' ? 'Estrellas dadas' : orden === 'dinero' ? 'Dinero generado (Bs.)' : 'Reuniones'}</Text>
            {top10.map((f, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', flex: 1 }} numberOfLines={1}>{f.Empresa ?? `#${i + 1}`}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#0f172a' }}>{Number(f[campo]).toLocaleString('es-BO')}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(4, (Number(f[campo]) / max) * 100)}%`, height: '100%', backgroundColor: GREEN, borderRadius: 99 }} />
                </View>
              </View>
            ))}
          </View>
        );
      })()}
      {visibles.length === 0 ? <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>No hay datos para este reporte.</Text> : visibles.map((fila, i) => <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 13 }}>{columnas.map((c) => <View key={c} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}><Text style={{ width: '42%', fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{c.replace(/([A-Z])/g, ' $1')}</Text><Text selectable style={{ flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' }}>{String(fila[c] ?? '—')}</Text></View>)}</View>)}</ScrollView>}
  </View>;
}
