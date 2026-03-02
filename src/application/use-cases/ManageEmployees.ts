import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
import { db, secondaryAuth } from "../../infrastructure/firebase/config";
import type { User } from "../../domain/models/User";

export class ManageEmployees {
  // 1. OBTENER TODOS LOS EMPLEADOS
  async getAllWorkers(): Promise<User[]> {
    const snap = await getDocs(collection(db, "users"));
    const allUsers = snap.docs.map((doc) => doc.data() as User);
    // Filtramos para devolver solo trabajadores (o todos, si prefieres)
    return allUsers.filter((u) => u.role === "WORKER");
  }

  // 2. CREAR EMPLEADO
  async createEmployee(
    email: string,
    password: string,
    fullName: string,
    employeeNumber: string,
  ): Promise<void> {
    if (!email || !password || !fullName || !employeeNumber) {
      throw new Error("Todos los campos son obligatorios.");
    }

    try {
      // Usamos el clon de Auth para no cerrar la sesión del Admin
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      const newUid = userCredential.user.uid;

      // Cerramos sesión en el clon por limpieza
      await signOut(secondaryAuth);

      // Guardamos el perfil en Firestore
      const newUser: User = {
        id: newUid,
        email,
        fullName,
        role: "WORKER",
        isActive: true,
        employeeNumber,
      };

      await setDoc(doc(db, "users", newUid), newUser);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "auth/email-already-in-use"
      )
        throw new Error("El correo ya está registrado.");
      throw error;
    }
  }

  // 3. ELIMINAR (Solo de Firestore por ahora, borrar de Auth requiere Cloud Functions o credenciales Admin)
  async deleteEmployeeFromDatabase(uid: string): Promise<void> {
    await deleteDoc(doc(db, "users", uid));
  }
}
