import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Only the shape is checked here. The address, the phone and which roles count
 * as a technician live in the domain, which refuses them with the message the
 * administrator reads.
 */
export class SaveTechnicianDto {
  @IsString() @IsNotEmpty() @MaxLength(105) nombres!: string;
  @IsString() @IsNotEmpty() @MaxLength(65) apellidoPaterno!: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoMaterno?: string;

  @IsString() @IsNotEmpty() @MaxLength(105) correo!: string;
  @IsString() @IsNotEmpty() @MaxLength(45) telefono!: string;

  @IsOptional() @IsString() @MaxLength(505) urlFotoPerfil?: string;
  @IsOptional() @IsString() @MaxLength(45) rolEvento?: string;
}

/** Everything is optional: an edit only touches what it names. */
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(105) nombres?: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoPaterno?: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoMaterno?: string;
  @IsOptional() @IsString() @MaxLength(105) correo?: string;
  @IsOptional() @IsString() @MaxLength(45) telefono?: string;
  @IsOptional() @IsString() @MaxLength(505) urlFotoPerfil?: string;

  /** Changing the address resets the password, so it is confirmed first. */
  @IsOptional() @IsBoolean() confirmarResetCorreo?: boolean;
}
