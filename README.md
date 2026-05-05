# 🚀 TaskFlow — AI-Powered Team Task Management System

> A production-grade, full-stack task management system built for real teams — featuring AI-powered task writing, multi-profile shared accounts, team access delegation, calendar views, productivity analytics, and automated deadline reminders. https://task-flow-ebon-six.vercel.app/

---

## ✨ Feature Overview.

### 🔐 Authentication & Security
- JWT Access Token (15 min) + Refresh Token (7 days via HttpOnly cookie)
- Auto token refresh — seamless session management
- bcrypt password hashing (12 rounds)
- GitHub-style account deletion (email + password confirmation)

### 👤 Multi-Profile System
- Multiple named profiles under one login (e.g. 10 team members sharing one org email)
- Netflix-style profile picker after login
- Each profile has its own isolated task list
- Profile avatars with colour coding

### 📋 Task Management (Full CRUD)
- Create, view, edit, delete tasks
- Status: `PENDING` → `IN_PROGRESS` → `COMPLETED` (toggle)
- Priority levels: `LOW`, `MEDIUM`, `HIGH`
- Due dates, descriptions, search, filter, pagination

### 🤖 AI Features (Powered by Groq — Free)
- **Edit with AI** — rewrites task title & description to be professional and actionable
- **AI Productivity Report** — detailed analysis of your work including what you did, what patterns emerge, a productivity score, strengths, and recommendations
- Uses **Llama 3.3 70B** via Groq (free, no credit card)

### 📊 Three Dashboard Views
| View | Description |
|------|-------------|
| **List** | Searchable, filterable task list with pagination |
| **Kanban** | 3-column board (Pending / In Progress / Completed) |
| **Calendar** | Monthly calendar showing tasks by creation date |

### 👥 Team Collaboration
- Grant your manager read access to your tasks via email
- Manager sees all team members' tasks in one Team View
- Per-member date & status filters
- One-click refresh per team member
- Shared accounts: manager sees tasks grouped by profile name

### 📈 Analytics & Reports
- Stats: total, completed, in-progress, overdue, completion rate
- Weekly activity bar chart
- Per-profile completion breakdown
- Full AI-generated narrative report (downloadable)
- Manager can view any team member's analytics

### 🔔 Email Reminders
- Toggle deadline reminders on/off in Settings
- Automatic email sent at 8 AM the day before a task is due
- Beautiful HTML email template
- Powered by Nodemailer (Gmail SMTP)

### 📥 Data Export
- Download tasks as CSV (opens in Excel / Google Sheets)
- Last 30 Days or Last Quarter range
- Includes profile, title, description, status, priority, dates

### ⚙️ Settings
- Toggle email reminders
- Export task data
- Delete account (GitHub-style verification)

---

## 🗂️ Project Structure

```
task-management/
├── backend/                        # Node.js + Express + TypeScript API
│   ├── prisma/
│   │   └── schema.prisma           # SQLite DB schema
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── task.controller.ts
│   │   │   ├── profile.controller.ts
│   │   │   ├── team.controller.ts
│   │   │   ├── settings.controller.ts
│   │   │   └── ai.controller.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   ├── jwt.ts              # Token generation & management
│   │   │   ├── mailer.ts           # Nodemailer email service
│   │   │   ├── scheduler.ts        # node-cron deadline reminders
│   │   │   └── groq.ts             # Groq AI (Llama 3.3 70B)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── task.routes.ts
│   │   │   ├── profile.routes.ts
│   │   │   ├── team.routes.ts
│   │   │   ├── settings.routes.ts
│   │   │   └── ai.routes.ts
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                       # Next.js 14 (App Router) + TypeScript
    └── src/
        ├── app/
        │   ├── (auth)/
        │   │   ├── login/page.tsx
        │   │   └── register/page.tsx
        │   └── (dashboard)/
        │       ├── profiles/page.tsx   # Profile picker
        │       ├── dashboard/page.tsx  # Main dashboard (List/Kanban/Calendar)
        │       ├── team/page.tsx       # Team access management
        │       ├── analytics/page.tsx  # AI productivity analytics
        │       └── settings/page.tsx   # Settings & account
        ├── components/
        │   ├── Navbar.tsx
        │   ├── TaskCard.tsx
        │   └── TaskModal.tsx           # Create/edit with AI improve button
        ├── context/
        │   ├── AuthContext.tsx
        │   └── ProfileContext.tsx
        ├── lib/api.ts                  # Axios + auto token refresh
        ├── services/taskService.ts
        └── types/index.ts
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="your-strong-secret-key"
JWT_REFRESH_SECRET="your-strong-refresh-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"

# Email reminders (Gmail App Password)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-16-char-app-password
MAIL_FROM="TaskFlow <your-gmail@gmail.com>"

# AI (Groq — free at console.groq.com)
GROQ_API_KEY=gsk_your_groq_key_here
```

```bash
npx prisma db push    # Creates SQLite database
npm run dev           # Starts on http://localhost:4000
```

### 3. Frontend Setup

```bash
cd frontend
npm install --registry https://registry.npmmirror.com
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm run dev           # Starts on http://localhost:3000
```

---

## 🔑 Getting Free API Keys

| Service | Where | Time |
|---------|-------|------|
| **Groq AI** | [console.groq.com](https://console.groq.com) | 1 min, no card |
| **Gmail App Password** | Google Account → Security → 2-Step → App Passwords | 2 min |

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login → returns access + refresh token |
| POST | `/auth/refresh` | ❌ | Get new access token |
| POST | `/auth/logout` | ❌ | Logout + clear refresh token |

### Profiles
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profiles` | ✅ | List all profiles for logged-in user |
| POST | `/profiles` | ✅ | Create new profile |
| PATCH | `/profiles/:id` | ✅ | Rename profile |
| DELETE | `/profiles/:id` | ✅ | Delete profile + all its tasks |

### Tasks (scoped per profile)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tasks?profileId=&page=&limit=&status=&priority=&search=` | ✅ | List tasks with filters |
| POST | `/tasks` | ✅ | Create task |
| GET | `/tasks/:id` | ✅ | Get single task |
| PATCH | `/tasks/:id` | ✅ | Update task |
| DELETE | `/tasks/:id` | ✅ | Delete task |
| PATCH | `/tasks/:id/toggle` | ✅ | Toggle PENDING ↔ COMPLETED |

### Team
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/team/grant` | ✅ | Grant access to manager by email |
| DELETE | `/team/revoke/:viewerId` | ✅ | Revoke manager access |
| GET | `/team/my-viewers` | ✅ | Who can see my tasks |
| GET | `/team/my-owners` | ✅ | Whose tasks I can see |
| GET | `/team/member/:memberId/tasks` | ✅ | View member's tasks (if access granted) |

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/improve-task` | ✅ | AI rewrite title + description |
| GET | `/ai/productivity-report?range=30days\|quarter&profileId=` | ✅ | AI analytics report |
| GET | `/ai/member-report?memberId=&range=` | ✅ | Manager views member's report |

### Settings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settings` | ✅ | Get current settings |
| PATCH | `/settings/reminder` | ✅ | Toggle email reminders |
| GET | `/settings/export?range=30days\|quarter` | ✅ | Download CSV |
| DELETE | `/settings/account` | ✅ | Delete account (requires email + password) |

---

## 🗃️ Database Schema (SQLite via Prisma)

```
User ──< Profile ──< Task
User ──< RefreshToken
User ──< TeamAccess (as owner)
User ──< TeamAccess (as viewer)
```

| Model | Key Fields |
|-------|-----------|
| User | id, email, name, passwordHash, reminderEnabled |
| Profile | id, name, avatarColor, userId |
| Task | id, title, description, status, priority, dueDate, profileId |
| RefreshToken | id, token, userId, expiresAt |
| TeamAccess | id, ownerId, viewerId |

---

## 🚀 Deployment (Free Hosting)

### Frontend → Vercel (Free)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repo → select `frontend/`
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Deploy ✅

### Backend → Render (Free)
1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub → select `backend/`
3. Build: `npm install && npx prisma generate && npx prisma db push && npm run build`
4. Start: `npm start`
5. Add all `.env` variables in Render dashboard
6. Deploy ✅

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Runtime | Node.js 18 + TypeScript |
| Backend Framework | Express.js |
| ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (Access + Refresh tokens) |
| Email | Nodemailer + Gmail SMTP |
| Scheduler | node-cron |
| AI | Groq API — Llama 3.3 70B (free) |
| Frontend Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| HTTP Client | Axios (with interceptors) |
| Notifications | react-hot-toast |
| Date Utils | date-fns |
| Icons | lucide-react |

---

## 🌟 Unique Features

| Feature | Details |
|---------|---------|
| Shared email profiles | One email → multiple named users, each with their own tasks |
| Manager delegation | Team members grant read access; manager sees all in one view |
| AI task improvement | One click makes vague tasks professional and actionable |
| AI productivity report | Llama 3.3 70B analyses actual task content, not just numbers |
| Three view modes | Switch between List, Kanban, and Calendar views |
| Smart calendar | Tasks shown by creation date for daily work tracking |
| Deadline reminders | Automated email at 8 AM, day before due date |
| CSV export | Last 30 days or quarter — opens in Excel/Google Sheets |
| Account security | GitHub-style deletion requiring email + password match |

---

## 📄 License

MIT License — free for personal and commercial use.

---

DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="your-super-secret-access-token-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"

# mail config
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=ttaskfflow@gmail.com
MAIL_PASS=ofuzqmqtdpblwlys
MAIL_FROM="TaskFlow <ttaskfflow@gmail.com>"

// GROQ API
GROQ_API_KEY=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

*Built with ❤️ for teams who deserve better than Excel reports.*
