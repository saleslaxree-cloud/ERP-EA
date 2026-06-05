---
Task ID: 1-7
Agent: Main Agent
Task: Implement task dependency workflow with department/director dependencies and EA-Director approval chain

Work Log:
- Added Ashish Sir and Samarth Sir as directors in seed data (prisma/seed.ts)
- Added Management department to seed data
- Added 4th step template "EA Final Review & Submit" to Task Approval Workflow
- Rewrote task-list.tsx with enhanced create task form including:
  - Department dependency toggle buttons (Sales, Accounts, HR, Coordinator, Admin, Back Office, Management)
  - Director dependency toggle buttons (Ashish Sir, Samarth Sir)
  - Workflow template dropdown (optional)
  - Approval flow preview when dependencies selected
- Rewrote tasks API (POST) to auto-create workflow instances when dependencies are selected
- Created approval-action API endpoint for handling APPROVE, REJECT, SEND_BACK actions
- Enhanced Director Dependency view with:
  - Three-stage approval pipeline: EA Review → Director Approval → EA Final Review
  - Interactive approval cards with comments input and action buttons
  - Director "Send Back to EA" action with comments
  - EA "Final Submit" action
- Reseeded database with new directors and step templates
- Tested end-to-end: Create task with deps → EA Review → Director → Send Back / Approve → EA Final → Complete

Stage Summary:
- Full approval chain working: Employee → EA Review → Director Approval → EA Final Review → Complete
- Director can "Send Back to EA" with comments (for remaining employee tasks)
- EA can do Final Submit to complete the workflow
- Workflow template is auto-created when task has dependencies
- Ashish Sir and Samarth Sir are available as director dependencies
