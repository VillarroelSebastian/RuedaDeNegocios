import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../utils/userStore';
import ImagenLightbox from '../../components/ImagenLightbox';
import { useFeedback } from '../../components/FeedbackProvider';
import { refreshNotifications } from '../../utils/notificationEvents';

export default function ArticleDetailScreen({ route }: any) {
  const id = route.params?.id;
  const [article, setArticle] = useState<any>(null), [loading, setLoading] = useState(true);
  const show = useFeedback();
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`${API_URL}/notificaciones/contenido/${id}`);
        if (!r.ok) throw new Error((await r.json()).message || 'Publicación no disponible');
        const data = await r.json(); if (!alive) return; setArticle(data);
        await fetch(`${API_URL}/notificaciones/leidas`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [`noticia-${id}`] }) });
        refreshNotifications();
      } catch (e: any) { if (alive) show({ type: 'error', title: 'Publicación', message: e.message }); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom', 'left', 'right']}>
    {loading ? <ActivityIndicator color="#449D3A" style={{ marginTop: 40 }} /> : article && <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ color: '#64748b', fontSize: 12 }}>{article.tipo} · {new Date(article.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</Text>
      <Text style={{ fontWeight: '900', fontSize: 25, marginVertical: 16 }}>{article.titulo}</Text>
      {article.urlImagen && <ImagenLightbox uri={article.urlImagen} style={{ height: 260, width: '100%', marginBottom: 20 }} />}
      <Text style={{ fontSize: 16, lineHeight: 25, color: '#334155' }}>{article.contenido}</Text>
    </ScrollView>}
  </SafeAreaView>;
}
