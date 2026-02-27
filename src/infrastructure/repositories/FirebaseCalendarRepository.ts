import type { Holiday, HolidayType } from "../../domain/models/Calendar";
import type { CalendarRepository } from "../../domain/repositories/CalendarRepository";
import { db } from "../firebase/config";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

export class FirebaseCalendarRepository implements CalendarRepository {
  async getHolidayByDate(date: string): Promise<Holiday | null> {
    // Buscamos un documento cuyo ID sea exactamente la fecha (ej: "2026-03-20")
    const docRef = doc(db, "calendar", date);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();

    // Mapeo estricto para cumplir con TypeScript
    return {
      date: snap.id,
      reason: data.reason || "Día de asueto",
      type: (data.type as HolidayType) || "CUSTOM",
    };
  }
  async saveHoliday(holiday: Holiday): Promise<void> {
    const docRef = doc(db, "calendar", holiday.date);
    await setDoc(docRef, holiday); // Firebase creará la colección si no existe
  }

  // TRAE SOLO LOS ASUETOS DE HOY EN ADELANTE
  async getUpcomingHolidays(): Promise<Holiday[]> {
    const today = new Date().toLocaleDateString("en-CA");

    // Traemos fechas mayores o iguales a hoy, ordenadas cronológicamente
    const q = query(
      collection(db, "calendar"),
      where("date", ">=", today),
      orderBy("date", "asc"),
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => doc.data() as Holiday);
  }

  async deleteHoliday(date: string): Promise<void> {
    const docRef = doc(db, "calendar", date);
    await deleteDoc(docRef);
  }
}
