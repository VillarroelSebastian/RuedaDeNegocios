"use client";
import { useRef, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useModal } from './ui/Modal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';
async function mutate(path: string, method: string, body?: object) {
  const response = await fetch(`${API}/mensajeria/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error((await response.json()).message || 'No se pudo guardar el cambio');
}

export function MessageActions({ mensaje, interno = false, onChanged }: { mensaje: any; interno?: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState(''), [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const { showConfirm, showError, ModalComponent } = useModal();
  if (!mensaje.puedeModificar) return null;
  const path = `${interno ? 'interno' : 'empresa'}/${mensaje.id}`;
  const save = async () => {
    if (!text.trim() || busy.current) return;
    busy.current = true; setSaving(true);
    try { await mutate(path, 'PUT', { contenido: text }); setEditing(false); onChanged(); }
    catch (e: any) { setEditing(false); showError('No se pudo editar', e.message); }
    finally { busy.current = false; setSaving(false); }
  };
  return <>
    {ModalComponent}
    <div className="flex justify-end gap-3 mt-1">
      <button type="button" aria-label="Editar mensaje" title="Editar mensaje" className="p-2 rounded-lg hover:bg-black/10" onClick={() => { setText(mensaje.contenido); setEditing(true); }}><Pencil size={14} /></button>
      <button type="button" aria-label="Eliminar mensaje" title="Eliminar mensaje" className="p-2 rounded-lg hover:bg-black/10" onClick={() => showConfirm('Eliminar mensaje', 'Se mostrará «Mensaje eliminado» a las personas de esta conversación.', async () => {
        try { await mutate(path, 'DELETE'); onChanged(); } catch (e: any) { showError('No se pudo eliminar', e.message); }
      })}><Trash2 size={14} /></button>
    </div>
    {editing && <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 text-gray-900" role="dialog" aria-modal="true" aria-label="Editar mensaje">
      <form className="bg-white rounded-2xl p-5 w-full max-w-md" onSubmit={e => { e.preventDefault(); void save(); }}>
        <div className="flex justify-between mb-4"><h2 className="font-bold">Editar mensaje</h2><button type="button" aria-label="Cerrar" disabled={saving} onClick={() => setEditing(false)}><X size={22} /></button></div>
        <textarea autoFocus required maxLength={1000} value={text} onChange={e => setText(e.target.value)} className="w-full border rounded-xl p-3 min-h-28 max-h-[40dvh]" />
        <button disabled={saving || !text.trim()} className="bg-[#449D3A] text-white font-bold rounded-xl p-3 w-full mt-3 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
    </div>}
  </>;
}

export function DeleteConversation({ canal, eeId, otroEeId, onDeleted }: { canal: string; eeId?: number; otroEeId: number; onDeleted: () => void }) {
  const { showConfirm, showError, ModalComponent } = useModal();
  return <>{ModalComponent}<button type="button" aria-label="Eliminar conversación para mí" title="Eliminar conversación para mí" className="p-2 text-gray-500 hover:text-red-600 shrink-0" onClick={() => showConfirm('Eliminar conversación para mí', 'Se ocultará tu historial de esta conversación. Las demás personas conservarán sus mensajes. Un mensaje nuevo volverá a mostrarla.', async () => {
    try { await mutate('conversacion', 'DELETE', { canal, eeId, otroEeId }); onDeleted(); window.dispatchEvent(new Event('mensajesActualizados')); }
    catch (e: any) { showError('No se pudo eliminar', e.message); }
  })}><Trash2 size={18} /></button></>;
}
