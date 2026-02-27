import type { Shift, ShiftAssignment } from "../models/Shift";

export interface ShiftRepository {
  saveShift(shift: Shift): Promise<void>;
  getAllShifts(): Promise<Shift[]>;
  getShiftById(shiftId: string): Promise<Shift | null>;
  deleteShift(shiftId: string): Promise<void>;
  saveAssignment(assignment: ShiftAssignment): Promise<void>;
  getActiveAssignmentForUser(
    userId: string,
    targetDate: string,
  ): Promise<ShiftAssignment | null>;
}
