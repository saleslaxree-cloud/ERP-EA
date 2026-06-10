# Task 9 - Fix Monday Meeting Live Score Auto-Update

## Agent: Task Agent

## Summary
Implemented live score auto-update for the Monday Meeting Scorecard. The "Actual Score" row is now automatically computed from the user's actual task performance data, with a LIVE badge and the ability for EA/admin to override.

## Changes Made

### 1. New API Endpoint: `/api/weekly-score/route.ts`
- Created a new GET endpoint at `/api/weekly-score` that accepts `userId`, `weekStart`, and `weekEnd` parameters
- Queries all tasks owned by the user that fall within the selected week (by dueDate, createdAt, or completedAt)
- Calculates task statistics:
  - **Green Score**: `completedOnTime / total * 100` — tasks completed before or on their due date
  - **Yellow Score**: `(inProgressOnTrack + completedLate) / total * 100` — tasks in progress/review/on-track + tasks completed late
  - **Red Score**: `(overdue + rejected) / total * 100` — tasks past due date not completed + rejected tasks
  - **PR Score**: Weighted performance rating from the scores
- Returns detailed breakdown including counts for each category

### 2. Updated Frontend: `/src/components/laxree/laxree-monday.tsx`
- Refactored state management to separate plan form data from actual score overrides
- Added `WeeklyScoreData` type and `LiveBadge` component
- Added query to fetch weekly score data from the new API endpoint
- Actual scores are now auto-calculated from live task data:
  - When live data is available and user hasn't overridden, shows auto-calculated values with green-bordered inputs
  - "LIVE" badge appears next to "Actual Score" label with pulse animation
  - Info banner shows task breakdown (on-time, in-progress/late, overdue/rejected)
- Override capability: EA can manually edit actual scores, which switches to "Override" mode
- "Reset to Live" button allows reverting overrides back to auto-calculated values
- PR Score auto-calculates from live data when not overridden
- Performance distribution bar shows "Live from task data" indicator
- Plan scores (This Week Plan, Next Week Plan) remain manual entry as before
- Commitments and notes remain manual entry as before

### Key Design Decisions
- Used derived state (useMemo) instead of effects to avoid React lint issues with setState-in-effect
- Separated `actualOverrides` state from `planForm` state for clean override tracking
- `mergedPlanForm` merges scorecard data with local edits for plan fields
- Live data always updates actual scores unless user has explicitly overridden them
- Switching user or week resets overrides
