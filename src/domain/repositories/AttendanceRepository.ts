import type { AttendanceWithWorker } from "../models/User";

export interface AttendanceRepository {
  recordScan(
    userId: string,
    employeeNumber: string,
    date: string,
    type: "ENTRY" | "EXIT",
    time: Date,
    isLate?: boolean,
    skippedBlocks?: number,
  ): Promise<void>;
  getAttendancesByDate(date: string): Promise<AttendanceWithWorker[]>;

  // NUEVO: Método para escuchar en tiempo real
  listenToAttendancesByDate(
    date: string,
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void;
}
