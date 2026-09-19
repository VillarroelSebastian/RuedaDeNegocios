import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTOs carry shape only. Business rules such as the password policy live in the
 * domain value objects, so they hold no matter which adapter calls the use case.
 */

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @MaxLength(105)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  newPassword!: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @MaxLength(105)
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @MaxLength(105)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  newPassword!: string;
}
