import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../infrastructure/firebase/config";

export class CompleteOnboarding {
  async execute(userId: string, newPassword: string): Promise<void> {
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
      throw new Error("No hay una sesión activa válida para este usuario.");
    }

    try {
      // 1. Actualizar contraseña en el proveedor de Identidad (Firebase Auth)
      await updatePassword(currentUser, newPassword);

      // 2. Actualizar el estado del dominio (Firestore)
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        requiresPasswordChange: false,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Interceptamos el error de Firebase si la sesión expiró por seguridad
        if (error.message.includes("auth/requires-recent-login")) {
          throw new Error(
            "Por seguridad, debes cerrar sesión, volver a entrar e intentarlo de nuevo.",
          );
        }
        throw new Error("Error al actualizar la contraseña: " + error.message);
      }
      throw new Error("Error desconocido al completar el proceso.");
    }
  }
}
