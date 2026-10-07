"use client";
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { Bell, X } from 'lucide-react';
import { useModal } from './ui/Modal';
import ImagenLightbox from './ui/ImagenLightbox';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';
export default function NotificationBell({ storageKey }: { storageKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [items, setItems] = useState<any[]>([]), [count, setCount] = useState(0);
  const { showError, ModalComponent } = useModal();
  const refresh = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!user?.token) return;
    const r = await fetch(`${API}/notificaciones`, { headers: { Authorization: `Bearer ${user.token}` } });
    if (!r.ok) throw new Error('No se pudieron cargar las notificaciones');
    const data = await r.json(); setItems(data.notificaciones); setCount(data.noLeidas);
  }, [storageKey]);
  useEffect(() => {
    const update = () => { void refresh().catch(() => {}); };
    update();
    const user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    const socket = io(`${API.replace(/\/api\/?$/, '')}/notificaciones`, { transports: ['websocket'], auth: { token: user?.token } });
    socket.on('connect', update);
    socket.onAny((event: string) => { if (!event.startsWith('mensaje') && !event.startsWith('chat-interno')) update(); });
    const timer = setInterval(update, 15000);
    window.addEventListener('focus', update);
    window.addEventListener('notificacionesActualizadas', update);
    return () => { clearInterval(timer); socket.disconnect(); window.removeEventListener('focus', update); window.removeEventListener('notificacionesActualizadas', update); };
  }, [refresh, storageKey]);
  const read = async (ids: string[]) => {
    const user = JSON.parse(localStorage.getItem(storageKey) || 'null');
    const r = await fetch(`${API}/notificaciones/leidas`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` }, body: JSON.stringify({ ids }) });
    if (!r.ok) throw new Error('No se pudieron marcar las notificaciones');
    await refresh();
  };
  return <>
    {ModalComponent}
    <button aria-label={`Notificaciones: ${count} sin leer`} title="Notificaciones" className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-50" onClick={() => { setOpen(true); void refresh().catch(e => showError('Notificaciones', e.message)); }}>
      <Bell size={22} />{count > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1 flex items-center justify-center">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-center justify-center" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Notificaciones" className="bg-white rounded-2xl w-full max-w-lg max-h-[85dvh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">Notificaciones del evento</h2><button aria-label="Cerrar" onClick={() => setOpen(false)}><X size={22} /></button></div>
        <div className="overflow-y-auto min-h-0 p-2">{items.length === 0 ? <p className="p-6 text-center text-gray-500">No hay notificaciones.</p> : items.map(n => <div key={n.id} className={`rounded-xl p-3 mb-2 ${n.leida ? 'bg-gray-50' : 'bg-green-50 border border-green-200'}`}>
          {n.urlImagen && <ImagenLightbox src={n.urlImagen} alt={n.titulo} className="w-full h-24 mb-2" imgClassName="object-contain w-full h-full" />}
          <button className="w-full text-left" onClick={() => { void (async () => { try { if (!n.leida) await read([n.id]); setOpen(false); router.push(n.enlace); } catch (e: any) { showError('Notificaciones', e.message); } })(); }}>
            <p className="text-sm font-bold text-gray-900">{n.titulo}</p><p className="text-xs text-gray-600 line-clamp-3 mt-1 whitespace-pre-line">{n.mensaje}</p><p className="text-[10px] text-gray-400 mt-2">{new Date(n.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p>
          </button>
        </div>)}</div>
        {items.some(n => !n.leida) && <button className="shrink-0 p-3 border-t font-bold text-sm text-green-700" onClick={() => { void read(items.filter(n => !n.leida).map(n => n.id)).catch(e => showError('Notificaciones', e.message)); }}>Marcar estas notificaciones como leídas</button>}
      </section>
    </div>, document.body)}
  </>;
}
