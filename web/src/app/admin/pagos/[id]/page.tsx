"use client";
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Download, FileText, Info, Eye, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useModal } from '@/components/ui/Modal';
import FichaEmpresaModal from '@/components/admin/FichaEmpresaModal';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

export default function PagoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [pago, setPago] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [verFicha, setVerFicha] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/pagos/${id}`)
      .then((r) => r.json())
      .then((data) => { setPago(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleAprobar = () => {
    showConfirm(
      'Aprobar pago',
      'La aprobación habilitará el acceso de la empresa y sus participantes, y se les enviará un correo con sus credenciales.',
      async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`${API}/admin/pagos/${id}/aprobar`, { method: 'PUT' });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'No se pudo aprobar el pago.');
          if (data.correosFallidos?.length) {
            showError('Pago aprobado con envios pendientes', `No se pudieron enviar credenciales a: ${data.correosFallidos.join(', ')}. Puedes volver a aprobar para reintentar.`);
          } else {
            showSuccess('Pago aprobado', 'La empresa ha sido habilitada y se enviaron las credenciales por correo.');
          }
          setTimeout(() => router.push('/admin/pagos'), 1500);
        } catch { showError('Error', 'No se pudo aprobar el pago.'); }
        finally { setSubmitting(false); }
      },
      'success'
    );
  };

  const handleObservar = async () => {
    if (!observacion.trim()) {
      showError('Campo requerido', 'Escribe una observación antes de solicitar nueva evidencia.');
      return;
    }
    showConfirm(
      'Enviar observación',
      'Se notificará al encargado por correo con la observación indicada y deberá subir un nuevo comprobante.',
      async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`${API}/admin/pagos/${id}/observar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observacion }),
          });
          if (!res.ok) throw new Error();
          showSuccess('Observación enviada', 'Se notificó al encargado de la empresa por correo.');
          setTimeout(() => router.push('/admin/pagos'), 1500);
        } catch { showError('Error', 'No se pudo enviar la observación.'); }
        finally { setSubmitting(false); }
      }
    );
  };

  const handleRechazar = () => {
    if (!motivo.trim()) {
      showError('Campo requerido', 'Escribe el motivo de rechazo antes de continuar.');
      return;
    }
    showConfirm(
      'Rechazar pago',
      'Se notificará al encargado por correo con el motivo del rechazo. Esta acción no se puede deshacer.',
      async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`${API}/admin/pagos/${id}/rechazar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo }),
          });
          if (!res.ok) throw new Error();
          showSuccess('Pago rechazado', 'Se notificó al encargado de la empresa por correo.');
          setTimeout(() => router.push('/admin/pagos'), 1500);
        } catch { showError('Error', 'No se pudo rechazar el pago.'); }
        finally { setSubmitting(false); }
      }
    );
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!pago) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Pago no encontrado.</p>
        <Link href="/admin/pagos" className="text-[#449D3A] font-semibold mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const comprobante = pago.empresaeventocomprobantes?.[0];
  const urlComp = comprobante?.urlComprobantePagoInscripcion;
  const isPdf = urlComp && (urlComp.includes('.pdf') || urlComp.includes('/raw/upload/'));

  const estadoColor: Record<string, string> = {
    COMPLETADO: 'bg-green-100 text-green-700',
    PENDIENTE:  'bg-orange-100 text-orange-700',
    OBSERVADO:  'bg-yellow-100 text-yellow-700',
    RECHAZADO:  'bg-red-100 text-red-700',
  };

  const estado = pago.estadoVerificacionPago;
  const puedeAprobar  = estado !== 'COMPLETADO' && estado !== 'RECHAZADO';
  const puedeObservar = estado !== 'COMPLETADO' && estado !== 'RECHAZADO';
  const puedeRechazar = estado !== 'COMPLETADO' && estado !== 'RECHAZADO';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ModalComponent />
      {verFicha && pago.empresa?.id && (
        <FichaEmpresaModal empresaId={pago.empresa.id} onClose={() => setVerFicha(false)} />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30" onClick={() => setLightbox(null)}>
            <XCircle className="w-6 h-6" />
          </button>
          <img src={lightbox} alt="Comprobante" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pagos" className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Verificación de pago</h1>
        <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${estadoColor[estado] || 'bg-gray-100 text-gray-600'}`}>
          {estado}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Info className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Resumen del Registro</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Empresa',               value: pago.empresa?.nombre },
              { label: 'Ciudad',                value: pago.empresa?.ciudad?.nombre },
              { label: 'Participantes',         value: pago.numeroParticipantes },
              { label: 'Monto',                 value: pago.montoPagado ? `${Number(pago.montoPagado).toLocaleString('es-BO')} BOB` : '—', green: !!pago.montoPagado },
              { label: 'Fecha de envío',        value: pago.fechaHoraEnvioComprobante ? new Date(pago.fechaHoraEnvioComprobante).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className={`text-sm font-semibold ${item.green ? 'text-[#449D3A]' : 'text-gray-900'}`}>{item.value}</span>
              </div>
            ))}
          </div>

          {pago.empresa?.id && (
            <button
              type="button"
              onClick={() => setVerFicha(true)}
              className="mt-4 w-full rounded-xl border border-[#449D3A] px-4 py-2.5 text-sm font-bold text-[#449D3A] hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> Ver ficha completa de la empresa
            </button>
          )}

          {/* Última observación — persiste incluso si subieron nuevo comprobante */}
          {pago.observacionSobreComprobante && (
            <div className={`mt-4 rounded-lg p-3 border ${estado === 'RECHAZADO' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`text-xs font-bold mb-1 uppercase tracking-wide ${estado === 'RECHAZADO' ? 'text-red-700' : 'text-yellow-700'}`}>
                {estado === 'RECHAZADO' ? 'Motivo de rechazo:' : 'Última observación:'}
              </p>
              <p className={`text-sm ${estado === 'RECHAZADO' ? 'text-red-800' : 'text-yellow-800'}`}>
                {pago.observacionSobreComprobante}
              </p>
            </div>
          )}
        </div>

        {/* Comprobante */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Comprobante de pago</h2>
          </div>

          {urlComp ? (
            <div>
              <div
                className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-3 h-64 flex items-center justify-center cursor-pointer hover:border-[#449D3A] transition-colors"
                onClick={() => !isPdf && setLightbox(urlComp)}
                title={isPdf ? '' : 'Clic para ampliar'}
              >
                {isPdf ? (
                  <div className="text-center p-8">
                    <FileText className="w-14 h-14 text-[#449D3A] mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-semibold">Archivo PDF adjunto</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img src={urlComp} alt="Comprobante" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}
              </div>
              {!isPdf && <p className="text-[11px] text-gray-400 text-center mb-3">Clic en la imagen para ampliar</p>}
              <a href={urlComp} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-[#449D3A] hover:underline">
                <Download className="w-4 h-4" /> Descargar / abrir comprobante
              </a>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Sin comprobante adjunto</p>
            </div>
          )}
        </div>
      </div>

      {/* Participantes */}
      {pago.empresa_usuario?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Participantes registrados ({pago.empresa_usuario.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pago.empresa_usuario.map((eu: any) => (
              <div key={eu.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${eu.esResponsable === 1 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-500'}`}>
                  {(eu.usuario?.nombres?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                    {eu.usuario?.nombres} {eu.usuario?.apellidoPaterno}
                    {eu.esResponsable === 1 && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Encargado</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{eu.cargo || '—'}</p>
                  <p className="text-xs text-gray-400">{eu.usuario?.correo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      {(puedeObservar || puedeRechazar) && (
        <>
          {/* Observar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-gray-900">Solicitar nueva evidencia</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">Escribe una observación clara para que la empresa pueda corregir su comprobante.</p>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              placeholder="Ej: El archivo adjunto es ilegible, suba una foto más clara del comprobante..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 resize-none bg-gray-50"
            />
          </div>

          {/* Rechazar */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <h2 className="font-bold text-gray-900">Rechazar pago</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">Indica el motivo por el que se rechaza el comprobante. Se notificará al encargado por correo.</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ej: El comprobante presentado no corresponde al monto declarado..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 resize-none bg-gray-50"
            />
          </div>
        </>
      )}

      {/* Info */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#449D3A] mt-0.5 shrink-0" />
        <p className="text-sm text-green-800">Al aprobar, se habilita el acceso y se envían las credenciales por correo. Al observar o rechazar, se notifica al encargado automáticamente.</p>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3">
        {puedeAprobar && (
          <button onClick={handleAprobar} disabled={submitting}
            className="flex items-center gap-2 px-7 py-3 bg-[#449D3A] text-white font-bold rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors shadow-sm">
            <CheckCircle className="w-5 h-5" /> Aprobar pago
          </button>
        )}
        {puedeObservar && (
          <button onClick={handleObservar} disabled={submitting || !observacion.trim()}
            className="flex items-center gap-2 px-6 py-3 border border-amber-400 text-amber-700 font-semibold rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-colors">
            <AlertCircle className="w-5 h-5" /> Solicitar nueva evidencia
          </button>
        )}
        {puedeRechazar && (
          <button onClick={handleRechazar} disabled={submitting || !motivo.trim()}
            className="flex items-center gap-2 px-6 py-3 border border-red-400 text-red-600 font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors">
            <XCircle className="w-5 h-5" /> Rechazar pago
          </button>
        )}
        {estado === 'COMPLETADO' && (
          <div className="flex items-center gap-2 px-6 py-3 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-xl">
            <CheckCircle className="w-5 h-5" /> Pago aprobado
          </div>
        )}
        {estado === 'RECHAZADO' && (
          <div className="flex items-center gap-2 px-6 py-3 bg-red-50 border border-red-200 text-red-600 font-semibold rounded-xl">
            <XCircle className="w-5 h-5" /> Pago rechazado
          </div>
        )}
      </div>
    </div>
  );
}
