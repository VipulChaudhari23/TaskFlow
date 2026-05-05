// controllers/comment.controller.ts
import { prisma } from '../lib/prisma';

export const addComment = async (req: { body: { taskId: any; message: any; status: any; }; user: { userId: any; }; }, res: { json: (arg0: { status: string; id: string; createdAt: Date; userId: string; taskId: string; message: string; }) => void; }) => {
  const { taskId, message, status } = req.body;
  const userId = req.user.userId;

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      message,
      status: status || 'PENDING',
      userId,
    },
  });

  // 🔥 ALSO ADD HISTORY ENTRY
  await prisma.taskHistory.create({
    data: {
      taskId,
      userId,
      action: 'COMMENT_ADDED',
      changes: JSON.stringify({ message, status }),
    },
  });

  res.json(comment);
};

export const getComments = async (req: { params: { taskId: any; }; }, res: { json: (arg0: { userId: string; id: string; message: string; status: string; createdAt: Date; taskId: string; }[]) => void; }) => {
  const { taskId } = req.params;

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(comments);
};