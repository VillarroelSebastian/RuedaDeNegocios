import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RepresentativeDto {
  @IsString() @IsNotEmpty() @MaxLength(155) nombreCompleto!: string;
  @IsOptional() @IsString() @MaxLength(105) cargo?: string;
  @IsString() @IsNotEmpty() @MaxLength(105) correo!: string;
}

/** A sponsor brings a delegation, not a crowd. */
const MAX_REPRESENTATIVES = 50;

/**
 * Only the shape is checked here. Which fields each kind of contribution needs,
 * and that the list of people matches the entries declared, live in the domain.
 */
export class SaveSponsorDto {
  @IsString() @IsNotEmpty() @MaxLength(155) nombreEmpresa!: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) descripcion!: string;
  @IsString() @IsNotEmpty() @MaxLength(20) tipoAporte!: string;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) montoAporte?: number;
  @IsOptional() @IsString() @MaxLength(505) detalleAporte?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) paqueteId?: number;

  @IsInt() @Min(1) @Type(() => Number) cantidadIngresos!: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Registra al menos una persona del auspiciador.' })
  @ArrayMaxSize(MAX_REPRESENTATIVES)
  @ValidateNested({ each: true })
  @Type(() => RepresentativeDto)
  personas!: RepresentativeDto[];
}

export class SponsorCredentialQueryDto {
  @IsString() @IsNotEmpty({ message: 'Credencial inválida o alterada' }) t!: string;
}

export class CheckSponsorCredentialQueryDto {
  @IsInt() @Min(1) @Type(() => Number) personaId!: number;
  @IsString() @IsNotEmpty({ message: 'Credencial inválida o alterada' }) token!: string;
}

export class RecordSponsorAttendanceDto {
  @IsInt() @Min(1) @Type(() => Number) personaId!: number;
  @IsString() @IsNotEmpty({ message: 'El código QR del auspiciador no es válido.' }) token!: string;
}
