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

export interface WorkPeriod {
  checkIn: Date;
  checkOut?: Date;
  isLate?: boolean;
  isAbsent?: boolean;
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
