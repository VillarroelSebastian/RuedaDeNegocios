"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, ScanLine, X } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { API } from "@/lib/api";

export default function TecnicoAsistenciaPage() {
  const [valor, setValor] = useState("");
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [empresaEscaneada, setEmpresaEscaneada] = useState<{ tipo: "PARTICIPANTE" | "AUSPICIADOR"; id: number; nombre: string } | null>(null);
  const [camara, setCamara] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [pendiente, setPendiente] = useState<any>(null);
  const [modal, setModal] = useState<{
    titulo: string;
    mensaje: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlesRef = useRef<any>(null);
  const escaneoBloqueadoRef = useRef(false);
  const registroBloqueadoRef = useRef(false);
  const tecnico =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tecnicoUser") || "null")
      : null;
  const cargar = useCallback((filtro?: { tipo: "PARTICIPANTE" | "AUSPICIADOR"; id: number; nombre: string } | null) => {
    if (!tecnico?.id || !filtro) { setAsistencias([]); return; }
    const url = filtro.tipo === "PARTICIPANTE"
      ? `${API}/attendance?empresaEventoId=${filtro.id}`
      : `${API}/sponsors/attendance`;
    fetch(url).then((r) => r.json()).then((data) => {
      const lista = Array.isArray(data) ? data : [];
      const filtrada = filtro.tipo === "AUSPICIADOR"
        ? lista.filter((a: any) => a.auspiciadorpersona?.auspiciador?.nombreEmpresa === filtro.nombre)
        : lista;
      setAsistencias(filtrada.map((a: any) => ({ ...a, tipo: filtro.tipo })));
    }).catch(() => setAsistencias([]));
  }, [tecnico?.id]);
  const extraerCredencial = (contenido: string) => {
    try {
      const url = new URL(contenido.trim());
      const ausp = url.pathname.match(/\/credencial\/auspiciador\/(\d+)\/?$/);
      const normal = url.pathname.match(/\/credencial\/(\d+)\/?$/);
      const token = url.searchParams.get("t");
      if (token && (ausp || normal)) return { partes: (ausp || normal)!, auspiciador: Boolean(ausp), token };
    } catch { /* también se aceptan enlaces copiados sin URL absoluta */ }
    const matchAusp = contenido.match(/\/credencial\/auspiciador\/(\d+)\/?\?t=([a-zA-Z0-9_-]+)/);
    const match = contenido.match(/\/credencial\/(\d+)\/?\?t=([a-zA-Z0-9_-]+)/);
    const partes = matchAusp || match;
    return partes ? { partes, auspiciador: Boolean(matchAusp), token: partes[2] } : null;
  };
  const cerrarCamara = () => {
    controlesRef.current?.stop?.();
    controlesRef.current = null;
    setCamara(false);
    escaneoBloqueadoRef.current = false;
  };
  const revisar = async (contenido: string) => {
    if (procesando || escaneoBloqueadoRef.current) return;
    escaneoBloqueadoRef.current = true;
    const credencial = extraerCredencial(contenido);
    if (!credencial) {
      setModal({
        titulo: "QR no válido",
        mensaje: "Escanea o pega una credencial válida del evento.",
      });
      return;
    }
    setProcesando(true);
    try {
      const { auspiciador, partes, token } = credencial;
      const res = await fetch(auspiciador
        ? `${API}/sponsors/attendance/check?personaId=${partes[1]}&token=${encodeURIComponent(token)}`
        : `${API}/attendance/check?companyUserId=${partes[1]}&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo verificar.");
      cerrarCamara();
      const filtro = auspiciador
        ? { tipo: "AUSPICIADOR" as const, id: Number(partes[1]), nombre: String(data.empresa || "Auspiciador") }
        : { tipo: "PARTICIPANTE" as const, id: Number(data.empresa?.empresaEventoId), nombre: String(data.empresa?.nombre || "Empresa") };
      setEmpresaEscaneada(filtro);
      setPendiente({ ...(auspiciador ? { personaId: Number(partes[1]) } : { euId: Number(partes[1]) }), token, tipo: auspiciador ? "AUSPICIADOR" : "PARTICIPANTE", ...data, registroCompletado: false });
      cargar(filtro);
    } catch (e: any) {
      setModal({ titulo: "No se pudo verificar", mensaje: e.message });
    } finally {
      setProcesando(false);
    }
  };
  const registrar = async () => {
    if (!pendiente || procesando || registroBloqueadoRef.current) return;
    registroBloqueadoRef.current = true;
    setProcesando(true);
    try {
      const esAuspiciador = pendiente.tipo === "AUSPICIADOR";
      const res = await fetch(`${API}/${esAuspiciador ? "tecnico/asistencias-auspiciadores" : "tecnico/asistencias"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(esAuspiciador ? { personaId: pendiente.personaId, token: pendiente.token } : { companyUserId: pendiente.euId, token: pendiente.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo registrar.");
      setPendiente((actual: any) => ({
        ...actual,
        registroCompletado: true,
        asistencia: {
          registrada: data.usosRestantes === 0,
          fechaHoraAsistencia: data.fechaHoraAsistencia,
          usosHoy: data.usosHoy,
          usosRestantes: data.usosRestantes,
          limiteDiario: data.limiteDiario,
        },
      }));
      setValor("");
      cargar(empresaEscaneada);
      setModal({
        titulo: data.yaRegistrada ? "Asistencia ya procesada" : "Asistencia registrada",
        mensaje: data.yaRegistrada
          ? `${data.participante.nombre}: este escaneo ya había sido procesado y no consumió otro uso.`
          : `${data.participante.nombre} · uso ${data.usosHoy} de ${data.limiteDiario}. ${data.usosRestantes ? `Queda ${data.usosRestantes} registro hoy; para usarlo se debe escanear nuevamente la credencial.` : "Se alcanzó el límite diario."}`,
      });
    } catch (e: any) {
      setModal({ titulo: "No se pudo registrar", mensaje: e.message });
    } finally {
      setProcesando(false);
      registroBloqueadoRef.current = false;
    }
  };
  const abrirCamara = async () => {
    if (!navigator.mediaDevices?.getUserMedia)
      return setModal({
        titulo: "Cámara no disponible",
        mensaje:
          "El navegador no permite usar la cámara. Abre la página mediante HTTPS y concede el permiso de cámara.",
      });
    escaneoBloqueadoRef.current = false;
    setCamara(true);
    setTimeout(async () => {
      try {
        const video = videoRef.current;
        if (!video) throw new Error("No se pudo iniciar la vista de cámara.");
        const lector = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 100,
          delayBetweenScanSuccess: 500,
        });
        controlesRef.current = await lector.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          video,
          (resultado) => {
            if (resultado?.getText() && !escaneoBloqueadoRef.current) {
              revisar(resultado.getText());
            }
          },
        );
      } catch (e: any) {
        cerrarCamara();
        const denegado =
          e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError";
        setModal({
          titulo: "Cámara no disponible",
          mensaje: denegado
            ? "Debes permitir el acceso a la cámara en la configuración del navegador y volver a intentarlo."
            : e.message || "No se pudo abrir la cámara.",
        });
      }
    }, 100);
  };
  const leerImagenQR = async (archivo?: File) => {
    if (!archivo || procesando) return;
    const url = URL.createObjectURL(archivo);
    try {
      const lector = new BrowserQRCodeReader();
      const resultado = await lector.decodeFromImageUrl(url);
      await revisar(resultado.getText());
    } catch {
      escaneoBloqueadoRef.current = false;
      setModal({ titulo: "QR no reconocido", mensaje: "No se encontró un código QR legible en la imagen. Intenta acercarlo, enfocarlo mejor o usa la cámara." });
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  useEffect(() => () => controlesRef.current?.stop?.(), []);
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {modal && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="font-extrabold">{modal.titulo}</h2>
            <p className="text-sm text-gray-600 mt-2 break-words">
              {modal.mensaje}
            </p>
            <button
              onClick={() => {
                setModal(null);
                escaneoBloqueadoRef.current = false;
              }}
              className="mt-5 w-full rounded-xl bg-[#449D3A] text-white font-bold py-3"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-extrabold">Control de asistencia</h1>
      <p className="text-sm text-gray-500 mt-1">
        Solo el personal técnico puede verificar credenciales y registrar
        asistencias.
      </p>
      <div className="mt-5 bg-white border rounded-2xl p-4 sm:p-6">
        {pendiente ? (
          <div>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <p className="text-xs text-center font-bold text-green-700 uppercase mt-2">
              {pendiente.registroCompletado
                ? "Registro completado"
                : pendiente.asistencia?.registrada
                  ? "Límite diario alcanzado"
                  : `Credencial válida · ${pendiente.asistencia?.usosHoy || 0} de ${pendiente.asistencia?.limiteDiario || 2} usos`}
            </p>
            <h2 className="font-extrabold text-xl sm:text-2xl mt-1 text-center break-words">
              {pendiente.participante?.nombre || pendiente.nombreCompleto}
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3 min-w-0"><p className="text-xs text-gray-400">Empresa</p><p className="font-bold break-words">{pendiente.empresa?.nombre || pendiente.empresa}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-400">Tipo de participante</p><p className="font-bold">{pendiente.tipo === "AUSPICIADOR" ? "Auspiciador" : pendiente.participante?.esResponsable ? "Encargado" : "Participante"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-400">Cargo</p><p className="font-bold break-words">{pendiente.participante?.cargo || pendiente.cargo || "No indicado"}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-400">Ciudad y país de la empresa</p><p className="font-bold break-words">{pendiente.tipo === "AUSPICIADOR" ? (pendiente.lugar || "No indicado") : ([pendiente.empresa?.ciudad, pendiente.empresa?.pais].filter(Boolean).join(", ") || "No indicado")}</p></div>
              {(pendiente.evento?.nombre || pendiente.evento) && <div className="rounded-xl bg-gray-50 p-3 sm:col-span-2"><p className="text-xs text-gray-400">Evento</p><p className="font-bold break-words">{pendiente.evento?.nombre || pendiente.evento} {pendiente.edicion || pendiente.evento?.edicion || ""}</p></div>}
            </div>
            {pendiente.asistencia?.fechaHoraAsistencia && <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 text-center text-sm font-semibold text-green-800">Último registro: {new Date(pendiente.asistencia.fechaHoraAsistencia).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}. Usos de hoy: {pendiente.asistencia.usosHoy} de {pendiente.asistencia.limiteDiario || 2}. Cada participante tiene su propio límite.</div>}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-2 mt-5">
              <button
                onClick={() => { setPendiente(null); setValor(""); escaneoBloqueadoRef.current = false; }}
                className="w-full border rounded-xl px-4 py-3 font-bold text-gray-600"
              >
                {pendiente.registroCompletado || pendiente.asistencia?.registrada ? "Escanear otra credencial" : "Cancelar"}
              </button>
              {!pendiente.registroCompletado && !pendiente.asistencia?.registrada && <button
                onClick={registrar}
                disabled={procesando}
                className="w-full rounded-xl bg-[#449D3A] text-white px-4 py-3 font-bold disabled:opacity-50"
              >
                {procesando ? "Registrando..." : "Registrar asistencia"}
              </button>}
            </div>
          </div>
        ) : (
          <>
            {camara ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                />
                <button
                  onClick={cerrarCamara}
                  className="absolute top-3 right-3 bg-white rounded-full p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={abrirCamara}
                className="w-full rounded-xl bg-[#449D3A] text-white font-bold py-3 flex justify-center gap-2"
              >
                <ScanLine className="w-5 h-5" />
                Escanear QR con la cámara
              </button>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="O pega el enlace de la credencial"
                className="flex-1 min-w-0 border rounded-xl px-3 py-3 text-sm"
              />
              <button
                onClick={() => revisar(valor)}
                disabled={!valor.trim() || procesando}
                className="rounded-xl bg-gray-900 text-white px-5 py-3 font-bold disabled:opacity-40"
              >
                Verificar QR
              </button>
            </div>
            <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700">
              <ImageIcon className="h-5 w-5" /> Leer QR desde una imagen
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void leerImagenQR(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
          </>
        )}
      </div>
      <h2 className="font-extrabold mt-7 mb-1">Asistencias de la empresa escaneada ({asistencias.length})</h2>
      <p className="mb-3 text-xs text-gray-500">{empresaEscaneada ? empresaEscaneada.nombre : "Escanea una credencial para consultar únicamente la asistencia de su empresa."}</p>
      <div className="space-y-2">
        {asistencias.map((a) => (
          <div key={a.id} className="bg-white border rounded-xl p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold break-words">
                {a.tipo === "AUSPICIADOR" ? a.auspiciadorpersona?.nombreCompleto : `${a.empresa_usuario?.usuario?.nombres || ""} ${a.empresa_usuario?.usuario?.apellidoPaterno || ""}`}
              </p>
              <p className="text-xs text-gray-500 break-words">
                {a.tipo === "AUSPICIADOR" ? a.auspiciadorpersona?.auspiciador?.nombreEmpresa : a.empresa_usuario?.empresa?.nombre}
              </p>
              <p className="text-xs text-gray-400 mt-1 break-words">
                {new Date(a.fechaHoraAsistencia).toLocaleString("es-BO", { timeZone: "America/La_Paz" })} · {a.tipo === "AUSPICIADOR" ? ([a.evento?.ciudadEvento, a.evento?.paisEvento].filter(Boolean).join(", ") || "Lugar del evento") : ([a.empresa_usuario?.empresa?.ciudad?.nombre, a.empresa_usuario?.empresa?.ciudad?.pais?.nombre].filter(Boolean).join(", ") || "Ubicación no indicada")} · uso {a.numeroUso || 1}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
