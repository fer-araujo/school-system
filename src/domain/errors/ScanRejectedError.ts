/**
 * Why a scan was refused. The UI needs to tell these apart — a duplicate
 * swipe must not look like an unrecognized badge — and matching on Spanish
 * message strings would break the moment the copy is reworded.
 */
export type ScanRejectionCode =
  | "EMPTY_BADGE"
  | "BADGE_NOT_RECOGNIZED"
  | "EMPLOYEE_INACTIVE"
  | "HOLIDAY"
  | "ON_LEAVE"
  | "SHIFT_ENDED"
  | "BLOCK_MISMATCH"
  | "DUPLICATE_SWIPE"
  | "DOUBLE_ENTRY"
  | "DOUBLE_EXIT"
  | "EXIT_WITHOUT_ENTRY";

export class ScanRejectedError extends Error {
  readonly code: ScanRejectionCode;
  /** Values the terminal renders, e.g. the time of the standing check-in. */
  readonly context?: Record<string, string | number>;

  constructor(
    code: ScanRejectionCode,
    message: string,
    context?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "ScanRejectedError";
    this.code = code;
    this.context = context;
  }
}

export const isScanRejectedError = (
  error: unknown,
): error is ScanRejectedError => error instanceof ScanRejectedError;
