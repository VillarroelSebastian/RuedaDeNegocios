import { Inject, Injectable } from '@nestjs/common';
import {
  type CityOption,
  REGISTRATION_REPOSITORY,
  type RegistrationRepositoryPort,
} from '../../domain/ports/registration.repository.port.js';

/** Places the registration form offers, so a company picks one instead of typing it. */
@Injectable()
export class ListRegistrationCitiesUseCase {
  constructor(
    @Inject(REGISTRATION_REPOSITORY) private readonly registrations: RegistrationRepositoryPort,
  ) {}

  execute(): Promise<CityOption[]> {
    return this.registrations.listCities();
  }
}
