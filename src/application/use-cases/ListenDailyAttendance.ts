import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { AttendanceWithWorker } from "../../domain/models/User";

export class ListenDailyAttendances {
  private attendanceRepo: AttendanceRepository;

  constructor(attendanceRepo: AttendanceRepository) {
    this.attendanceRepo = attendanceRepo;
  }

  execute(
    dateRange: { start: string; end: string }, // 🌟 AHORA RECIBE EL RANGO
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void {
    // LLama al nuevo método del repositorio
    return this.attendanceRepo.listenToAttendancesByDateRange(
      dateRange.start,
      dateRange.end,
      callback,
    );
  }
}
