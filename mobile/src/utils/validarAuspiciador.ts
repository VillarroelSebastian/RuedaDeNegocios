type Formulario = { nombreEmpresa: string; descripcion: string; tipoAporte: string; montoAporte: string; detalleAporte: string; cantidadIngresos: number };
type Persona = { nombres?: string; apellidoPaterno?: string; apellidoMaterno?: string; cargo: string; correo: string; telefono: string };

export function validarAuspiciador(form: Formulario, personas: Persona[]): string | null {
  if (!form.nombreEmpresa.trim() || form.nombreEmpresa.trim().length > 155) return 'Escribe el nombre de la empresa (hasta 155 caracteres).';
  if (!form.descripcion.trim() || form.descripcion.trim().length > 1000) return 'Escribe una descripcion de hasta 1000 caracteres.';
  if (!['DINERO', 'INSUMOS', 'AMBOS'].includes(form.tipoAporte)) return 'Selecciona un tipo de aporte valido.';
  if (form.tipoAporte !== 'INSUMOS') {
    const monto = Number(form.montoAporte);
    if (!/^\d+(\.\d{1,2})?$/.test(form.montoAporte.trim()) || !Number.isFinite(monto) || monto <= 0 || monto > 99999999.99)
      return 'El monto debe estar entre 0.01 y 99999999.99, con hasta dos decimales.';
  }
  if (form.tipoAporte !== 'DINERO' && (!form.detalleAporte.trim() || form.detalleAporte.trim().length > 505)) return 'Describe los insumos aportados (hasta 505 caracteres).';
  if (!Number.isInteger(form.cantidadIngresos) || form.cantidadIngresos < 1 || form.cantidadIngresos > 50 || personas.length !== form.cantidadIngresos) return 'Registra entre 1 y 50 personas, una por credencial.';
  const correos = new Set<string>();
  for (const [i, p] of personas.entries()) {
    const prefijo = `Persona ${i + 1}: `;
    const nombre = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].map(v => (v || '').trim()).filter(Boolean).join(' ');
    if (!p.nombres?.trim() || !p.apellidoPaterno?.trim()) return prefijo + 'completa nombres y apellido paterno.';
    if (nombre.length > 155 || !/^[\p{L}\p{M} .'-]+$/u.test(nombre)) return prefijo + 'usa nombres y apellidos sin numeros (hasta 155 caracteres en total).';
    if (!p.cargo.trim() || p.cargo.trim().length > 105) return prefijo + 'escribe el cargo (hasta 105 caracteres).';
    const correo = p.correo.trim().toLowerCase();
    if (correo.length > 105 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(correo)) return prefijo + 'escribe un correo valido (hasta 105 caracteres).';
    if (correos.has(correo)) return prefijo + 'el correo esta repetido en otra persona.';
    correos.add(correo);
    const telefono = p.telefono.trim(), digitos = telefono.replace(/\D/g, '');
    if (telefono.length > 45 || !/^\+?[0-9 ()-]+$/.test(telefono) || digitos.length < 7 || digitos.length > 15) return prefijo + 'el telefono debe contener entre 7 y 15 digitos.';
  }
  return null;
}
