---
Task ID: 1
Agent: Main Agent
Task: Build Monday Meeting Scorecard feature matching uploaded image

Work Log:
- Analyzed uploaded image showing Monday Meeting tracking sheet with Doer Name, Week Start/End, Week Number, Red/Yellow/Green scoring, and Save button
- Added MondayMeeting model to Prisma schema with fields: userId, weekStartDate, weekEndDate, weekNumber, year, planRedScore, planYellowScore, planGreenScore, actualRedScore, actualYellowScore, actualGreenScore, nextRedScore, nextYellowScore, nextGreenScore, prScore, commitments, notes
- Added User relation for MondayMeeting
- Ran Prisma migration (db push) successfully
- Created API route at /api/monday-meeting with GET (list/filter), POST (upsert), DELETE operations
- Completely rebuilt laxree-monday.tsx component with:
  - Doer Name selector (dropdown with all non-director employees)
  - Week navigation (prev/next with week number auto-calculation)
  - PR (Performance Rating) score display in header
  - Scorecard table matching uploaded image: Red/Yellow/Green columns for This Week Plan, Actual Score, Next Week Plan
  - Visual performance distribution bar (Red/Yellow/Green stacked)
  - Commitments for Next Week textarea
  - Notes/Remarks textarea
  - Save button with "Don't press save button twice" warning
  - Past Week Performance history panel with visual bars and PR scores
  - Team Overview table with all doers, quick selection
- Build passes successfully
- Database seeded successfully
- Dev server running on port 3000

Stage Summary:
- Monday Meeting feature fully rebuilt matching uploaded image design
- Uses database persistence (Prisma + SQLite) instead of localStorage
- Red/Yellow/Green scoring system implemented
- PR score auto-calculated from task performance data
- Past week performance history with visual distribution bars
- Next week commitment tracking
- All API routes working
