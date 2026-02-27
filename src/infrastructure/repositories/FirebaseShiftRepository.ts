import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import type { ShiftRepository } from "../../domain/repositories/ShiftRepository";
import type { Shift, ShiftAssignment } from "../../domain/models/Shift";

export class FirebaseShiftRepository implements ShiftRepository {
  // --- TURNOS (CATÁLOGO) ---

  async saveShift(shift: Shift): Promise<void> {
    const docRef = doc(db, "shifts", shift.id);
    await setDoc(docRef, shift);
  }

  async getAllShifts(): Promise<Shift[]> {
    const snap = await getDocs(collection(db, "shifts"));
    return snap.docs.map((doc) => doc.data() as Shift);
  }

  async getShiftById(shiftId: string): Promise<Shift | null> {
    const docRef = doc(db, "shifts", shiftId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as Shift) : null;
  }

  // --- ASIGNACIONES A MAESTROS ---

  async saveAssignment(assignment: ShiftAssignment): Promise<void> {
    // Usamos el ID generado o creamos uno nuevo con el timestamp
    const id = assignment.id || `assign_${assignment.userId}_${Date.now()}`;
    const docRef = doc(db, "shift_assignments", id);
    await setDoc(docRef, { ...assignment, id });
  }

  async getActiveAssignmentForUser(
    userId: string,
    targetDate: string,
  ): Promise<ShiftAssignment | null> {
    // Buscamos todas las asignaciones del usuario
    const q = query(
      collection(db, "shift_assignments"),
      where("userId", "==", userId),
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const assignments = snap.docs.map((doc) => doc.data() as ShiftAssignment);

    // Filtramos en JavaScript para encontrar la que coincida con la fecha objetivo
    // (Firestore no es muy bueno haciendo validaciones de rangos superpuestos)
    const active = assignments.find((a) => {
      const isAfterStart = targetDate >= a.validFrom;
      const isBeforeEnd = a.validUntil ? targetDate <= a.validUntil : true;
      return isAfterStart && isBeforeEnd;
    });

    return active || null;
  }

  async deleteShift(shiftId: string): Promise<void> {
    const docRef = doc(db, "shifts", shiftId);
    await deleteDoc(docRef);
  }
}
