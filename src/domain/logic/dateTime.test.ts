import {
  minutesSinceMidnight,
  parseTimeToMinutes,
  todayLocalISO,
} from "./dateTime";

describe("todayLocalISO", () => {
  it("returns the local calendar date, not the UTC one", () => {
    // Under America/Mexico_City this instant is still the 2nd locally even
    // though it is already the 3rd in UTC. Getting this wrong files a scan
    // under tomorrow's attendance document.
    expect(todayLocalISO(new Date("2026-03-02T23:30:00"))).toBe("2026-03-02");
  });

  it("holds the date just after local midnight", () => {
    expect(todayLocalISO(new Date("2026-03-03T00:15:00"))).toBe("2026-03-03");
  });

  it("holds the date just before local midnight", () => {
    expect(todayLocalISO(new Date("2026-03-02T00:00:00"))).toBe("2026-03-02");
  });
});

describe("minutesSinceMidnight", () => {
  it.each([
    ["00:00", 0],
    ["08:00", 480],
    ["08:11", 491],
    ["12:30", 750],
    ["23:59", 1439],
  ])("%s -> %i", (time, expected) => {
    expect(minutesSinceMidnight(new Date(`2026-03-02T${time}:00`))).toBe(
      expected,
    );
  });
});

describe("parseTimeToMinutes", () => {
  it.each([
    ["00:00", 0],
    ["08:00", 480],
    ["14:00", 840],
    ["18:00", 1080],
  ])("%s -> %i", (time, expected) => {
    expect(parseTimeToMinutes(time)).toBe(expected);
  });

  it("agrees with minutesSinceMidnight for the same wall clock time", () => {
    // The two are compared against each other on every scan, so a drift
    // between them would silently misjudge lateness.
    const time = "08:11";
    expect(parseTimeToMinutes(time)).toBe(
      minutesSinceMidnight(new Date(`2026-03-02T${time}:00`)),
    );
  });
});
