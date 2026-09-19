import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Only the shape is checked here. What a value may contain — the length of a
 * company name, a phone with too few digits, a roster larger than the package —
 * belongs to the domain, which refuses it with the message the company reads.
 */

export class CompanyRegistrationDto {
  @IsString() @IsNotEmpty() @MaxLength(55) nombre!: string;
  @IsString() @IsNotEmpty() @MaxLength(55) rubro!: string;
  @IsEmail({}, { message: 'El correo corporativo no es válido.' })
  @MaxLength(105)
  correoCorporativo!: string;
  @IsString() @IsNotEmpty() @MaxLength(45) telefonoWhatsapp!: string;

  @IsOptional() @IsString() @MaxLength(300) sitioWeb?: string;
  @IsOptional() @IsString() @MaxLength(1000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(500) oferta?: string;
  @IsOptional() @IsString() @MaxLength(500) demanda?: string;
  @IsOptional() @IsString() @MaxLength(600) interesesBusqueda?: string;
  @IsOptional() @IsString() @MaxLength(45) paisNombre?: string;
  @IsOptional() @IsString() @MaxLength(45) ciudadNombre?: string;
}

export class ParticipantRegistrationDto {
  @IsString() @IsNotEmpty() @MaxLength(105) nombres!: string;
  @IsString() @IsNotEmpty() @MaxLength(65) apellidoPaterno!: string;
  @IsOptional() @IsString() @MaxLength(65) apellidoMaterno?: string;

  @IsEmail({}, { message: 'El correo del participante no es válido.' })
  @MaxLength(105)
  correo!: string;

  @IsString() @IsNotEmpty() @MaxLength(45) telefono!: string;
  @IsOptional() @IsString() @MaxLength(55) cargo?: string;
  @IsOptional() @IsBoolean() esResponsable?: boolean;
}

/** A package never includes more than a handful of people. */
const MAX_ROSTER = 25;

export class RegisterCompanyDto {
  @ValidateNested()
  @Type(() => CompanyRegistrationDto)
  empresa!: CompanyRegistrationDto;

  @IsInt({ message: 'Debes elegir un paquete de inscripción.' })
  @Min(1)
  @Type(() => Number)
  paqueteId!: number;

  @IsOptional() @IsString() @MaxLength(505) urlComprobante?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debes registrar al menos un participante.' })
  @ArrayMaxSize(MAX_ROSTER)
  @ValidateNested({ each: true })
  @Type(() => ParticipantRegistrationDto)
  participantes!: ParticipantRegistrationDto[];
}

export class AvailabilityQueryDto {
  @IsOptional() @IsString() @MaxLength(105) correo?: string;
  @IsOptional() @IsString() @MaxLength(45) telefono?: string;
  @IsOptional() @IsString() @MaxLength(20) tipo?: string;
}

export class TrackingQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Enlace de seguimiento inválido.' })
  t!: string;
}

export class ResubmitReceiptDto {
  @IsString()
  @IsNotEmpty({ message: 'El comprobante es obligatorio.' })
  @MaxLength(505)
  urlComprobante!: string;
}
