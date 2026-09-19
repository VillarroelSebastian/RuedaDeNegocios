import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * The company asking and the membership answering for it are never in the body:
 * both come from the caller's token.
 */
export class CreateMeetingRequestDto {
  @IsInt() @Min(1) @Type(() => Number) receptoraId!: number;

  @IsString() @IsNotEmpty() @MaxLength(55) tipo!: string;
  @IsString() @IsNotEmpty() inicio!: string;
  @IsString() @IsNotEmpty() fin!: string;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) mesaId?: number;
  @IsOptional() @IsString() @MaxLength(505) mensaje?: string;
}

export class EditMeetingRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(55) tipo!: string;
  @IsString() @IsNotEmpty() inicio!: string;
  @IsString() @IsNotEmpty() fin!: string;

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) mesaId?: number;
  @IsOptional() @IsString() @MaxLength(505) mensaje?: string;
}

export class RejectMeetingRequestDto {
  @IsOptional() @IsString() @MaxLength(505) motivo?: string;
}
