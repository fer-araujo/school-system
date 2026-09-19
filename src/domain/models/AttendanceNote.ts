/**
 * An admin-written observation about one employee on one day.
 *
 * Deliberately NOT part of the attendance document: a day with no attendance
 * has no document at all, and creating one just to hold a note would make the
 * dashboard read that absence as a day the person showed up.
 */
export interface AttendanceNote {
  /** `${userId}_${date}` — one note per employee per day. */
  id: string;
  userId: string;
  /** YYYY-MM-DD, local calendar date. */
  date: string;
  text: string;
  /** Who last wrote it, so a second admin knows where a note came from. */
  authorName?: string;
  updatedAt: Date;
}
