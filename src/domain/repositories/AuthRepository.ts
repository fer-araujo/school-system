import type { User } from "../models/User";

export interface AuthRepository {
  login(email: string, pass: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}