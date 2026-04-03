import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// Grant access to a viewer (manager) by their email
export const grantAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!.userId;
    const { viewerEmail } = req.body;

    if (!viewerEmail) {
      res.status(400).json({ message: "Viewer email is required" });
      return;
    }

    const viewer = await prisma.user.findUnique({
      where: { email: viewerEmail },
    });
    if (!viewer) {
      res
        .status(404)
        .json({
          message: "No user found with that email. They must register first.",
        });
      return;
    }

    if (viewer.id === ownerId) {
      res.status(400).json({ message: "You cannot grant access to yourself" });
      return;
    }

    const existing = await prisma.teamAccess.findUnique({
      where: { ownerId_viewerId: { ownerId, viewerId: viewer.id } },
    });
    if (existing) {
      res.status(409).json({ message: "Access already granted to this user" });
      return;
    }

    await prisma.teamAccess.create({ data: { ownerId, viewerId: viewer.id } });
    res
      .status(201)
      .json({
        message: `Access granted to ${viewer.name}`,
        viewer: { id: viewer.id, name: viewer.name, email: viewer.email },
      });
  } catch (err) {
    next(err);
  }
};

// Revoke access
export const revokeAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!.userId;
    const { viewerId } = req.params;

    await prisma.teamAccess.deleteMany({ where: { ownerId, viewerId } });
    res.json({ message: "Access revoked" });
  } catch (err) {
    next(err);
  }
};

// List people I've granted access to
export const myViewers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user!.userId;
    const accesses = await prisma.teamAccess.findMany({
      where: { ownerId },
      include: { viewer: { select: { id: true, name: true, email: true } } },
    });
    res.json(accesses.map((a) => a.viewer));
  } catch (err) {
    next(err);
  }
};

// List people whose tasks I can see (people who granted me access)
export const myOwners = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const viewerId = req.user!.userId;
    const accesses = await prisma.teamAccess.findMany({
      where: { viewerId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    res.json(accesses.map((a) => a.owner));
  } catch (err) {
    next(err);
  }
};

// Get tasks of a specific user (only if they granted me access)
export const getMemberTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const viewerId = req.user!.userId;
    const { memberId } = req.params;

    const access = await prisma.teamAccess.findUnique({
      where: { ownerId_viewerId: { ownerId: memberId, viewerId } },
    });
    if (!access) {
      res.status(403).json({ message: "Access not granted" });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { userId: memberId },
      orderBy: { createdAt: "desc" },
    });

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true },
    });

    res.json({ member, tasks });
  } catch (err) {
    next(err);
  }
};
