import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendDeadlineReminderEmail = async (
  to: string,
  userName: string,
  tasks: Array<{ title: string; dueDate: string; priority: string; status: string }>
) => {
  const taskRows = tasks.map(t => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a35;color:#f1f1f5;font-size:13px">${t.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a35;text-align:center">
        <span style="background:${t.priority === 'HIGH' ? 'rgba(239,68,68,0.15)' : t.priority === 'MEDIUM' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'};color:${t.priority === 'HIGH' ? '#ef4444' : t.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">${t.priority}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a35;text-align:center;color:#9191a4;font-size:12px">${new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `⏰ ${tasks.length} task${tasks.length > 1 ? 's' : ''} due tomorrow — TaskFlow`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0f0f13;font-family:'DM Sans',Arial,sans-serif">
        <div style="max-width:560px;margin:40px auto;background:#17171f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)">
          <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px;text-align:center">
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:18px">✓</div>
              <span style="color:white;font-size:22px;font-weight:700">TaskFlow</span>
            </div>
            <p style="color:rgba(255,255,255,0.85);margin:12px 0 0;font-size:14px">Deadline Reminder</p>
          </div>
          <div style="padding:32px">
            <p style="color:#f1f1f5;font-size:16px;margin:0 0 6px">Hi ${userName} 👋</p>
            <p style="color:#9191a4;font-size:14px;margin:0 0 24px;line-height:1.6">
              You have <strong style="color:#6366f1">${tasks.length} task${tasks.length > 1 ? 's' : ''}</strong> due <strong style="color:#f1f1f5">tomorrow</strong>. Here's a quick reminder to stay on track.
            </p>
            <table style="width:100%;border-collapse:collapse;background:#0f0f13;border-radius:10px;overflow:hidden">
              <thead>
                <tr style="background:#1e1e28">
                  <th style="padding:10px 12px;text-align:left;color:#5a5a70;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Task</th>
                  <th style="padding:10px 12px;text-align:center;color:#5a5a70;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Priority</th>
                  <th style="padding:10px 12px;text-align:center;color:#5a5a70;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Due</th>
                </tr>
              </thead>
              <tbody>${taskRows}</tbody>
            </table>
            <div style="margin-top:28px;text-align:center">
              <a href="http://localhost:3000/dashboard" style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Open TaskFlow →</a>
            </div>
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
            <p style="color:#5a5a70;font-size:11px;margin:0">You're receiving this because deadline reminders are enabled. <br>Login to TaskFlow → Settings to disable.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};