# DBMS Project - Local Setup

## Prerequisites

- Node.js and npm
- Docker Desktop (or Docker Engine + Compose)

## 1) Create environment files

Copy `.env.example` to both:

- `.env` (repo root, used by Prisma)
- `apps/backend/.env` (used by backend runtime)

Then create `apps/frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

## 2) Start database and pgAdmin

From the repository root:

```bash
docker compose up -d
```

- Postgres: `localhost:5432`
- pgAdmin: `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

## 3) Install dependencies

Run from repository root:

```bash
npm install
npm install --prefix apps/backend
npm install --prefix apps/frontend
```

## 4) Generate Prisma client, migrate, and seed

Run from repository root:

```bash
npm run prisma:generate --prefix apps/backend
npm run prisma:migrate --prefix apps/backend
npm run prisma:seed
```

## 5) Run backend

In one terminal:

```bash
npm run dev --prefix apps/backend
```

Backend URL: `http://localhost:5000`

## 6) Run frontend

In a second terminal:

```bash
npm run dev --prefix apps/frontend
```

Frontend URL: `http://localhost:3000`

## Seeded test users

If seeding succeeds, log in with:

- `admin@pm.local` / `Admin@1234`
- `manager@pm.local` / `Manager@1234`
- `alice@pm.local` / `Member@1234`

## New project management capabilities

After running migration + seed, the app now includes:

- Persisted Kanban ordering (`sort_order`) with drag/drop move endpoint
- Server-side task filtering/search/sort/pagination (including label filter)
- Project activity log feed (`/api/projects/:id/activity`)
- Project-scoped labels and task label assignment APIs/UI

If your database was initialized before these changes, run:

```bash
npm run prisma:migrate
npm run prisma:seed
```
