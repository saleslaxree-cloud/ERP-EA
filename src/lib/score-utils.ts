// ═══════════════════════════════════════════════════════════
// SHARED SCORE UTILITIES
// ═══════════════════════════════════════════════════════════
// Single source of truth for revision-penalty logic.
//
// ─── Date-based dual system (v9 · 2026-06-27) ────────────────
// Tasks created ON OR AFTER 27 June 2026 use the NEW lenient logic:
//   1st revision → 0  (no impact)
//   2nd revision → 0  (no impact)
//   3rd revision → -20 (penalty STARTS here)
//   4th revision → -25 additional
//   5th+ revision → -25 each
//   Per-task score floor: 0
//
// Tasks created BEFORE 27 June 2026 keep the ORIGINAL strict logic:
//   1st revision → -10
//   2nd revision → -15  (cumulative -25)
//   3rd revision → -20  (cumulative -45)
//   4th+ revision → -25 each
//
// This cutoff guarantees:
//   ✅ No existing task is retroactively penalised differently.
//   ✅ No historical score is recalculated.
//   ✅ Only future tasks (and their revisions) follow the new rules.
// ═══════════════════════════════════════════════════════════

import type { WorkflowStatusType } from './constants'

// 27 June 2026, 00:00:00 IST (UTC+5:30) → 26 June 2026 18:30:00 UTC
export const SCORE_V2_CUTOFF_ISO = '2026-06-26T18:30:00.000Z'
export const SCORE_V2_CUTOFF_DATE = new Date(SCORE_V2_CUTOFF_ISO)
export const SCORE_V2_CUTOFF_LABEL = '27 June 2026'

/**
 * Returns true if the task was created on or after the v2 cutoff
 * (27 June 2026, IST). Tasks created before this date keep the
 * original strict revision penalty; tasks on/after use the new
 * lenient penalty.
 */
export function usesV2Scoring(taskCreatedAt: Date | string | null | undefined): boolean {
  if (!taskCreatedAt) return false
  const created = taskCreatedAt instanceof Date ? taskCreatedAt : new Date(taskCreatedAt)
  if (isNaN(created.getTime())) return false
  return created.getTime() >= SCORE_V2_CUTOFF_DATE.getTime()
}

/**
 * Compute the cumulative revision penalty for a given task.
 *
 * @param reviseCount   Number of revisions applied so far (>= 0)
 * @param taskCreatedAt Task creation timestamp — decides which system applies
 * @returns Cumulative penalty points (>= 0). Caller must clamp to a per-task floor of 0.
 */
export function revisionPenalty(reviseCount: number, taskCreatedAt: Date | string | null | undefined): number {
  if (!reviseCount || reviseCount <= 0) return 0

  const useV2 = usesV2Scoring(taskCreatedAt)

  if (useV2) {
    // NEW logic (tasks created on/after 27 June 2026)
    // 1st & 2nd revision → 0
    // 3rd revision       → -20
    // 4th revision       → -25 additional
    // 5th+               → -25 each
    let penalty = 0
    for (let i = 1; i <= reviseCount; i++) {
      if (i <= 2) penalty += 0           // 1st & 2nd — no impact
      else if (i === 3) penalty += 20    // 3rd — start of penalty
      else penalty += 25                 // 4th and beyond
    }
    return penalty
  }

  // ORIGINAL logic (tasks created before 27 June 2026) — preserved unchanged
  let penalty = 0
  for (let i = 1; i <= reviseCount; i++) {
    if (i === 1) penalty += 10
    else if (i === 2) penalty += 15
    else if (i === 3) penalty += 20
    else penalty += 25
  }
  return penalty
}

/**
 * Compute the incremental penalty for the NEXT revision (i.e. the penalty
 * that the (reviseCount + 1)th revision will add on top of the current
 * cumulative penalty). Used by the UI to show "this revision will cost -X".
 *
 * @param currentReviseCount  Revisions already applied
 * @param taskCreatedAt       Task creation timestamp
 * @returns The additional penalty the NEXT revision will incur
 */
export function nextRevisionIncrement(currentReviseCount: number, taskCreatedAt: Date | string | null | undefined): number {
  const nextIndex = (currentReviseCount || 0) + 1
  const currentPenalty = revisionPenalty(currentReviseCount, taskCreatedAt)
  const nextPenalty = revisionPenalty(nextIndex, taskCreatedAt)
  return Math.max(0, nextPenalty - currentPenalty)
}

/**
 * Human-readable explanation of which scoring system applies to a task.
 * Used by the UI to display the correct penalty table.
 */
export function scoringSystemLabel(taskCreatedAt: Date | string | null | undefined): {
  version: 'v1' | 'v2'
  label: string
  description: string
  rules: { revision: string; penalty: string }[]
} {
  if (usesV2Scoring(taskCreatedAt)) {
    return {
      version: 'v2',
      label: `New scoring (on/after ${SCORE_V2_CUTOFF_LABEL})`,
      description: 'First two revisions are free. Penalty starts from the 3rd revision.',
      rules: [
        { revision: '1st revision', penalty: 'No impact (0 pts)' },
        { revision: '2nd revision', penalty: 'No impact (0 pts)' },
        { revision: '3rd revision', penalty: '-20 points' },
        { revision: '4th revision', penalty: '-25 additional' },
        { revision: '5th+ revision', penalty: '-25 each' },
      ],
    }
  }
  return {
    version: 'v1',
    label: `Original scoring (before ${SCORE_V2_CUTOFF_LABEL})`,
    description: 'Progressive penalty from the 1st revision. Preserved for historical tasks.',
    rules: [
      { revision: '1st revision', penalty: '-10 points' },
      { revision: '2nd revision', penalty: '-15 additional (total -25)' },
      { revision: '3rd revision', penalty: '-20 additional (total -45)' },
      { revision: '4th+ revision', penalty: '-25 each' },
    ],
  }
}

/**
 * Final per-task score floor is always 0.
 */
export function clampTaskScore(score: number): number {
  return Math.max(0, Math.round(score))
}

// ─── Re-export for backwards-compat (older code that imports from constants) ───
export type { WorkflowStatusType }
