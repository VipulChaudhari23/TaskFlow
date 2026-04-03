# TaskFlow — Task Management System

A full-stack Task Management System built with:
- **Backend**: Node.js + TypeScript + Express + Prisma (SQLite) + JWT Auth
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS

---

## Project Structure

```
task-management/
|── backend/          # Node.js + Express API
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── task.controller.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   └── jwt.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── task.routes.ts
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/         # Next.js App
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx
    │   │   │   ├── register/page.tsx
    │   │   │   └── layout.tsx
    │   │   ├── (dashboard)/
    │   │   │   ├── dashboard/page.tsx
    │   │   │   └── layout.tsx
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── TaskCard.tsx
    │   │   └── TaskModal.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── lib/
    │   │   └── api.ts
    │   ├── services/
    │   │   └── taskService.ts
    │   └── types/
    │       └── index.ts
    ├── .env.local
    ├── next.config.js
    ├── package.json
    └── tsconfig.json
```

---

## Setup & Running

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to SQLite database (creates dev.db)
npm run db:push

# Start dev server
npm run dev
# Server runs at http://localhost:4000
```

The backend `.env` is pre-configured for local development with SQLite.

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs at http://localhost:3000
```

---

## API Endpoints

### Auth

| Method | Endpoint        | Body                          | Auth  | Description            |
|--------|-----------------|-------------------------------|-------|------------------------|
| POST   | /auth/register  | `{ name, email, password }`   | No    | Register new user      |
| POST   | /auth/login     | `{ email, password }`         | No    | Login, returns tokens  |
| POST   | /auth/refresh   | cookie: refreshToken          | No    | Get new access token   |
| POST   | /auth/logout    | cookie: refreshToken          | No    | Logout                 |

### Tasks (all require `Authorization: Bearer <token>`)

| Method | Endpoint           | Description                                                         |
|--------|--------------------|---------------------------------------------------------------------|
| GET    | /tasks             | List tasks (pagination, filter by status/priority, search by title) |
| POST   | /tasks             | Create task                                                         |
| GET    | /tasks/:id         | Get single task                                                     |
| PATCH  | /tasks/:id         | Update task                                                         |
| DELETE | /tasks/:id         | Delete task                                                         |
| PATCH  | /tasks/:id/toggle  | Toggle PENDING ↔ COMPLETED                                          |

#### GET /tasks query params

| Param    | Type   | Example         |
|----------|--------|-----------------|
| page     | number | ?page=2         |
| limit    | number | ?limit=10       |
| status   | string | ?status=PENDING |
| priority | string | ?priority=HIGH  |
| search   | string | ?search=meeting |

---

## Features

### Backend
- JWT **Access Token** (15 min) + **Refresh Token** (7 days, stored as HttpOnly cookie)
- Passwords hashed with **bcrypt** (12 rounds)
- Full input validation via `express-validator`
- Pagination, filtering, and full-text search on task list
- Proper HTTP status codes (400, 401, 404, 409, 500)
- SQLite via **Prisma ORM** (easy to swap to PostgreSQL/MySQL)

### Frontend
- **Auth guard** on dashboard — redirects to login if not authenticated
- **Auto token refresh** — Axios interceptor silently refreshes expired access tokens
- **Task CRUD** — Create, view, edit, delete, and toggle tasks
- **Search** with debounce (350ms)
- **Filter** by status and priority
- **Pagination** controls
- **Stats bar** — clickable counts for each status
- **Toast notifications** for all actions
- Responsive design (mobile + desktop)
- Dark theme with polished UI

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL="file:./dev.db"
JWT_ACCESS_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-me-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Production Notes

1. **Database**: Replace SQLite with PostgreSQL — just update `DATABASE_URL` and `provider` in `prisma/schema.prisma`
2. **Secrets**: Use strong random secrets for JWT keys
3. **CORS**: Update `FRONTEND_URL` in backend `.env`
4. **Cookies**: Set `secure: true` and `sameSite: 'strict'` in production
