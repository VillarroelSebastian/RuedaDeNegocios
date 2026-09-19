import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { QrCode, Share2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API } from '../../utils/api';

const GREEN = '#449D3A';
export default function CredencialesScreen() {
  const [data, setData] = useState<any>({ credenciales: [] });
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const cargar = async () => { setLoading(true); try { const r = await fetch(`${API}/credentials/printable`); setData(r.ok ? await r.json() : { credenciales: [] }); } finally { setLoading(false); } };
  useEffect(() => { cargar(); }, []);
  const lista = useMemo(() => (data.credenciales || []).filter((c: any) => `${c.nombre} ${c.empresa}`.toLowerCase().includes(buscar.toLowerCase())), [data, buscar]);
  const compartir = (c: any) => Share.share({ title: `Credencial de ${c.nombre}`, message: `${data.evento?.nombre || 'Rueda de Negocios'}\n${c.nombre}\n${c.empresa}\n${c.cargo || 'Participante'}\n${c.qr || ''}`, url: c.qr || undefined });
  const compartirTodas = async () => {
    if (!lista.length) return;
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tarjetas = lista.map((c: any) => `<section><div><h2>${esc(c.nombre)}</h2><h3>${esc(c.empresa)}</h3><p>${esc(c.cargo || 'Participante')}</p></div>${c.qr ? `<img src="${esc(c.qr)}"/>` : ''}</section>`).join('');
    const html = `<html><head><meta charset="utf-8"><style>@page{size:letter portrait;margin:10mm}body{font-family:Arial;display:flex;flex-wrap:wrap;gap:4mm}section{box-sizing:border-box;width:85.6mm;height:54mm;border:2px solid #449D3A;border-radius:4mm;padding:5mm;display:flex;align-items:center;justify-content:space-between;break-inside:avoid}div{flex:1;text-align:center}h2{font-size:16px;margin:0}h3{font-size:13px;color:#449D3A;margin:5px 0}p{font-size:11px;color:#64748b}img{width:32mm;height:32mm;object-fit:contain}</style></head><body>${tarjetas}</body></html>`;
    const archivo = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf', dialogTitle: 'Credenciales QR' });
  };
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}><View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}><Text style={{ fontSize: 21, fontWeight: '900', color: '#0f172a' }}>Credenciales QR</Text><Text style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Consulta y comparte credenciales individuales.</Text><TextInput value={buscar} onChangeText={setBuscar} placeholder="Buscar por persona o empresa..." style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, padding: 11, marginTop: 12 }} /><TouchableOpacity onPress={compartirTodas} disabled={!lista.length} style={{ marginTop: 9, padding: 11, backgroundColor: GREEN, borderRadius: 11, flexDirection: 'row', justifyContent: 'center', gap: 7, opacity: lista.length ? 1 : .4 }}><Share2 size={17} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>Generar PDF de las visibles</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={GREEN} style={{ marginTop: 45 }} /> : <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>{lista.length === 0 ? <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 45 }}>No hay credenciales disponibles.</Text> : lista.map((c: any) => <View key={c.id} style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: GREEN, padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1, alignItems: 'center' }}>{data.evento?.urlLogoEvento ? <Image source={{ uri: data.evento.urlLogoEvento }} style={{ height: 38, width: '100%', resizeMode: 'contain', marginBottom: 7 }} /> : <QrCode size={28} color={GREEN} />}<Text style={{ fontWeight: '900', color: '#0f172a', textAlign: 'center', marginTop: 5 }}>{c.nombre}</Text><Text style={{ color: GREEN, fontWeight: '800', textAlign: 'center', fontSize: 12 }}>{c.empresa}</Text><Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center' }}>{c.cargo || 'Participante'}</Text><TouchableOpacity onPress={() => compartir(c)} style={{ marginTop: 9, borderWidth: 1, borderColor: GREEN, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: GREEN, fontWeight: '800', fontSize: 11 }}>Compartir</Text></TouchableOpacity></View>{c.qr ? <Image source={{ uri: c.qr }} style={{ width: 125, height: 125, resizeMode: 'contain' }} /> : null}</View>)}</ScrollView>}
  </View>;
}
