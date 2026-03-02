import type { AttendanceWithWorker } from "../models/User";

export interface AttendanceRepository {
  recordScan(
    userId: string,
    date: string,
    type: "ENTRY" | "EXIT",
    time: Date,
    isLate?: boolean,
  ): Promise<void>;
  getAttendancesByDate(date: string): Promise<AttendanceWithWorker[]>;

  // NUEVO: Método para escuchar en tiempo real
  listenToAttendancesByDate(
    date: string,
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void;
}
