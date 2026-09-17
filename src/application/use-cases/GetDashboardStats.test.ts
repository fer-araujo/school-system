import type { Absence } from "../../domain/models/Absence";
import type { Holiday } from "../../domain/models/Holiday";
import type { Shift, ShiftAssignment } from "../../domain/models/Shift";
import type { AttendanceWithWorker, User } from "../../domain/models/User";
import {
  anAbsence,
  anAttendance,
  aHoliday,
  aPeriod,
  aShift,
  aUser,
} from "../../test/builders";
import {
  makeFakeAbsenceRepository,
  makeFakeCalendarRepository,
  makeFakeShiftRepository,
} from "../../test/fakes";
import { GetDashboardStats } from "./GetDashboardStats";
import type { ManageEmployees } from "./ManageEmployees";

const MONDAY = "2026-03-02";
const TUESDAY = "2026-03-03";
const SUNDAY = "2026-03-08";
const at = (hhmm: string, date = MONDAY) => new Date(`${date}T${hhmm}:00`);
const range = (start: string, end = start) => ({ start, end });

interface SetupOptions {
  workers?: User[];
  shifts?: Shift[];
  assignments?: ShiftAssignment[];
  absences?: Absence[];
  holidays?: Holiday[];
}

function setup(options: SetupOptions = {}) {
  // GetDashboardStats takes the concrete ManageEmployees rather than a port,
  // so the fake has to be cast. Depending on EmployeeRepository instead would
  // remove this — noted as a follow-up, not fixed here.
  const manageEmployees = {
    getAllWorkers: vi.fn(async () => options.workers ?? [aUser()]),
  } as unknown as ManageEmployees;

  const shift = makeFakeShiftRepository(
    options.shifts ?? [aShift()],
    options.assignments ?? [],
  );
  const absence = makeFakeAbsenceRepository(options.absences ?? []);
  const calendar = makeFakeCalendarRepository(options.holidays ?? []);

  const useCase = new GetDashboardStats(
    manageEmployees,
    absence.repo,
    shift.repo,
    calendar.repo,
  );

  return { useCase };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Late enough on the Monday that the 08:10 deadline has passed, so missing
  // people already count as unjustified.
  vi.setSystemTime(at("13:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("expectedToday", () => {
  it("counts a rostered worker who attended", async () => {
    // This is the regression that produced "25 / 0" on the dashboard:
    // expectedToday used to be incremented only for people who did NOT show
    // up, so a full-attendance day drove the denominator to zero.
    const { useCase } = setup();
    const attendances: AttendanceWithWorker[] = [
      anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
    ];

    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats.expectedToday).toBe(1);
    expect(stats.faltasInjustificadas).toBe(0);
  });

  it("counts a rostered worker who did not attend", async () => {
    const { useCase } = setup();
    const stats = await useCase.execute(range(MONDAY), []);

    expect(stats.expectedToday).toBe(1);
    expect(stats.faltasInjustificadas).toBe(1);
  });

  it("does not count a worker who is not rostered that day", async () => {
    const { useCase } = setup();
    const stats = await useCase.execute(range(SUNDAY), []);

    expect(stats.expectedToday).toBe(0);
    expect(stats.faltasInjustificadas).toBe(0);
  });

  it("does not count a worker with no shift at all", async () => {
    const { useCase } = setup({ workers: [aUser({ shiftId: undefined })] });
    const stats = await useCase.execute(range(MONDAY), []);

    expect(stats.expectedToday).toBe(0);
  });

  it("excludes holidays from the denominator", async () => {
    const { useCase } = setup({ holidays: [aHoliday({ date: MONDAY })] });
    const stats = await useCase.execute(range(MONDAY), []);

    expect(stats.expectedToday).toBe(0);
    expect(stats.faltasInjustificadas).toBe(0);
  });

  it("accumulates across every day in the range", async () => {
    const { useCase } = setup();
    const stats = await useCase.execute(range(MONDAY, TUESDAY), []);

    expect(stats.expectedToday).toBe(2);
  });
});

describe("employeesWithLates", () => {
  it("is zero when nobody arrived late", async () => {
    const { useCase } = setup();
    const attendances = [
      anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
    ];

    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats.employeesWithLates).toBe(0);
    expect(stats.lateUserIds).toEqual([]);
  });

  it("counts an employee with a late period", async () => {
    const { useCase } = setup();
    const attendances = [
      anAttendance({
        periods: [aPeriod({ checkIn: at("08:20"), isLate: true })],
      }),
    ];

    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats.employeesWithLates).toBe(1);
    expect(stats.lateUserIds).toEqual(["u1"]);
  });

  it("counts a person once even when late on several days", async () => {
    // The card reads against the headcount, so the numerator has to be
    // distinct people rather than late events.
    const { useCase } = setup();
    const attendances = [
      anAttendance({
        id: "u1_mon",
        date: MONDAY,
        periods: [aPeriod({ checkIn: at("08:20"), isLate: true })],
      }),
      anAttendance({
        id: "u1_tue",
        date: TUESDAY,
        periods: [aPeriod({ checkIn: at("08:20", TUESDAY), isLate: true })],
      }),
    ];

    const stats = await useCase.execute(range(MONDAY, TUESDAY), attendances);

    expect(stats.employeesWithLates).toBe(1);
    expect(stats.lateUserIds).toEqual(["u1"]);
  });

  it("counts each late employee separately", async () => {
    const { useCase } = setup({
      workers: [aUser(), aUser({ id: "u2", badgeId: "B2", fullName: "Grecia" })],
    });
    const attendances = [
      anAttendance({
        periods: [aPeriod({ checkIn: at("08:20"), isLate: true })],
      }),
      anAttendance({
        id: "u2_mon",
        userId: "u2",
        workerName: "Grecia",
        periods: [aPeriod({ checkIn: at("08:30"), isLate: true })],
      }),
    ];

    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats.employeesWithLates).toBe(2);
    expect(stats.lateUserIds.sort()).toEqual(["u1", "u2"]);
  });
});

describe("absences and permissions", () => {
  it("classifies a covered absence as a permission, not a missing shift", async () => {
    const { useCase } = setup({ absences: [anAbsence()] });
    const stats = await useCase.execute(range(MONDAY), []);

    expect(stats.totalAbsences).toBe(1);
    expect(stats.faltasInjustificadas).toBe(0);

    const row = stats.fullTableData[0];
    expect(row.isJustified).toBe(true);
    expect(row.absenceReason).toBe("Vacaciones");
    expect(row.status).toBe("ABSENT");
  });

  it("still counts the shift as expected when the absence is justified", async () => {
    const { useCase } = setup({ absences: [anAbsence()] });
    const stats = await useCase.execute(range(MONDAY), []);

    expect(stats.expectedToday).toBe(1);
  });
});

describe("table rows", () => {
  it("injects department and shift name onto an attended row", async () => {
    const { useCase } = setup();
    const attendances = [
      anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
    ];

    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats.fullTableData[0]).toMatchObject({
      userId: "u1",
      department: "Kinder 1A",
      shiftName: "Maestras",
    });
  });

  it("sorts by date descending", async () => {
    // Both days must be in the past: a future date produces no missing-shift
    // row, so with the clock still on Monday only one row would exist.
    vi.setSystemTime(at("13:00", "2026-03-04"));
    const { useCase } = setup();
    const stats = await useCase.execute(range(MONDAY, TUESDAY), []);

    expect(stats.fullTableData.map((r) => r.date)).toEqual([TUESDAY, MONDAY]);
  });

  it("reports the active headcount", async () => {
    const { useCase } = setup({
      workers: [aUser(), aUser({ id: "u2" }), aUser({ id: "u3", isActive: false })],
    });

    const stats = await useCase.execute(range(MONDAY), []);
    expect(stats.totalEmployees).toBe(2);
  });
});

describe("failure handling", () => {
  it("returns the same shape with zeros when a repository fails", async () => {
    // The keys must match the success path, or the inferred return type
    // becomes a union and callers lose every field.
    const manageEmployees = {
      getAllWorkers: vi.fn(async () => {
        throw new Error("firestore unavailable");
      }),
    } as unknown as ManageEmployees;

    const shift = makeFakeShiftRepository();
    const absence = makeFakeAbsenceRepository();
    const calendar = makeFakeCalendarRepository();
    const useCase = new GetDashboardStats(
      manageEmployees,
      absence.repo,
      shift.repo,
      calendar.repo,
    );

    const attendances = [anAttendance()];
    const stats = await useCase.execute(range(MONDAY), attendances);

    expect(stats).toMatchObject({
      totalEmployees: 0,
      expectedToday: 0,
      totalAbsences: 0,
      faltasInjustificadas: 0,
      employeesWithLates: 0,
      lateUserIds: [],
      isPollingNeeded: false,
    });
    expect(stats.fullTableData).toBe(attendances);
  });
});
