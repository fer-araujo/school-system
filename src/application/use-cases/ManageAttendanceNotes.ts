import { MAX_NOTE_LENGTH } from "../../domain/constants/attendanceRules";
import type { AttendanceNote } from "../../domain/models/AttendanceNote";
import type {
  AttendanceNoteRepository,
  SaveAttendanceNoteInput,
} from "../../domain/repositories/AttendanceNoteRepository";

export class ManageAttendanceNotes {
  private noteRepo: AttendanceNoteRepository;

  constructor(noteRepo: AttendanceNoteRepository) {
    this.noteRepo = noteRepo;
  }

  async getForRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<AttendanceNote[]> {
    return this.noteRepo.getNotesForUserRange(userId, start, end);
  }

  /**
   * Saving an empty note deletes it, so clearing the textarea is how an admin
   * removes an observation — no separate delete affordance to discover.
   */
  async save(input: SaveAttendanceNoteInput): Promise<void> {
    const text = input.text.trim();

    if (!text) {
      await this.noteRepo.deleteNote(input.userId, input.date);
      return;
    }

    if (text.length > MAX_NOTE_LENGTH) {
      throw new Error(
        `La observación no puede pasar de ${MAX_NOTE_LENGTH} caracteres.`,
      );
    }

    await this.noteRepo.saveNote({ ...input, text });
  }

  async remove(userId: string, date: string): Promise<void> {
    await this.noteRepo.deleteNote(userId, date);
  }
}
