# Task 6 - Fix Task Approval Flow Backend

## Agent: Task Agent

## Summary
Fixed the complete task approval workflow in the LAXREE Enterprise Workflow system to properly route tasks through the full approval chain: Employee → EA Review → Director → EA Final → Employee Final Submit → COMPLETED.

## Files Modified

### Backend
1. **`/home/z/my-project/src/app/api/tasks/[id]/route.ts`** (PATCH handler)
   - Added intercept for COMPLETED status when task has active workflow → routes to EA Review instead
   - Added intercept for IN_REVIEW from ON_HOLD → Director approval routes to EA Final
   - Added intercept for PENDING from ON_HOLD → Director rejection resets workflow
   - Added support for Final Submit when workflow is APPROVED

2. **`/home/z/my-project/src/app/api/tasks/[id]/steps/route.ts`** (PATCH handler)
   - When all steps completed and task has active workflow → triggers EA Review instead of auto-completing
   - Added support for Final Submit when workflow is APPROVED

3. **`/home/z/my-project/src/app/api/approval-action/route.ts`** (POST handler)
   - EA Final APPROVE no longer completes the task directly
   - Sets workflow to APPROVED and task to IN_PROGRESS for employee final submission

### Frontend
4. **`/home/z/my-project/src/components/laxree/laxree-task-detail.tsx`**
   - Added "Submit for Review" and "Final Submit" buttons based on workflow status
   - Director approve sends IN_REVIEW instead of COMPLETED
   - Director reject sends PENDING instead of REJECTED
   - Updated approval routing flow diagram

5. **`/home/z/my-project/src/components/laxree/laxree-dir-dependency.tsx`**
   - Changed EA Final button from "Final Submit & Complete" to "Submit to Employee"

6. **`/home/z/my-project/src/components/laxree/laxree-approvals.tsx`**
   - Changed "Mark Done" to "Submit for Review"
   - Changed "Approve & Complete" to "Approve & Send to Review"

7. **`/home/z/my-project/src/components/task-list.tsx`**
   - Added "Submit for Review" button for IN_PROGRESS tasks with workflow (not approved)
   - Added "Final Submit" button for IN_PROGRESS tasks with APPROVED workflow
   - Updated EA Final action label to "Submit to Employee"

## The Correct Flow (Now Implemented)
```
Employee does work → clicks "Submit for Review"
  → Employee workflow step COMPLETED
  → EA Review step becomes IN_REVIEW (task status: IN_REVIEW)
  → EA reviews, clicks "Send to Director"
  → EA step APPROVED, Director step IN_REVIEW (task status: ON_HOLD)
  → Director clicks "Approve & Send to EA"
  → Director step APPROVED, EA Final step IN_REVIEW (task status: IN_REVIEW)
  → EA Final clicks "Submit to Employee"
  → EA Final step APPROVED, workflow APPROVED (task status: IN_PROGRESS, back to employee)
  → Employee reviews and clicks "Final Submit"
  → Task COMPLETED, workflow COMPLETED
```

## Key Edge Cases Handled
- If employee tries to complete task when workflow has already progressed past employee step (e.g., Director rejected and employee resubmits), the intercept is skipped
- If workflow is already APPROVED, "Final Submit" completes the task normally
- Director rejection properly resets the workflow and employee step for redo
