# Unify — Integrated University Assistant Platform

> Persian (Farsi) RTL web application for university students, professors, and administrative staff.
> Built per the Unify Golden Documentation v6.0.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Reverse Proxy)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐            ┌──────▼──────┐
        │   Next.js  │            │   Express   │
        │  Frontend  │◄──────────►│   Backend   │
        │  (Port 3000)│            │  (Port 3001)│
        └───────────┘            └──────┬──────┘
                                       │
                              ┌────────┼─────────┐
                              │        │         │
                        ┌─────▼──┐ ┌───▼────┐ ┌──▼──┐
                        │Postgres│ │ Redis  │ │Local│
                        │   DB   │ │Cache + │ │Files│
                        │        │ │  Queue │ │     │
                        └────────┘ └────────┘ └─────┘
```

## 🧰 Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod, Framer Motion, Recharts
- **Backend:** Node.js 20, Express.js 5, TypeScript, Prisma 5, Socket.io 4, BullMQ
- **Database:** PostgreSQL 16, Redis 7
- **Push Notifications:** Pushe SDK (Iranian) + Socket.io fallback
- **Containerization:** Docker + Docker Compose
- **Calendar:** jalaali-js (Shamsi/Jalali)

## 📁 Monorepo Structure

```
unify/
├── apps/
│   ├── web/              # Next.js frontend (apps/web/src/app)
│   └── api/              # Express backend (apps/api/src)
├── packages/
│   ├── shared-types/     # Shared TS types + Zod schemas + Shamsi utilities
│   └── config/           # Shared ESLint/TS configs
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Initial System Owner seed
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── nginx/nginx.conf
├── scripts/
│   └── excel-templates/  # Excel import templates
└── storage/              # Local file storage (gitignored)
```

## 🚀 Quick Start

### Option A: Docker (Recommended)

```bash
# 1. Clone & install
git clone <repo-url> unify
cd unify
cp .env.example .env

# 2. Generate secure secrets (REQUIRED — do not skip)
openssl rand -base64 64  # paste into JWT_ACCESS_SECRET
openssl rand -base64 64  # paste into JWT_REFRESH_SECRET
# Also change SEED_OWNER_PASSWORD in .env

# 3. Boot the full stack
docker-compose -f docker/docker-compose.yml up -d
# Or for development with hot-reload:
docker-compose -f docker/docker-compose.dev.yml up

# 4. Run database migrations
docker exec -it unify-api npx prisma migrate deploy
docker exec -it unify-api npx prisma db seed

# 5. Open
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Prisma Studio: docker exec -it unify-api npx prisma studio
```

### Option B: Local Development

```bash
# Prerequisites: Node.js 20+, PostgreSQL 16, Redis 7

# 1. Install
cp .env.example .env
# Edit .env with your local Postgres/Redis URLs
npm install

# 2. Database setup
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..

# 3. Start both apps
npm run dev
# Web: http://localhost:3000
# API: http://localhost:3001
```

## 🔐 Default Seeded Credentials

After running `prisma db seed`, a **System Owner** account is created.

| Role | Username | Password (from .env) |
|---|---|---|
| System Owner | `owner` | `SEED_OWNER_PASSWORD` value |

> ⚠️ **Change the default password immediately after first login.**

The System Owner can then create additional user accounts via the Owner Panel:
- **Excel bulk upload** for hundreds of students/staff at once
- **Manual creation** for individual accounts
- Generated passwords are exported to an Excel file for physical distribution

## 🔧 Setup cron for automated backups

```bash
chmod +x scripts/backup.sh

# Edit crontab
crontab -e

# Add this line (runs daily at 02:00):
0 2 * * * /opt/unify/scripts/backup.sh >> /var/log/unify-backup.log 2>&1
```

Adjust paths as needed for your installation.

## 🧪 Testing

```bash
# Unit + integration tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# TypeScript check
npm run typecheck
```

## 📜 Key Documentation

- [Golden Documentation v6.0](docs/Golden-Doc.md) — Product spec
- [Agent Implementation Guide](docs/Agent-Guide.md) — Engineering spec
- API contract: see `Appendix D` of Golden Doc
- Edge cases & resolutions: see `PART 5` of Agent Guide

## 🌐 Internationalization

All UI text is **Persian (Farsi)** with **RTL** layout. Default fonts: Vazirmatn. Calendar: Shamsi/Jalali throughout.

## 📜 License

Internal/Proprietary — University Use Only
