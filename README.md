# MailFlow - Email Campaign Scheduler

A production-ready, full-stack email campaign scheduler with distributed rate limiting, background job processing, and crash recovery.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Redis](https://img.shields.io/badge/Redis-7-DC382D)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Email Configuration (Ethereal)](#email-configuration-ethereal)
5. [Environment Variables](#environment-variables)
6. [Architecture Overview](#architecture-overview)
7. [Features Implemented](#features-implemented)
8. [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Quick Start

```bash
# 1. Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# 2. Setup backend
cd backend
cp ../.env.example .env  # Edit with your credentials
npm install
npx prisma db push

# 3. Start all services (3 terminals)
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Email Worker
cd backend && npm run dev:worker

# Terminal 3: Frontend
cd frontend && npm install && npm run dev

# 4. Open http://localhost:5173
```

---

## Backend Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Services Architecture

| Service | Port | Description |
|---------|------|-------------|
| Express API | 3001 | REST API server |
| Email Worker | - | BullMQ background processor |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Queue & rate limiting |

### Running the Backend

```bash
# Start infrastructure
docker-compose up -d

# Install dependencies
cd backend
npm install

# Setup database
npx prisma db push

# Start API server (development)
npm run dev

# Start email worker (separate terminal)
npm run dev:worker
```

### Production Commands

```bash
# Build
npm run build

# Start API
npm start

# Start Worker
npm run start:worker
```

### Database Commands

```bash
# Push schema changes
npx prisma db push

# Open database GUI
npx prisma studio

# Regenerate Prisma client
npx prisma generate
```

---

## Frontend Setup

### Prerequisites
- Node.js 20+

### Running the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables (Frontend)

For production deployment, create `.env` in frontend:

```env
VITE_API_URL=https://your-backend-url.com
```

---

## Email Configuration (Ethereal)

[Ethereal Email](https://ethereal.email/) provides fake SMTP for development - emails are captured but not delivered.

### Setup Steps

1. **Create Ethereal Account**
   - Go to https://ethereal.email/
   - Click "Create Ethereal Account"
   - Copy the generated credentials

2. **Configure Environment**
   ```env
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.ethereal.user@ethereal.email
   SMTP_PASSWORD=your_ethereal_password
   SMTP_FROM="OutBox <noreply@outbox.dev>"
   ```

3. **View Sent Emails**
   - Check worker logs for "previewUrl"
   - Or login to https://ethereal.email/messages

### Production Email (Gmail)

For real email delivery:

1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Configure:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=your_app_password
   SMTP_FROM="OutBox <your.email@gmail.com>"
   ```

---

## Environment Variables

Create `backend/.env` with the following:

```env
# === DATABASE ===
DATABASE_URL="postgresql://outbox:outbox_password@localhost:5432/outbox_db"

# === REDIS ===
REDIS_URL="redis://localhost:6379"

# === GOOGLE OAUTH ===
# Create at: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# === SESSION ===
SESSION_SECRET=change_this_to_random_string

# === SMTP ===
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ethereal_user
SMTP_PASSWORD=your_ethereal_password
SMTP_FROM="OutBox <noreply@outbox.dev>"

# === WORKER ===
WORKER_CONCURRENCY=5

# === RATE LIMITING ===
# 60 = per minute (demo), 3600 = per hour (production)
RATE_LIMIT_WINDOW_SECONDS=60

# === URLS ===
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
NODE_ENV=development
PORT=3001
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized origins: `http://localhost:5173`
4. Add redirect URI: `http://localhost:3001/auth/google/callback`

---

## Architecture Overview

### System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                           USER                                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                        │
│                      http://localhost:5173                        │
│  ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐  │
│  │  Login  │ │Dashboard│ │  Compose  │ │Scheduled │ │  Sent   │  │
│  └─────────┘ └─────────┘ └───────────┘ └──────────┘ └─────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ REST API
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express + TypeScript)                  │
│                      http://localhost:3001                        │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────────┐ │
│  │  Auth       │ │  Campaigns   │ │  Email Jobs                │ │
│  │  (Passport) │ │  CRUD        │ │  Scheduling                │ │
│  └─────────────┘ └──────────────┘ └────────────────────────────┘ │
└───────────┬──────────────────┬───────────────────┬───────────────┘
            │                  │                   │
            ▼                  ▼                   ▼
┌───────────────────┐ ┌────────────────┐ ┌─────────────────────────┐
│    PostgreSQL     │ │     Redis      │ │    BullMQ Worker        │
│    (Prisma ORM)   │ │  Queue + Rate  │ │    Background Jobs      │
│    Port 5432      │ │  Port 6379     │ │                         │
└───────────────────┘ └────────────────┘ └───────────┬─────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │    SMTP Server      │
                                          │  (Ethereal/Gmail)   │
                                          └─────────────────────┘
```

### How Scheduling Works

```
1. USER creates campaign with recipients + schedule time
                    │
                    ▼
2. API creates EmailCampaign + EmailJob records in PostgreSQL
   Status: PENDING
                    │
                    ▼
3. SchedulerService adds jobs to BullMQ with calculated delays
   - Each job gets unique ID: `email-job-{emailJobId}`
   - Delay = scheduledAt - now
   Status: SCHEDULED
                    │
                    ▼
4. BullMQ triggers job when delay expires
                    │
                    ▼
5. Worker processes job:
   a. Check idempotency (skip if SENT)
   b. Check rate limit (reschedule if exceeded)
   c. Mark PROCESSING
   d. Send via SMTP
   e. Mark SENT or FAILED
```

### Persistence on Restart (Crash Recovery)

```
┌─────────────────────────────────────────────────────────────────┐
│                    STARTUP RECONCILIATION                        │
└─────────────────────────────────────────────────────────────────┘

When worker starts:
                    │
                    ▼
1. Query PostgreSQL for jobs with status SCHEDULED or PENDING
                    │
                    ▼
2. For each job, re-add to BullMQ queue:
   - Same deterministic jobId prevents duplicates
   - BullMQ ignores if job already exists
                    │
                    ▼
3. Jobs resume processing automatically

WHY IT WORKS:
┌──────────────────┐     ┌──────────────────┐
│   PostgreSQL     │     │     Redis        │
│   (Persistent)   │     │   (Volatile)     │
│                  │     │                  │
│ EmailJob records │────▶│ BullMQ jobs      │
│ survive restart  │     │ recreated from   │
│                  │     │ DB on startup    │
└──────────────────┘     └──────────────────┘
```

### Rate Limiting & Concurrency

```
┌─────────────────────────────────────────────────────────────────┐
│                  DISTRIBUTED RATE LIMITING                       │
└─────────────────────────────────────────────────────────────────┘

Algorithm: Token Bucket with Redis Atomic Operations

Key Format: rate_limit:{campaignId}:{windowTimestamp}
Window: 60 seconds (configurable)

┌─────────────────────────────────────────────────────────────────┐
│                      Lua Script (Atomic)                         │
│  1. INCR counter                                                 │
│  2. If first increment, SET EXPIRE                               │
│  3. If > limit, DECR and return -1                               │
│  4. Else return current count                                    │
└─────────────────────────────────────────────────────────────────┘

When limit exceeded:
  - Job is NOT marked as failed
  - New delayed job created for next window
  - Original job completes successfully

┌─────────────────────────────────────────────────────────────────┐
│                       CONCURRENCY                                │
└─────────────────────────────────────────────────────────────────┘

BullMQ Worker: 5 concurrent jobs (configurable)

Race Condition Prevention:
  - Optimistic locking with status check
  - UPDATE WHERE status IN (PENDING, SCHEDULED)
  - If count = 0, another worker got it first

┌────────────┐    ┌────────────┐    ┌────────────┐
│  Worker 1  │    │  Worker 2  │    │  Worker 3  │
└─────┬──────┘    └─────┬──────┘    └─────┬──────┘
      │                 │                 │
      └────────────────┼─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  BullMQ Queue   │
              │  (Redis-backed) │
              └─────────────────┘
```

---

## Features Implemented

### Backend Features

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Email Scheduler** | BullMQ delayed jobs with configurable delays | `schedulerService.ts`, `queue.ts` |
| **Persistence** | PostgreSQL + startup reconciliation | `emailWorker.ts` (reconcileScheduledJobs) |
| **Rate Limiting** | Redis atomic counters with Lua script | `rateLimiter.ts` |
| **Concurrency** | BullMQ worker pool (5 concurrent) | `emailWorker.ts` |
| **Idempotency** | DB status check before send + unique jobIds | `emailWorker.ts` |
| **State Machine** | PENDING → SCHEDULED → PROCESSING → SENT/FAILED | Prisma schema |
| **Google OAuth** | Passport.js strategy | `passport.ts`, `authController.ts` |
| **CSV Parsing** | Server-side validation | `csvParser.ts` |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers | `index.ts`, `emailWorker.ts` |

### Frontend Features

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Login Page** | Google OAuth redirect | `LoginPage.tsx` |
| **Dashboard** | Animated stats, recent campaigns | `DashboardPage.tsx` |
| **Compose Form** | Recipients, CSV upload, scheduling | `ComposePage.tsx` |
| **Draft Persistence** | localStorage auto-save | `ComposePage.tsx` |
| **Scheduled Table** | Auto-refresh (10s), search, stats | `ScheduledPage.tsx` |
| **Sent Table** | Auto-refresh, copy message ID | `SentPage.tsx` |
| **Status Badges** | Color-coded with animations | `StatusBadge.tsx` |
| **Toast Notifications** | Success/error/info with progress | `Toast.tsx`, `useToast.ts` |
| **Glassmorphism UI** | Modern design system | `index.css`, `tailwind.config.js` |
| **Responsive Design** | Mobile-friendly layout | All components |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/parse-csv` | Parse CSV |
| GET | `/api/emails/scheduled` | Scheduled emails |
| GET | `/api/emails/sent` | Sent emails |

---

## Assumptions & Trade-offs

### Assumptions Made

1. **Single Tenant**: One user owns all their campaigns (no sharing/teams)
2. **Email Delivery**: SMTP is reliable; no delivery tracking beyond "sent"
3. **Time Zones**: All times stored in UTC, displayed in browser local time
4. **Rate Limit Window**: Per-minute for demo (easily changed to per-hour)
5. **Session Storage**: In-memory (would use Redis session store in production)

### Trade-offs

| Decision | Trade-off | Reason |
|----------|-----------|--------|
| **BullMQ over Agenda** | Less MongoDB integration | Better Redis performance, cleaner API |
| **Prisma over TypeORM** | Less raw SQL flexibility | Better TypeScript integration, simpler migrations |
| **localStorage for drafts** | Not synced across devices | Simple, no backend changes needed |
| **Per-campaign rate limit** | Not global rate limit | More granular control per campaign |
| **Polling for updates** | Not real-time WebSocket | Simpler implementation, 10s refresh is acceptable |
| **Ethereal for dev** | Emails not actually sent | Safe testing, easy setup |

### Shortcuts Taken

1. **No email templates**: HTML typed directly (production would have template system)
2. **No pagination**: Tables load all data (production would paginate)
3. **No email tracking**: No open/click tracking (would need tracking pixel/links)
4. **No campaign editing**: Once scheduled, cannot modify (would need cancel/reschedule)
5. **No email preview**: Basic HTML render (would need proper email preview)

### Production Improvements Needed

1. **Session Store**: Use Redis for sessions (currently in-memory)
2. **Rate Limiting API**: Add Express rate limiting middleware
3. **Email Templates**: Rich template system with variables
4. **Monitoring**: Add APM (DataDog, New Relic)
5. **Logging**: Ship logs to centralized system
6. **Testing**: Add unit/integration tests
7. **CI/CD**: Add GitHub Actions pipeline

---

## Project Structure

```
outbox/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, Logger, Passport
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── emailService.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── schedulerService.ts
│   │   ├── workers/         # BullMQ processors
│   │   └── index.ts         # Express app entry
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── docker-compose.yml       # PostgreSQL + Redis
├── .env.example             # Environment template
├── DEMO_SCRIPT.md           # Evaluation demo guide
└── README.md                # This file
```

---

## License

MIT License - Free for personal and commercial use.

---

Built with React, Node.js, PostgreSQL, Redis, and BullMQ
