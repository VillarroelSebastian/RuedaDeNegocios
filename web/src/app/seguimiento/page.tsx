'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  CreditCard,
  CalendarDays,
  Mail,
  User,
  RefreshCw,
  MapPin,
  Upload,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

interface Participante {
  nombres: string;
  apellidoPaterno: string;
  correo: string;
  cargo: string;
  esResponsable: boolean;
}

interface SeguimientoData {
  id: number;
  empresa: {
    nombre: string;
    rubro: string;
    correoCorporativo: string;
    urlFotoPerfil: string | null;
  };
  evento: {
    nombre: string;
    urlLogoEvento: string | null;
  };
  estadoVerificacionPago: string;
  estadoHabilitacionAcceso: string;
  observacionSobreComprobante: string | null;
  montoPagado: number | null;
  tipoParticipacion: string | null;
  numeroParticipantes: number | null;
  fechaHoraEnvioComprobante: string | null;
  urlComprobante: string | null;
  tieneComprobante: boolean;
  encargado: {
    nombres: string;
    apellidoPaterno: string;
    correo: string;
  } | null;
  participantes: Participante[];
}

const ESTADO_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  PENDIENTE: {
    label: 'Pendiente de verificación',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Clock className="w-5 h-5 text-amber-600" />,
  },
  OBSERVADO: {
    label: 'Con observaciones',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
  },
  COMPLETADO: {
    label: 'Pago verificado',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  },
  RECHAZADO: {
    label: 'Pago rechazado',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <XCircle className="w-5 h-5 text-red-600" />,
  },
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG['PENDIENTE'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function TimelineStep({
  done,
  active,
  label,
  sub,
  icon,
  last,
}: {
  done: boolean;
  active: boolean;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
            done
              ? 'bg-green-500 border-green-500 text-white'
              : active
              ? 'bg-white border-green-500 text-green-600'
              : 'bg-white border-gray-200 text-gray-400'
          }`}
        >
          {icon}
        </div>
        {!last && <div className={`w-0.5 flex-1 mt-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />}
      </div>
      <div className={last ? 'pt-1' : 'pb-6'}>
        <p
          className={`text-sm font-semibold leading-none mb-1 ${
            done ? 'text-green-700' : active ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {label}
        </p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

function SeguimientoContent() {
  const params = useSearchParams();
  const eeId = params.get('ee');

  const [data, setData] = useState<SeguimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // URL del nuevo antes de confirmar
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function fetchData() {
    if (!eeId) {
      setError('No se proporcionó un ID de seguimiento.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/public/seguimiento?ee=${eeId}`);
      if (!res.ok) throw new Error('Registro no encontrado');
      setData(await res.json());
    } catch {
      setError('No se pudo obtener la información. Verifica el enlace o intenta más tarde.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eeId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !eeId) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError('El archivo no debe superar 10 MB.'); return; }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setPreviewUrl(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch(`${API}/admin/imagenes/upload`, { method: 'POST', body: fd });
      const upData = await upRes.json();
      if (!upData.url) throw new Error('No se obtuvo URL del archivo');

      const res = await fetch(`${API}/public/seguimiento/${eeId}/comprobante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlComprobante: upData.url }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message || 'Error al subir el comprobante');
      }
      setUploadSuccess(true);
      setPreviewUrl(upData.url);
      await fetchData();
    } catch (err: any) {
      setUploadError(err.message || 'No se pudo subir el comprobante.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const estadoPago = data?.estadoVerificacionPago ?? 'PENDIENTE';
  const comprobanteSent = data?.tieneComprobante ?? false;
  const pagoCompletado = estadoPago === 'COMPLETADO';
  const pagoObservado = estadoPago === 'OBSERVADO';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {data?.evento.urlLogoEvento ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={data.evento.urlLogoEvento} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {data?.evento.nombre ?? 'Rueda de Negocios'}
            </p>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Estado de inscripción
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 z-10"
            onClick={() => setLightbox(null)}
          >
            <XCircle className="w-6 h-6" />
          </button>
          {lightbox.includes('.pdf') || lightbox.includes('/raw/upload/') ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xs text-center" onClick={e => e.stopPropagation()}>
              <FileText className="w-16 h-16 text-green-500" />
              <p className="font-semibold text-gray-800">Archivo PDF</p>
              <a href={lightbox} target="_blank" rel="noopener noreferrer"
                className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors">
                Abrir PDF
              </a>
            </div>
          ) : (
            <img
              src={lightbox}
              alt="Comprobante"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-sm">Cargando información…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3 text-red-700">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">No se pudo cargar el seguimiento</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Empresa card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {data.empresa.urlFotoPerfil ? (
                  <img
                    src={data.empresa.urlFotoPerfil}
                    alt={data.empresa.nombre}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{data.empresa.nombre}</h2>
                <p className="text-sm text-gray-500 truncate">{data.empresa.rubro}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  {data.empresa.correoCorporativo}
                </p>
              </div>
              {!pagoCompletado && <StatusBadge estado={estadoPago} />}
            </div>

            {/* Observación */}
            {pagoObservado && data.observacionSobreComprobante && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-700">
                    Observación del comprobante
                  </p>
                  <p className="text-sm text-orange-600 mt-1">
                    {data.observacionSobreComprobante}
                  </p>
                </div>
              </div>
            )}

            {/* Comprobante de pago — siempre visible si tiene o puede subir */}
            {(estadoPago === 'PENDIENTE' || estadoPago === 'OBSERVADO' || data.urlComprobante) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Comprobante de pago
                </h3>
                {(estadoPago === 'PENDIENTE' || estadoPago === 'OBSERVADO') && (
                  <p className="text-xs text-gray-400 mb-4">
                    {pagoObservado
                      ? 'Tu comprobante tiene observaciones. Sube uno nuevo para que sea revisado nuevamente.'
                      : 'Si subiste un comprobante incorrecto, puedes reemplazarlo aquí.'}
                  </p>
                )}

                {/* Preview del comprobante actual o del recién subido */}
                {(previewUrl || data.urlComprobante) && (() => {
                  const url = previewUrl || data.urlComprobante!;
                  const isPdf = url.includes('.pdf') || url.includes('/raw/upload/');
                  return (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2 font-medium">
                        {previewUrl ? 'Nuevo comprobante subido:' : 'Comprobante actual:'}
                      </p>
                      <div
                        className="w-full h-48 rounded-xl border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer hover:border-green-400 transition-colors"
                        onClick={() => setLightbox(url)}
                        title="Clic para ampliar"
                      >
                        {isPdf ? (
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <FileText className="w-12 h-12 text-green-500" />
                            <p className="text-sm font-semibold">Archivo PDF</p>
                            <p className="text-xs text-gray-400">Clic para ver</p>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt="Comprobante"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 text-center">Clic en la imagen para ampliar</p>
                    </div>
                  );
                })()}

                {/* Feedback upload */}
                {uploadSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-green-700">Comprobante actualizado correctamente.</p>
                  </div>
                )}
                {uploadError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                )}

                {/* Botón de subida — solo si puede modificar */}
                {(estadoPago === 'PENDIENTE' || estadoPago === 'OBSERVADO') && (
                  <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${uploading ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-green-50'}`}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Upload className={`w-7 h-7 mb-2 ${uploading ? 'text-green-500 animate-bounce' : 'text-gray-400'}`} />
                    <p className={`text-sm font-semibold ${uploading ? 'text-green-600' : 'text-gray-600'}`}>
                      {uploading
                        ? 'Subiendo comprobante…'
                        : data.urlComprobante
                        ? 'Reemplazar comprobante'
                        : 'Subir comprobante de pago'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Imagen o PDF — Máximo 10 MB</p>
                  </label>
                )}
              </div>
            )}

            {/* Línea de tiempo */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">
                Progreso de la solicitud
              </h3>
              <TimelineStep
                done
                active={false}
                label="Solicitud enviada"
                sub={formatDate(data.fechaHoraEnvioComprobante)}
                icon={<FileText className="w-4 h-4" />}
              />
              <TimelineStep
                done={comprobanteSent}
                active={!comprobanteSent}
                label="Comprobante de pago adjuntado"
                sub={comprobanteSent ? 'Comprobante recibido' : 'En espera de comprobante'}
                icon={<CreditCard className="w-4 h-4" />}
              />
              <TimelineStep
                done={pagoCompletado}
                active={comprobanteSent && !pagoCompletado}
                label="Verificación de pago"
                sub={
                  pagoCompletado
                    ? 'Pago aprobado'
                    : pagoObservado
                    ? 'Requiere corrección'
                    : 'Pendiente de revisión'
                }
                icon={<CheckCircle2 className="w-4 h-4" />}
              />
              <TimelineStep
                done={pagoCompletado}
                active={false}
                last
                label="Acceso habilitado al evento"
                sub={
                  pagoCompletado
                    ? 'Tus credenciales fueron enviadas por correo'
                    : 'Se habilita tras aprobar el pago'
                }
                icon={<CalendarDays className="w-4 h-4" />}
              />
            </div>

            {/* Detalles de inscripción */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Detalles de inscripción
              </h3>
              <dl className="divide-y divide-gray-100">
                {[
                  {
                    icon: <CreditCard className="w-4 h-4 text-gray-400" />,
                    label: 'Monto declarado',
                    value: data.montoPagado != null ? `${data.montoPagado} Bs.` : '—',
                  },
                  {
                    icon: <Users className="w-4 h-4 text-gray-400" />,
                    label: 'Participantes',
                    value: data.numeroParticipantes ?? '—',
                  },
                  {
                    icon: <FileText className="w-4 h-4 text-gray-400" />,
                    label: 'Tipo de participación',
                    value: data.tipoParticipacion ?? '—',
                  },
                  {
                    icon: <CalendarDays className="w-4 h-4 text-gray-400" />,
                    label: 'Fecha de envío',
                    value: formatDate(data.fechaHoraEnvioComprobante),
                  },
                  {
                    icon: <MapPin className="w-4 h-4 text-gray-400" />,
                    label: 'Evento',
                    value: data.evento.nombre,
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-3">
                    {icon}
                    <span className="text-sm text-gray-500 flex-1">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </dl>
            </div>

            {/* Participantes */}
            {data.participantes?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Participantes registrados ({data.participantes.length})
                </h3>
                <div className="space-y-3">
                  {data.participantes.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${p.esResponsable ? 'bg-green-100' : 'bg-blue-50'}`}>
                        <User className={`w-4 h-4 ${p.esResponsable ? 'text-green-600' : 'text-blue-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.nombres} {p.apellidoPaterno}
                          {p.esResponsable && (
                            <span className="ml-2 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Encargado</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{p.cargo || '—'}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {p.correo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acceso habilitado */}
            {pagoCompletado && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-green-800 mb-1">
                  ¡Inscripción aprobada!
                </h3>
                <p className="text-sm text-green-700 max-w-xs mx-auto">
                  Las credenciales de acceso fueron enviadas al correo de cada participante
                  registrado. Revisa tu bandeja de entrada.
                </p>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 pb-4">
              ID de seguimiento: #{data.id} &nbsp;·&nbsp; Actualiza la página para ver cambios
              recientes
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-green-500" />
        <p className="text-sm">Cargando…</p>
      </div>
    </div>
  );
}

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SeguimientoContent />
    </Suspense>
  );
}
