/**
 * Shortest work period the system accepts, in minutes.
 *
 * A second swipe inside this window is a duplicate, not a check-out: staff
 * re-scan when they are unsure the first one registered. Set to 10 by the
 * school after a teacher was afraid to re-scan because it would have clocked
 * her out.
 *
 * It is a constant rather than a per-shift setting because it describes
 * hardware and human debounce, not shift policy — and because the rule must
 * still apply when there is no shift at all.
 */
export const MIN_PERIOD_MINUTES = 10;
