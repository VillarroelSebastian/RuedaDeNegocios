import type { Role } from '../../../../shared/domain/role.js';

export interface UserAccountProps {
  id: number;
  email: string;
  /** Either a bcrypt hash or, for accounts never migrated, a plaintext value. */
  storedPassword: string;
  role: Role;
  assignedEventId: number | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string;
  urlFotoPerfil: string;
}

const BCRYPT_PREFIX = /^\$2[aby]\$/;

export class UserAccount {
  constructor(private readonly props: UserAccountProps) {}

  get id(): number {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get storedPassword(): string {
    return this.props.storedPassword;
  }
  get role(): Role {
    return this.props.role;
  }
  get assignedEventId(): number | null {
    return this.props.assignedEventId;
  }
  get nombres(): string {
    return this.props.nombres;
  }
  get apellidoPaterno(): string {
    return this.props.apellidoPaterno;
  }
  get apellidoMaterno(): string | null {
    return this.props.apellidoMaterno;
  }
  get telefono(): string {
    return this.props.telefono;
  }
  get urlFotoPerfil(): string {
    return this.props.urlFotoPerfil;
  }

  /**
   * Accounts created before hashing was introduced still store the password in
   * plaintext. Login verifies them literally and re-hashes on the spot.
   */
  hasLegacyPlaintextPassword(): boolean {
    return !BCRYPT_PREFIX.test(this.props.storedPassword);
  }

  /** Applies the per-event identity overrides stored on `empresa_usuario`. */
  withEventIdentity(overrides: {
    nombres?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    telefono?: string | null;
  }): UserAccount {
    return new UserAccount({
      ...this.props,
      nombres: overrides.nombres || this.props.nombres,
      apellidoPaterno: overrides.apellidoPaterno || this.props.apellidoPaterno,
      apellidoMaterno: overrides.apellidoMaterno ?? this.props.apellidoMaterno,
      telefono: overrides.telefono || this.props.telefono,
    });
  }

  withoutAssignedEvent(): UserAccount {
    return new UserAccount({ ...this.props, assignedEventId: null });
  }
}
