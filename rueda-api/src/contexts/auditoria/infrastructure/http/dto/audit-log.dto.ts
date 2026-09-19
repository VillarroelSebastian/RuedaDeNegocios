import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Only the shape is checked here. The bounds of the page — the default size and
 * the cap that keeps one request from pulling the whole trail — live in the
 * use case.
 */
export class ListAuditLogQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) usuarioId?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) limit?: number;
}
