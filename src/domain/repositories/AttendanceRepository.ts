import type { AttendanceWithWorker, ScheduleAnomaly } from "../models/User";

/**
 * A single params object rather than positional arguments: with a boolean, a
 * number and an optional object trailing, a transposed argument would compile
 * cleanly and corrupt attendance data.
 */
export interface RecordScanInput {
  userId: string;
  employeeNumber: string;
  /** YYYY-MM-DD, local calendar date. */
  date: string;
  type: "ENTRY" | "EXIT";
  time: Date;
  isLate?: boolean;
  skippedBlocks?: number;
  /** Set when the entry happened outside the worker's schedule. */
  anomaly?: ScheduleAnomaly;
}

export interface AttendanceRepository {
  recordScan(input: RecordScanInput): Promise<void>;
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
