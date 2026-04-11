# Project Management Platform — Technical Specification & AI Agent Context Document

**Version:** 1.0  
**Stack:** Next.js 14 (App Router) · Express + TypeScript · Prisma ORM · PostgreSQL (Docker)  

> ⚠️ **AI Agent Instructions:** Read this entire document before writing any code. Follow the build order in Section 10 exactly. Refer back to the relevant section for each feature you implement.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Roles & Permissions](#2-roles--permissions)
3. [Database Schema](#3-database-schema)
4. [Environment Setup](#4-environment-setup)
5. [Seed Data](#5-seed-data)
6. [Backend Architecture](#6-backend-architecture)
7. [API Reference](#7-api-reference)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Kanban Board](#9-kanban-board)
10. [Build Order](#10-build-order-phase-by-phase)
11. [Key Business Rules](#11-key-business-rules)
12. [Common Pitfalls & Agent Notes](#12-common-pitfalls--agent-notes)
13. [Dependencies](#13-dependencies)
14. [Feature Acceptance Criteria](#14-feature-acceptance-criteria)

---

## 1. Project Overview

### 1.1 Product Vision

A multi-role project management platform where:

- A **seeded Admin** manages the platform — adds/removes Managers
- **Managers** create and own Projects, define timelines, milestones, and assign Members
- **Members** work on Tasks and Subtasks within projects they are assigned to
- Each project has a **Kanban board**, task comments, attachments, and time logs

### 1.2 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | React Server Components + Client Components |
| Styling | Tailwind CSS + shadcn/ui | Component library built on Radix UI |
| Backend | Express + TypeScript | REST API, runs separately on port 5000 |
| ORM | Prisma | Type-safe DB access, migrations, seeding |
| Database | PostgreSQL 15 (Docker) | Local dev via docker-compose |
| Auth | JWT (jsonwebtoken) | Access + refresh tokens, stored in httpOnly cookies |
| Validation | Zod | Schema validation on all API inputs |
| File Uploads | Multer + local storage (dev) | S3 in production |
| State (FE) | React Query (TanStack) | Server state, caching, optimistic updates |

### 1.3 Repository Structure

```
project-root/
  apps/
    frontend/          # Next.js 14 app
    backend/           # Express + TypeScript API
  prisma/
    schema.prisma      # Single source of truth for DB
    migrations/        # Auto-generated migration files
    seed.ts            # Seeds admin + reference data
  docker-compose.yml   # PostgreSQL + pgAdmin
  .env.example         # Template for environment variables
```

---

## 2. Roles & Permissions

There are exactly **three roles** in the system. They are seeded — never created via the UI.

| Role | Who sets it | What they can do |
|---|---|---|
| `admin` | Seeded at startup | View all users, promote users to manager, demote managers, deactivate accounts. Cannot create projects. |
| `manager` | Admin promotes a user | Create projects, set deadlines & milestones, add/remove members to their projects, assign tasks, manage all content within their projects. |
| `member` | Default on registration | View and work on projects they are assigned to. Create/update tasks assigned to them. Cannot create projects or manage members. |

### 2.1 Permission Matrix

| Action | Admin | Manager | Member |
|---|---|---|---|
| Register / login | Yes (seeded) | Yes | Yes |
| View admin dashboard | ✅ | ❌ | ❌ |
| Promote user to manager | ✅ | ❌ | ❌ |
| Create a project | ❌ | ✅ | ❌ |
| Edit / delete own project | ❌ | ✅ (owner) | ❌ |
| Add members to project | ❌ | ✅ (owner) | ❌ |
| Create tasks in project | ❌ | ✅ | ✅ (if assigned to project) |
| Assign task to member | ❌ | ✅ | ❌ |
| Update task status | ❌ | ✅ | ✅ (own tasks) |
| Add comments / attachments | ❌ | ✅ | ✅ |
| Log time on task | ❌ | ✅ | ✅ |
| View Kanban board | ❌ | ✅ | ✅ (own projects) |

---

## 3. Database Schema

The full Prisma schema is below. This is the **definitive version** — do not deviate from it without updating this document.

### 3.1 Enums

```prisma
enum Role {
  admin
  manager
  member
}

enum ProjectStatus {
  planning
  active
  on_hold
  completed
  cancelled
}

enum TaskStatus {
  backlog
  todo
  in_progress
  in_review
  done
}

enum Priority {
  low
  medium
  high
  urgent
}

enum MilestoneStatus {
  upcoming
  in_progress
  completed
  missed
}
```

### 3.2 Models

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  user_id       Int      @id @default(autoincrement())
  first_name    String
  last_name     String
  email         String   @unique
  password_hash String
  phone         String?
  role          Role     @default(member)
  status        String   @default("active")
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  created_projects    Project[]        @relation("ProjectCreator")
  assigned_tasks      Task[]           @relation("TaskAssignee")
  created_tasks       Task[]           @relation("TaskCreator")
  project_memberships ProjectMember[]
  comments            TaskComment[]
  attachments         TaskAttachment[]
  time_logs           TimeLog[]
}

model Project {
  project_id   Int           @id @default(autoincrement())
  project_name String
  description  String?
  start_date   DateTime
  end_date     DateTime?
  budget       Float?
  status       ProjectStatus @default(planning)
  created_at   DateTime      @default(now())

  created_by Int
  creator    User @relation("ProjectCreator", fields: [created_by], references: [user_id])

  tasks      Task[]
  milestones Milestone[]
  members    ProjectMember[]
}

model ProjectMember {
  project_member_id Int      @id @default(autoincrement())
  project_id        Int
  user_id           Int
  assigned_role     String   @default("member")
  joined_date       DateTime @default(now())

  project Project @relation(fields: [project_id], references: [project_id])
  user    User    @relation(fields: [user_id], references: [user_id])

  @@unique([project_id, user_id])
}

model Task {
  task_id         Int        @id @default(autoincrement())
  title           String
  description     String?
  priority        Priority   @default(medium)
  status          TaskStatus @default(backlog)
  start_date      DateTime
  due_date        DateTime?
  estimated_hours Float?
  actual_hours    Float?
  created_at      DateTime   @default(now())

  project_id Int
  project    Project @relation(fields: [project_id], references: [project_id])

  assigned_to Int?
  assignee    User? @relation("TaskAssignee", fields: [assigned_to], references: [user_id])

  created_by Int
  creator    User @relation("TaskCreator", fields: [created_by], references: [user_id])

  parent_task_id Int?
  parent_task    Task?  @relation("Subtasks", fields: [parent_task_id], references: [task_id])
  subtasks       Task[] @relation("Subtasks")

  comments    TaskComment[]
  attachments TaskAttachment[]
  time_logs   TimeLog[]
}

model Milestone {
  milestone_id Int             @id @default(autoincrement())
  title        String
  description  String?
  due_date     DateTime
  status       MilestoneStatus @default(upcoming)

  project_id Int
  project    Project @relation(fields: [project_id], references: [project_id])
}

model TaskComment {
  comment_id   Int      @id @default(autoincrement())
  comment_text String
  created_at   DateTime @default(now())
  task_id      Int
  user_id      Int

  task Task @relation(fields: [task_id], references: [task_id])
  user User @relation(fields: [user_id], references: [user_id])
}

model TaskAttachment {
  attachment_id Int      @id @default(autoincrement())
  file_name     String
  file_path     String
  uploaded_at   DateTime @default(now())
  task_id       Int
  uploaded_by   Int

  task Task @relation(fields: [task_id], references: [task_id])
  user User @relation(fields: [uploaded_by], references: [user_id])
}

model TimeLog {
  time_log_id  Int      @id @default(autoincrement())
  hours_logged Float
  log_date     DateTime
  description  String?
  task_id      Int
  user_id      Int

  task Task @relation(fields: [task_id], references: [task_id])
  user User @relation(fields: [user_id], references: [user_id])
}
```

---

## 4. Environment Setup

### 4.1 Prerequisites

- Node.js >= 18
- Docker Desktop (for PostgreSQL)
- pnpm (recommended) or npm

### 4.2 docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: pm_postgres
    environment:
      POSTGRES_USER: pmuser
      POSTGRES_PASSWORD: pmpassword
      POSTGRES_DB: pmdb
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - '5050:80'

volumes:
  pgdata:
```

### 4.3 Backend `.env`

```env
DATABASE_URL="postgresql://pmuser:pmpassword@localhost:5432/pmdb"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
UPLOAD_DIR="./uploads"
```

### 4.4 Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### 4.5 Startup Commands

```bash
# 1. Start database
docker-compose up -d

# 2. Install backend deps
cd apps/backend && npm install

# 3. Run migration
npx prisma migrate dev --name init

# 4. Seed database
npx prisma db seed

# 5. Start backend (port 5000)
npm run dev

# 6. Install and start frontend (port 3000)
cd apps/frontend && npm install && npm run dev
```

---

## 5. Seed Data

The seed file must create data in dependency order. **Never run seed against production.**

### 5.1 `prisma/seed.ts`

```typescript
import { PrismaClient, Role, ProjectStatus, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Admin user (seeded, not creatable via UI)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pm.local' },
    update: {},
    create: {
      first_name: 'Super',
      last_name: 'Admin',
      email: 'admin@pm.local',
      password_hash: await bcrypt.hash('Admin@1234', 12),
      role: Role.admin,
      status: 'active',
    },
  });

  // 2. Seed a manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@pm.local' },
    update: {},
    create: {
      first_name: 'Jane',
      last_name: 'Manager',
      email: 'manager@pm.local',
      password_hash: await bcrypt.hash('Manager@1234', 12),
      role: Role.manager,
      status: 'active',
    },
  });

  // 3. Seed a member
  const member = await prisma.user.upsert({
    where: { email: 'alice@pm.local' },
    update: {},
    create: {
      first_name: 'Alice',
      last_name: 'Dev',
      email: 'alice@pm.local',
      password_hash: await bcrypt.hash('Member@1234', 12),
      role: Role.member,
      status: 'active',
    },
  });

  // 4. Sample project
  const project = await prisma.project.create({
    data: {
      project_name: 'Website Redesign',
      description: 'Full redesign of company website',
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 86400000),
      status: ProjectStatus.active,
      created_by: manager.user_id,
    },
  });

  // 5. Add member to project
  await prisma.projectMember.create({
    data: {
      project_id: project.project_id,
      user_id: member.user_id,
      assigned_role: 'developer',
    },
  });

  // 6. Sample milestone
  await prisma.milestone.create({
    data: {
      title: 'Design Approval',
      project_id: project.project_id,
      due_date: new Date(Date.now() + 14 * 86400000),
      status: 'upcoming',
    },
  });

  // 7. Sample task
  await prisma.task.create({
    data: {
      title: 'Design new homepage',
      priority: Priority.high,
      status: TaskStatus.todo,
      start_date: new Date(),
      due_date: new Date(Date.now() + 7 * 86400000),
      project_id: project.project_id,
      assigned_to: member.user_id,
      created_by: manager.user_id,
    },
  });

  console.log('Seed complete.');
  console.log('Admin:   admin@pm.local   / Admin@1234');
  console.log('Manager: manager@pm.local / Manager@1234');
  console.log('Member:  alice@pm.local   / Member@1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

### 5.2 `package.json` seed config (in `apps/backend/package.json`)

```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts"
}
```

---

## 6. Backend Architecture

### 6.1 Folder Structure

```
apps/backend/src/
  lib/
    prisma.ts            # Singleton Prisma client
  middleware/
    auth.ts              # JWT verify middleware
    requireRole.ts       # Role guard factory
    validate.ts          # Zod validation middleware
    errorHandler.ts      # Global error handler
    upload.ts            # Multer config
  routes/
    auth.routes.ts
    user.routes.ts
    project.routes.ts
    task.routes.ts
    milestone.routes.ts
    comment.routes.ts
    attachment.routes.ts
    timelog.routes.ts
  controllers/           # One file per route module
  schemas/               # Zod schemas for every request body
  index.ts               # Express app entry point
```

### 6.2 Prisma Singleton (`lib/prisma.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

### 6.3 Auth Middleware (`middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token =
    (req.cookies as any)?.access_token ||
    req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 6.4 Role Guard (`middleware/requireRole.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### 6.5 Global Error Handler (`middleware/errorHandler.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
```

### 6.6 `index.ts` Entry Point

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
// ... other routes

app.use(errorHandler);

app.listen(process.env.PORT || 5000, () => {
  console.log(`Backend running on port ${process.env.PORT || 5000}`);
});
```

---

## 7. API Reference

Base URL: `http://localhost:5000/api`

All protected routes require a valid JWT, sent either as an `httpOnly` cookie (`access_token`) or as `Authorization: Bearer <token>`.

### 7.1 Auth Routes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user (role defaults to `member`) |
| POST | `/auth/login` | None | Returns `access_token` + `refresh_token` in httpOnly cookies |
| POST | `/auth/refresh` | Refresh cookie | Issues new access token |
| POST | `/auth/logout` | Access token | Clears cookies |
| GET | `/auth/me` | Access token | Returns current user profile |

### 7.2 User / Admin Routes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/users` | admin | List all users with roles and status |
| PATCH | `/users/:id/role` | admin | Change user role (promote/demote) |
| PATCH | `/users/:id/status` | admin | Activate or deactivate a user account |
| GET | `/users/:id` | admin | Get single user details |

### 7.3 Project Routes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/projects` | manager, member | List projects where user is creator or member |
| POST | `/projects` | manager | Create new project |
| GET | `/projects/:id` | member of project | Get project with tasks + milestones |
| PATCH | `/projects/:id` | manager (owner) | Update project details, status, deadline |
| DELETE | `/projects/:id` | manager (owner) | Delete project and all children |
| GET | `/projects/:id/members` | member of project | List all project members |
| POST | `/projects/:id/members` | manager (owner) | Add member to project |
| DELETE | `/projects/:id/members/:userId` | manager (owner) | Remove member from project |

### 7.4 Task Routes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/projects/:id/tasks` | member of project | List tasks — supports `?status=&assignee=&priority=` |
| POST | `/projects/:id/tasks` | manager, member | Create task in project |
| GET | `/tasks/:id` | member of project | Get task detail with subtasks and comments |
| PATCH | `/tasks/:id` | manager, task assignee | Update task (status, priority, assignee, etc.) |
| DELETE | `/tasks/:id` | manager | Delete task and all subtasks |
| POST | `/tasks/:id/subtasks` | manager, member | Create subtask under a task |
| PATCH | `/tasks/:id/assign` | manager | Assign or reassign task to member |

### 7.5 Milestone Routes

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/projects/:id/milestones` | member of project | List all milestones for project |
| POST | `/projects/:id/milestones` | manager (owner) | Create milestone |
| PATCH | `/milestones/:id` | manager (owner) | Update milestone status or due date |
| DELETE | `/milestones/:id` | manager (owner) | Delete milestone |

### 7.6 Supporting Feature Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/tasks/:id/comments` | Add comment to task |
| GET | `/tasks/:id/comments` | List comments on task |
| DELETE | `/comments/:id` | Delete own comment (or any, if manager) |
| POST | `/tasks/:id/attachments` | Upload file attachment (`multipart/form-data`) |
| GET | `/tasks/:id/attachments` | List attachments for task |
| DELETE | `/attachments/:id` | Delete attachment (uploader or manager only) |
| POST | `/tasks/:id/timelogs` | Log hours against a task |
| GET | `/tasks/:id/timelogs` | List time logs for task |
| GET | `/projects/:id/timelogs` | All time logs for project (manager summary view) |

---

## 8. Frontend Architecture

### 8.1 Folder Structure

```
apps/frontend/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (dashboard)/
      layout.tsx              # Sidebar + auth guard
      page.tsx                # Dashboard home
      admin/
        page.tsx              # Admin: user management
      projects/
        page.tsx              # Projects list
        [id]/
          page.tsx            # Project overview
          board/page.tsx      # Kanban board
          tasks/page.tsx      # Task list view
          milestones/page.tsx
          members/page.tsx
      tasks/[id]/page.tsx     # Task detail
  components/
    ui/                       # shadcn/ui components
    layout/                   # Sidebar, Navbar, etc.
    kanban/                   # KanbanBoard, KanbanColumn, KanbanCard
    tasks/                    # TaskCard, TaskForm, TaskDetail
    projects/                 # ProjectCard, ProjectForm
    milestones/               # MilestoneTimeline
  lib/
    api.ts                    # Axios instance with interceptors
    auth.ts                   # Auth helpers
    hooks/                    # React Query hooks
  types/                      # Shared TypeScript interfaces
  middleware.ts               # Route protection
```

### 8.2 Route Guard (`middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 8.3 API Client (`lib/api.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api(err.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 8.4 React Query Hook Example

```typescript
// lib/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query';
import api from '../api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });
}
```

---

## 9. Kanban Board

The Kanban board is the centrepiece of the project view. Built with `@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`).

### 9.1 Columns

The board always has exactly **5 columns**, one per `TaskStatus` value:

| Column | TaskStatus value |
|---|---|
| Backlog | `backlog` |
| Todo | `todo` |
| In Progress | `in_progress` |
| In Review | `in_review` |
| Done | `done` |

### 9.2 Drag and Drop Behaviour

- Dragging a card between columns calls `PATCH /tasks/:id` with the new `status`
- **Optimistic update:** update React Query cache before the API responds, roll back on error
- Only managers and the task assignee can drag cards
- Subtasks are **not** shown on the Kanban — only parent tasks appear

### 9.3 Card Contents

Each card displays:

- Task title
- Priority badge (color coded: `urgent` = red, `high` = orange, `medium` = blue, `low` = gray)
- Assignee avatar (initials fallback if no profile image)
- Due date (shown in red if overdue)
- Subtask progress count (e.g. `2 / 5 subtasks done`)
- Attachment count icon

### 9.4 Install

```bash
npm install @hello-pangea/dnd
```

---

## 10. Build Order (Phase-by-Phase)

Follow this order exactly. **Do not start a phase until the previous one is fully working and tested.**

### Phase 1 — Infrastructure

1. Create monorepo folder structure
2. Write `docker-compose.yml`, start PostgreSQL
3. Initialise backend: `npm init`, install deps, configure `tsconfig.json`
4. Copy `schema.prisma` with enums, run `npx prisma migrate dev --name init`
5. Write and run `seed.ts`, verify in Prisma Studio (`npx prisma studio`)
6. Create `lib/prisma.ts` singleton

### Phase 2 — Auth API

1. `POST /auth/register` — hash password with bcrypt, create user
2. `POST /auth/login` — verify password, issue JWT access + refresh tokens as httpOnly cookies
3. `POST /auth/refresh` — verify refresh token, issue new access token
4. `POST /auth/logout` — clear cookies
5. `GET /auth/me` — return current user from token
6. Write `authenticate` middleware and `requireRole` middleware
7. **Test all auth routes in Postman / Thunder Client before proceeding**

### Phase 3 — Admin API

1. `GET /users` — admin only, return all users
2. `PATCH /users/:id/role` — promote/demote
3. `PATCH /users/:id/status` — activate/deactivate

### Phase 4 — Projects API

1. `POST /projects` — manager only
2. `GET /projects` — return projects where user is creator OR member
3. `GET /projects/:id` — include tasks and milestones
4. `PATCH /projects/:id` — manager owner only
5. `DELETE /projects/:id` — cascade deletes tasks, milestones, members
6. `POST /projects/:id/members` + `DELETE /projects/:id/members/:userId`

### Phase 5 — Tasks API

1. Full CRUD for tasks within a project
2. Subtask creation via `parent_task_id`
3. Task assignment endpoint
4. Filter by `status`, `priority`, `assignee` (query params)

### Phase 6 — Milestones, Comments, Attachments, Time Logs

1. Milestones CRUD
2. Task comments CRUD
3. File uploads with Multer (`POST /tasks/:id/attachments`)
4. Time logs CRUD

### Phase 7 — Frontend: Auth + Layout

1. Initialise Next.js 14 with App Router, Tailwind, shadcn/ui
2. Login page + Register page
3. JWT auth context / server-side cookie handling
4. Sidebar layout with role-aware navigation
5. Route protection via `middleware.ts`

### Phase 8 — Frontend: Admin Dashboard

1. User list table with role badges
2. Promote to manager / demote button
3. Activate / deactivate toggle

### Phase 9 — Frontend: Projects

1. Projects list page (cards with status, deadline, member count)
2. Create project modal (name, description, start/end date, budget)
3. Project overview page (stats, recent tasks, milestones)
4. Members management tab

### Phase 10 — Frontend: Kanban Board

1. Install `@hello-pangea/dnd`
2. Render 5 columns from `TaskStatus` enum
3. Task cards with priority badge, assignee, due date
4. Drag-and-drop with optimistic `PATCH /tasks/:id` status update

### Phase 11 — Frontend: Task Detail

1. Task detail page or drawer
2. Subtask list with add subtask form
3. Comments section (add, delete own)
4. Attachments section (upload, download, delete)
5. Time log section

### Phase 12 — Frontend: Milestones

1. Timeline view (horizontal, sorted by `due_date`)
2. Status badges and overdue highlighting
3. Add / edit milestone modal (manager only)

---

## 11. Key Business Rules

Enforce these rules in the **backend controllers** — never rely on the frontend alone.

| Rule | Where enforced |
|---|---|
| A member can only see projects they are in `ProjectMember` for | `GET /projects` query filter |
| Only the project creator (manager) can add/remove members | `requireRole` + ownership check |
| A task can only be assigned to a user who is a `ProjectMember` | Validate `assigned_to` in `PATCH /tasks/:id` |
| Subtasks cannot have their own subtasks (max 1 level deep) | Check `parent_task_id` in `POST /tasks/:id/subtasks` |
| Deleting a project cascades to tasks, milestones, members, comments, attachments, time logs | Prisma `onDelete: Cascade` or manual transaction |
| Admin cannot create projects — admin role is management only | `requireRole('manager')` on `POST /projects` |
| A user cannot be added to the same project twice | `@@unique([project_id, user_id])` in `ProjectMember` |
| File uploads: max 10 MB, allowed types: jpg, png, gif, pdf, docx, xlsx | Multer `fileFilter` + `limits` |
| Time logs: `hours_logged` must be > 0 and <= 24 | Zod schema validation |

---

## 12. Common Pitfalls & Agent Notes

### 12.1 CommonJS / ESModule Issues

`jsonwebtoken` and some other packages have ESM interop issues with `ts-node`. Always use:

```typescript
import jwt from 'jsonwebtoken';
```

And set in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "esModuleInterop": true
  }
}
```

### 12.2 Prisma Client in Next.js

In Next.js dev mode, hot reload creates multiple Prisma client instances and exhausts the connection pool. Use the global singleton pattern:

```typescript
// apps/frontend/lib/prisma.ts (for server components / route handlers)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 12.3 Error Serialization in Catch Blocks

Never do `res.json({ error: e })` — errors are not serializable. Always:

```typescript
} catch (e) {
  const message = e instanceof Error ? e.message : 'Unknown error';
  res.status(500).json({ error: message });
}
```

### 12.4 JWT Payload Shape

Always include `user_id`, `email`, and `role` in the JWT payload — not the full user object. The auth middleware attaches this to `req.user`.

```typescript
const payload = {
  user_id: user.user_id,
  email: user.email,
  role: user.role,
};
const token = jwt.sign(payload, process.env.JWT_SECRET!, {
  expiresIn: process.env.JWT_EXPIRES_IN,
});
```

### 12.5 Cascade Deletes

PostgreSQL enforces FK constraints strictly. When deleting a project, either set `onDelete: Cascade` on all child relations in the Prisma schema, or delete children manually in a transaction in this order:

```
TimeLog → TaskAttachment → TaskComment → Task → ProjectMember → Milestone → Project
```

To add cascade deletes in Prisma:

```prisma
project Project @relation(fields: [project_id], references: [project_id], onDelete: Cascade)
```

### 12.6 Kanban Drag-and-Drop Library

`react-beautiful-dnd` is **unmaintained**. Use `@hello-pangea/dnd` — it is a direct drop-in replacement with active maintenance and React 18 support. The API is identical.

### 12.7 CORS Configuration

The Express CORS config must explicitly allow the frontend origin and credentials:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Required for cookies
}));
```

---

## 13. Dependencies

### 13.1 Backend

```bash
npm install express @types/express
npm install prisma @prisma/client
npm install jsonwebtoken @types/jsonwebtoken
npm install bcryptjs @types/bcryptjs
npm install zod
npm install multer @types/multer
npm install cookie-parser @types/cookie-parser
npm install cors @types/cors
npm install dotenv
npm install -D typescript ts-node @types/node nodemon
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

### 13.2 Frontend

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
npx shadcn-ui@latest init
npm install @tanstack/react-query axios
npm install @hello-pangea/dnd
npm install date-fns
npm install react-hook-form @hookform/resolvers zod
```

---

## 14. Feature Acceptance Criteria

Use this checklist to verify each feature is complete before moving to the next phase.

| Feature | Acceptance Criteria |
|---|---|
| Auth | Register, login, logout, token refresh all work. Role is returned in `/auth/me`. Expired tokens return 401. |
| Admin Dashboard | Admin can see all users, change any user's role, activate/deactivate accounts. Non-admin gets 403. |
| Projects | Manager can create/edit/delete own projects. Member can only view assigned projects. Deadline and status visible. |
| Project Members | Manager can add/remove members. Cannot add same user twice (409). Cannot add user who doesn't exist. |
| Tasks | CRUD works. Status updates reflected on Kanban. Subtasks linked to parent. Filter by status/priority/assignee works. |
| Kanban Board | All 5 columns shown. Cards draggable between columns. Status persisted via API. Non-assignees/managers cannot drag. |
| Milestones | Timeline shows milestones in order. Overdue milestones highlighted in red. Manager can add/edit/delete. |
| Comments | Members can add comments. Authors can delete own comments. Manager can delete any comment. |
| Attachments | Files upload successfully. Download link works. Size and type validation enforced server-side. |
| Time Logs | Hours can be logged per task. Total hours shown on task detail. Manager can see project-wide time report. |

---

*End of document.*
