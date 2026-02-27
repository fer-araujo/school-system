import { db } from "../firebase/config";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import type { AbsenceRepository } from "../../domain/repositories/AbsenceRepository";
import type { Absence, AbsenceType } from "../../domain/models/Absence";

export class FirebaseAbsenceRepository implements AbsenceRepository {
  async saveAbsences(absences: Absence[]): Promise<void> {
    const batch = writeBatch(db);

    absences.forEach((absence) => {
      const docRef = doc(db, "absences", absence.id);
      batch.set(docRef, absence);
    });

    await batch.commit();
  }

  async getAbsenceForUserAndDate(
    userId: string,
    date: string,
  ): Promise<Absence | null> {
    const docId = `${userId}_${date}`;
    const docRef = doc(db, "absences", docId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      userId: data.userId,
      date: data.date,
      type: data.type as AbsenceType,
      notes: data.notes || "",
    };
  }
}
