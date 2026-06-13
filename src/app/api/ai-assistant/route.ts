import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WorkflowStatus } from '@/lib/constants'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { userId, question } = await request.json()

    if (!userId || !question) {
      return NextResponse.json({ error: 'userId and question are required' }, { status: 400 })
    }

    // Fetch employee's tasks
    const tasks = await db.task.findMany({
      where: { ownerId: userId, status: { notIn: [WorkflowStatus.CANCELLED] } },
      include: {
        taskSteps: { orderBy: { order: 'asc' } },
        owner: { select: { name: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Fetch employee's leaves
    const leaves = await db.leave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Build context
    const taskSummary = tasks.map(t => {
      const stepsDone = t.taskSteps.filter(s => s.status === 'COMPLETED').length
      const stepsTotal = t.taskSteps.length
      return `- "${t.title}" | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'} | Steps: ${stepsDone}/${stepsTotal}`
    }).join('\n')

    const leaveSummary = leaves.map(l =>
      `- ${l.leaveType} | ${new Date(l.fromDate).toLocaleDateString()} to ${new Date(l.toDate).toLocaleDateString()} | ${l.totalDays} days | Status: ${l.status} | Tag: ${l.applicationTag}`
    ).join('\n')

    const systemPrompt = `You are an AI assistant for Laxree Enterprise Operating System. You help employees with their tasks, leave management, and workflow guidance.

RULES:
- Employees CANNOT mark tasks as Done — only Arti Sharma (EA) can do that
- Employees can ONLY view their assigned tasks (read-only)
- If an employee asks to complete/mark done a task, tell them only Arti Sharma can do that
- Help them understand their task progress, what steps remain, and prioritize work
- Guide them on leave policies: Apply 1 day before for "AL" (Approved Leave), same day = "LA" (Late Arrival, shown in red)
- Be concise, friendly, and helpful
- Use bullet points for lists

EMPLOYEE'S CURRENT TASKS:
${taskSummary || 'No tasks assigned'}

EMPLOYEE'S LEAVE HISTORY:
${leaveSummary || 'No leaves applied'}`

    // Use ZAI SDK for AI chat
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const answer = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response. Please try again.'

    return NextResponse.json({ answer })
  } catch (error: any) {
    console.error('AI Assistant error:', error)
    return NextResponse.json({ error: 'AI assistant failed', details: error.message }, { status: 500 })
  }
}
