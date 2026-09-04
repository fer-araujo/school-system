import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, type DocumentData } from "firebase/firestore";
import type { AuthRepository } from "../../domain/repositories/AuthRepository";
import type { User, UserRole } from "../../domain/models/User";

const VALID_ROLES: readonly UserRole[] = ["ADMIN", "WORKER", "SCANNER"];

/**
 * Marker used by the UI to tell an invalid-role rejection apart from a
 * Firebase auth failure, matching how firebase surfaces its own codes.
 */
export const INVALID_ROLE_CODE = "auth/invalid-role";

function isValidRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Every session flows through here, so this is the single place where the
 * Firestore document is validated instead of being cast blindly.
 */
function toUser(uid: string, data: DocumentData): User {
  if (!isValidRole(data.role)) {
    throw new Error(INVALID_ROLE_CODE);
  }
  // id last: the document id is authoritative over any stored `id` field.
  return { ...data, id: uid, role: data.role } as User;
}

export class FirebaseAuthRepository implements AuthRepository {
  async login(email: string, pass: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    return this.getUserData(credential.user.uid);
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async getCurrentUser(): Promise<User | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return this.getUserData(currentUser.uid);
  }

  private async getUserData(uid: string): Promise<User> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) throw new Error("User not found in database");

    return toUser(uid, userDoc.data());
  }
}
