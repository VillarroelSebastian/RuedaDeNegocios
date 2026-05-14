import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { Newspaper } from 'lucide-react-native';
import { API_URL } from '../../utils/userStore';

const GREEN = '#449D3A';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TIPO_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  COMUNICADO:   { color: '#1d4ed8', bg: '#dbeafe', label: 'Comunicado'   },
  EVENTO:       { color: '#15803d', bg: '#dcfce7', label: 'Evento'       },
  ACTUALIZACIÓN:{ color: '#c2410c', bg: '#ffedd5', label: 'Actualización'},
};

function NoticiaCard({ noticia }: { noticia: any }) {
  const [expanded, setExpanded] = useState(false);
  const badge   = TIPO_BADGE[noticia.tipoNoticia] ?? { color: '#6b7280', bg: '#f3f4f6', label: noticia.tipoNoticia };
  const content: string = noticia.contenido ?? '';
  const MAX_CHARS = 160;
  const isTruncatable = content.length > MAX_CHARS;
  const displayText   = isTruncatable && !expanded ? content.slice(0, MAX_CHARS) + '…' : content;

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
      marginBottom: 12, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    }}>
      {/* Imagen */}
      {noticia.urlImagenNoticia ? (
        <View style={{ height: 180, backgroundColor: '#f8fafc' }}>
          <Image
            source={{ uri: noticia.urlImagenNoticia }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={{
          height: 120, backgroundColor: '#f1f5f9',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Newspaper color="#d1d5db" size={40} />
        </View>
      )}

      <View style={{ padding: 14 }}>
        {/* Tipo + fecha */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 3,
            borderRadius: 999, backgroundColor: badge.bg,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
          </View>
          {noticia.fechaPublicacion && (
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(noticia.fechaPublicacion)}</Text>
          )}
        </View>

        {/* Título */}
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
          {noticia.titulo}
        </Text>

        {/* Contenido */}
        <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 20 }}>{displayText}</Text>

        {isTruncatable && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>
              {expanded ? 'Leer menos' : 'Leer más'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TecnicoNoticiasScreen() {
  const [noticias,   setNoticias]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNoticias = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/tecnico/noticias`);
      const data = await res.json();
      setNoticias(Array.isArray(data) ? data : []);
    } catch {
      setNoticias([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNoticias(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
      }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Noticias del evento</Text>
        <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{noticias.length} publicación(es)</Text>
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
              onRefresh={() => { setRefreshing(true); fetchNoticias(); }}
              tintColor={GREEN}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {noticias.length === 0 ? (
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9',
              padding: 40, alignItems: 'center',
            }}>
              <Newspaper color="#d1d5db" size={36} />
              <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>
                Sin noticias publicadas
              </Text>
            </View>
          ) : (
            noticias.map((n) => <NoticiaCard key={n.id} noticia={n} />)
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
