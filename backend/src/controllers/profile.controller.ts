import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const AVATAR_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
];

export const getProfiles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.user!.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(profiles);
  } catch (err) { next(err); }
};

export const createProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Name is required' }); return; }

    const count = await prisma.profile.count({ where: { userId: req.user!.userId } });
    const avatarColor = AVATAR_COLORS[count % AVATAR_COLORS.length];

    const profile = await prisma.profile.create({
      data: { name: name.trim(), avatarColor, userId: req.user!.userId },
    });
    res.status(201).json(profile);
  } catch (err) { next(err); }
};

export const deleteProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findFirst({ where: { id, userId: req.user!.userId } });
    if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }
    await prisma.profile.delete({ where: { id } });
    res.json({ message: 'Profile deleted' });
  } catch (err) { next(err); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const profile = await prisma.profile.findFirst({ where: { id, userId: req.user!.userId } });
    if (!profile) { res.status(404).json({ message: 'Profile not found' }); return; }
    const updated = await prisma.profile.update({ where: { id }, data: { name: name.trim() } });
    res.json(updated);
  } catch (err) { next(err); }
};