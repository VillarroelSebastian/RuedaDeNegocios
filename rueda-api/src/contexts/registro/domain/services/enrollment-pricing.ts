import { ValidationError } from '../../../../shared/domain/errors/domain.error.js';

/** The registration package, as the event configured it. */
export interface RegistrationPackage {
  id: number;
  costo: number;
  credencialesIncluidas: number;
  tipoParticipacion: string;
}

export interface PricedEnrollment {
  paqueteId: number;
  /** Slots the company pays for, whether or not it fills them now. */
  numeroParticipantes: number;
  montoPagado: number;
  tipoParticipacion: string;
}

/**
 * A registration is always bought as a package, so the package alone decides
 * the price, the credentials and the modality — the client never sends any of
 * them. Extra credentials are not sold here: they are bought afterwards as a
 * top-up, once the company is already enrolled.
 */
export function priceEnrollment(
  registrationPackage: RegistrationPackage,
  rosterSize: number,
): PricedEnrollment {
  if (rosterSize > registrationPackage.credencialesIncluidas) {
    throw new ValidationError(
      `El paquete seleccionado incluye ${registrationPackage.credencialesIncluidas} credenciales y registraste ${rosterSize} participantes.`,
    );
  }

  return {
    paqueteId: registrationPackage.id,
    numeroParticipantes: registrationPackage.credencialesIncluidas,
    montoPagado: registrationPackage.costo,
    tipoParticipacion: registrationPackage.tipoParticipacion,
  };
}
