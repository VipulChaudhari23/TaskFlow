import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';
import { deleteRefreshToken } from '../lib/jwt';

// GET settings
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, reminderEnabled: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
};

// Toggle reminder
export const toggleReminder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { reminderEnabled: !user!.reminderEnabled },
      select: { reminderEnabled: true },
    });
    res.json({ reminderEnabled: updated.reminderEnabled });
  } catch (err) { next(err); }
};

// Delete account — requires email confirmation
export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { confirmEmail, password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    if (confirmEmail !== user.email) {
      res.status(400).json({ message: 'Email does not match. Please type your exact email address.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ message: 'Incorrect password' });
      return;
    }

    // Delete everything (cascades via Prisma relations)
    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (err) { next(err); }
};

// Download tasks as Excel-compatible CSV
export const exportTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { range } = req.query; // '30days' | 'quarter'
    const userId = req.user!.userId;

    const now = new Date();
    let since: Date;
    if (range === 'quarter') {
      since = new Date(now);
      since.setMonth(since.getMonth() - 3);
    } else {
      since = new Date(now);
      since.setDate(since.getDate() - 30);
    }

    const profiles = await prisma.profile.findMany({
      where: { userId },
      include: {
        tasks: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const rows: string[] = [
      ['Profile', 'Task Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created At', 'Updated At'].join(','),
    ];

    for (const profile of profiles) {
      for (const task of profile.tasks) {
        rows.push([
          `"${profile.name}"`,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${(task.description || '').replace(/"/g, '""')}"`,
          task.status,
          task.priority,
          task.dueDate ? format(task.dueDate) : '',
          format(task.createdAt),
          format(task.updatedAt),
        ].join(','));
      }
    }

    const csv = rows.join('\n');
    const filename = `taskflow-export-${range === 'quarter' ? 'last-quarter' : 'last-30-days'}-${now.toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
};

function format(date: Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}