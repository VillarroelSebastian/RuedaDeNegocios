import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/domain.error.js';
import { FakePasswordHasher, FixedClock } from '../../../auth/test-doubles.js';
import { FixedTemporaryPassword } from '../../../registro/test-doubles.js';
import {
  EVENT,
  FakeStaffCredentialsNotifier,
  FakeStaffRepository,
  type FakeStaffOptions,
  TECHNICIAN_ID,
  USER_ID,
  buildProfile,
  buildTechnicianBody,
} from '../../test-doubles.js';
import {
  CreateTechnicianUseCase,
  DeleteTechnicianUseCase,
  ListTechniciansUseCase,
  ResendTechnicianCredentialsUseCase,
  UpdateTechnicianUseCase,
} from './manage-technicians.use-cases.js';
import {
  GetOwnProfileUseCase,
  UpdateOwnProfileUseCase,
} from './own-profile.use-cases.js';

const NOW = new Date('2026-11-10T12:00:00.000Z');

function build(options: FakeStaffOptions = {}) {
  const repository = new FakeStaffRepository(options);
  const notifier = new FakeStaffCredentialsNotifier();
  const hasher = new FakePasswordHasher();
  const passwords = new FixedTemporaryPassword();
  const clock = new FixedClock(NOW);

  return {
    repository,
    notifier,
    list: new ListTechniciansUseCase(repository),
    create: new CreateTechnicianUseCase(repository, hasher, passwords, notifier, clock),
    update: new UpdateTechnicianUseCase(repository),
    remove: new DeleteTechnicianUseCase(repository),
    resend: new ResendTechnicianCredentialsUseCase(repository, hasher, passwords, notifier, clock),
    profile: new GetOwnProfileUseCase(repository),
    editProfile: new UpdateOwnProfileUseCase(repository, hasher, passwords, notifier),
  };
}

describe('CreateTechnicianUseCase', () => {
  it('registers the technician and mails their password', async () => {
    const { create, repository, notifier } = build();

    const created = await create.execute(buildTechnicianBody());

    expect(repository.created).toHaveLength(1);
    expect(notifier.technicians[0]?.contraseniaTemporal).toBe('Temp123456');
    expect(notifier.technicians[0]?.eventoNombre).toBe(EVENT.nombre);
    expect(created.correoEnviado).toBe(true);
    expect(created.reactivado).toBe(false);
  });

  it('hashes the password it stores', async () => {
    const { create, repository } = build();

    await create.execute(buildTechnicianBody());

    expect(repository.created[0]?.hashedPassword).not.toBe('Temp123456');
  });

  /** One account keeps one history, so a technician removed earlier comes back. */
  it('brings back a technician that was removed earlier', async () => {
    const { create, repository } = build({ deactivated: { id: 42 } });

    const created = await create.execute(buildTechnicianBody());

    expect(repository.reactivated[0]?.technicianId).toBe(42);
    expect(repository.created).toEqual([]);
    expect(created.reactivado).toBe(true);
  });

  it('records that the email went out', async () => {
    const { create, repository } = build();

    await create.execute(buildTechnicianBody());

    expect(repository.deliveries[0]?.delivery.estadoUltimoEnvioCredenciales).toBe('ENVIADO');
  });

  /** The account is already created; the staff needs to know the email failed. */
  it('keeps the technician and records the failure when the email does not go out', async () => {
    const { create, notifier, repository } = build();
    notifier.fails = true;

    const created = await create.execute(buildTechnicianBody());

    expect(created.correoEnviado).toBe(false);
    expect(repository.deliveries[0]?.delivery.estadoUltimoEnvioCredenciales).toBe('FALLIDO');
    expect(repository.deliveries[0]?.delivery.errorUltimoEnvioCredenciales).toBe(
      'mail server down',
    );
  });

  it('refuses an address that belongs to somebody of another role', async () => {
    const { create } = build({ emailClash: 'OTRO_ROL' });

    await expect(create.execute(buildTechnicianBody())).rejects.toThrow(
      'El correo pertenece a un usuario registrado y no puede utilizarse para un técnico.',
    );
  });

  it('refuses an address another active technician already uses', async () => {
    const { create } = build({ emailClash: 'TECNICO_ACTIVO' });

    await expect(create.execute(buildTechnicianBody())).rejects.toThrow(
      'Ya existe un técnico activo con ese correo.',
    );
  });

  it('refuses a phone somebody else already uses', async () => {
    const { create } = build({ phoneTaken: true });

    await expect(create.execute(buildTechnicianBody())).rejects.toThrow(
      'Ya existe un usuario con ese telefono',
    );
  });

  it('refuses an address that is not one', async () => {
    const { create } = build();

    await expect(
      create.execute(buildTechnicianBody({ correo: 'ana@test' })),
    ).rejects.toThrow(ValidationError);
  });
});

describe('UpdateTechnicianUseCase', () => {
  it('rewrites the technician', async () => {
    const { update, repository } = build();

    await update.execute(TECHNICIAN_ID, buildTechnicianBody({ nombres: 'Ana María' }));

    expect(repository.updated[0]?.account.nombres).toBe('Ana María');
  });

  it('never changes the password on the way', async () => {
    const { update, repository } = build();

    await update.execute(TECHNICIAN_ID, buildTechnicianBody());

    expect(repository.passwords).toEqual([]);
  });

  it('refuses a technician that is not there', async () => {
    const { update } = build({ technician: null });

    await expect(update.execute(404, buildTechnicianBody())).rejects.toThrow(NotFoundError);
  });
});

describe('DeleteTechnicianUseCase', () => {
  it('retires the technician instead of erasing them', async () => {
    const { remove, repository } = build();

    await remove.execute(TECHNICIAN_ID);

    expect(repository.deactivatedIds).toEqual([TECHNICIAN_ID]);
  });

  it('refuses a technician that is not there', async () => {
    const { remove } = build({ technician: null });

    await expect(remove.execute(404)).rejects.toThrow('Técnico activo no encontrado.');
  });
});

describe('ResendTechnicianCredentialsUseCase', () => {
  it('mints a new password and mails it', async () => {
    const { resend, repository, notifier } = build();

    await resend.execute(TECHNICIAN_ID);

    expect(repository.passwords).toHaveLength(1);
    expect(notifier.technicians[0]?.contraseniaTemporal).toBe('Temp123456');
    expect(repository.deliveries[0]?.delivery.estadoUltimoEnvioCredenciales).toBe('ENVIADO');
  });

  /**
   * A technician locked out by a mail server that happened to be down is worse
   * than one whose password was never rotated.
   */
  it('puts the previous password back when the email does not go out', async () => {
    const { resend, repository, notifier } = build();
    notifier.fails = true;

    await expect(resend.execute(TECHNICIAN_ID)).rejects.toThrow(
      'No se pudo enviar el correo. La contraseña anterior continúa vigente.',
    );

    expect(repository.passwords).toHaveLength(2);
    expect(repository.passwords[1]?.hashedPassword).toBe('$2b$10$previous');
    expect(repository.deliveries[0]?.delivery.estadoUltimoEnvioCredenciales).toBe('FALLIDO');
  });

  it('refuses a technician that is not there', async () => {
    const { resend } = build({ technician: null });

    await expect(resend.execute(404)).rejects.toThrow(NotFoundError);
  });
});

describe('GetOwnProfileUseCase', () => {
  it('hands back the caller own profile', async () => {
    const { profile } = build();

    expect((await profile.execute(USER_ID)).correo).toBe('ana@test.com');
  });

  it('refuses a user that is not there', async () => {
    const { profile } = build({ profile: null });

    await expect(profile.execute(404)).rejects.toThrow('Usuario no encontrado');
  });
});

describe('UpdateOwnProfileUseCase', () => {
  it('saves what the request named and keeps the rest', async () => {
    const { editProfile, repository } = build();

    const updated = await editProfile.execute(USER_ID, { nombres: 'Ana María' });

    expect(repository.profiles[0]?.profile.nombres).toBe('Ana María');
    expect(repository.profiles[0]?.profile.apellidoPaterno).toBe('Perez');
    expect(updated.credencialesEnviadas).toBe(false);
  });

  it('never changes the password when the address stays the same', async () => {
    const { editProfile, repository } = build();

    await editProfile.execute(USER_ID, { nombres: 'Ana María' });

    expect(repository.profiles[0]?.profile.hashedPassword).toBeUndefined();
  });

  /** Otherwise somebody who typed the wrong address locks themselves out. */
  it('resets the password and mails it to the new address', async () => {
    const { editProfile, repository, notifier } = build();

    const updated = await editProfile.execute(USER_ID, {
      correo: 'otra@test.com',
      confirmarResetCorreo: true,
    });

    expect(repository.profiles[0]?.profile.hashedPassword).toBeDefined();
    expect(notifier.resets[0]?.correo).toBe('otra@test.com');
    expect(updated.credencialesEnviadas).toBe(true);
  });

  it('asks for confirmation before changing the address', async () => {
    const { editProfile } = build();

    await expect(editProfile.execute(USER_ID, { correo: 'otra@test.com' })).rejects.toThrow(
      'Confirma que deseas cambiar el correo y reiniciar la contraseña por seguridad.',
    );
  });

  it('refuses an address another account already uses', async () => {
    const { editProfile } = build({ emailClash: 'TECNICO_ACTIVO' });

    await expect(
      editProfile.execute(USER_ID, { correo: 'otra@test.com', confirmarResetCorreo: true }),
    ).rejects.toThrow(ConflictError);
  });

  it('refuses emptying a name', async () => {
    const { editProfile } = build({ profile: buildProfile() });

    await expect(editProfile.execute(USER_ID, { nombres: '  ' })).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('ListTechniciansUseCase', () => {
  it('hands back the active technicians', async () => {
    const { list } = build();

    expect(await list.execute()).toHaveLength(1);
  });
});
