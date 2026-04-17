"use client";

import React, { useState, useEffect } from 'react';
import { Info, LayoutGrid, CreditCard, QrCode, Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import styles from './ConfiguracionEvento.module.css';
import Modal, { useModal } from '@/components/ui/Modal';

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
    correoContacto: '',
    telefonoContacto: '',
    enlaceFacebook: '',
    enlaceInstagram: '',
    enlaceTwitterX: '',
  });

  const [reglasQR, setReglasQR] = useState([
    { rangoDesde: 1, rangoHasta: 2, monto: 500, urlQR: '' }
  ]);

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const { modal, showModal, closeModal } = useModal();

  useEffect(() => {
    if (isNew) return;
    
    fetch(`http://localhost:3334/admin/eventos/${params.id}`)
      .then(res => res.text())
      .then(text => text ? JSON.parse(text) : {})
      .then(data => {
        if (data && data.id) {
          setFormData({
            id: data.id,
            nombre: data.nombre || '',
            edicion: data.edicion || '',
            descripcion: data.descripcion || '',
            fechaInicioEvento: data.fechaInicioEvento ? new Date(data.fechaInicioEvento).toISOString().split('T')[0] : '',
            fechaFinEvento: data.fechaFinEvento ? new Date(data.fechaFinEvento).toISOString().split('T')[0] : '',
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
            correoContacto: data.correoContacto || '',
            telefonoContacto: data.telefonoContacto || '',
            enlaceFacebook: data.enlaceFacebook || '',
            enlaceInstagram: data.enlaceInstagram || '',
            enlaceTwitterX: data.enlaceTwitterX || '',
          });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    setReglasQR(reglasQR.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, index?: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingField(index !== undefined ? `${fieldName}-${index}` : fieldName);
    
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('http://localhost:3334/admin/imagenes/upload', {
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

    setSaving(true);
    
    // Helper: convert empty strings to null for optional fields
    const orNull = (v: string) => (v === '' ? null : v);
    
    const payload: any = {
      nombre: formData.nombre,
      edicion: formData.edicion || '',
      descripcion: orNull(formData.descripcion),
      fechaInicioEvento: formData.fechaInicioEvento ? new Date(formData.fechaInicioEvento).toISOString() : new Date().toISOString(),
      fechaFinEvento: formData.fechaFinEvento ? new Date(formData.fechaFinEvento).toISOString() : new Date().toISOString(),
      duracionReunion: Number(formData.duracionReunion),
      tiempoEntreReuniones: Number(formData.tiempoEntreReuniones),
      cantidadTotalMesasEvento: Number(formData.cantidadTotalMesasEvento),
      capacidadPersonasPorMesa: Number(formData.capacidadPersonasPorMesa),
      montoBaseIncripcionBolivianos: Number(formData.montoBaseIncripcionBolivianos),
      cantidadParticipantesIncluidos: Number(formData.cantidadParticipantesIncluidos),
      costoParticipanteExtra: Number(formData.costoParticipanteExtra),
      urlImagenMapaRecinto: orNull(formData.urlImagenMapaRecinto),
      urlImagenCronogramaCharlas: orNull(formData.urlImagenCronogramaCharlas),
      urlLogoEvento: orNull(formData.urlLogoEvento),
      sobreElEvento: orNull(formData.sobreElEvento),
      correoContacto: orNull(formData.correoContacto),
      telefonoContacto: orNull(formData.telefonoContacto),
      enlaceFacebook: orNull(formData.enlaceFacebook),
      enlaceInstagram: orNull(formData.enlaceInstagram),
      enlaceTwitterX: orNull(formData.enlaceTwitterX),
      reglasQR: reglasQR.map(r => ({
        rangoDesde: Number(r.rangoDesde),
        rangoHasta: Number(r.rangoHasta),
        monto: Number(r.monto),
        urlQR: r.urlQR || '',
      })),
    };

    try {
      const url = isNew ? 'http://localhost:3334/admin/eventos' : `http://localhost:3334/admin/eventos/${formData.id}`;
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
              <label className={styles.label}>Fecha Inicio *</label>
              <input required type="date" name="fechaInicioEvento" value={formData.fechaInicioEvento} onChange={handleChange} className={styles.input} />
            </div>
            <div>
              <label className={styles.label}>Fecha Fin *</label>
              <input required type="date" name="fechaFinEvento" value={formData.fechaFinEvento} onChange={handleChange} className={styles.input} />
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
                  <div style={{marginTop: '0.5rem', width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee'}}>
                    <img src={formData.urlImagenMapaRecinto} alt="Mapa" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
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
                  <div style={{marginTop: '0.5rem', width: '100px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee'}}>
                    <img src={formData.urlImagenCronogramaCharlas} alt="Cronograma" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
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
                <div style={{marginTop: '0.5rem', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee'}}>
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
              <label className={styles.label}>Enlace Twitter/X</label>
              <input type="text" name="enlaceTwitterX" value={formData.enlaceTwitterX} onChange={handleChange} className={styles.input} placeholder="https://x.com/..." />
            </div>
          </div>

          <div style={{marginTop: '1rem'}}>
            <label className={styles.label}>Sobre el Evento (Texto Pestaña)</label>
            <textarea name="sobreElEvento" value={formData.sobreElEvento} onChange={handleChange} className={styles.input + " " + styles.textarea} placeholder="Historia detallada, visión o texto largo para mostrar públicamente..." style={{height: '100px'}} />
          </div>
        </div>

        {/* Logística de Mesas */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <LayoutGrid className={styles.icon} />
            <h2 className={styles.sectionTitle}>Logística de Reuniones</h2>
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
                        <div style={{marginTop: '0.25rem', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #eee', backgroundColor: 'white'}}>
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
    </div>
  );
}
