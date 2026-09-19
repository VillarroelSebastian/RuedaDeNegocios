import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ListPaymentsQueryDto {
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
}

export class ObservationDto {
  @IsString()
  @IsNotEmpty({ message: 'La observación es obligatoria.' })
  observacion!: string;
}

export class RejectionDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio.' })
  motivo!: string;
}

export class TopUpRejectionDto {
  @IsOptional() @IsString() motivo?: string;
}

export class TopUpQuoteQueryDto {
  @IsInt() @Min(1) @Type(() => Number) cantidad!: number;
}

export class RequestTopUpDto {
  @IsInt() @Min(1) @Type(() => Number) cantidadParticipantes!: number;

  @IsString()
  @IsNotEmpty({ message: 'El comprobante es obligatorio.' })
  urlComprobante!: string;
}

export class ListTopUpsQueryDto {
  @IsOptional() @IsString() estado?: string;
}
