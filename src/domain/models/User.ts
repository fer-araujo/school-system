export type UserRole = "ADMIN" | "WORKER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeNumber: string;
  phone?: string;
  department?: string;
  position?: string;
  shiftId?: string;
  shiftName?: string;
  isActive: boolean;
}

export interface WorkPeriod {
  checkIn: Date;
  checkOut?: Date;
  isLate?: boolean;
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
  date: string;
  periods: WorkPeriod[];
  status: AttendanceStatus;
}

export interface AttendanceWithWorker extends Attendance {
  workerName: string;
}
