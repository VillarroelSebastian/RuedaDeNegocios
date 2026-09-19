import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RecordAttendanceDto {
  @IsInt() @Min(1) @Type(() => Number) companyUserId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El código QR no es válido.' })
  token!: string;
}

export class CheckCredentialQueryDto {
  @IsInt() @Min(1) @Type(() => Number) companyUserId!: number;

  @IsString()
  @IsNotEmpty({ message: 'El código QR no es válido.' })
  token!: string;
}

export class ListAttendanceQueryDto {
  /** When set, lists that company's scans instead of the caller's own. */
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) companyEventId?: number;
}
