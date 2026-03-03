import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"; // Añadido updateDoc
import { db, secondaryAuth } from "../../infrastructure/firebase/config";
import type { User } from "../../domain/models/User";
import type { EmployeeFormData } from "../../app/components/admin/EmployeeForm";

export class ManageEmployees {
  async getAllWorkers(): Promise<User[]> {
    // Obtenemos la fecha de hoy para saber cuál es el turno "activo"
    const today = new Date().toLocaleDateString("en-CA");

    // 1. Descargamos todos los usuarios (y filtramos WORKERS)
    const usersSnap = await getDocs(collection(db, "users"));
    let workers = usersSnap.docs
      .map((doc) => doc.data() as User)
      .filter((u) => u.role === "WORKER");

    // 2. Descargamos el catálogo de turnos (Diccionario: id -> nombre)
    const shiftsSnap = await getDocs(collection(db, "shifts"));
    const shiftMap = new Map<string, string>();
    shiftsSnap.forEach((doc) => {
      shiftMap.set(doc.id, doc.data().name);
    });

    // 3. Descargamos TODAS las asignaciones de una vez
    const assignmentsSnap = await getDocs(collection(db, "shift_assignments"));

    // Creamos un diccionario en memoria (userId -> shiftId activo HOY)
    const activeAssignments = new Map<string, string>();

    assignmentsSnap.forEach((doc) => {
      const a = doc.data(); // Puedes tiparlo como as ShiftAssignment si lo importas

      // Aplicamos tu misma lógica de validación de fechas
      const isAfterStart = today >= a.validFrom;
      const isBeforeEnd = a.validUntil ? today <= a.validUntil : true;

      if (isAfterStart && isBeforeEnd) {
        // Guardamos el turno activo para este usuario
        activeAssignments.set(a.userId, a.shiftId);
      }
    });

    // 4. Cruzamos los datos finales para la tabla
    workers = workers.map((worker) => {
      // Buscamos si el empleado tiene un turno asignado para hoy
      const currentShiftId = activeAssignments.get(worker.id);

      return {
        ...worker,
        shiftId: currentShiftId,
        shiftName: currentShiftId
          ? shiftMap.get(currentShiftId) || "Turno eliminado"
          : "Sin asignar",
      };
    });

    return workers;
  }

  // --- CREAR EMPLEADO ---
  async createEmployee(
    data: EmployeeFormData,
  ): Promise<{ uid: string; empNo: string; tempPass: string }> {
    if (
      !data.email ||
      !data.fullName ||
      !data.position ||
      !data.department ||
      !data.phone
    ) {
      throw new Error(
        "Todos los campos obligatorios (incluyendo teléfono) deben estar llenos.",
      );
    }

    try {
      // 1. Generar Número Numérico (1000 a 9999)
      const generatedEmpNo = Math.floor(1000 + Math.random() * 9000).toString();

      // 2. Generar Contraseña Sencilla pero válida (6+ caracteres)
      const generatedPassword = `hola${generatedEmpNo}`;

      // 3. Crear en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        data.email,
        generatedPassword,
      );
      const newUid = userCredential.user.uid;
      await signOut(secondaryAuth);

      // 4. Guardar en Firestore (incluyendo el teléfono)
      const newUser: User = {
        id: newUid,
        email: data.email,
        fullName: data.fullName,
        role: "WORKER",
        employeeNumber: generatedEmpNo,
        phone: data.phone,
        department: data.department,
        position: data.position,
        isActive: true,
      };

      await setDoc(doc(db, "users", newUid), newUser);

      // DEVOLVEMOS LOS DATOS PARA MOSTRARLOS EN PANTALLA
      return {
        uid: newUid,
        empNo: generatedEmpNo,
        tempPass: generatedPassword,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        const err = error as { code?: string; message: string };
        if (err.code === "auth/email-already-in-use")
          throw new Error("Este correo ya está registrado.");
        throw new Error("Error de servidor: " + err.message);
      }
      throw new Error("Error desconocido al crear el empleado.");
    }
  }

  // --- EDITAR EMPLEADO ---
  async updateEmployee(data: EmployeeFormData): Promise<void> {
    if (!data.id) throw new Error("Se requiere el ID.");
    try {
      const userRef = doc(db, "users", data.id);
      await updateDoc(userRef, {
        fullName: data.fullName,
        phone: data.phone, // Actualizamos el teléfono también
        department: data.department,
        position: data.position,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error("Error al actualizar el perfil: " + error.message);
      }
      throw new Error("Error desconocido al actualizar el empleado.");
    }
  }

  async toggleEmployeeStatus(
    uid: string,
    currentStatus: boolean,
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", uid);
      // Guardamos lo contrario al estado actual
      await updateDoc(userRef, {
        isActive: !currentStatus,
      });
    } catch (error: unknown) {
      if (error instanceof Error) throw new Error(error.message);
      throw new Error("Error al actualizar el estado del empleado.");
    }
  }

  // --- ELIMINACIÓN PERMANENTE (Hard Delete) ---
  async deleteEmployeeFromDatabase(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      throw new Error(`Error al eliminar permanentemente al empleado de la base de datos: ${errorMessage}`);
    }
  }

}
