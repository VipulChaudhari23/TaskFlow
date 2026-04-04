import { improveTaskWithAI, generateProductivityReport } from '../lib/groq';
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const improveTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) { res.status(400).json({ message: 'Title is required' }); return; }
    const improved = await improveTaskWithAI(title, description || '');
    res.json(improved);
  } catch (err) { next(err); }
};

export const getProductivityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { range, profileId } = req.query;

    const now = new Date();
    let since: Date;
    let periodLabel: string;

    if (range === 'quarter') {
      since = new Date(now); since.setMonth(since.getMonth() - 3);
      periodLabel = 'Last Quarter (3 months)';
    } else {
      since = new Date(now); since.setDate(since.getDate() - 30);
      periodLabel = 'Last 30 Days';
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const profileWhere = profileId ? { id: profileId as string, userId } : { userId };
    const profiles = await prisma.profile.findMany({
      where: profileWhere,
      include: {
        tasks: { where: { createdAt: { gte: since } }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!profiles.length) { res.status(404).json({ message: 'No profiles found' }); return; }

    const allTasks = profiles.flatMap(p => p.tasks.map(t => ({ ...t, description: t.description, profileName: p.name })));
    const profileName = profiles.length === 1 ? profiles[0].name : 'All Profiles';

    const profileStats = profiles.map(p => ({
      id: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      total: p.tasks.length,
      completed: p.tasks.filter(t => t.status === 'COMPLETED').length,
      inProgress: p.tasks.filter(t => t.status === 'IN_PROGRESS').length,
      pending: p.tasks.filter(t => t.status === 'PENDING').length,
      overdue: p.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length,
      completionRate: p.tasks.length > 0 ? Math.round((p.tasks.filter(t => t.status === 'COMPLETED').length / p.tasks.length) * 100) : 0,
      highPriority: p.tasks.filter(t => t.priority === 'HIGH').length,
    }));

    const weeklyData: Record<string, { total: number; completed: number }> = {};
    allTasks.forEach(task => {
      const week = getWeekLabel(new Date(task.createdAt));
      if (!weeklyData[week]) weeklyData[week] = { total: 0, completed: 0 };
      weeklyData[week].total++;
      if (task.status === 'COMPLETED') weeklyData[week].completed++;
    });

    const aiReport = await generateProductivityReport(
      user!.name, profileName,
      allTasks.map(t => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate?.toISOString() || null,
      })),
      periodLabel
    );

    res.json({
      period: periodLabel,
      profileStats,
      weeklyData,
      overall: {
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
        pending: allTasks.filter(t => t.status === 'PENDING').length,
        overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length,
        completionRate: allTasks.length > 0 ? Math.round((allTasks.filter(t => t.status === 'COMPLETED').length / allTasks.length) * 100) : 0,
        highPriority: allTasks.filter(t => t.priority === 'HIGH').length,
      },
      aiReport,
      // ✅ Raw tasks for burndown chart — added here
      tasks: allTasks.map(t => ({
        createdAt: t.createdAt.toISOString(),
        status: t.status,
        dueDate: t.dueDate?.toISOString() || null,
        priority: t.priority,
        title: t.title,
      })),
    });
  } catch (err) { next(err); }
};

export const getMemberReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const viewerId = req.user!.userId;
    const { memberId, range } = req.query;

    if (!memberId) { res.status(400).json({ message: 'memberId is required' }); return; }

    const access = await prisma.teamAccess.findUnique({
      where: { ownerId_viewerId: { ownerId: memberId as string, viewerId } },
    });
    if (!access) { res.status(403).json({ message: 'Access not granted' }); return; }

    req.user!.userId = memberId as string;
    return getProductivityReport(req, res, next);
  } catch (err) { next(err); }
};

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
}