"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ScanLine, X } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

export default function TecnicoAsistenciaPage() {
  const [valor, setValor] = useState(""); const [asistencias, setAsistencias] = useState<any[]>([]);
  const [camara, setCamara] = useState(false); const [procesando, setProcesando] = useState(false);
  const [modal, setModal] = useState<{ titulo: string; mensaje: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null);
  const tecnico = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("tecnicoUser") || "null") : null;
  const cargar = useCallback(() => { if (tecnico?.id) fetch(`${API}/tecnico/asistencias?tecnicoId=${tecnico.id}`).then(r => r.json()).then(d => setAsistencias(Array.isArray(d) ? d : [])).catch(() => {}); }, [tecnico?.id]);
  useEffect(() => { cargar(); }, [cargar]);
  const cerrarCamara = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCamara(false); };
  const registrar = async (contenido: string) => {
    if (procesando) return; const match = contenido.match(/\/credencial\/(\d+)\?t=([a-zA-Z0-9]+)/);
    if (!match) return setModal({ titulo: "QR no válido", mensaje: "Escanea o pega una credencial válida del evento." });
    setProcesando(true);
    try { const res = await fetch(`${API}/tecnico/asistencias`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tecnicoId: tecnico.id, euId: Number(match[1]), token: match[2] }) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || "No se pudo registrar."); cerrarCamara(); setValor(""); cargar(); setModal({ titulo: data.yaRegistrada ? "Asistencia ya registrada" : "Asistencia registrada", mensaje: `${data.participante.nombre} · ${data.participante.empresa}` }); }
    catch (e: any) { setModal({ titulo: "No se pudo registrar", mensaje: e.message }); } finally { setProcesando(false); }
  };
  const abrirCamara = async () => {
    try { const Detector = (window as any).BarcodeDetector; if (!Detector) throw new Error("Este navegador no admite lectura QR. Puedes pegar el enlace de la credencial."); const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); streamRef.current = stream; setCamara(true); setTimeout(async () => { const video = videoRef.current; if (!video) return; video.srcObject = stream; await video.play(); const detector = new Detector({ formats: ["qr_code"] }); const leer = async () => { if (!streamRef.current || !videoRef.current) return; const codigos = await detector.detect(videoRef.current).catch(() => []); if (codigos[0]?.rawValue) return registrar(codigos[0].rawValue); requestAnimationFrame(leer); }; leer(); }, 50); }
    catch (e: any) { setModal({ titulo: "Cámara no disponible", mensaje: e.message }); }
  };
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);
  return <div className="p-4 sm:p-6 max-w-4xl mx-auto">
    {modal && <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"><h2 className="font-extrabold">{modal.titulo}</h2><p className="text-sm text-gray-600 mt-2 break-words">{modal.mensaje}</p><button onClick={() => setModal(null)} className="mt-5 w-full rounded-xl bg-[#449D3A] text-white font-bold py-3">Aceptar</button></div></div>}
    <h1 className="text-2xl font-extrabold">Control de asistencia</h1><p className="text-sm text-gray-500 mt-1">Escanea la credencial y registra quién se presentó y a qué hora.</p>
    <div className="mt-5 bg-white border rounded-2xl p-4 sm:p-6">{camara ? <div className="relative rounded-xl overflow-hidden bg-black aspect-video"><video ref={videoRef} className="w-full h-full object-contain" playsInline muted/><button onClick={cerrarCamara} className="absolute top-3 right-3 bg-white rounded-full p-2"><X className="w-5 h-5"/></button></div> : <button onClick={abrirCamara} className="w-full rounded-xl bg-[#449D3A] text-white font-bold py-3 flex justify-center gap-2"><ScanLine className="w-5 h-5"/>Escanear QR con la cámara</button>}<div className="flex flex-col sm:flex-row gap-2 mt-4"><input value={valor} onChange={e => setValor(e.target.value)} placeholder="O pega el enlace de la credencial" className="flex-1 min-w-0 border rounded-xl px-3 py-3 text-sm"/><button onClick={() => registrar(valor)} disabled={!valor.trim() || procesando} className="rounded-xl bg-gray-900 text-white px-5 py-3 font-bold disabled:opacity-40">Registrar</button></div></div>
    <h2 className="font-extrabold mt-7 mb-3">Asistencias ({asistencias.length})</h2><div className="space-y-2">{asistencias.map(a => <div key={a.id} className="bg-white border rounded-xl p-4 flex gap-3"><CheckCircle2 className="w-5 h-5 text-green-600 shrink-0"/><div className="min-w-0"><p className="font-bold break-words">{a.empresa_usuario?.usuario?.nombres} {a.empresa_usuario?.usuario?.apellidoPaterno}</p><p className="text-xs text-gray-500 break-words">{a.empresa_usuario?.empresa?.nombre}</p><p className="text-xs text-gray-400 mt-1">{new Date(a.fechaHoraAsistencia).toLocaleString("es-BO")}</p></div></div>)}</div>
  </div>;
}
