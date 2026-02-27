import { auth, db } from "../../infrastructure/firebase/config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { AuthRepository } from "./AuthRepository";
import type { User } from "../models/User";

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
    
    return { id: uid, ...userDoc.data() } as User;
  }
}