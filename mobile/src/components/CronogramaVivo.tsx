import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Linking } from 'react-native';
import {
  Radio, Clock, MapPin, User, CheckCircle2, Play, Square, ExternalLink, Megaphone,
} from 'lucide-react-native';
import { API_URL, userStore } from '../utils/userStore';

// Mismo diseño y comportamiento que web/src/components/CronogramaVivo.tsx —
// se mantienen ambos alineados a propósito (misma grilla de estados, mismos
// textos, mismo intervalo de refresco) para que admin/técnico vean exactamente
// lo mismo en web y en móvil.
const REFRESCO_MS = 15000;

export function hora(iso: string) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fechaLarga(iso: string) {
  if (!iso) return '';
  const [y, mo, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
}

function PuntoEnVivo({ texto = 'EN VIVO' }: { texto?: string }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1 self-start">
      <View className="w-2 h-2 rounded-full bg-white" />
      <Text className="text-white text-[11px] font-bold">{texto}</Text>
    </View>
  );
}

const ESTILO_ESTADO: Record<string, string> = {
  EN_VIVO: 'border-red-300 bg-red-50',
  FINALIZADA: 'border-gray-200 bg-gray-50 opacity-70',
  PENDIENTE: 'border-gray-200 bg-white',
};

/**
 * Cronograma en vivo. Si `staff` es true muestra los botones para cambiar el
 * estado y publicar anuncios (admin y técnicos); si no, es solo lectura.
 */
export default function CronogramaVivo({
  staff = false,
  onError,
}: {
  staff?: boolean;
  onError?: (mensaje: string) => void;
}) {
  const [actividades, setActividades] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [anuncios, setAnuncios] = useState<Record<number, string>>({});
  const vivoRef = useRef(true);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/public/cronograma-vivo`);
      if (!r.ok) return;
      const d = await r.json();
      if (!vivoRef.current) return;
      const ordenadas = Array.isArray(d.actividades)
        ? [...d.actividades].sort((a, b) => {
            const f = String(a.fechaActividad).localeCompare(String(b.fechaActividad));
            return f || hora(a.horaInicioActividad).localeCompare(hora(b.horaInicioActividad));
          })
        : [];
      setActividades(ordenadas);
      setActualizado(new Date());
    } catch { /* sin conexión: se conserva lo último mostrado */ }
    finally { if (vivoRef.current) setCargando(false); }
  }, []);

  useEffect(() => {
    vivoRef.current = true;
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => { vivoRef.current = false; clearInterval(id); };
  }, [cargar]);

  const publicarAnuncio = async (a: any) => {
    const mensaje = (anuncios[a.id] || '').trim();
    const usuarioId = userStore.get()?.id;
    if (!mensaje || !usuarioId) return onError?.('Escribe el anuncio antes de publicarlo.');
    const r = await fetch(`${API_URL}/staff/cronograma-vivo/${a.id}/anuncios`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuarioId, mensaje }),
    });
    if (!r.ok) return onError?.((await r.json())?.message || 'No se pudo publicar el anuncio.');
    setAnuncios((n) => ({ ...n, [a.id]: '' }));
    cargar();
  };

  const cambiarEstado = async (id: number, estadoEnVivo: string) => {
    setCambiando(id);
    try {
      const r = await fetch(`${API_URL}/staff/cronograma-vivo/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estadoEnVivo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || 'No se pudo actualizar.');
      setActividades(d.actividades ?? []);
    } catch (e: any) {
      onError?.(e.message);
    } finally {
      setCambiando(null);
    }
  };

  if (cargando) return <View className="py-12"><ActivityIndicator color="#449D3A" /></View>;

  if (actividades.length === 0) {
    return (
      <View className="items-center py-14 bg-white border border-dashed border-gray-300 rounded-2xl mx-4">
        <Radio color="#d1d5db" size={44} />
        <Text className="font-semibold text-gray-700 mt-3">Todavía no hay actividades programadas</Text>
        <Text className="text-sm text-gray-400 mt-1">Aparecerán aquí en cuanto se carguen.</Text>
      </View>
    );
  }

  const enVivo = actividades.filter((a) => a.estadoEnVivo === 'EN_VIVO');
  const porDia: Record<string, any[]> = {};
  for (const a of actividades) { const dia = a.fechaActividad.substring(0, 10); (porDia[dia] ??= []).push(a); }

  return (
    <View className="px-4">
      {/* Lo que está pasando ahora */}
      <View className={`rounded-2xl border-2 p-4 mb-5 ${enVivo.length ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        <View className="flex-row items-center gap-2 mb-2">
          {enVivo.length > 0 ? <PuntoEnVivo texto="AHORA" /> : (
            <View className="flex-row items-center gap-1.5 bg-gray-300 rounded-full px-2.5 py-1 self-start">
              <View className="w-2 h-2 rounded-full bg-gray-700" />
              <Text className="text-gray-700 text-[11px] font-bold">SIN ACTIVIDAD</Text>
            </View>
          )}
          <Text className="text-sm font-bold text-gray-700">Lo que está pasando en el momento</Text>
        </View>
        {enVivo.length > 0 ? enVivo.map((a) => (
          <View key={a.id} className="mb-1">
            <Text className="font-extrabold text-gray-900">{a.nombreActividad}</Text>
            <View className="flex-row flex-wrap items-center gap-x-3 mt-0.5">
              <View className="flex-row items-center gap-1"><Clock color="#4b5563" size={13} /><Text className="text-sm text-gray-600">{hora(a.horaInicioActividad)} – {hora(a.horaFinActividad)}</Text></View>
              <View className="flex-row items-center gap-1"><MapPin color="#4b5563" size={13} /><Text className="text-sm text-gray-600">{a.nombreSalaEspacio}</Text></View>
            </View>
            {!!a.notaEnVivo && <Text className="text-sm text-red-700 font-semibold mt-1">⚠ {a.notaEnVivo}</Text>}
          </View>
        )) : <Text className="text-sm text-gray-500">En este momento no hay ninguna actividad en curso.</Text>}
        {actualizado && (
          <Text className="text-[11px] text-gray-400 mt-2">
            Actualizado {actualizado.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} · se refresca solo
          </Text>
        )}
      </View>

      {Object.entries(porDia).map(([dia, acts]) => (
        <View key={dia} className="mb-5">
          <Text className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-2 capitalize">{fechaLarga(dia)}</Text>
          <View className="gap-2.5">
            {acts.map((a: any) => (
              <View key={a.id} className={`rounded-xl border-2 p-3.5 ${ESTILO_ESTADO[a.estadoEnVivo]}`}>
                <View className="flex-row gap-3">
                  <View className="w-16">
                    <Text className="text-sm font-bold text-gray-800">{hora(a.horaInicioActividad)}</Text>
                    <Text className="text-xs text-gray-400">{hora(a.horaFinActividad)}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className={`font-bold ${a.estadoEnVivo === 'FINALIZADA' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{a.nombreActividad}</Text>
                      {a.estadoEnVivo === 'EN_VIVO' && <PuntoEnVivo />}
                      {a.estadoEnVivo === 'FINALIZADA' && (
                        <View className="flex-row items-center gap-1"><CheckCircle2 color="#6b7280" size={12} /><Text className="text-[11px] font-bold text-gray-500">FINALIZADA</Text></View>
                      )}
                    </View>
                    <View className="flex-row flex-wrap items-center gap-x-3 mt-1">
                      <View className="flex-row items-center gap-1"><MapPin color="#6b7280" size={12} /><Text className="text-xs text-gray-500">{a.nombreSalaEspacio}</Text></View>
                      {!!a.nombreCompletoPilaExpositor && <View className="flex-row items-center gap-1"><User color="#6b7280" size={12} /><Text className="text-xs text-gray-500">{a.nombreCompletoPilaExpositor}</Text></View>}
                    </View>
                    {!!a.notaEnVivo && <Text className="text-xs text-red-600 font-semibold mt-1.5">⚠ {a.notaEnVivo}</Text>}
                    {!!a.descripcionActividad && <Text className="text-sm text-gray-600 mt-2">{a.descripcionActividad}</Text>}
                    {!!a.linkReunionVirtual && (
                      <TouchableOpacity onPress={() => Linking.openURL(a.linkReunionVirtual)} className="mt-3 flex-row items-center gap-1.5 bg-[#449D3A] rounded-lg px-3 py-2 self-start">
                        <ExternalLink color="#fff" size={14} /><Text className="text-white text-xs font-bold">Ver transmisión</Text>
                      </TouchableOpacity>
                    )}
                    {!!a.anuncios?.length && (
                      <View className="mt-3 gap-1">
                        {a.anuncios.map((an: any) => (
                          <View key={an.id} className="flex-row items-start gap-1.5 bg-amber-50 rounded-lg px-3 py-2">
                            <Megaphone color="#92400e" size={14} /><Text className="text-xs text-amber-900 flex-1">{an.mensaje}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {staff && (
                      <View className="mt-3 gap-2">
                        <TextInput
                          value={anuncios[a.id] || ''} onChangeText={(v) => setAnuncios((n) => ({ ...n, [a.id]: v }))}
                          maxLength={500} placeholder="Anuncio o cambio para los suscritos" placeholderTextColor="#9ca3af"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                        />
                        <TouchableOpacity onPress={() => publicarAnuncio(a)} className="rounded-lg bg-amber-500 px-3 py-2 self-start">
                          <Text className="text-white text-xs font-bold">Publicar anuncio</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {staff && (
                      <View className="flex-row gap-1.5 mt-3">
                        <TouchableOpacity
                          disabled={cambiando === a.id || a.estadoEnVivo === 'EN_VIVO'} onPress={() => cambiarEstado(a.id, 'EN_VIVO')}
                          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 ${(cambiando === a.id || a.estadoEnVivo === 'EN_VIVO') ? 'opacity-30' : ''}`}>
                          <Play color="#fff" size={12} /><Text className="text-white text-xs font-bold">Vivo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={cambiando === a.id || a.estadoEnVivo === 'FINALIZADA'} onPress={() => cambiarEstado(a.id, 'FINALIZADA')}
                          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 ${(cambiando === a.id || a.estadoEnVivo === 'FINALIZADA') ? 'opacity-30' : ''}`}>
                          <Square color="#fff" size={12} /><Text className="text-white text-xs font-bold">Fin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={cambiando === a.id || a.estadoEnVivo === 'PENDIENTE'} onPress={() => cambiarEstado(a.id, 'PENDIENTE')}
                          className={`px-3 py-1.5 rounded-lg border border-gray-300 ${(cambiando === a.id || a.estadoEnVivo === 'PENDIENTE') ? 'opacity-30' : ''}`}>
                          <Text className="text-xs font-bold text-gray-600">Reset</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
