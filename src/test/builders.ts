import type { Absence } from "../domain/models/Absence";
import type { Holiday } from "../domain/models/Holiday";
import type { Shift, ShiftAssignment } from "../domain/models/Shift";
import type { AttendanceWithWorker, User, WorkPeriod } from "../domain/models/User";

/**
 * Object mothers. Every builder returns a valid entity so a test only has to
 * state the one field it actually cares about.
 */

export function aUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "maestra@escuela.mx",
    fullName: "Adelina Gutierrez",
    role: "WORKER",
    employeeNumber: "7090",
    isActive: true,
    badgeId: "BADGE-7090",
    shiftId: "shift-morning",
    department: "Kinder 1A",
    ...overrides,
  };
}

/** Monday-to-Friday, 08:00-12:00 and 14:00-18:00, 10 minutes of tolerance. */
export function aShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: "shift-morning",
    name: "Maestras",
    workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    toleranceMinutes: 10,
    blocksByDay: {
      Lunes: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "18:00" },
      ],
      Martes: [{ start: "08:00", end: "12:00" }],
      Miércoles: [{ start: "08:00", end: "12:00" }],
      Jueves: [{ start: "08:00", end: "12:00" }],
      Viernes: [{ start: "08:00", end: "12:00" }],
    },
    ...overrides,
  };
}

export function anAssignment(
  overrides: Partial<ShiftAssignment> = {},
): ShiftAssignment {
  return {
    id: "assign_u1",
    userId: "u1",
    shiftId: "shift-morning",
    validFrom: "2026-01-01",
    ...overrides,
  };
}

export function anAttendance(
  overrides: Partial<AttendanceWithWorker> = {},
): AttendanceWithWorker {
  return {
    id: "u1_2026-03-02",
    userId: "u1",
    employeeNumber: "7090",
    date: "2026-03-02",
    periods: [],
    status: "PRESENT",
    workerName: "Adelina Gutierrez",
    ...overrides,
  };
}

export function aPeriod(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return {
    checkIn: new Date("2026-03-02T08:00:00"),
    ...overrides,
  };
}

export function anAbsence(overrides: Partial<Absence> = {}): Absence {
  return {
    id: "abs1",
    userId: "u1",
    type: "Vacaciones",
    startDate: "2026-03-02",
    endDate: "2026-03-02",
    notes: "",
    ...overrides,
  };
}

export function aHoliday(overrides: Partial<Holiday> = {}): Holiday {
  return {
    id: "hol_1",
    name: "Día del Trabajo",
    date: "2026-05-01",
    type: "Oficial (Ley)",
    ...overrides,
  };
}
