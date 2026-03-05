import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  collection,
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
    // 🟢 LA SOLUCIÓN: Un solo documento por empleado. Adiós al Date.now()
    const id = `assign_${assignment.userId}`;
    const docRef = doc(db, "shift_assignments", id);

    // Al usar setDoc con este ID fijo, si el empleado cambia de turno, sobrescribe el viejo.
    await setDoc(docRef, { ...assignment, id });
  }

  async getActiveAssignmentForUser(
    userId: string,
    targetDate: string,
  ): Promise<ShiftAssignment | null> {
    const docRef = doc(db, "shift_assignments", `assign_${userId}`);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const assignment = snap.data() as ShiftAssignment;

      // Validamos que la fecha actual (targetDate) esté dentro del rango de validez de la asignación
      const isAfterStart = targetDate >= assignment.validFrom;
      const isBeforeEnd = assignment.validUntil
        ? targetDate <= assignment.validUntil
        : true;

      // Solo devolvemos la asignación si ya entró en vigor y no ha expirado
      if (isAfterStart && isBeforeEnd) {
        return assignment;
      }
    }

    // Si no existe, o si existe pero su fecha aún no empieza (o ya caducó), devolvemos null
    return null;
  }

  async deleteShift(shiftId: string): Promise<void> {
    const docRef = doc(db, "shifts", shiftId);
    await deleteDoc(docRef);
  }
}
