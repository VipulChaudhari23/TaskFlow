import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

const VALID_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const VALID_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

// Verify profile belongs to logged-in user
const verifyProfile = async (profileId: string, userId: string) => {
  return prisma.profile.findFirst({ where: { id: profileId, userId } });
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { profileId, page = '1', limit = '10', status, priority, search } = req.query;

    if (!profileId) { res.status(400).json({ message: 'profileId is required' }); return; }

    const profile = await verifyProfile(profileId as string, userId);
    if (!profile) { res.status(403).json({ message: 'Access denied' }); return; }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { profileId };
    if (status && VALID_STATUSES.includes(status as TaskStatus)) where.status = status;
    if (priority && VALID_PRIORITIES.includes(priority as Priority)) where.priority = priority;
    if (search) where.title = { contains: search as string };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { profileId, title, description, status, priority, dueDate } = req.body;

    if (!profileId) { res.status(400).json({ message: 'profileId is required' }); return; }
    const profile = await verifyProfile(profileId, userId);
    if (!profile) { res.status(403).json({ message: 'Access denied' }); return; }

    const task = await prisma.task.create({
      data: {
        title, description,
        status: (status as TaskStatus) || 'PENDING',
        priority: (priority as Priority) || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        profileId,
      },
    });
    res.status(201).json(task);
  } catch (err) { next(err); }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const task = await prisma.task.findFirst({
      where: { id },
      include: { profile: true },
    });
    if (!task) { res.status(404).json({ message: 'Task not found' }); return; }
    if (task.profile.userId !== userId) { res.status(403).json({ message: 'Access denied' }); return; }
    res.json(task);
  } catch (err) { next(err); }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { title, description, status, priority, dueDate } = req.body;

    const existing = await prisma.task.findFirst({ where: { id }, include: { profile: true } });
    if (!existing) { res.status(404).json({ message: 'Task not found' }); return; }
    if (existing.profile.userId !== userId) { res.status(403).json({ message: 'Access denied' }); return; }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });
    res.json(task);
  } catch (err) { next(err); }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const existing = await prisma.task.findFirst({ where: { id }, include: { profile: true } });
    if (!existing) { res.status(404).json({ message: 'Task not found' }); return; }
    if (existing.profile.userId !== userId) { res.status(403).json({ message: 'Access denied' }); return; }
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) { next(err); }
};

export const toggleTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const existing = await prisma.task.findFirst({ where: { id }, include: { profile: true } });
    if (!existing) { res.status(404).json({ message: 'Task not found' }); return; }
    if (existing.profile.userId !== userId) { res.status(403).json({ message: 'Access denied' }); return; }
    const newStatus: TaskStatus = existing.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const task = await prisma.task.update({ where: { id }, data: { status: newStatus } });
    res.json(task);
  } catch (err) { next(err); }
};