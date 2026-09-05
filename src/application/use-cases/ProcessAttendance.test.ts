import type { Absence } from "../../domain/models/Absence";
import type { Holiday } from "../../domain/models/Holiday";
import type { Shift, ShiftAssignment } from "../../domain/models/Shift";
import type { AttendanceWithWorker, User } from "../../domain/models/User";
import { isScanRejectedError } from "../../domain/errors/ScanRejectedError";
import {
  anAbsence,
  anAssignment,
  anAttendance,
  aHoliday,
  aPeriod,
  aShift,
  aUser,
} from "../../test/builders";
import {
  makeFakeAbsenceRepository,
  makeFakeAttendanceRepository,
  makeFakeCalendarRepository,
  makeFakeEmployeeRepository,
  makeFakeShiftRepository,
} from "../../test/fakes";
import { ProcessAttendanceScan } from "./ProcessAttendance";

// 2026-03-02 is a Monday and 2026-03-08 a Sunday under the pinned TZ.
const MONDAY = "2026-03-02";
const at = (hhmm: string, date = MONDAY) => new Date(`${date}T${hhmm}:00`);

interface SetupOptions {
  workers?: User[];
  attendances?: AttendanceWithWorker[];
  shifts?: Shift[];
  assignments?: ShiftAssignment[];
  holidays?: Holiday[];
  absences?: Absence[];
}

function setup(options: SetupOptions = {}) {
  const employee = makeFakeEmployeeRepository(options.workers ?? [aUser()]);
  const attendance = makeFakeAttendanceRepository(options.attendances ?? []);
  const shift = makeFakeShiftRepository(
    options.shifts ?? [aShift()],
    options.assignments ?? [],
  );
  const calendar = makeFakeCalendarRepository(options.holidays ?? []);
  const absence = makeFakeAbsenceRepository(options.absences ?? []);

  const useCase = new ProcessAttendanceScan(
    employee.repo,
    attendance.repo,
    shift.repo,
    calendar.repo,
    absence.repo,
  );

  return { useCase, employee, attendance, shift, calendar, absence };
}

/** Asserts the rejection code without coupling to the Spanish copy. */
async function expectRejection(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    if (!isScanRejectedError(error)) throw error;
    expect(error.code).toBe(code);
    return error;
  }
  throw new Error(`Expected a ${code} rejection, but the scan succeeded.`);
}

beforeEach(() => {
  // Only Date is faked: faking timers wholesale would interfere with the
  // promise scheduling these async use cases rely on.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("08:05"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("identity resolution", () => {
  it("rejects an empty badge", async () => {
    const { useCase } = setup();
    await expectRejection(useCase.execute("   "), "EMPTY_BADGE");
  });

  it("stops at the badge id without trying the other lookups", async () => {
    const { useCase, employee } = setup();
    await useCase.execute("BADGE-7090");

    expect(employee.byBadge).toHaveBeenCalledWith("BADGE-7090");
    expect(employee.byEmployeeNumber).not.toHaveBeenCalled();
    expect(employee.byId).not.toHaveBeenCalled();
  });

  it("falls back to the employee number", async () => {
    const { useCase, employee, attendance } = setup();
    await useCase.execute("7090");

    expect(employee.byEmployeeNumber).toHaveBeenCalledWith("7090");
    expect(attendance.recordScan).toHaveBeenCalled();
  });

  it("reads the uid out of a JSON payload", async () => {
    const { useCase, employee } = setup();
    await useCase.execute(JSON.stringify({ uid: "u1", t: Date.now() }));

    expect(employee.byId).toHaveBeenCalledWith("u1");
  });

  it("rejects an unknown badge", async () => {
    const { useCase } = setup();
    await expectRejection(useCase.execute("no-existe"), "BADGE_NOT_RECOGNIZED");
  });

  it("refuses an inactive employee and writes nothing", async () => {
    const { useCase, attendance } = setup({
      workers: [aUser({ isActive: false })],
    });

    await expectRejection(useCase.execute("BADGE-7090"), "EMPLOYEE_INACTIVE");
    expect(attendance.recordScan).not.toHaveBeenCalled();
  });
});

describe("calendar gates", () => {
  it("blocks on a holiday", async () => {
    const { useCase, attendance } = setup({
      holidays: [aHoliday({ date: MONDAY, name: "Consejo Técnico" })],
    });

    const error = await expectRejection(
      useCase.execute("BADGE-7090"),
      "HOLIDAY",
    );
    expect(error?.context?.holidayName).toBe("Consejo Técnico");
    expect(attendance.recordScan).not.toHaveBeenCalled();
  });

  it("blocks when the employee is on leave", async () => {
    const { useCase } = setup({ absences: [anAbsence()] });

    const error = await expectRejection(
      useCase.execute("BADGE-7090"),
      "ON_LEAVE",
    );
    expect(error?.context?.absenceType).toBe("Vacaciones");
  });

  it("ignores leave that covers a different date", async () => {
    const { useCase, attendance } = setup({
      absences: [anAbsence({ startDate: "2026-04-01", endDate: "2026-04-05" })],
    });

    await useCase.execute("BADGE-7090");
    expect(attendance.recordScan).toHaveBeenCalled();
  });
});

describe("entry and exit deduction", () => {
  it("treats the first scan of the day as an entry", async () => {
    const { useCase, attendance } = setup();
    const result = await useCase.execute("BADGE-7090");

    expect(result.type).toBe("ENTRY");
    expect(attendance.recordScan.mock.calls[0][0].type).toBe("ENTRY");
  });

  it("closes an open period as an exit", async () => {
    vi.setSystemTime(at("12:00"));
    const { useCase, attendance } = setup({
      attendances: [
        anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
      ],
    });

    const result = await useCase.execute("BADGE-7090");

    expect(result.type).toBe("EXIT");
    expect(attendance.recordScan.mock.calls[0][0].type).toBe("EXIT");
  });

  it("opens a new entry when the last period is already closed", async () => {
    vi.setSystemTime(at("14:05"));
    const { useCase } = setup({
      attendances: [
        anAttendance({
          periods: [aPeriod({ checkIn: at("08:00"), checkOut: at("12:00") })],
        }),
      ],
    });

    const result = await useCase.execute("BADGE-7090");
    expect(result.type).toBe("ENTRY");
  });

  it("ignores another employee's record for the same day", async () => {
    const { useCase } = setup({
      attendances: [
        anAttendance({
          userId: "someone-else",
          periods: [aPeriod({ checkIn: at("08:00") })],
        }),
      ],
    });

    const result = await useCase.execute("BADGE-7090");
    expect(result.type).toBe("ENTRY");
  });
});

describe("schedule anomalies", () => {
  it("records the entry when no shift is assigned", async () => {
    const { useCase, attendance } = setup({
      workers: [aUser({ shiftId: undefined })],
    });

    const result = await useCase.execute("BADGE-7090");

    expect(result.anomaly).toEqual({ code: "NO_SHIFT_ASSIGNED" });
    expect(result.isLate).toBe(false);
    expect(result.skippedBlocks).toBe(0);
    expect(attendance.recordScan).toHaveBeenCalled();
  });

  it("records the entry when the assigned shift no longer exists", async () => {
    const { useCase, attendance } = setup({
      workers: [aUser({ shiftId: "deleted-shift" })],
      shifts: [],
    });

    const result = await useCase.execute("BADGE-7090");

    expect(result.anomaly).toEqual({ code: "SHIFT_NOT_FOUND" });
    expect(attendance.recordScan).toHaveBeenCalled();
  });

  it("records the entry on a rest day and names the day", async () => {
    vi.setSystemTime(at("08:05", "2026-03-08")); // Sunday
    const { useCase, attendance } = setup();

    const result = await useCase.execute("BADGE-7090");

    expect(result.anomaly).toEqual({ code: "REST_DAY", detail: "Domingo" });
    expect(attendance.recordScan).toHaveBeenCalled();
  });

  it("records the entry when the day has no configured blocks", async () => {
    const { useCase } = setup({
      shifts: [aShift({ blocksByDay: { Lunes: [] } })],
    });

    const result = await useCase.execute("BADGE-7090");
    expect(result.anomaly).toEqual({
      code: "NO_BLOCKS_CONFIGURED",
      detail: "Lunes",
    });
  });

  it("leaves no anomaly on a normal entry", async () => {
    const { useCase } = setup();
    const result = await useCase.execute("BADGE-7090");
    expect(result.anomaly).toBeUndefined();
  });

  it("prefers an active assignment over the user's own shiftId", async () => {
    const { useCase } = setup({
      workers: [aUser({ shiftId: "shift-morning" })],
      shifts: [aShift(), aShift({ id: "shift-cover", name: "Cocina" })],
      assignments: [anAssignment({ shiftId: "shift-cover" })],
    });

    const result = await useCase.execute("BADGE-7090");
    // The covering shift exists and is valid today, so no anomaly is raised.
    expect(result.anomaly).toBeUndefined();
  });

  it("ignores an assignment that is no longer valid", async () => {
    const { useCase } = setup({
      workers: [aUser({ shiftId: undefined })],
      assignments: [
        anAssignment({ validFrom: "2026-01-01", validUntil: "2026-02-01" }),
      ],
    });

    const result = await useCase.execute("BADGE-7090");
    expect(result.anomaly).toEqual({ code: "NO_SHIFT_ASSIGNED" });
  });
});

describe("block targeting and tolerance", () => {
  // Monday: 08:00-12:00 and 14:00-18:00, tolerance 10 minutes.
  it.each([
    ["07:45", false, "arriving early"],
    ["08:00", false, "arriving exactly on time"],
    ["08:10", false, "arriving exactly at the tolerance edge"],
    ["08:11", true, "arriving one minute past tolerance"],
    ["11:59", true, "arriving near the end of the block"],
  ])("%s -> isLate %s (%s)", async (time, expected) => {
    vi.setSystemTime(at(time));
    const { useCase } = setup();

    const result = await useCase.execute("BADGE-7090");
    expect(result.isLate).toBe(expected);
  });

  it("treats a missing tolerance as zero", async () => {
    vi.setSystemTime(at("08:01"));
    const { useCase } = setup({
      shifts: [aShift({ toleranceMinutes: undefined as unknown as number })],
    });

    const result = await useCase.execute("BADGE-7090");
    expect(result.isLate).toBe(true);
  });

  it("counts a skipped block without marking the new one late", async () => {
    // 12:01 is past block 0, so block 1 is targeted — but 12:01 is well before
    // its 14:00 start, so lateness and skipped blocks are independent.
    vi.setSystemTime(at("12:01"));
    const { useCase } = setup();

    const result = await useCase.execute("BADGE-7090");

    expect(result.skippedBlocks).toBe(1);
    expect(result.isLate).toBe(false);
  });

  it("marks the second block late when arriving past its tolerance", async () => {
    vi.setSystemTime(at("14:11"));
    const { useCase } = setup();

    const result = await useCase.execute("BADGE-7090");

    expect(result.skippedBlocks).toBe(1);
    expect(result.isLate).toBe(true);
  });

  it("rejects a scan after the last block has ended", async () => {
    vi.setSystemTime(at("18:01"));
    const { useCase, attendance } = setup();

    const error = await expectRejection(
      useCase.execute("BADGE-7090"),
      "SHIFT_ENDED",
    );
    expect(error?.context?.endedAt).toBe("18:00");
    expect(attendance.recordScan).not.toHaveBeenCalled();
  });

  it("rejects when the targeted block is behind the periods already stored", async () => {
    vi.setSystemTime(at("08:30"));
    const { useCase } = setup({
      attendances: [
        anAttendance({
          periods: [aPeriod({ checkIn: at("07:00"), checkOut: at("07:30") })],
        }),
      ],
    });

    await expectRejection(useCase.execute("BADGE-7090"), "BLOCK_MISMATCH");
  });
});

describe("duplicate swipe window", () => {
  it("refuses to close a period opened minutes ago", async () => {
    vi.setSystemTime(at("08:03"));
    const { useCase, attendance } = setup({
      attendances: [
        anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
      ],
    });

    const error = await expectRejection(
      useCase.execute("BADGE-7090"),
      "DUPLICATE_SWIPE",
    );

    expect(error?.context?.lastCheckIn).toBeDefined();
    expect(error?.context?.employeeName).toBe("Adelina Gutierrez");
    expect(attendance.recordScan).not.toHaveBeenCalled();
  });

  it("still refuses one minute before the window closes", async () => {
    vi.setSystemTime(at("08:09"));
    const { useCase } = setup({
      attendances: [
        anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
      ],
    });

    await expectRejection(useCase.execute("BADGE-7090"), "DUPLICATE_SWIPE");
  });

  it("allows the exit once the window has passed", async () => {
    vi.setSystemTime(at("08:10"));
    const { useCase, attendance } = setup({
      attendances: [
        anAttendance({ periods: [aPeriod({ checkIn: at("08:00") })] }),
      ],
    });

    const result = await useCase.execute("BADGE-7090");

    expect(result.type).toBe("EXIT");
    expect(attendance.recordScan).toHaveBeenCalled();
  });
});

describe("recordScan contract", () => {
  it("passes the whole input the repository needs", async () => {
    vi.setSystemTime(at("08:11"));
    const { useCase, attendance } = setup();

    await useCase.execute("BADGE-7090");

    expect(attendance.recordScan).toHaveBeenCalledWith({
      userId: "u1",
      employeeNumber: "7090",
      date: MONDAY,
      type: "ENTRY",
      time: at("08:11"),
      isLate: true,
      skippedBlocks: 0,
      anomaly: undefined,
    });
  });

  it("substitutes a placeholder employee number when there is none", async () => {
    const { useCase, attendance } = setup({
      workers: [aUser({ employeeNumber: "" })],
    });

    await useCase.execute("BADGE-7090");

    expect(attendance.recordScan.mock.calls[0][0].employeeNumber).toBe("0000");
  });

  it("returns the details the terminal renders", async () => {
    const { useCase } = setup();
    const result = await useCase.execute("BADGE-7090");

    expect(result).toMatchObject({
      employeeName: "Adelina Gutierrez",
      type: "ENTRY",
      isLate: false,
      skippedBlocks: 0,
    });
    expect(result.time).toMatch(/\d{1,2}:\d{2}/);
  });
});
