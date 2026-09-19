import { MAX_NOTE_LENGTH } from "../../domain/constants/attendanceRules";
import type { AttendanceNote } from "../../domain/models/AttendanceNote";
import { makeFakeAttendanceNoteRepository } from "../../test/fakes";
import { ManageAttendanceNotes } from "./ManageAttendanceNotes";

const aNote = (overrides: Partial<AttendanceNote> = {}): AttendanceNote => ({
  id: "u1_2026-03-02",
  userId: "u1",
  date: "2026-03-02",
  text: "Avisó que llegaría tarde.",
  authorName: "Fer",
  updatedAt: new Date("2026-03-02T09:00:00"),
  ...overrides,
});

describe("getForRange", () => {
  it("returns only this employee's notes inside the range", async () => {
    const { repo } = makeFakeAttendanceNoteRepository([
      aNote(),
      aNote({ id: "u2_2026-03-02", userId: "u2" }),
      aNote({ id: "u1_2026-04-01", date: "2026-04-01" }),
    ]);
    const useCase = new ManageAttendanceNotes(repo);

    const notes = await useCase.getForRange("u1", "2026-03-01", "2026-03-31");

    expect(notes).toHaveLength(1);
    expect(notes[0].userId).toBe("u1");
  });
});

describe("save", () => {
  it("stores the note trimmed", async () => {
    const { repo, saveNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await useCase.save({
      userId: "u1",
      date: "2026-03-02",
      text: "   Cita médica.  ",
      authorName: "Fer",
    });

    expect(saveNote).toHaveBeenCalledWith({
      userId: "u1",
      date: "2026-03-02",
      text: "Cita médica.",
      authorName: "Fer",
    });
  });

  it("deletes the note when the text is cleared", async () => {
    // Clearing the textarea is the only remove affordance, so an empty save
    // must not write a blank note.
    const { repo, saveNote, deleteNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await useCase.save({ userId: "u1", date: "2026-03-02", text: "   " });

    expect(deleteNote).toHaveBeenCalledWith("u1", "2026-03-02");
    expect(saveNote).not.toHaveBeenCalled();
  });

  it("accepts a note exactly at the limit", async () => {
    const { repo, saveNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await useCase.save({
      userId: "u1",
      date: "2026-03-02",
      text: "a".repeat(MAX_NOTE_LENGTH),
    });

    expect(saveNote).toHaveBeenCalled();
  });

  it("rejects a note past the limit without writing", async () => {
    const { repo, saveNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await expect(
      useCase.save({
        userId: "u1",
        date: "2026-03-02",
        text: "a".repeat(MAX_NOTE_LENGTH + 1),
      }),
    ).rejects.toThrow(String(MAX_NOTE_LENGTH));

    expect(saveNote).not.toHaveBeenCalled();
  });

  it("measures the limit after trimming", async () => {
    const { repo, saveNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await useCase.save({
      userId: "u1",
      date: "2026-03-02",
      text: `  ${"a".repeat(MAX_NOTE_LENGTH)}  `,
    });

    expect(saveNote).toHaveBeenCalled();
  });
});

describe("remove", () => {
  it("deletes the note for that employee and day", async () => {
    const { repo, deleteNote } = makeFakeAttendanceNoteRepository();
    const useCase = new ManageAttendanceNotes(repo);

    await useCase.remove("u1", "2026-03-02");

    expect(deleteNote).toHaveBeenCalledWith("u1", "2026-03-02");
  });
});
