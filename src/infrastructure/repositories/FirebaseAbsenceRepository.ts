import { db } from "../firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc, // 🌟 AÑADIMOS deleteDoc
} from "firebase/firestore";
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
      employeeName: data.employeeName,
      startDate: data.startDate,
      endDate: data.endDate,
      type: data.type as AbsenceType,
      notes: data.notes || "",
    };
  }

  async countAbsencesByDate(date: string): Promise<number> {
    const q = query(collection(db, "absences"), where("startDate", "<=", date));
    const snap = await getDocs(q);

    let count = 0;
    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.endDate || data.endDate >= date) {
        count++;
      }
    });

    return count;
  }

  async getAbsencesByDate(date: string): Promise<Absence[]> {
    const q = query(collection(db, "absences"), where("startDate", "<=", date));
    const snap = await getDocs(q);

    const absences: Absence[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.endDate || data.endDate >= date) {
        absences.push({ id: doc.id, ...data } as Absence);
      }
    });
    return absences;
  }

  async getAbsencesByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Absence[]> {
    const snap = await getDocs(collection(db, "absences"));
    return snap.docs
      .map((doc) => doc.data() as Absence)
      .filter((a) => a.startDate <= endDate && a.endDate >= startDate);
  }

  // 🌟 MÉTODOS NUEVOS IMPLEMENTADOS
  async getAllAbsences(): Promise<Absence[]> {
    const snap = await getDocs(collection(db, "absences"));
    return snap.docs.map((doc) => doc.data() as Absence);
  }

  async deleteAbsence(id: string): Promise<void> {
    const docRef = doc(db, "absences", id);
    await deleteDoc(docRef);
  }
}
