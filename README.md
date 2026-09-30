# MailFlow - Email Campaign Scheduler

A production-ready, full-stack email campaign scheduler with distributed rate limiting, background job processing, and crash recovery.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Redis](https://img.shields.io/badge/Redis-7-DC382D)

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Email Configuration (Ethereal)](#email-configuration-ethereal)
6. [Environment Variables](#environment-variables)
7. [Architecture Overview](#architecture-overview)
8. [Deployment (Vercel + Railway)](#deployment-vercel--railway)
9. [Demo Walkthrough](#demo-walkthrough)
10. [Features Implemented](#features-implemented)
11. [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Live Demo

| | URL |
|---|---|
| Frontend (Vercel) | https://mail-flow-sigma.vercel.app |
| Backend health (Railway) | https://mailflow-production-20df.up.railway.app/health |

Sign in with any Google account.

> **Demo mode: email delivery is limited to one address.** Railway blocks outbound SMTP, so production sends through the [Resend](https://resend.com) HTTP API. Resend's free tier only delivers to the account owner's address (`mukulparashar0512@gmail.com`) until a custom domain is verified. The Compose page suggests that address when you click the recipient field. Emails to other addresses are still scheduled and rate limited, but the send step fails and they end up marked Failed. Running locally with Ethereal has no recipient restriction.

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

No frontend env vars are required. The app calls relative `/api` and `/auth` paths:
- Locally, the Vite dev server proxies them to `http://localhost:3001` (`vite.config.ts`).
- On Vercel, `frontend/vercel.json` rewrites them to the Railway backend.

Optional (`frontend/.env`):

```env
# Call a backend directly instead of the proxy. Leave unset in production (see Deployment).
VITE_API_URL=
# Suggested recipient on the Compose page; set to "" to turn off the demo-mode hint
VITE_DEMO_RECIPIENT=
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

### Real Delivery via Gmail SMTP

Works locally or on any host that allows outbound SMTP:

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

### Production Email (Resend API)

Railway blocks outbound SMTP ports, so SMTP connections from the deployed worker time out. When `RESEND_API_KEY` is set, the worker sends through Resend's HTTP API instead (`emailService.ts`); otherwise it uses SMTP.

```env
RESEND_API_KEY=re_your_resend_api_key
SMTP_FROM="MailFlow <onboarding@resend.dev>"
```

On Resend's free tier, mail is only delivered to the account owner's address until a domain is verified at https://resend.com/domains.

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

# === RESEND (optional, production) ===
# If set, emails go through Resend's HTTP API instead of SMTP
# RESEND_API_KEY=re_your_resend_api_key

# === WORKER ===
WORKER_CONCURRENCY=5

# === RATE LIMITING ===
# 60 = per minute (default), 3600 = per hour
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
5. For production, also add origin `https://mail-flow-sigma.vercel.app` and redirect URI `https://mail-flow-sigma.vercel.app/auth/google/callback` (the callback goes through the Vercel proxy)
6. Set the OAuth consent screen's publishing status to "In production" so any Google account can sign in

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
                                          │  Email provider     │
                                          │  SMTP (Ethereal) or │
                                          │  Resend API (prod)  │
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
   d. Send via SMTP, or the Resend API when RESEND_API_KEY is set
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

Algorithm: Fixed-window counter per campaign, in an atomic Redis Lua script

Key Format: rate_limit:{campaignId}:{windowTimestamp}
Window: 60 seconds by default (RATE_LIMIT_WINDOW_SECONDS)

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

## Deployment (Vercel + Railway)

```
Browser ──> Vercel (mail-flow-sigma.vercel.app)
              ├── static React build
              └── rewrites /api/* and /auth/* ──> Railway: MailFlow API (Express)
                                                        │
                                           Railway: PostgreSQL + Redis
                                                        │
                                           Railway: MailFlow-Worker (BullMQ) ──> Resend API
```

**Why the Vercel rewrites:** the API sets the session cookie. If the browser called Railway directly, that cookie would belong to `railway.app` while the page runs on `vercel.app`. Brave, Safari and Incognito block such third-party cookies, which caused a login loop. Proxying through Vercel makes the cookie first-party.

### Railway (backend)

| Service | Root directory | Start command | Key variables |
|---------|----------------|---------------|---------------|
| MailFlow (API) | `/backend` | `npm start` | `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL=https://mail-flow-sigma.vercel.app/auth/google/callback`, `FRONTEND_URL=https://mail-flow-sigma.vercel.app`, `NODE_ENV=production` |
| MailFlow-Worker | `/backend` | `npm run start:worker` | `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `SMTP_FROM`, `NODE_ENV=production`, optional `WORKER_CONCURRENCY`, `RATE_LIMIT_WINDOW_SECONDS` |
| PostgreSQL, Redis | Railway databases | - | - |

- The build command comes from `railway.json` (`npm run build` = `prisma generate && tsc`).
- Create the tables once from the API service console: `npx prisma db push`.

### Vercel (frontend)

- Root directory `frontend`, build command `npm run build`, output directory `dist`.
- `frontend/vercel.json` holds the `/api` and `/auth` rewrites plus the SPA fallback to `index.html`.
- Don't set `VITE_API_URL` in production; it would bypass the proxy.

---

## Demo Walkthrough

1. **Create scheduled emails:** Compose → click the recipient field and pick the suggested address (or upload a CSV) → fill in subject, body, start time, delay and rate limit → Schedule Campaign.
2. **Dashboard, Scheduled and Sent:** the Scheduled page lists queued emails and refreshes every 10 seconds; delivered emails move to Sent with their provider message ID.
3. **Restart scenario:** schedule a campaign a few minutes ahead, then restart the worker (Railway → MailFlow-Worker → Restart, or Ctrl+C and `npm run dev:worker` locally). On startup the worker logs `Starting startup reconciliation...`, re-queues SCHEDULED/PENDING jobs from PostgreSQL, and the emails still go out.
4. **Rate limiting under load:** set Rate Limit to 1 and Delay to 0 with several recipients. One email is sent per minute and the rest are rescheduled to the next window (worker log: `Rate limit reached — rescheduling email job`). Use a local Ethereal setup to demo many recipients, since production only delivers to the demo address.

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
| **Email Delivery** | Resend HTTP API when `RESEND_API_KEY` is set, SMTP (Nodemailer) otherwise | `emailService.ts`, `mailer.ts` |
| **CSV Parsing** | Server-side validation | `csvParser.ts` |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers | `index.ts`, `emailWorker.ts` |

### Frontend Features

| Feature | Implementation | Files |
|---------|---------------|-------|
| **Login Page** | Google OAuth redirect | `LoginPage.tsx` |
| **Dashboard** | Animated stats, recent campaigns | `DashboardPage.tsx` |
| **Compose Form** | Recipients, CSV upload, scheduling | `ComposePage.tsx` |
| **Draft Persistence** | localStorage auto-save | `ComposePage.tsx` |
| **Demo Recipient Hint** | Suggests the only deliverable address, plus a demo-mode note | `ComposePage.tsx` |
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
4. **Rate Limit Window**: Per-minute by default (`RATE_LIMIT_WINDOW_SECONDS=3600` for per-hour)
5. **Session Storage**: In-memory, so a backend redeploy logs everyone out (would use a Redis or Postgres session store in production)

### Trade-offs

| Decision | Trade-off | Reason |
|----------|-----------|--------|
| **BullMQ over Agenda** | Less MongoDB integration | Better Redis performance, cleaner API |
| **Prisma over TypeORM** | Less raw SQL flexibility | Better TypeScript integration, simpler migrations |
| **localStorage for drafts** | Not synced across devices | Simple, no backend changes needed |
| **Per-campaign rate limit** | Not global rate limit | More granular control per campaign |
| **Polling for updates** | Not real-time WebSocket | Simpler implementation, 10s refresh is acceptable |
| **Ethereal for dev** | Emails not actually sent | Safe testing, easy setup |
| **Resend API in production** | Free tier only delivers to the owner's address | Railway blocks outbound SMTP; an HTTP API works from any host |
| **Vercel rewrites for the API** | Extra network hop | Session cookie is first-party, so privacy-focused browsers don't block login |
| **`hourlyLimit` column name** | Name no longer matches meaning | Kept to avoid a schema migration; the value is per window (per minute by default) |

### Shortcuts Taken

1. **No email templates**: HTML typed directly (production would have template system)
2. **No pagination**: Tables load all data (production would paginate)
3. **No email tracking**: No open/click tracking (would need tracking pixel/links)
4. **No campaign editing**: Once scheduled, cannot modify (would need cancel/reschedule)
5. **No email preview**: Basic HTML render (would need proper email preview)
6. **Interrupted sends**: a job that crashes mid-send stays PROCESSING; startup reconciliation only re-queues PENDING and SCHEDULED jobs (production would add a stale-job sweeper)

### Production Improvements Needed

1. **Session Store**: Use Redis for sessions (currently in-memory)
2. **Rate Limiting API**: Add Express rate limiting middleware
3. **Email Templates**: Rich template system with variables
4. **Monitoring**: Add APM (DataDog, New Relic)
5. **Logging**: Ship logs to centralized system
6. **Testing**: Add integration and end-to-end tests (unit tests cover the scheduling logic)
7. **CI/CD**: Add GitHub Actions pipeline
8. **Email Domain**: Verify a sending domain in Resend so any recipient can receive mail
9. **Dependencies**: Upgrade Nodemailer to a major version without the `npm audit` advisory

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
│   ├── vercel.json          # Vercel rewrites (/api, /auth -> Railway) + SPA fallback
│   └── package.json
│
├── docker-compose.yml       # PostgreSQL + Redis
├── railway.json             # Railway build command
├── .env.example             # Environment template
└── README.md                # This file
```

---

## License

MIT License - Free for personal and commercial use.

---

Built with React, Node.js, PostgreSQL, Redis, and BullMQ
