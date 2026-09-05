import { vi } from "vitest";
import type { Absence } from "../domain/models/Absence";
import type { Holiday } from "../domain/models/Holiday";
import type { Shift, ShiftAssignment } from "../domain/models/Shift";
import type { AttendanceWithWorker, User } from "../domain/models/User";
import type { AbsenceRepository } from "../domain/repositories/AbsenceRepository";
import type { AttendanceRepository } from "../domain/repositories/AttendanceRepository";
import type { CalendarRepository } from "../domain/repositories/CalendarRepository";
import type { EmployeeRepository } from "../domain/repositories/EmployeeRepository";
import type { ShiftRepository } from "../domain/repositories/ShiftRepository";

/**
 * Fakes are object literals annotated with the port type, not classes.
 *
 * The annotation still gives compile-time conformance — add a method to a port
 * and every fake breaks at build time — while `vi.fn()` properties declare no
 * named parameters, so `noUnusedParameters` and `erasableSyntaxOnly` (both on
 * in tsconfig.app.json) never fire.
 */

export function makeFakeEmployeeRepository(workers: User[] = []) {
  const byBadge = vi.fn(
    async (badgeId: string) => workers.find((w) => w.badgeId === badgeId) ?? null,
  );
  const byEmployeeNumber = vi.fn(
    async (empNo: string) =>
      workers.find((w) => w.employeeNumber === empNo) ?? null,
  );
  const byId = vi.fn(
    async (uid: string) => workers.find((w) => w.id === uid) ?? null,
  );

  const repo: EmployeeRepository = {
    countActiveWorkers: vi.fn(async () => workers.filter((w) => w.isActive).length),
    getAllWorkers: vi.fn(async () => workers),
    getWorkerById: byId,
    getWorkerByEmployeeNumber: byEmployeeNumber,
    getWorkerByBadgeId: byBadge,
    createEmployee: vi.fn(async () => {}),
    updateEmployee: vi.fn(async () => {}),
    deleteEmployee: vi.fn(async () => {}),
    generateNewId: vi.fn(() => "generated-id"),
  };

  return { repo, byBadge, byEmployeeNumber, byId };
}

export function makeFakeAttendanceRepository(seed: AttendanceWithWorker[] = []) {
  const store = [...seed];
  const recordScan = vi.fn<AttendanceRepository["recordScan"]>(async () => {});

  const repo: AttendanceRepository = {
    recordScan,
    getAttendancesByDate: vi.fn(async (date: string) =>
      store.filter((a) => a.date === date),
    ),
    getAttendancesByDateRange: vi.fn(async (start: string, end: string) =>
      store.filter((a) => a.date >= start && a.date <= end),
    ),
    listenToAttendancesByDateRange: vi.fn(() => () => {}),
  };

  return { repo, recordScan, store };
}

export function makeFakeShiftRepository(
  shifts: Shift[] = [],
  assignments: ShiftAssignment[] = [],
) {
  const repo: ShiftRepository = {
    saveShift: vi.fn(async () => {}),
    getAllShifts: vi.fn(async () => shifts),
    getShiftById: vi.fn(
      async (shiftId: string) => shifts.find((s) => s.id === shiftId) ?? null,
    ),
    deleteShift: vi.fn(async () => {}),
    saveAssignment: vi.fn(async () => {}),
    getActiveAssignmentForUser: vi.fn(
      async (userId: string, targetDate: string) =>
        assignments.find(
          (a) =>
            a.userId === userId &&
            targetDate >= a.validFrom &&
            (!a.validUntil || targetDate <= a.validUntil),
        ) ?? null,
    ),
    getAllAssignments: vi.fn(async () => assignments),
  };

  return { repo };
}

export function makeFakeCalendarRepository(holidays: Holiday[] = []) {
  const repo: CalendarRepository = {
    getHolidays: vi.fn(async () => holidays),
    getAllHolidays: vi.fn(async () => holidays),
    getHolidayByDate: vi.fn(
      async (date: string) => holidays.find((h) => h.date === date) ?? null,
    ),
    createHoliday: vi.fn(async () => {}),
    updateHoliday: vi.fn(async () => {}),
    deleteHoliday: vi.fn(async () => {}),
  };

  return { repo };
}

export function makeFakeAbsenceRepository(absences: Absence[] = []) {
  const covering = (userId: string, date: string) =>
    absences.find(
      (a) => a.userId === userId && date >= a.startDate && date <= a.endDate,
    ) ?? null;

  const repo: AbsenceRepository = {
    saveAbsences: vi.fn(async () => {}),
    getAbsenceForUserAndDate: vi.fn(async (userId: string, date: string) =>
      covering(userId, date),
    ),
    countAbsencesByDate: vi.fn(async () => absences.length),
    getAbsencesByDate: vi.fn(async (date: string) =>
      absences.filter((a) => date >= a.startDate && date <= a.endDate),
    ),
    getAbsencesByDateRange: vi.fn(async (start: string, end: string) =>
      absences.filter((a) => a.startDate <= end && a.endDate >= start),
    ),
    getAllAbsences: vi.fn(async () => absences),
    deleteAbsence: vi.fn(async () => {}),
  };

  return { repo };
}
