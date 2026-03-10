import type { User } from "../models/User";

export interface EmployeeRepository {
  countActiveWorkers(): Promise<number>;
  getAllWorkers(): Promise<User[]>;
  getWorkerById(uid: string): Promise<User | null>;
  getWorkerByEmployeeNumber(empNo: string): Promise<User | null>;
  getWorkerByBadgeId(badgeId: string): Promise<User | null>;
  createEmployee(user: User): Promise<void>;
  updateEmployee(uid: string, data: Partial<User>): Promise<void>;
  deleteEmployee(uid: string): Promise<void>;
  generateNewId(): string;
}
