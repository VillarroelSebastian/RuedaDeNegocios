import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { EXPORT_KINDS } from '../../../application/use-cases/export-report.use-case.js';

export class ExportReportQueryDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(EXPORT_KINDS, {
    message: 'tipo debe ser: empresas, reuniones, resultados, ranking o asistencia',
  })
  tipo!: string;
}

export class SearchEventQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}
