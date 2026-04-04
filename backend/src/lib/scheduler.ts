import cron from 'node-cron';
import { prisma } from './prisma';
import { sendDeadlineReminderEmail } from './mailer';

export const startScheduler = () => {
  // Runs every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Checking deadline reminders...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow.setHours(0, 0, 0, 0));
      const end   = new Date(tomorrow.setHours(23, 59, 59, 999));

      // Get all users with reminders enabled
      const users = await prisma.user.findMany({
        where: { reminderEnabled: true },
        include: {
          profiles: {
            include: {
              tasks: {
                where: {
                  dueDate: { gte: start, lte: end },
                  status: { not: 'COMPLETED' },
                },
              },
            },
          },
        },
      });

      for (const user of users) {
        const tasks = user.profiles.flatMap(p => p.tasks);
        if (tasks.length === 0) continue;
        await sendDeadlineReminderEmail(user.email, user.name, tasks.map(t => ({
          title: t.title,
          dueDate: t.dueDate!.toISOString(),
          priority: t.priority,
          status: t.status,
        })));
        console.log(`[Scheduler] Sent reminder to ${user.email} for ${tasks.length} tasks`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });

  console.log('[Scheduler] Started — deadline reminders at 8:00 AM daily');
};