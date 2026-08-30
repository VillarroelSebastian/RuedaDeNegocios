"use client";

import React, { useState, useEffect } from 'react';
import { Info, LayoutGrid, CreditCard, QrCode, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import styles from './ConfiguracionEvento.module.css';
import Modal, { useModal } from '@/components/ui/Modal';
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3334";

type DiaReunion = { fecha: string; habilitado: boolean; rangos: { desde: string; hasta: string }[] };

function fechasEntre(inicio: string, fin: string): string[] {
  const desde = inicio.slice(0, 10), hasta = fin.slice(0, 10);
  if (!desde || !hasta || desde > hasta) return [];
  const cursor = new Date(`${desde}T12:00:00Z`);
  const resultado: string[] = [];
  while (cursor.toISOString().slice(0, 10) <= hasta) {
    resultado.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return resultado;
}

function fechaHoraBolivia(iso: string) {
  if (!iso) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value || '';
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}

function fechaHoraInputComoBolivia(valor: string) {
  return valor ? `${valor}:00-04:00` : null;
}

const SOUTH_AMERICA: Record<string, string[]> = {
  "Bolivia":   ["Trinidad","Beni","La Paz","Santa Cruz de la Sierra","Cochabamba","Sucre","Oruro","Potosí","Tarija","Cobija","Riberalta","Guayaramerín"],
  "Argentina": ["Buenos Aires","Córdoba","Rosario","Mendoza","Tucumán","La Plata","Mar del Plata","Salta","Santa Fe","San Juan"],
  "Brasil":    ["São Paulo","Río de Janeiro","Brasilia","Salvador","Fortaleza","Manaus","Curitiba","Recife","Porto Alegre","Belo Horizonte"],
  "Chile":     ["Santiago","Valparaíso","Concepción","Antofagasta","Viña del Mar","Temuco","Rancagua","Talca"],
  "Colombia":  ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira"],
  "Ecuador":   ["Quito","Guayaquil","Cuenca","Manta","Ambato","Portoviejo","Machala"],
  "Paraguay":  ["Asunción","Ciudad del Este","Encarnación","Luque","San Lorenzo"],
  "Perú":      ["Lima","Arequipa","Trujillo","Cusco","Piura","Chiclayo","Iquitos"],
  "Uruguay":   ["Montevideo","Salto","Paysandú","Las Piedras","Rivera"],
  "Venezuela": ["Caracas","Maracaibo","Valencia","Barquisimeto","Maracay"],
};

export default function ConfiguracionDeEventoPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'nuevo';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    nombre: '',
    edicion: '',
    descripcion: '',
    fechaInicioEvento: '',
    fechaFinEvento: '',
    fechaInicioSolicitudes: '',
    fechaFinSolicitudes: '',
    duracionReunion: 20,
    tiempoEntreReuniones: 5,
    cantidadTotalMesasEvento: 50,
    capacidadPersonasPorMesa: 4,
    montoBaseIncripcionBolivianos: 500,
    cantidadParticipantesIncluidos: 2,
    costoParticipanteExtra: 100,
    urlImagenMapaRecinto: '',
    urlImagenCronogramaCharlas: '',
    urlLogoEvento: '',
    sobreElEvento: '',
    urlVideoEvento: '',
    pilaresEvento: '',
    correoContacto: '',
    telefonoContacto: '',
    enlaceFacebook: '',
    enlaceInstagram: '',
    enlaceLinkedIn: '',
    enlaceTiktok: '',
    ciudadEvento: '',
    paisEvento: '',
  });

  const [reglasQR, setReglasQR] = useState([
    { rangoDesde: 1, rangoHasta: 2, monto: 500, urlQR: '' }
  ]);
  const [horariosReunion, setHorariosReunion] = useState<DiaReunion[]>([]);

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const { modal, showModal, closeModal } = useModal();

  useEffect(() => {
    if (isNew) return;
    
    fetch(`${API}/admin/eventos/${params.id}`)
      .then(res => res.text())
      .then(text => text ? JSON.parse(text) : {})
      .then(data => {
        if (data && data.id) {
          const ini = new Date(data.fechaInicioEvento);
          const fin = new Date(data.fechaFinEvento);
          const legado = ini.getUTCHours() === 0 && ini.getUTCMinutes() === 0 && fin.getUTCHours() === 0 && fin.getTime() - ini.getTime() === 86400000;
          const fechaLegada = data.fechaInicioEvento?.substring(0, 10);
          setFormData({
            id: data.id,
            nombre: data.nombre || '',
            edicion: data.edicion || '',
            descripcion: data.descripcion || '',
            fechaInicioEvento: legado ? `${fechaLegada}T08:00` : fechaHoraBolivia(data.fechaInicioEvento),
            fechaFinEvento: legado ? `${fechaLegada}T18:00` : fechaHoraBolivia(data.fechaFinEvento),
            fechaInicioSolicitudes: data.fechaInicioSolicitudes ? fechaHoraBolivia(data.fechaInicioSolicitudes) : '',
            fechaFinSolicitudes: data.fechaFinSolicitudes ? fechaHoraBolivia(data.fechaFinSolicitudes) : '',
            duracionReunion: data.duracionReunion || 20,
            tiempoEntreReuniones: data.tiempoEntreReuniones || 5,
            cantidadTotalMesasEvento: data.cantidadTotalMesasEvento || 50,
            capacidadPersonasPorMesa: data.capacidadPersonasPorMesa || 4,
            montoBaseIncripcionBolivianos: Number(data.montoBaseIncripcionBolivianos) || 500,
            cantidadParticipantesIncluidos: data.cantidadParticipantesIncluidos || 2,
            costoParticipanteExtra: data.costoParticipanteExtra || 100,
            urlImagenMapaRecinto: data.urlImagenMapaRecinto || '',
            urlImagenCronogramaCharlas: data.urlImagenCronogramaCharlas || '',
            urlLogoEvento: data.urlLogoEvento || '',
            sobreElEvento: data.sobreElEvento || '',
            urlVideoEvento: data.urlVideoEvento || '',
            pilaresEvento: data.pilaresEvento || '',
            correoContacto: data.correoContacto || '',
            telefonoContacto: data.telefonoContacto || '',
            enlaceFacebook: data.enlaceFacebook || '',
            enlaceInstagram: data.enlaceInstagram || '',
            enlaceLinkedIn: data.enlaceLinkedIn || '',
            enlaceTiktok: data.enlaceTiktok || '',
            ciudadEvento: data.ciudadEvento || '',
            paisEvento: data.paisEvento || '',
          });
          try {
            const guardados = JSON.parse(data.horariosReunionJson || '[]');
            if (Array.isArray(guardados)) setHorariosReunion(guardados);
          } catch { setHorariosReunion([]); }
          if (data.eventoreglaqr && data.eventoreglaqr.length > 0) {
            setReglasQR(data.eventoreglaqr.map((r: any) => ({
              rangoDesde: r.rangoDesde,
              rangoHasta: r.rangoHasta,
              monto: Number(r.monto),
              urlQR: r.urlQR
            })));
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleQRChange = (index: number, field: string, value: any) => {
    const newRules = [...reglasQR];
    (newRules[index] as any)[field] = value;
    setReglasQR(newRules);
  };

  const addRule = () => {
    setReglasQR([...reglasQR, { rangoDesde: 1, rangoHasta: 1, monto: 0, urlQR: '' }]);
  };

  const removeRule = (index: number) => {
    if (reglasQR.length <= 1) {
      showModal('warning', 'Regla requerida', 'Debe existir al menos una regla QR de pago. No se puede eliminar la última.');
      return;
    }
    setReglasQR(reglasQR.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, index?: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingField(index !== undefined ? `${fieldName}-${index}` : fieldName);
    
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`${API}/admin/imagenes/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      
      if (data.url) {
        if (fieldName === 'urlQR' && index !== undefined) {
          const newRules = [...reglasQR];
          (newRules[index] as any).urlQR = data.url;
          setReglasQR(newRules);
        } else {
          setFormData(prev => ({ ...prev, [fieldName]: data.url }));
        }
      } else {
        showModal('error', 'Error de Carga', 'Respuesta inesperada al subir imagen.');
      }
    } catch (error) {
      showModal('error', 'Error de Carga', 'No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setUploadingField(null);
    }
  };


  const handleSave = async () => {
    if (!formData.nombre || !formData.fechaInicioEvento || !formData.fechaFinEvento) {
      showModal('warning', 'Campos Obligatorios', 'Por favor completa: Nombre del evento, Fecha de inicio y Fecha de fin.');
      return;
    }
    
    if (formData.duracionReunion <= 0 || formData.cantidadTotalMesasEvento <= 0) {
      showModal('warning', 'Datos Inválidos', 'La duración de reunión y la cantidad de mesas deben ser mayores a 0.');
      return;
    }

    const fechasEvento = fechasEntre(formData.fechaInicioEvento, formData.fechaFinEvento);
    const desdeDefault = formData.fechaInicioEvento.slice(11, 16) || '08:00';
    const hastaDefault = formData.fechaFinEvento.slice(11, 16) || '18:00';
    const porFecha = new Map(horariosReunion.map((dia) => [dia.fecha, dia]));
    const horariosNormalizados = fechasEvento.map((fecha) => porFecha.get(fecha) ?? {
      fecha, habilitado: true, rangos: [{ desde: desdeDefault, hasta: hastaDefault }],
    });
    if (horariosNormalizados.some((dia) => !dia.rangos.length || dia.rangos.some((r) => !r.desde || !r.hasta || r.desde >= r.hasta))) {
      showModal('warning', 'Horarios incompletos', 'Todos los días del evento deben tener al menos un rango de reuniones válido.');
      return;
    }
    setSaving(true);
    
    // Helper: convert empty strings to null for optional fields
    const orNull = (v: string) => (v === '' ? null : v);
    
    const payload: any = {
      nombre: formData.nombre,
      edicion: formData.edicion || '',
      descripcion: orNull(formData.descripcion),
      fechaInicioEvento: fechaHoraInputComoBolivia(formData.fechaInicioEvento) || new Date().toISOString(),
      fechaFinEvento: fechaHoraInputComoBolivia(formData.fechaFinEvento) || new Date().toISOString(),
      fechaInicioSolicitudes: fechaHoraInputComoBolivia(formData.fechaInicioSolicitudes),
      fechaFinSolicitudes: fechaHoraInputComoBolivia(formData.fechaFinSolicitudes),
      duracionReunion: Number(formData.duracionReunion),
      tiempoEntreReuniones: Number(formData.tiempoEntreReuniones),
      horariosReunion: horariosNormalizados,
      cantidadTotalMesasEvento: Number(formData.cantidadTotalMesasEvento),
      capacidadPersonasPorMesa: Number(formData.capacidadPersonasPorMesa),
      montoBaseIncripcionBolivianos: Number(formData.montoBaseIncripcionBolivianos),
      cantidadParticipantesIncluidos: Number(formData.cantidadParticipantesIncluidos),
      costoParticipanteExtra: Number(formData.costoParticipanteExtra),
      urlImagenMapaRecinto: orNull(formData.urlImagenMapaRecinto),
      urlImagenCronogramaCharlas: orNull(formData.urlImagenCronogramaCharlas),
      urlLogoEvento: orNull(formData.urlLogoEvento),
      sobreElEvento: orNull(formData.sobreElEvento),
      urlVideoEvento: orNull(formData.urlVideoEvento),
      pilaresEvento: orNull(formData.pilaresEvento),
      correoContacto: orNull(formData.correoContacto),
      telefonoContacto: orNull(formData.telefonoContacto),
      enlaceFacebook: orNull(formData.enlaceFacebook),
      enlaceInstagram: orNull(formData.enlaceInstagram),
      enlaceLinkedIn: orNull(formData.enlaceLinkedIn),
      enlaceTiktok: orNull(formData.enlaceTiktok),
      ciudadEvento: orNull(formData.ciudadEvento),
      paisEvento: orNull(formData.paisEvento),
      reglasQR: reglasQR.map(r => ({
        rangoDesde: Number(r.rangoDesde),
        rangoHasta: Number(r.rangoHasta),
        monto: Number(r.monto),
        urlQR: r.urlQR || '',
      })),
    };

    try {
      const url = isNew ? `${API}/admin/eventos` : `${API}/admin/eventos/${formData.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showModal('success', '¡Guardado!', 'El evento se guardó exitosamente.');
        setTimeout(() => router.push('/admin/eventos'), 1500);
      } else {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.message || 'Error desconocido del servidor.';
        showModal('error', 'Error al Guardar', msg);
      }
    } catch (err) {
      showModal('error', 'Sin Conexión', 'No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const diasReunion: DiaReunion[] = fechasEntre(formData.fechaInicioEvento, formData.fechaFinEvento).map((fecha) => {
    const existente = horariosReunion.find((dia) => dia.fecha === fecha);
    return existente ?? {
      fecha,
      habilitado: true,
      rangos: [{ desde: formData.fechaInicioEvento.slice(11, 16) || '08:00', hasta: formData.fechaFinEvento.slice(11, 16) || '18:00' }],
    };
  });

  const guardarDiasEnEstado = (dias: DiaReunion[]) => setHorariosReunion(dias.map((dia) => ({
    ...dia, rangos: dia.rangos.map((r) => ({ ...r })),
  })));

  const copiarPrimerDia = () => {
    if (!diasReunion.length) return;
    const rangos = diasReunion[0].rangos.map((r) => ({ ...r }));
    guardarDiasEnEstado(diasReunion.map((dia) => ({ ...dia, habilitado: true, rangos })));
    showModal('success', 'Horarios copiados', 'El horario del primer día se copió a todos los días. Puedes modificar cada fecha por separado.');
  };

  if (loading) {
    return <div className={styles.loader}>Cargando evento...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <div>
          <h1 className={styles.title}>{isNew ? 'Crear Nuevo Evento' : 'Editar Evento'}</h1>
          <p className={styles.subtitle}>Gestione los detalles y parámetros completos del evento en la base de datos.</p>
        </div>
        <button className={styles.backButton} onClick={() => router.push('/admin/eventos')}>Volver a la lista</button>
      </div>

      <div>
        {/* Información General */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <Info className={styles.icon} />
            <h2 className={styles.sectionTitle}>Información General</h2>
          </div>
          
          <div className={styles.grid + " " + styles.grid3Lg}>
            <div className={styles.colSpan2}>
              <label className={styles.label}>Nombre del evento *</label>
              <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={styles.input} placeholder="Rueda de Negocios" />
            </div>
            <div>
              <label className={styles.label}>Edición</label>
              <input type="text" name="edicion" value={formData.edicion} onChange={handleChange} className={styles.input} placeholder="Ej. 2026" />
            </div>
            <div className={styles.colSpanAll}>
              <label className={styles.label}>Descripción General</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className={styles.input + " " + styles.textarea} placeholder="Añada detalles del evento..." />
            </div>

            <div>
              <label className={styles.label}>Inicio del evento (fecha y hora) *</label>
              <input required type="datetime-local" name="fechaInicioEvento" value={formData.fechaInicioEvento} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Fin del evento (fecha y hora) *</label>
              <input required type="datetime-local" name="fechaFinEvento" value={formData.fechaFinEvento} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Apertura de solicitudes de reunión</label>
              <input type="datetime-local" name="fechaInicioSolicitudes" value={formData.fechaInicioSolicitudes} onChange={handleChange} className={styles.input} />
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Opcional. Antes de esta fecha las empresas no podrán solicitar reuniones.</p>
            </div>
            <div>
              <label className={styles.label}>Cierre de solicitudes de reunión</label>
              <input type="datetime-local" name="fechaFinSolicitudes" value={formData.fechaFinSolicitudes} onChange={handleChange} className={styles.input} />
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Opcional. Después de esta fecha ya no se aceptarán nuevas solicitudes.</p>
            </div>
            <div>
              <label className={styles.label}>País del evento</label>
              <select
                name="paisEvento"
                value={formData.paisEvento}
                onChange={(e) => setFormData(prev => ({ ...prev, paisEvento: e.target.value, ciudadEvento: '' }))}
                className={styles.input}
              >
                <option value="">Selecciona un país</option>
                {Object.keys(SOUTH_AMERICA).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={styles.label}>Ciudad del evento</label>
              <select
                name="ciudadEvento"
                value={formData.ciudadEvento}
                onChange={handleChange}
                className={styles.input}
                disabled={!formData.paisEvento}
              >
                <option value="">{formData.paisEvento ? 'Selecciona una ciudad' : 'Selecciona un país primero'}</option>
                {(SOUTH_AMERICA[formData.paisEvento] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.imageRow}>
            <div className={styles.sectionHeader} style={{marginBottom: '0.5rem'}}>
              <ImageIcon className={styles.icon} />
              <h3 className={styles.sectionTitle} style={{fontSize: '1rem'}}>Imágenes y Mapas</h3>
            </div>
            <div className={styles.grid + " " + styles.grid2}>
              <div>
                <label className={styles.label}>Mapa del Recinto</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'urlImagenMapaRecinto')}
                  style={{display: 'none'}} 
                  id="upload-mapa"
                />
                <label htmlFor="upload-mapa" className={styles.uploadButton}>
                  <ImageIcon size={14} /> Subir Imagen
                </label>
                {formData.urlImagenMapaRecinto && (
                  <div onClick={() => setPreviewImg(formData.urlImagenMapaRecinto)} style={{marginTop: '0.5rem', width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer'}}>
                    <img src={formData.urlImagenMapaRecinto} alt="Mapa" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                  </div>
                )}
              </div>
              
              <div>
                <label className={styles.label}>Cronograma de Charlas</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'urlImagenCronogramaCharlas')}
                  style={{display: 'none'}} 
                  id="upload-cronograma"
                />
                <label htmlFor="upload-cronograma" className={styles.uploadButton}>
                  <ImageIcon size={14} /> Subir Imagen
                </label>
                {formData.urlImagenCronogramaCharlas && (
                  <div onClick={() => setPreviewImg(formData.urlImagenCronogramaCharlas)} style={{marginTop: '0.5rem', width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer'}}>
                    <img src={formData.urlImagenCronogramaCharlas} alt="Cronograma" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información Pública (Landing Page) */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <Info className={styles.icon} />
            <h2 className={styles.sectionTitle}>Información Pública (Landing Page)</h2>
          </div>
          
          <div className={styles.grid + " " + styles.grid3Lg} style={{marginBottom: '1.5rem'}}>
            <div>
              <label className={styles.label}>Correo de Contacto</label>
              <input type="email" name="correoContacto" value={formData.correoContacto} onChange={handleChange} className={styles.input} placeholder="info@ejemplo.com" />
            </div>
            <div>
              <label className={styles.label}>Teléfono/WhatsApp</label>
              <input type="text" name="telefonoContacto" value={formData.telefonoContacto} onChange={handleChange} className={styles.input} placeholder="+591 70000000" />
            </div>
            <div>
              <label className={styles.label}>Logo del Evento</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'urlLogoEvento')}
                style={{display: 'none'}} 
                id="upload-logo"
              />
              <label htmlFor="upload-logo" className={styles.uploadButton}>
                <ImageIcon size={14} /> Subir Imagen
              </label>
              {formData.urlLogoEvento && (
                <div onClick={() => setPreviewImg(formData.urlLogoEvento)} style={{marginTop: '0.5rem', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer'}}>
                  <img src={formData.urlLogoEvento} alt="Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.grid + " " + styles.grid3Lg}>
            <div>
              <label className={styles.label}>Enlace Facebook</label>
              <input type="text" name="enlaceFacebook" value={formData.enlaceFacebook} onChange={handleChange} className={styles.input} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className={styles.label}>Enlace Instagram</label>
              <input type="text" name="enlaceInstagram" value={formData.enlaceInstagram} onChange={handleChange} className={styles.input} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className={styles.label}>Enlace LinkedIn</label>
              <input type="text" name="enlaceLinkedIn" value={formData.enlaceLinkedIn} onChange={handleChange} className={styles.input} placeholder="https://linkedin.com/company/..." />
            </div>
          </div>

          <div className={styles.grid + " " + styles.grid3Lg} style={{marginTop: '1rem'}}>
            <div>
              <label className={styles.label}>Enlace TikTok</label>
              <input type="text" name="enlaceTiktok" value={formData.enlaceTiktok} onChange={handleChange} className={styles.input} placeholder="https://tiktok.com/@..." />
            </div>
            <div>
              <label className={styles.label}>Video &quot;¿Qué es la rueda?&quot;</label>
              <input type="text" name="urlVideoEvento" value={formData.urlVideoEvento} onChange={handleChange} className={styles.input} placeholder="https://youtube.com/..." />
            </div>
          </div>

          <div style={{marginTop: '1rem'}}>
            <label className={styles.label}>Sobre el Evento (Texto Pestaña)</label>
            <textarea name="sobreElEvento" value={formData.sobreElEvento} onChange={handleChange} className={styles.input + " " + styles.textarea} placeholder="Historia detallada, visión o texto largo para mostrar públicamente..." style={{height: '100px'}} />
          </div>

          <div style={{marginTop: '1rem'}}>
            <label className={styles.label}>Ejes del evento (uno por línea)</label>
            <textarea name="pilaresEvento" value={formData.pilaresEvento} onChange={handleChange} className={styles.input + " " + styles.textarea} placeholder={"Articulación Estratégica\nInternacionalización\nOportunidades de Negocio"} style={{height: '100px'}} />
          </div>
        </div>

        {/* Logística de Mesas */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <LayoutGrid className={styles.icon} />
            <h2 className={styles.sectionTitle}>Logística de Reuniones</h2>
          </div>
          <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid #dcfce7', borderRadius: '12px', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.875rem' }}>Horarios disponibles para reuniones *</p>
                <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '0.2rem' }}>Son independientes de la duración total del evento. Todos los días deben tener al menos un rango.</p>
              </div>
              <button type="button" onClick={copiarPrimerDia} className={styles.uploadButton} style={{ marginTop: 0 }}>Copiar primer día a todos</button>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {diasReunion.map((dia, diaIndex) => (
                <div key={dia.fecha} style={{ background: '#fff', border: '1px solid #d1fae5', borderRadius: '10px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                    {new Date(`${dia.fecha}T12:00:00`).toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {dia.rangos.map((rango, rangoIndex) => (
                      <div key={`${dia.fecha}-${rangoIndex}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input type="time" value={rango.desde} className={styles.input} style={{ flex: '1 1 130px' }}
                          onChange={(e) => guardarDiasEnEstado(diasReunion.map((d, i) => i === diaIndex ? { ...d, rangos: d.rangos.map((r, j) => j === rangoIndex ? { ...r, desde: e.target.value } : r) } : d))} />
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>hasta</span>
                        <input type="time" value={rango.hasta} className={styles.input} style={{ flex: '1 1 130px' }}
                          onChange={(e) => guardarDiasEnEstado(diasReunion.map((d, i) => i === diaIndex ? { ...d, rangos: d.rangos.map((r, j) => j === rangoIndex ? { ...r, hasta: e.target.value } : r) } : d))} />
                        {dia.rangos.length > 1 && (
                          <button type="button" onClick={() => guardarDiasEnEstado(diasReunion.map((d, i) => i === diaIndex ? { ...d, rangos: d.rangos.filter((_, j) => j !== rangoIndex) } : d))}
                            style={{ color: '#dc2626', padding: '0.4rem' }} aria-label="Eliminar rango"><Trash2 size={16} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => guardarDiasEnEstado(diasReunion.map((d, i) => i === diaIndex ? { ...d, rangos: [...d.rangos, { desde: '', hasta: '' }] } : d))}
                    style={{ color: '#449D3A', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.6rem' }}>+ Agregar rango</button>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.grid + " " + styles.grid4Lg}>
            <div>
              <label className={styles.label}>Mesas Totales</label>
              <input type="number" name="cantidadTotalMesasEvento" value={formData.cantidadTotalMesasEvento} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Capacidad por mesa</label>
              <input type="number" name="capacidadPersonasPorMesa" value={formData.capacidadPersonasPorMesa} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Duración reunión (min)</label>
              <input type="number" name="duracionReunion" value={formData.duracionReunion} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Pausa entre citas (min)</label>
              <input type="number" name="tiempoEntreReuniones" value={formData.tiempoEntreReuniones} onChange={handleChange} className={styles.input} />
            </div>
          </div>
        </div>

        {/* Pagos y Tarifas */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <CreditCard className={styles.icon} />
            <h2 className={styles.sectionTitle}>Pagos y Tarifas</h2>
          </div>
          <div className={styles.grid + " " + styles.grid3Lg}>
            <div>
              <label className={styles.label}>Monto base (Bs.)</label>
              <input type="number" name="montoBaseIncripcionBolivianos" value={formData.montoBaseIncripcionBolivianos} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Participantes incluidos</label>
              <input type="number" name="cantidadParticipantesIncluidos" value={formData.cantidadParticipantesIncluidos} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Participante extra (Bs.)</label>
              <input type="number" name="costoParticipanteExtra" value={formData.costoParticipanteExtra} onChange={handleChange} className={styles.input} />
            </div>
          </div>
        </div>

        {/* Configuración de QR */}
        <div className={styles.formSection}>
          <div className={styles.qrContainer}>
            <div className={styles.sectionHeader} style={{marginBottom: 0}}>
              <QrCode className={styles.icon} />
              <h2 className={styles.sectionTitle}>Reglas QR de Pago</h2>
            </div>
            <button onClick={addRule} className={styles.uploadButton} style={{marginTop: 0}}>
              <Plus size={14} /> Agregar Regla
            </button>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{width: '30%'}}>Rango participantes</th>
                  <th className={styles.th} style={{width: '25%'}}>Monto (Bs.)</th>
                  <th className={styles.th} style={{width: '35%'}}>Imagen QR</th>
                  <th className={styles.th} style={{textAlign: 'right'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reglasQR.map((regla, index) => (
                  <tr key={index}>
                    <td className={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <input type="number" value={regla.rangoDesde} onChange={(e) => handleQRChange(index, 'rangoDesde', Number(e.target.value))} className={styles.input} style={{width: '4rem', padding: '0.5rem'}} />
                        <span style={{fontSize: '0.75rem', color: '#6b7280'}}>a</span>
                        <input type="number" value={regla.rangoHasta} onChange={(e) => handleQRChange(index, 'rangoHasta', Number(e.target.value))} className={styles.input} style={{width: '4rem', padding: '0.5rem'}} />
                      </div>
                    </td>
                    <td className={styles.td}>
                      <input type="number" value={regla.monto} onChange={(e) => handleQRChange(index, 'monto', Number(e.target.value))} className={styles.input} style={{padding: '0.5rem'}} />
                    </td>
                    <td className={styles.td}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'urlQR', index)}
                        style={{display: 'none'}} 
                        id={`upload-qr-${index}`}
                      />
                      <label htmlFor={`upload-qr-${index}`} className={styles.uploadButton} style={{marginTop: 0}}>
                        <QrCode size={14} /> Subir QR
                      </label>
                      {regla.urlQR && (
                        <div onClick={() => setPreviewImg(regla.urlQR)} style={{marginTop: '0.25rem', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee', backgroundColor: 'white', cursor: 'pointer'}}>
                          <img src={regla.urlQR} alt="QR" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                        </div>
                      )}
                    </td>
                    <td className={styles.td} style={{textAlign: 'right'}}>
                      <button onClick={() => removeRule(index)} className={styles.deleteButton}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.bottomActionArea}>
          <button className={styles.cancelAction} onClick={() => router.push('/admin/eventos')}>Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className={styles.saveAction}
          >
            <Save size={16} /> {saving ? "Procesando..." : "Guardar Evento"}
          </button>
        </div>

      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
      />

      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out',
          }}
        >
          <img
            src={previewImg}
            alt="Vista previa"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}
    </div>
  );
}
