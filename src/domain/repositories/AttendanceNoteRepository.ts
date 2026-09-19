import type { AttendanceNote } from "../models/AttendanceNote";

export interface SaveAttendanceNoteInput {
  userId: string;
  /** YYYY-MM-DD, local calendar date. */
  date: string;
  text: string;
  authorName?: string;
}

export interface AttendanceNoteRepository {
  getNotesForUserRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<AttendanceNote[]>;
  saveNote(input: SaveAttendanceNoteInput): Promise<void>;
  deleteNote(userId: string, date: string): Promise<void>;
}
