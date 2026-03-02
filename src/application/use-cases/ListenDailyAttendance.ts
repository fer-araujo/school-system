import type { AttendanceRepository } from "../../domain/repositories/AttendanceRepository";
import type { AttendanceWithWorker } from "../../domain/models/User";

export class ListenDailyAttendances {
  private attendanceRepo: AttendanceRepository;

  constructor(attendanceRepo: AttendanceRepository) {
    this.attendanceRepo = attendanceRepo;
  }

  execute(
    date: string,
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void {
    return this.attendanceRepo.listenToAttendancesByDate(date, callback);
  }
}
