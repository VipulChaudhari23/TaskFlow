// controllers/comment.controller.ts
import { prisma } from "../lib/prisma";

export const addComment = async (
  req: {
    body: { taskId: any; message: any; status: any };
    user: { userId: any };
  },
  res: {
    json: (arg0: {
      status: string;
      id: string;
      createdAt: Date;
      userId: string;
      taskId: string;
      message: string;
    }) => void;
  },
) => {
  const { taskId, message, status } = req.body;
  const userId = req.user.userId;

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      message,
      status: status || "PENDING",
      userId,
    },
  });

  // 🔥 ALSO ADD HISTORY ENTRY
  await prisma.taskHistory.create({
    data: {
      taskId,
      userId,
      action: "COMMENT_ADDED",
      changes: JSON.stringify({ message, status }),
    },
  });

  res.json(comment);
};

export const getComments = async (
  req: { params: { taskId: any } },
  res: {
    json: (
      arg0: {
        userId: string;
        id: string;
        message: string;
        status: string;
        createdAt: Date;
        taskId: string;
      }[],
    ) => void;
  },
) => {
  const { taskId } = req.params;

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });

  res.json(comments);
};

// export const updateComment = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   const updated = await prisma.taskComment.update({
//     where: { id },
//     data: { status },
//   });

//   // 🔥 Add history entry
//   await prisma.taskHistory.create({
//     data: {
//       taskId: updated.taskId,
//       userId: req.user.userId,
//       action: "COMMENT_UPDATED",
//       changes: JSON.stringify({ status }),
//     },
//   });

//   res.json(updated);
// };

export const updateComment = async (
  req: { params: { id: any }; body: { status: any }; user: { userId: any } },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: { (arg0: { message: string }): any; new (): any };
    };
    json: (arg0: {
      id: string;
      message: string;
      status: string;
      createdAt: Date;
      taskId: string;
      userId: string;
    }) => void;
  },
) => {
  const { id } = req.params;
  const { status } = req.body;

  const existing = await prisma.taskComment.findUnique({
    where: { id },
  });

  // ✅ HANDLE NULL CASE
  if (!existing) {
    return res.status(404).json({ message: "Comment not found" });
  }

  const updated = await prisma.taskComment.update({
    where: { id },
    data: { status },
  });

  await prisma.taskHistory.create({
    data: {
      taskId: updated.taskId,
      userId: req.user.userId,
      action: "COMMENT_UPDATED",
      changes: JSON.stringify({
        message: existing.message, // ✅ ADD THIS
        status: {
          old: existing.status,
          new: status,
        },
      }),
    },
  });

  res.json(updated);
};
