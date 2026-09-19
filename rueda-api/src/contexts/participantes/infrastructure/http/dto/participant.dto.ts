import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddParticipantDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(105)
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio.' })
  @MaxLength(65)
  apellidoPaterno!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(105)
  email!: string;

  @IsOptional() @IsString() @MaxLength(45) telefono?: string;
  @IsOptional() @IsString() @MaxLength(55) cargo?: string;
}

export class IssueTemporaryPasswordDto {
  /** Optional: when absent, the API mints one that satisfies the policy. */
  @IsOptional() @IsString() nuevaContrasenia?: string;
}
