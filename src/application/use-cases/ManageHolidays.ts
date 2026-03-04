import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../infrastructure/firebase/config";
import type { Holiday } from "../../domain/models/Holiday";

export class ManageHolidays {
  async getHolidays(): Promise<Holiday[]> {
    const snap = await getDocs(collection(db, "holidays"));
    const holidays = snap.docs.map((doc) => doc.data() as Holiday);
    // Ordenamos cronológicamente
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  async createHoliday(data: Omit<Holiday, "id">): Promise<void> {
    const newId = `hol_${Date.now()}`;
    await setDoc(doc(db, "holidays", newId), { ...data, id: newId });
  }

  async updateHoliday(data: Holiday): Promise<void> {
    const ref = doc(db, "holidays", data.id);
    await updateDoc(ref, { ...data });
  }

  async deleteHoliday(id: string): Promise<void> {
    await deleteDoc(doc(db, "holidays", id));
  }
}
