import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { AttendanceWithWorker } from "../../domain/models/User";

export class GetDailyAttendances {
  private attendanceRepo: AttendanceRepository;

  constructor(attendanceRepo: AttendanceRepository) {
    this.attendanceRepo = attendanceRepo;
  }

  async execute(date: string): Promise<AttendanceWithWorker[]> {
    if (!date) throw new Error("La fecha es requerida");
    return await this.attendanceRepo.getAttendancesByDate(date);
  }
}
