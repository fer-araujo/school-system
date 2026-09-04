import type { DashboardTableRecord } from "../application/use-cases/GetDashboardStats";
import type { WorkPeriod } from "../domain/models/User";
import {
  calculateTotalMs,
  formatTime,
  formatTotalTime,
  getAvatarColor,
  getStatusPriority,
  stringsToSelectOptions,
} from "./helpers";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

function aRecord(
  periods: WorkPeriod[],
  overrides: Partial<DashboardTableRecord> = {},
): DashboardTableRecord {
  return {
    id: "att_1",
    userId: "u1",
    employeeNumber: "1234",
    date: "2026-03-02",
    periods,
    status: "PRESENT",
    workerName: "Adelina Gutierrez",
    ...overrides,
  };
}

const at = (hhmm: string) => new Date(`2026-03-02T${hhmm}:00`);

describe("getAvatarColor", () => {
  it("falls back to the first color for an empty name", () => {
    expect(getAvatarColor("")).toBe(AVATAR_COLORS[0]);
  });

  it("is deterministic for the same name", () => {
    expect(getAvatarColor("Adelina")).toBe(getAvatarColor("Adelina"));
  });

  it("always returns a color from the palette", () => {
    const names = ["A", "Adelina Gutierrez", "Zzzz", "ñ", "0000", "a".repeat(200)];
    for (const name of names) {
      expect(AVATAR_COLORS).toContain(getAvatarColor(name));
    }
  });

  it("never produces a negative index for names that overflow the hash", () => {
    // The hash uses `<<` (int32) and can go negative; Math.abs must save it.
    expect(getAvatarColor("￿".repeat(64))).toBeDefined();
    expect(AVATAR_COLORS).toContain(getAvatarColor("￿".repeat(64)));
  });
});

describe("formatTime", () => {
  it("returns a placeholder when there is no date", () => {
    expect(formatTime(undefined)).toBe("--:--");
  });

  it("formats hours and minutes", () => {
    // Locale-dependent output, so assert the shape rather than the exact string.
    expect(formatTime(at("08:05"))).toMatch(/\b0?8[:.]05\b/);
  });
});

describe("formatTotalTime", () => {
  it("special-cases zero", () => {
    expect(formatTotalTime(0)).toBe("0h 0m");
  });

  it("converts milliseconds to hours and minutes", () => {
    expect(formatTotalTime(60_000)).toBe("0h 1m");
    expect(formatTotalTime(3_600_000)).toBe("1h 0m");
    expect(formatTotalTime(3_600_000 + 25 * 60_000)).toBe("1h 25m");
  });

  it("truncates seconds instead of rounding", () => {
    expect(formatTotalTime(119_000)).toBe("0h 1m");
  });
});

describe("calculateTotalMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(at("12:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns zero for no periods", () => {
    expect(calculateTotalMs([])).toBe(0);
  });

  it("sums closed periods", () => {
    const periods: WorkPeriod[] = [
      { checkIn: at("08:00"), checkOut: at("10:00") },
      { checkIn: at("10:30"), checkOut: at("11:00") },
    ];
    expect(calculateTotalMs(periods)).toBe(150 * 60_000);
  });

  it("counts an open period up to now", () => {
    const periods: WorkPeriod[] = [{ checkIn: at("08:00") }];
    expect(calculateTotalMs(periods)).toBe(4 * 3_600_000);
  });

  it("skips absent periods and periods without a check-in", () => {
    const periods = [
      { checkIn: at("08:00"), checkOut: at("09:00") },
      { isAbsent: true, checkIn: at("08:00"), checkOut: at("18:00") },
      { checkIn: null, checkOut: at("18:00") },
    ] as unknown as WorkPeriod[];
    expect(calculateTotalMs(periods)).toBe(3_600_000);
  });
});

describe("getStatusPriority", () => {
  it("ranks a justified absence highest", () => {
    const row = aRecord([{ checkIn: at("08:00") }], { isJustified: true });
    expect(getStatusPriority(row)).toBe(5);
  });

  it("ranks a fully absent day lowest", () => {
    const row = aRecord([{ isAbsent: true } as unknown as WorkPeriod]);
    expect(getStatusPriority(row)).toBe(1);
  });

  it("ranks a partially absent day above a full absence", () => {
    const row = aRecord([
      { isAbsent: true } as unknown as WorkPeriod,
      { checkIn: at("10:00"), checkOut: at("12:00") },
    ]);
    expect(getStatusPriority(row)).toBe(2);
  });

  it("ranks a late day above a clean day", () => {
    const row = aRecord([
      { checkIn: at("08:20"), checkOut: at("12:00"), isLate: true },
    ]);
    expect(getStatusPriority(row)).toBe(3);
  });

  it("ranks a clean day as 4", () => {
    const row = aRecord([{ checkIn: at("08:00"), checkOut: at("12:00") }]);
    expect(getStatusPriority(row)).toBe(4);
  });

  it("treats an empty period list as clean, not absent", () => {
    // `allAbsent` guards on length > 0, so an empty day is not ranked 1.
    expect(getStatusPriority(aRecord([]))).toBe(4);
  });
});

describe("stringsToSelectOptions", () => {
  it("maps each string to an identical value and label", () => {
    expect(stringsToSelectOptions(["Kinder 1A", "Cocina"])).toEqual([
      { value: "Kinder 1A", label: "Kinder 1A" },
      { value: "Cocina", label: "Cocina" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(stringsToSelectOptions([])).toEqual([]);
  });
});
