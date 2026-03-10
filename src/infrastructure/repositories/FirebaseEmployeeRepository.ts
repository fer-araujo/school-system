import { db } from "../firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import type { EmployeeRepository } from "../../domain/repositories/EmployeeRepository";
import type { User } from "../../domain/models/User";

export class FirebaseEmployeeRepository implements EmployeeRepository {
  async countActiveWorkers(): Promise<number> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "WORKER"),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    return snap.size;
  }

  async getAllWorkers(): Promise<User[]> {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as User)
      .filter((u) => u.role === "WORKER");
  }

  async getWorkerById(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

  async getWorkerByEmployeeNumber(empNo: string): Promise<User | null> {
    const q = query(
      collection(db, "users"),
      where("employeeNumber", "==", empNo),
    );
    const snap = await getDocs(q);
    return snap.empty
      ? null
      : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as User);
  }

  async getWorkerByBadgeId(badgeId: string): Promise<User | null> {
    const q = query(collection(db, "users"), where("badgeId", "==", badgeId));
    const snap = await getDocs(q);
    return snap.empty
      ? null
      : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as User);
  }

  async createEmployee(user: User): Promise<void> {
    await setDoc(doc(db, "users", user.id), user);
  }

  async updateEmployee(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, "users", uid), data);
  }

  async deleteEmployee(uid: string): Promise<void> {
    await deleteDoc(doc(db, "users", uid));
  }

  generateNewId(): string {
    return doc(collection(db, "users")).id;
  }
}
