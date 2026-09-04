export type UserRole = "ADMIN" | "WORKER" | "SCANNER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeNumber: string;
  phone?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  shiftId?: string;
  shiftName?: string;
  badgeId?: string;
}

/**
 * Why a check-in happened outside the worker's schedule. The entry is still
 * recorded — the flag exists so the admin can see it needs attention.
 */
export type ScheduleAnomalyCode =
  | "NO_SHIFT_ASSIGNED"
  | "SHIFT_NOT_FOUND"
  | "REST_DAY"
  | "NO_BLOCKS_CONFIGURED";

export interface ScheduleAnomaly {
  code: ScheduleAnomalyCode;
  /** Extra context for the UI, e.g. the day name for REST_DAY. */
  detail?: string;
}

export interface WorkPeriod {
  checkIn: Date;
  checkOut?: Date;
  isLate?: boolean;
  isAbsent?: boolean;
  anomaly?: ScheduleAnomaly;
}

export type AttendanceStatus =
  | "PRESENT"
  | "COMPLETED"
  | "ABSENT"
  | "VACATION"
  | "SICK_LEAVE"
  | "HOLIDAY";

export interface Attendance {
  id: string;
  userId: string;
  employeeNumber: string;
  date: string;
  periods: WorkPeriod[];
  status: AttendanceStatus;
}

export interface AttendanceWithWorker extends Attendance {
  workerName: string;
}
