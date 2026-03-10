export interface TimeBlock {
  start: string;
  end: string;
}

export interface Shift {
  id: string;
  name: string;
  workDays: string[];
  toleranceMinutes: number;
  blocksByDay: Record<string, TimeBlock[]>;
}

export interface ShiftAssignment {
  id: string;
  userId: string;
  shiftId: string;
  validFrom: string;
  validUntil?: string;
}
