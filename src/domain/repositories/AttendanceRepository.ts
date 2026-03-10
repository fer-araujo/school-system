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
  getAttendancesByDateRange(
    start: string,
    end: string,
  ): Promise<AttendanceWithWorker[]>;
  // NUEVO: Método para escuchar en tiempo real
  listenToAttendancesByDateRange(
    start: string,
    end: string,
    callback: (data: AttendanceWithWorker[]) => void,
  ): () => void;
}
