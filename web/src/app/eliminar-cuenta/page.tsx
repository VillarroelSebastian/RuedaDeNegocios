"use client";

import React from "react";
import Link from "next/link";
import PaginaLegal, { useContactoEvento } from "@/components/PaginaLegal";

export default function EliminarCuentaPage() {
  const c = useContactoEvento();
  const correo = c.correo
    ? <a href={`mailto:${c.correo}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta`} className="font-semibold text-[#449D3A] hover:underline">{c.correo}</a>
    : "el equipo organizador del evento";
  return (
    <PaginaLegal titulo="Eliminar mi cuenta" actualizado="octubre de 2026">
      <section>
        <p>
          Puedes pedir la eliminación de tu cuenta de <b>{c.nombre}</b> y de los datos asociados de cualquiera de estas formas:
        </p>
      </section>

      <section>
        <h2>Desde la aplicación o la web (recomendado)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Inicia sesión con tu cuenta.</li>
          <li>Entra a tu perfil (en el administrador: Configuración).</li>
          <li>Pulsa <b>Eliminar mi cuenta</b>, escribe tu contraseña y confirma.</li>
        </ol>
        <p className="mt-2">La baja es inmediata: la cuenta deja de poder ingresar y se desactivan tus dispositivos de notificaciones.</p>
      </section>

      <section>
        <h2>Si no puedes iniciar sesión</h2>
        <p>
          Escribe a {correo} <b>desde el correo con el que te registraste</b>, indicando tu nombre y la empresa. Gestionaremos la baja y te confirmaremos por el mismo medio.
        </p>
      </section>

      <section>
        <h2>Qué pasa con tus datos</h2>
        <ul>
          <li>Tu cuenta se desactiva y ya no podrás ingresar ni recibirás notificaciones.</li>
          <li>Los registros del evento en los que participaste (inscripción, pagos, reuniones y resultados) se conservan para el historial y la contabilidad del evento.</li>
          <li>Si además quieres que se anonimicen tus datos personales, indícalo en tu solicitud.</li>
          <li>Si eres el encargado de una empresa con otros participantes, primero hay que reasignar el encargado; contáctanos para hacerlo.</li>
        </ul>
      </section>

      <p>
        Más información en nuestra <Link href="/privacidad" className="font-semibold text-[#449D3A] hover:underline">política de privacidad</Link>.
      </p>
    </PaginaLegal>
  );
}
