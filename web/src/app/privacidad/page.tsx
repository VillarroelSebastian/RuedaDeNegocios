"use client";

import React from "react";
import Link from "next/link";
import PaginaLegal, { useContactoEvento } from "@/components/PaginaLegal";

export default function PrivacidadPage() {
  const c = useContactoEvento();
  const contacto = c.correo ? <a href={`mailto:${c.correo}`} className="font-semibold text-[#449D3A] hover:underline">{c.correo}</a> : "el equipo organizador del evento";
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="octubre de 2026">
      <section>
        <p>
          Esta política explica cómo la plataforma y la aplicación móvil de <b>{c.nombre}</b> (en adelante, “la plataforma”)
          recopilan, usan y protegen tus datos personales. La plataforma es operada por el equipo organizador del evento
          (Universidad Privada del Valle). Para cualquier consulta escribe a {contacto}.
        </p>
      </section>

      <section>
        <h2>1. Datos que recopilamos</h2>
        <ul>
          <li><b>Datos de cuenta:</b> nombres, apellidos, correo electrónico, teléfono y contraseña (almacenada cifrada).</li>
          <li><b>Datos de la empresa participante:</b> nombre, rubro, ciudad y país, descripción, oferta y demanda comercial, sitio web, redes y logotipo.</li>
          <li><b>Datos de inscripción y pago:</b> paquete elegido, cantidad de participantes y comprobantes de pago que subes (imagen o PDF).</li>
          <li><b>Actividad en el evento:</b> solicitudes y reuniones, mesas asignadas, evaluaciones, mensajes con otras empresas o con el equipo del evento, y asistencia registrada mediante la credencial QR.</li>
          <li><b>Fotos y archivos</b> que decides subir (foto de perfil, logotipo, comprobantes).</li>
          <li><b>Datos técnicos:</b> identificador del dispositivo para notificaciones push y registros de errores de la aplicación, que se usan solo para diagnóstico.</li>
        </ul>
      </section>

      <section>
        <h2>2. Para qué los usamos</h2>
        <ul>
          <li>Crear y gestionar tu cuenta y tu inscripción al evento.</li>
          <li>Verificar pagos y habilitar tu acceso.</li>
          <li>Permitir que las empresas se conozcan, soliciten reuniones, se asignen mesas y se evalúen los resultados.</li>
          <li>Enviarte avisos del evento: reuniones, solicitudes, mensajes, comunicados y cambios de horario.</li>
          <li>Controlar la asistencia con la credencial QR y generar estadísticas del evento.</li>
          <li>Guardar los datos de las empresas participantes para contactarlas e invitarlas a futuras ediciones de la Rueda de Negocios.</li>
          <li>Mantener la seguridad de la plataforma y corregir fallos.</li>
        </ul>
        <p className="mt-2">No vendemos tus datos, no mostramos publicidad y no usamos herramientas de analítica o seguimiento de terceros.</p>
      </section>

      <section>
        <h2>3. Con quién se comparten</h2>
        <ul>
          <li><b>Otras empresas participantes:</b> ven el perfil comercial de tu empresa (nombre, rubro, descripción, oferta, demanda y datos de contacto que tú completes) y el nombre del encargado en las reuniones que agendes.</li>
          <li><b>El equipo del evento</b> (administradores y técnicos): accede a los datos necesarios para organizar el evento y atender a los participantes.</li>
          <li><b>Proveedores de servicio</b> que permiten operar la plataforma: alojamiento del servidor, envío de correos y entrega de notificaciones push (Google/Expo). Solo reciben lo estrictamente necesario para prestar ese servicio.</li>
          <li>Autoridades, cuando una norma legal lo exija.</li>
        </ul>
      </section>

      <section>
        <h2>4. Permisos de la aplicación móvil</h2>
        <ul>
          <li><b>Cámara:</b> para escanear credenciales QR (equipo técnico) y tomar fotos cuando lo eliges. No grabamos audio ni video.</li>
          <li><b>Fotos:</b> solo las imágenes que seleccionas expresamente, mediante el selector del sistema.</li>
          <li><b>Notificaciones:</b> para avisarte de reuniones, solicitudes y mensajes. Puedes desactivarlas en los ajustes del dispositivo.</li>
        </ul>
      </section>

      <section>
        <h2>5. Conservación y eliminación</h2>
        <p>
          Usamos tus datos únicamente para organizar el evento y los guardamos para futuras ediciones de la Rueda de Negocios, así como para el historial del evento
          (pagos, reuniones y resultados). Puedes eliminar tu cuenta en cualquier momento desde la aplicación
          (<i>Perfil › Eliminar mi cuenta</i>) o desde la web; consulta <Link href="/eliminar-cuenta" className="font-semibold text-[#449D3A] hover:underline">cómo eliminar tu cuenta</Link>.
          Al hacerlo dejas de poder ingresar y se revocan tus dispositivos de notificaciones. Si además quieres que anonimicemos
          tus datos personales, solicítalo a {contacto}.
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes acceder, corregir (desde tu perfil), pedir la eliminación y oponerte al tratamiento de tus datos escribiendo a {contacto}.
          Responderemos en un plazo razonable.
        </p>
      </section>

      <section>
        <h2>7. Seguridad</h2>
        <p>
          Las comunicaciones usan conexión cifrada (HTTPS), las contraseñas se guardan cifradas, la sesión de la aplicación móvil se
          almacena en el almacenamiento seguro del dispositivo y el acceso a cada función depende del rol de la cuenta.
        </p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>La plataforma está dirigida a personas y empresas que participan en un evento de negocios; no está destinada a menores de edad.</p>
      </section>

      <section>
        <h2>9. Cambios en esta política</h2>
        <p>Si actualizamos esta política publicaremos la nueva versión en esta misma página con su fecha de actualización.</p>
      </section>
    </PaginaLegal>
  );
}
