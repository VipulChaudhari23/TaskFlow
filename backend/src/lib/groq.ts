import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL        = 'llama-3.3-70b-versatile'; // Best free model on Groq

const callGroq = async (
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024
): Promise<string> => {
  const { data } = await axios.post(
    GROQ_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens:  maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return data?.choices?.[0]?.message?.content?.trim() || '';
};

// ── Task title + description improver ──
export const improveTaskWithAI = async (
  title: string,
  description: string
): Promise<{ title: string; description: string }> => {
  const system = `You are an expert task management assistant working with professionals.
Your job is to rewrite task titles and descriptions to be:
- Crystal clear and specific (not vague)
- Action-oriented (starts with a verb)
- Professional and concise
- Detailed enough to be immediately actionable

ALWAYS respond with ONLY a valid JSON object. No markdown fences, no explanation.
Format exactly: {"title": "...", "description": "..."}`;

  const user = `Rewrite this work task to be professional, specific and actionable:

Original Title: ${title}
Original Description: ${description || 'Not provided'}

Make the title under 12 words starting with an action verb.
Make the description 2-3 clear sentences explaining WHAT, WHY, and HOW.
Respond with JSON only.`;

  const raw = await callGroq(system, user, 300);

  // Extract JSON safely
  const match = raw.match(/\{[\s\S]*?"title"[\s\S]*?"description"[\s\S]*?\}/);
  if (match) {
    try { return JSON.parse(match[0]); }
    catch { /* fall through */ }
  }
  // Fallback — return originals if parse fails
  return { title, description };
};

// ── Detailed productivity report ──
export const generateProductivityReport = async (
  userName: string,
  profileName: string,
  tasks: Array<{
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string | null;
  }>,
  period: string
): Promise<string> => {
  // Compute stats
  const total          = tasks.length;
  const completed      = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgress     = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const pending        = tasks.filter(t => t.status === 'PENDING').length;
  const highPriority   = tasks.filter(t => t.priority === 'HIGH').length;
  const medPriority    = tasks.filter(t => t.priority === 'MEDIUM').length;
  const lowPriority    = tasks.filter(t => t.priority === 'LOW').length;
  const overdue        = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
  ).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group tasks by status with full details
  const completedTasks  = tasks.filter(t => t.status === 'COMPLETED');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const pendingTasks    = tasks.filter(t => t.status === 'PENDING');
  const overdueTasks    = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
  );

  // Format task list with full details for AI
  const formatTaskList = (taskList: typeof tasks) =>
    taskList.slice(0, 30).map(t =>
      `  • [${t.priority}] "${t.title}"${t.description ? ` — ${t.description.slice(0, 80)}` : ''}` +
      ` (Created: ${new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` +
      `${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''})`
    ).join('\n');

  const system = `You are a senior productivity analyst and career coach.
You write detailed, insightful, and genuinely helpful productivity reports for professionals.
Your reports are:
- Based on actual task content, not just numbers
- Specific about what work was done and what it reveals about work patterns
- Actionable with concrete next steps
- Encouraging but honest about gaps
- Written in professional business English
Use markdown with ## headers. Be thorough — this is a real performance document.`;

  const user = `Generate a comprehensive productivity report for ${userName} (Profile: ${profileName}) for ${period}.

═══ STATISTICS ═══
Total Tasks: ${total}
✅ Completed: ${completed} (${completionRate}%)
🔄 In Progress: ${inProgress}
⏳ Pending: ${pending}
🔴 Overdue: ${overdue}
Priority Breakdown: HIGH=${highPriority} | MEDIUM=${medPriority} | LOW=${lowPriority}

═══ COMPLETED WORK (${completedTasks.length} tasks) ═══
${completedTasks.length > 0 ? formatTaskList(completedTasks) : '  None completed this period'}

═══ IN PROGRESS (${inProgressTasks.length} tasks) ═══
${inProgressTasks.length > 0 ? formatTaskList(inProgressTasks) : '  None in progress'}

═══ PENDING / BACKLOG (${pendingTasks.length} tasks) ═══
${pendingTasks.length > 0 ? formatTaskList(pendingTasks.slice(0, 15)) : '  No pending tasks'}

${overdueTasks.length > 0 ? `═══ OVERDUE TASKS (${overdueTasks.length}) ═══\n${formatTaskList(overdueTasks)}` : ''}

Write a detailed report with these sections:

## Executive Summary
(3-4 sentences summarising the period — mention actual work done, not just numbers)

## Work Accomplished
(Detail what was actually completed — group by themes/technology if patterns are visible. Be specific about the type of work.)

## Current Focus Areas
(Analyse the in-progress tasks — what domains is this person focused on?)

## Productivity Score: X/100
(Score based on completion rate, overdue items, priority management. Show calculation clearly.)

## Strengths & Wins
(Specific observations based on actual task content — what is this person doing well?)

## Areas Needing Attention
(Specific gaps — address overdue items, backlog size, priority distribution)

## Actionable Recommendations
(5 concrete, specific recommendations based on actual task content — not generic advice)

## Week-by-Week Insight
(Any patterns in when tasks were created/completed — workload distribution)

## Conclusion & Next Period Goals
(Motivating close with 2-3 specific goals for the next period based on current backlog)`;

  try {
    const report = await callGroq(system, user, 2000);
    if (report && report.length > 200) return report;
    return generateFallbackReport(userName, profileName, tasks, {
      total, completed, inProgress, pending, highPriority, overdue, completionRate
    }, period);
  } catch {
    return generateFallbackReport(userName, profileName, tasks, {
      total, completed, inProgress, pending, highPriority, overdue, completionRate
    }, period);
  }
};

// ── Detailed fallback — always works even without AI ──
const generateFallbackReport = (
  userName: string,
  profileName: string,
  tasks: Array<{ title: string; status: string; priority: string; createdAt: string; dueDate?: string | null }>,
  s: { total: number; completed: number; inProgress: number; pending: number; highPriority: number; overdue: number; completionRate: number },
  period: string
): string => {
  const score = Math.min(100, Math.round(
    (s.completionRate * 0.45) +
    (s.overdue === 0 ? 20 : Math.max(0, 20 - s.overdue * 4)) +
    (s.highPriority > 0 ? 15 : 8) +
    (s.total >= 5 ? 15 : s.total * 3)
  ));

  const completedList  = tasks.filter(t => t.status === 'COMPLETED').slice(0, 10);
  const inProgressList = tasks.filter(t => t.status === 'IN_PROGRESS').slice(0, 5);
  const overduelist    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED');

  return `## Executive Summary
${userName} (${profileName}) managed **${s.total} tasks** during ${period}, completing **${s.completed}** with a ${s.completionRate}% completion rate. ${s.completionRate >= 70 ? 'This is a strong result, indicating consistent execution.' : s.completionRate >= 40 ? 'Moderate progress was made with room for improvement in closing open items.' : 'The period shows significant backlog accumulation that needs focused attention.'}${s.overdue > 0 ? ` There are ${s.overdue} overdue items requiring immediate attention.` : ' All deadlines were respected — excellent time management.'}

## Work Accomplished
${completedList.length > 0
  ? completedList.map(t => `- **${t.title}** *(${t.priority} priority)*`).join('\n')
  : '- No tasks completed this period.'}

## Current Focus Areas
${inProgressList.length > 0
  ? inProgressList.map(t => `- **${t.title}** *(${t.priority} priority)*`).join('\n')
  : '- No tasks currently in progress.'}

## Productivity Score: ${score}/100
| Factor | Value | Score |
|--------|-------|-------|
| Completion Rate (${s.completionRate}%) | ${s.completionRate >= 70 ? '✅ Above target' : '⚠️ Below target'} | ${Math.round(s.completionRate * 0.45)}/45 |
| Deadline Management | ${s.overdue === 0 ? '✅ No overdue' : `⚠️ ${s.overdue} overdue`} | ${s.overdue === 0 ? 20 : Math.max(0, 20 - s.overdue * 4)}/20 |
| Priority Handling | ${s.highPriority > 0 ? '✅ Active' : '➖ None'} | ${s.highPriority > 0 ? 15 : 8}/15 |
| Task Volume | ${s.total >= 5 ? '✅ Good' : '⚠️ Low'} | ${s.total >= 5 ? 15 : s.total * 3}/20 |

## Strengths & Wins
- ${s.completed > 0 ? `Successfully closed ${s.completed} task${s.completed > 1 ? 's' : ''} this period` : 'Tasks are being tracked and organised systematically'}
- ${s.overdue === 0 ? 'Perfect deadline management — zero overdue tasks' : `Managing ${s.highPriority} high-priority items simultaneously`}
- ${s.inProgress > 0 ? `${s.inProgress} task${s.inProgress > 1 ? 's' : ''} actively progressing, showing sustained momentum` : 'Clean slate — ready to take on new priorities'}

## Areas Needing Attention
${overduelist.length > 0 ? overduelist.map(t => `- ⚠️ **OVERDUE:** ${t.title}`).join('\n') : '- ✅ No overdue tasks'}
${s.pending > s.completed ? `- ${s.pending} pending tasks indicate a growing backlog — needs prioritisation` : ''}
${s.completionRate < 70 ? `- Completion rate of ${s.completionRate}% is below the 70% recommended benchmark` : ''}

## Actionable Recommendations
1. ${s.overdue > 0 ? `Immediately address ${s.overdue} overdue task${s.overdue > 1 ? 's' : ''} — reschedule or delegate` : 'Maintain your zero-overdue discipline'}
2. ${s.pending > 5 ? 'Conduct a backlog review — break large tasks into 30-min actions' : 'Continue your structured task management approach'}
3. Set a daily "shutdown ritual" — update task statuses at end of each workday
4. Use the Kanban view to visualise workflow bottlenecks at a glance
5. ${s.completionRate < 70 ? 'Focus on completing existing tasks before adding new ones' : 'Share your productivity system — you\'re a model for the team'}

## Conclusion & Next Period Goals
${s.completionRate >= 70
  ? `Excellent period, ${userName}! The ${s.completionRate}% completion rate is above target.`
  : `With focused effort, ${userName} can significantly improve next period.`}

**Goals for next period:**
1. Clear the ${s.pending} pending tasks backlog by 50%
2. Maintain zero overdue items${s.overdue > 0 ? ` (resolve current ${s.overdue} first)` : ''}
3. Target ${Math.min(100, s.completionRate + 15)}% completion rate`;
};