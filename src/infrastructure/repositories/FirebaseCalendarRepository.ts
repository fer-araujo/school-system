import type { Holiday } from "../../domain/models/Holiday";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import { db } from "../firebase/config";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

// Single collection for holidays. Reads and writes must never diverge:
// the scanner and the admin panel have to see the same data.
const HOLIDAYS = "holidays";

function toHoliday(id: string, data: DocumentData): Holiday {
  return {
    id,
    date: data.date,
    // `reason` kept as a fallback for documents written before the rename.
    name: data.name || data.reason || "Día de asueto",
    type: data.type || "Oficial (Ley)",
  };
}

export class FirebaseCalendarRepository implements CalendarRepository {
  async getAllHolidays(): Promise<Holiday[]> {
    const snap = await getDocs(collection(db, HOLIDAYS));
    const holidays = snap.docs.map((d) => toHoliday(d.id, d.data()));
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getHolidays(): Promise<Holiday[]> {
    return this.getAllHolidays();
  }

  async getHolidayByDate(date: string): Promise<Holiday | null> {
    const q = query(
      collection(db, HOLIDAYS),
      where("date", "==", date),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const found = snap.docs[0];
    return toHoliday(found.id, found.data());
  }

  async createHoliday(data: Omit<Holiday, "id">): Promise<void> {
    const newId = `hol_${Date.now()}`;
    await setDoc(doc(db, HOLIDAYS, newId), { ...data, id: newId });
  }

  async updateHoliday(data: Holiday): Promise<void> {
    const ref = doc(db, HOLIDAYS, data.id);
    await updateDoc(ref, { ...data });
  }

  async deleteHoliday(id: string): Promise<void> {
    await deleteDoc(doc(db, HOLIDAYS, id));
  }
}
