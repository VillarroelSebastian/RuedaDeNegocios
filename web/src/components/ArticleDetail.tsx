"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sesionPush } from '@/lib/push';
import { useModal } from './ui/Modal';
import ImagenLightbox from './ui/ImagenLightbox';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';
export default function ArticleDetail({ id }: { id: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<any>(null), [loading, setLoading] = useState(true);
  const { showError, ModalComponent } = useModal();
  useEffect(() => {
    const user = sesionPush();
    if (!user) { router.replace('/auth/login'); return; }
    let alive = true;
    void (async () => {
      try {
        const r = await fetch(`${API}/notificaciones/contenido/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
        if (!r.ok) throw new Error((await r.json()).message || 'Publicación no disponible');
        const data = await r.json(); if (!alive) return; setArticle(data);
        await fetch(`${API}/notificaciones/leidas`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify({ ids: [`noticia-${id}`] }) });
        window.dispatchEvent(new Event('notificacionesActualizadas'));
      } catch (e: any) { if (alive) showError('Publicación', e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id, router]);
  return <main className="min-h-screen bg-gray-50 p-4 sm:p-8">{ModalComponent}<div className="max-w-3xl mx-auto">
    <button className="text-green-700 font-bold mb-5" onClick={() => { const role = sesionPush()?.rolEvento; router.push(role === 'ADMINISTRADOR' ? '/admin/noticias' : role?.startsWith('TECNICO') ? '/tecnico/contenido' : '/empresa/comunicados'); }}>Volver al evento</button>
    {loading ? <p>Cargando publicación…</p> : article && <article className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm">
      <p className="text-xs text-gray-500 mb-2">{article.tipo} · {new Date(article.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p>
      <h1 className="font-extrabold text-2xl mb-5">{article.titulo}</h1>
      {article.urlImagen && <ImagenLightbox src={article.urlImagen} alt={article.titulo} className="w-full h-64 mb-5" imgClassName="object-contain w-full h-full" />}
      <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{article.contenido}</p>
    </article>}
  </div></main>;
}
