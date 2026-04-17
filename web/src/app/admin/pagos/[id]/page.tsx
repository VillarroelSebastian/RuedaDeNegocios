"use client";
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Download, FileText, Info } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useModal } from '@/components/ui/Modal';
import Link from 'next/link';

const API = 'http://localhost:3334';

export default function PagoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showSuccess, showError, showConfirm, ModalComponent } = useModal();
  const [pago, setPago] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/pagos/${id}`)
      .then((r) => r.json())
      .then((data) => { setPago(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleAprobar = () => {
    showConfirm(
      'Aprobar pago',
      'La aprobación del pago habilitará automáticamente el acceso de la empresa y sus participantes al sistema del evento.',
      async () => {
        setSubmitting(true);
        try {
          await fetch(`${API}/admin/pagos/${id}/aprobar`, { method: 'PUT' });
          showSuccess('Pago aprobado', 'La empresa ha sido habilitada correctamente.');
          const res = await fetch(`${API}/admin/pagos/${id}`);
          setPago(await res.json());
        } catch { showError('Error', 'No se pudo aprobar el pago.'); }
        finally { setSubmitting(false); }
      }
    );
  };

  const handleObservar = async () => {
    if (!observacion.trim()) {
      showError('Campo requerido', 'Escribe una observación antes de solicitar nueva evidencia.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API}/admin/pagos/${id}/observar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacion }),
      });
      showSuccess('Observación enviada', 'Se solicitó nueva evidencia a la empresa.');
      const res = await fetch(`${API}/admin/pagos/${id}`);
      setPago(await res.json());
      setObservacion('');
    } catch { showError('Error', 'No se pudo enviar la observación.'); }
    finally { setSubmitting(false); }
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
  const estadoColor: Record<string, string> = {
    COMPLETADO: 'bg-green-100 text-green-700',
    PENDIENTE: 'bg-orange-100 text-orange-700',
    OBSERVADO: 'bg-yellow-100 text-yellow-700',
    RECHAZADO: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <ModalComponent />

      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pagos" className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Verificación de pago</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Info className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Resumen del Registro</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Empresa', value: pago.empresa?.nombre },
              { label: 'Ciudad', value: pago.empresa?.ciudad?.nombre },
              { label: 'Número de participantes', value: pago.numeroParticipantes },
              { label: 'Monto pagado', value: pago.montoPagado ? `${Number(pago.montoPagado).toLocaleString('es-BO')} BOB` : 'No especificado', green: !!pago.montoPagado },
              { label: 'Fecha de envío', value: pago.fechaHoraEnvioComprobante ? new Date(pago.fechaHoraEnvioComprobante).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className={`text-sm font-semibold ${item.green ? 'text-[#449D3A]' : 'text-gray-900'}`}>{item.value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Estado actual del pago</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${estadoColor[pago.estadoVerificacionPago] || 'bg-gray-100 text-gray-600'}`}>
                {pago.estadoVerificacionPago}
              </span>
            </div>
          </div>

          {pago.observacionSobreComprobante && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Observación anterior:</p>
              <p className="text-sm text-yellow-800">{pago.observacionSobreComprobante}</p>
            </div>
          )}
        </div>

        {/* Comprobante */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-[#449D3A]" />
            <h2 className="font-bold text-gray-900">Comprobante de pago</h2>
          </div>

          {comprobante ? (
            <div>
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-4 aspect-[3/4] max-h-72 flex items-center justify-center">
                {comprobante.urlComprobantePagoInscripcion.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={comprobante.urlComprobantePagoInscripcion} alt="Comprobante" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Archivo de comprobante</p>
                  </div>
                )}
              </div>
              <a
                href={comprobante.urlComprobantePagoInscripcion}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-[#449D3A] hover:underline"
              >
                <Download className="w-4 h-4" /> Descargar comprobante
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

      {/* Observación */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-900 mb-2">Observaciones para solicitar nueva evidencia</h2>
        <p className="text-sm text-gray-500 mb-4">Escribe una observación clara para que la empresa pueda corregir o volver a enviar su comprobante.</p>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={3}
          placeholder="Ej: El archivo adjunto es ilegible, por favor suba una foto más clara..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#449D3A] focus:border-[#449D3A] resize-none bg-gray-50"
        />
      </div>

      {/* Info */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#449D3A] mt-0.5 shrink-0" />
        <p className="text-sm text-green-800">La aprobación del pago habilita automáticamente el acceso de la empresa y sus participantes al sistema del evento.</p>
      </div>

      {/* Botones */}
      {pago.estadoVerificacionPago !== 'COMPLETADO' && (
        <div className="flex gap-4">
          <button
            onClick={handleAprobar}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-[#449D3A] text-white font-bold rounded-xl hover:bg-[#367d2e] disabled:opacity-50 transition-colors shadow-sm"
          >
            <CheckCircle className="w-5 h-5" /> Aprobar pago
          </button>
          <button
            onClick={handleObservar}
            disabled={submitting || !observacion.trim()}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <AlertCircle className="w-5 h-5" /> Solicitar nueva evidencia
          </button>
        </div>
      )}
    </div>
  );
}
