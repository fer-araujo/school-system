/**
 * Local-calendar helpers shared by the scanner and the dashboard.
 *
 * Both used to derive these inline and byte-for-byte identically. Keeping one
 * copy matters because the whole system keys attendance documents on the local
 * date: if the two ever drift, a scan and the dashboard disagree about which
 * day it is.
 */

/** The local calendar date of `now` as YYYY-MM-DD. */
export function todayLocalISO(now: Date): string {
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
}

/** Minutes elapsed since local midnight, for comparing against "HH:MM" blocks. */
export function minutesSinceMidnight(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Parses an "HH:MM" block boundary into minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
