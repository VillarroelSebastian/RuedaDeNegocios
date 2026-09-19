import { Module } from '@nestjs/common';
import { CredencialesModule } from '../credenciales/credenciales.module.js';
import { ATTENDANCE_REPORT_PORT } from '../reportes/application/ports/attendance-report.port.js';
import { CheckCredentialUseCase } from './application/use-cases/check-credential.use-case.js';
import { ListAttendanceUseCase } from './application/use-cases/list-attendance.use-case.js';
import { RecordAttendanceUseCase } from './application/use-cases/record-attendance.use-case.js';
import { ATTENDANCE_REPOSITORY } from './domain/ports/attendance.repository.port.js';
import { ReportsAttendanceAdapter } from './infrastructure/adapters/reports-attendance.adapter.js';
import { AttendanceController } from './infrastructure/http/attendance.controller.js';
import { PrismaAttendanceRepository } from './infrastructure/persistence/prisma-attendance.repository.js';

@Module({
  // Attendance reads badges through the credentials context rather than
  // querying them itself.
  imports: [CredencialesModule],
  controllers: [AttendanceController],
  providers: [
    RecordAttendanceUseCase,
    CheckCredentialUseCase,
    ListAttendanceUseCase,
    { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceRepository },
    // Who walked in is this context’s record, so the reports read it from here.
    { provide: ATTENDANCE_REPORT_PORT, useClass: ReportsAttendanceAdapter },
  ],
  exports: [ATTENDANCE_REPORT_PORT],
})
export class AsistenciasModule {}
