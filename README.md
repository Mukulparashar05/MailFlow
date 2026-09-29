# OutBox - Email Campaign Scheduler

A production-ready, full-stack email campaign scheduler with distributed rate limiting, background job processing, and real-time notifications.

![OutBox Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933)

## Features

### Core Functionality
- **Email Campaign Creation** - Compose campaigns with subject, HTML body, and multiple recipients
- **CSV Import** - Bulk import recipients from CSV files with validation
- **Smart Scheduling** - Schedule emails with configurable start times and delays
- **Distributed Rate Limiting** - Redis-based atomic rate limiting per campaign per hour
- **Background Processing** - BullMQ workers for reliable email delivery
- **Idempotent Delivery** - Guaranteed no duplicate sends even on retries

### User Experience
- **Google OAuth** - Secure authentication via Google accounts
- **Real-time Updates** - Auto-refreshing dashboards (every 10 seconds)
- **Slack Notifications** - Optional alerts when rate limits are reached
- **Modern UI** - Glassmorphism design with smooth animations

### Technical Highlights
- **Worker Reconciliation** - Automatic job recovery on server restart
- **State Machine** - Email jobs follow: PENDING → SCHEDULED → PROCESSING → SENT/FAILED
- **Crash Recovery** - Redis persistence + DB state ensures no lost emails

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL with Prisma ORM |
| **Queue** | Redis + BullMQ |
| **Auth** | Passport.js + Google OAuth 2.0 |
| **Email** | Nodemailer (Gmail SMTP / Ethereal for dev) |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│  React + Vite   │     │ Express + TS    │     │    (Prisma)     │
│   Port 5173     │     │   Port 3001     │     │   Port 5432     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │     Redis       │
                        │  Queue + Rate   │
                        │   Port 6379     │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Email Worker   │
                        │    BullMQ       │
                        │  Background     │
                        └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Google Cloud Console account (for OAuth)
- Gmail account with App Password (for SMTP)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/outbox.git
   cd outbox
   ```

2. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

3. **Configure environment**
   ```bash
   cp .env.example backend/.env
   # Edit backend/.env with your credentials
   ```

4. **Install dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. **Setup database**
   ```bash
   cd backend
   npx prisma db push
   ```

6. **Start the application**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Worker
   cd backend && npm run dev:worker

   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

7. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add authorized JavaScript origin: `http://localhost:5173`
4. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Secret to `backend/.env`

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Gmail
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use your email and app password in `backend/.env`

### Slack Integration (Optional)

1. Create app at [Slack API](https://api.slack.com/apps)
2. Add OAuth scopes: `chat:write`, `incoming-webhook`
3. Add redirect URL: `http://localhost:3001/api/slack/callback`
4. Copy Client ID and Secret to `backend/.env`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/parse-csv` | Parse CSV file |

### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails/scheduled` | Get scheduled emails |
| GET | `/api/emails/sent` | Get sent emails |
| GET | `/api/emails/failed` | Get failed emails |

## Database Schema

```prisma
model User {
  id              String          @id @default(cuid())
  email           String          @unique
  name            String?
  avatar          String?
  googleId        String          @unique
  campaigns       EmailCampaign[]
  slackConnection SlackConnection?
}

model EmailCampaign {
  id                 String      @id @default(cuid())
  userId             String
  subject            String
  body               String
  startAt            DateTime
  delayBetweenEmails Int         @default(0)
  hourlyLimit        Int         @default(100)
  status             CampaignStatus @default(DRAFT)
  emailJobs          EmailJob[]
}

model EmailJob {
  id                String      @id @default(cuid())
  campaignId        String
  recipientEmail    String
  status            EmailStatus @default(PENDING)
  scheduledAt       DateTime
  sentAt            DateTime?
  attempts          Int         @default(0)
  providerMessageId String?
}
```

## Rate Limiting

OutBox uses a distributed rate limiter with Redis:

- **Window**: 1 hour (configurable via `RATE_LIMIT_WINDOW_SECONDS`)
- **Mechanism**: Atomic INCR + EXPIRE via Lua script
- **Behavior**: Emails exceeding the limit are automatically rescheduled for the next window
- **Notifications**: Optional Slack alerts when limits are reached

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-backend-url.com`

### Railway/Render (Backend)

1. Deploy backend with these settings:
   - Build: `npm run build`
   - Start: `npm start`
2. Deploy worker separately:
   - Start: `npm run start:worker`
3. Add PostgreSQL and Redis addons
4. Configure all environment variables

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=<secure-random-string>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend.com/auth/google/callback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<app-password>
FRONTEND_URL=https://your-frontend.vercel.app
```

## Project Structure

```
outbox/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/         # Database, Redis, Logger, etc.
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── workers/        # BullMQ email worker
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
├── docker-compose.yml      # PostgreSQL + Redis
├── .env.example            # Environment template
└── README.md
```

## Security Features

- **OAuth-only auth** - No passwords stored
- **HTTP-only cookies** - Session protection against XSS
- **CORS configured** - Only frontend origin allowed
- **Helmet.js** - Security headers
- **Input validation** - Zod schemas on all endpoints
- **Rate limiting** - Prevents email spam
- **Secrets protection** - Environment variables, never committed

## Development Commands

```bash
# Backend
npm run dev          # Start with hot reload
npm run dev:worker   # Start worker with hot reload
npm run build        # TypeScript compilation
npm start            # Production server
npm run start:worker # Production worker

# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build

# Database
npx prisma db push   # Sync schema
npx prisma studio    # GUI for database
npx prisma generate  # Regenerate client
```

## Troubleshooting

### OAuth Error: invalid_client
- Verify Client ID and Secret are correct
- Check callback URL matches exactly
- Ensure OAuth consent screen is configured

### Emails not sending
- Check SMTP credentials
- Verify app password (not regular password)
- Check worker is running (`npm run dev:worker`)

### Rate limit stuck
- Clear Redis: `docker exec outbox_redis redis-cli FLUSHDB`
- Restart worker

## License

MIT License - feel free to use for personal or commercial projects.

---

Built with ❤️ using React, Node.js, PostgreSQL, Redis, and BullMQ
