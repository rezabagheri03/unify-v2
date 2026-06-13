# Unify — Integrated University Assistant Platform

> Persian (Farsi) RTL web application for university students, professors, and administrative staff.

---

## 🚀 Quick Start (Windows)

### Step 1: Setup Prisma (RUN ONCE on Windows)

```bash
# Open PowerShell or CMD in the project folder
cd E:\Documents\New folder\New folder\unify-v2

# Install dependencies and generate Prisma client
npm install
cd apps/api
npx prisma generate
cd ../..
```

### Step 2: Start Docker

```bash
cd E:\Documents\New folder\New folder\unify-v2
docker-compose -f docker/docker-compose.yml up
```

That's it! Docker will automatically:
- ✅ Starts PostgreSQL + Redis
- ✅ Runs database migrations
- ✅ Seeds the System Owner account
- ✅ Starts everything on ports 3000 & 3001

---

## 🌐 Access

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:3001 |
| **Health Check** | http://localhost:3001/api/health |

---

## 🔐 Login

| Field | Value |
|-------|-------|
| **Username** | `owner` |
| **Password** | `ChangeThisOnFirstLogin!1` |

> ⚠️ Change the password immediately after first login via the Owner Panel.

---

## 📋 Docker Commands

```bash
# Start (with logs)
docker-compose -f docker/docker-compose.yml up

# Start in background
docker-compose -f docker/docker-compose.yml up -d

# Stop and keep data
docker-compose -f docker/docker-compose.yml down

# Stop and DELETE all data (clean slate)
docker-compose -f docker/docker-compose.yml down -v

# Rebuild from scratch
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up --build
```

---

## 🛠️ Troubleshooting

### Prisma binary download error?
```bash
# Run this on Windows first, then start Docker:
cd apps/api
npx prisma generate
```

### Port already in use?
```bash
# Kill existing processes
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### Database connection error?
```bash
# Make sure Docker is running
docker ps
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────┐
│              Docker              │
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │         app container      │  │
│  │  Next.js :3000 + API :3001 │  │
│  └────────────────────────────┘  │
│  ┌──────────┐  ┌───────────────┐ │
│  │ postgres │  │     redis     │ │
│  │  :5432   │  │    :6379      │ │
│  └──────────┘  └───────────────┘ │
└──────────────────────────────────┘
```

---

## 🔧 Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query
- **Backend:** Express.js, TypeScript, Prisma, Socket.io, BullMQ
- **Database:** PostgreSQL 16, Redis 7
- **Push Notifications:** Socket.io + Pushe SDK fallback
- **Calendar:** Shamsi/Jalali throughout
