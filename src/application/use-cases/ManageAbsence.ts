// src/application/use-cases/ManageAbsences.ts
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../infrastructure/firebase/config";
import type { Absence } from "../../domain/models/Absence";
import type { User } from "../../domain/models/User";

export class ManageAbsences {
  // Obtiene todos los permisos y les inyecta el nombre del maestro
  async getAllAbsences(): Promise<Absence[]> {
    // 1. Traemos los usuarios para el "Diccionario"
    const usersSnap = await getDocs(collection(db, "users"));
    const userMap = new Map<string, string>();
    usersSnap.forEach((doc) => {
      const user = doc.data() as User;
      userMap.set(user.id, user.fullName);
    });

    // 2. Traemos las ausencias
    const absencesSnap = await getDocs(collection(db, "absences"));
    const absences = absencesSnap.docs.map((doc) => {
      const data = doc.data() as Absence;
      return {
        ...data,
        employeeName: userMap.get(data.userId) || "Empleado Eliminado",
      };
    });

    // 3. Ordenamos por fecha de inicio (las más recientes primero)
    return absences.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async createAbsence(
    data: Omit<Absence, "id" | "employeeName">,
  ): Promise<void> {
    const newId = `abs_${Date.now()}`;
    await setDoc(doc(db, "absences", newId), { ...data, id: newId });
  }

  async updateAbsence(data: Absence): Promise<void> {
    const ref = doc(db, "absences", data.id);

    // Armamos el objeto explícitamente sin el employeeName para que el linter sea feliz
    const cleanData = {
      userId: data.userId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
    };

    await updateDoc(ref, cleanData);
  }

  async deleteAbsence(id: string): Promise<void> {
    await deleteDoc(doc(db, "absences", id));
  }
}
