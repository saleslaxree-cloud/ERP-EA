import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@/lib/constants'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { userId, question, history = [] } = await request.json()

    if (!userId || !question) {
      return NextResponse.json({ error: 'userId and question are required' }, { status: 400 })
    }

    // Fetch employee's tasks with steps
    const tasks = await db.task.findMany({
      where: { ownerId: userId, status: { notIn: [WorkflowStatus.CANCELLED] } },
      include: {
        taskSteps: { orderBy: { order: 'asc' } },
        owner: { select: { name: true, department: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    // Fetch employee's leaves
    const leaves = await db.leave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Fetch employee's user info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, department: true, designation: true, role: true },
    })

    // Build rich task context with step details
    const taskSummary = tasks.map(t => {
      const stepsDone = t.taskSteps.filter(s => s.status === 'COMPLETED').length
      const stepsTotal = t.taskSteps.length
      const stepDetails = t.taskSteps.map((s, i) =>
        `    Step ${i + 1}: "${s.title}" — ${s.status}${s.assigneeId ? '' : ' (unassigned)'}${s.dueDate ? ` | Due: ${new Date(s.dueDate).toLocaleDateString()}` : ''}`
      ).join('\n')
      return `- "${t.title}" | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'} | Category: ${t.category || 'N/A'} | Department: ${t.department || 'N/A'} | Steps: ${stepsDone}/${stepsTotal}\n${stepsTotal > 0 ? stepDetails : '    (No steps defined)'}`
    }).join('\n\n')

    const leaveSummary = leaves.map(l =>
      `- ${l.leaveType} | ${new Date(l.fromDate).toLocaleDateString()} to ${new Date(l.toDate).toLocaleDateString()} | ${l.totalDays} days | Status: ${l.status} | Tag: ${l.applicationTag}`
    ).join('\n')

    // Categorize tasks for the AI
    const pendingTasks = tasks.filter(t => t.status === 'PENDING')
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
    const highPriorityTasks = tasks.filter(t => ['HIGH', 'CRITICAL'].includes(t.priority))
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED')

    const systemPrompt = `You are an AI Workflow Assistant for Laxree Enterprise Operating System (EOS). You are designed to help employees organize, divide, and manage their work effectively.

EMPLOYEE INFO:
- Name: ${user?.name || 'Unknown'}
- Department: ${user?.department || 'N/A'}
- Designation: ${user?.designation || 'N/A'}
- Role: ${user?.role || 'EMPLOYEE'}

TASK SUMMARY:
Total Active Tasks: ${tasks.length}
- Pending: ${pendingTasks.length}
- In Progress: ${inProgressTasks.length}
- High/Critical Priority: ${highPriorityTasks.length}
- Overdue: ${overdueTasks.length}

DETAILED TASKS WITH STEPS:
${taskSummary || 'No tasks assigned'}

LEAVE HISTORY:
${leaveSummary || 'No leaves applied'}

IMPORTANT RULES:
1. Employees CANNOT mark tasks as Done — only Arti Sharma (EA) can do that
2. Employees can ONLY view their assigned tasks (read-only)
3. If an employee asks to complete/mark done a task, tell them only Arti Sharma (EA) can do that
4. Help them understand their task progress, what steps remain, and prioritize work
5. Guide them on leave policies: Apply 1 day before for "AL" (Approved Leave), same day = "LA" (Late Arrival, shown in red)
6. Be concise, friendly, and helpful
7. Use bullet points for lists

WORKFLOW DIVISION GUIDANCE — When an employee asks how to divide their work or organize their workflow, you MUST provide:
- Step-by-step breakdown of how to approach their tasks
- Priority ordering (what to do first, second, etc.)
- Time-blocking suggestions (morning/afternoon splits)
- Dependencies between tasks (if one must finish before another starts)
- Practical tips for managing workload
- Suggest breaking large tasks into smaller sub-steps if no steps exist

FORMAT YOUR RESPONSES:
- Use clear headings with emoji markers (📋, ⏰, 💡, ⚠️, ✅)
- Use numbered lists for sequential steps
- Use bullet points for options/suggestions
- Keep paragraphs short (2-3 sentences max)
- Always end with a helpful next-step suggestion

CURRENT DATE: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

    // Build conversation with history (max last 10 messages for context)
    const recentHistory = history.slice(-10)
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((msg: { role: string; text: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text,
      })),
      { role: 'user', content: question },
    ]

    // Use ZAI SDK for AI chat
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 800,
    })

    const answer = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.'

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('AI Assistant error:', error)
    return NextResponse.json({ error: 'AI assistant failed', details: error.message }, { status: 500 })
  }
}
