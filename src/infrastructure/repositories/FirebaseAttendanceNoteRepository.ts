import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { AttendanceNote } from "../../domain/models/AttendanceNote";
import type {
  AttendanceNoteRepository,
  SaveAttendanceNoteInput,
} from "../../domain/repositories/AttendanceNoteRepository";

const NOTES = "attendance_notes";

/** One note per employee per day, so the id is derivable and idempotent. */
const noteId = (userId: string, date: string) => `${userId}_${date}`;

function toAttendanceNote(id: string, data: DocumentData): AttendanceNote {
  return {
    id,
    userId: data.userId,
    date: data.date,
    text: data.text ?? "",
    authorName: data.authorName,
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt),
  };
}

export class FirebaseAttendanceNoteRepository
  implements AttendanceNoteRepository
{
  async getNotesForUserRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<AttendanceNote[]> {
    // Equality on userId plus a range on date needs the composite index
    // declared in firestore.indexes.json.
    const q = query(
      collection(db, NOTES),
      where("userId", "==", userId),
      where("date", ">=", start),
      where("date", "<=", end),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toAttendanceNote(d.id, d.data()));
  }

  async saveNote(input: SaveAttendanceNoteInput): Promise<void> {
    const id = noteId(input.userId, input.date);
    await setDoc(doc(db, NOTES, id), {
      userId: input.userId,
      date: input.date,
      text: input.text,
      // Firestore rejects an explicit undefined unless
      // ignoreUndefinedProperties is on, and it is not.
      ...(input.authorName ? { authorName: input.authorName } : {}),
      updatedAt: new Date(),
    });
  }

  async deleteNote(userId: string, date: string): Promise<void> {
    await deleteDoc(doc(db, NOTES, noteId(userId, date)));
  }
}
