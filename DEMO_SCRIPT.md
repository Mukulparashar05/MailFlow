# OutBox Demo Script for Evaluation

This script demonstrates all key features of OutBox for your internship evaluation.

---

## Pre-Demo Setup (Do Once)

```bash
# Terminal 1: Start Docker (PostgreSQL + Redis)
docker-compose up -d

# Terminal 2: Start Backend
cd backend && npm run dev

# Terminal 3: Start Worker
cd backend && npm run dev:worker

# Terminal 4: Start Frontend
cd frontend && npm run dev
```

**Open browser**: http://localhost:5173

---

## Demo 1: Creating Scheduled Emails (2 min)

### Steps:
1. **Login** with Google OAuth
2. Click **"New Campaign"** or go to **Compose**
3. **Add Recipients**:
   - Type: `test1@example.com` → Press Enter
   - Type: `test2@example.com` → Press Enter
   - Type: `test3@example.com` → Press Enter
   - (Or upload a CSV file with email column)

4. **Fill Email Content**:
   - Subject: `OutBox Demo - Rate Limiting Test`
   - Body: `<h1>Hello!</h1><p>This is a test email from OutBox.</p>`

5. **Configure Scheduling**:
   - Start Time: **Current time** (default)
   - Delay Between Emails: `10` seconds
   - Hourly Rate Limit: `2` (for demo - shows rate limiting quickly)

6. Click **"Schedule Campaign"**

### What to show evaluator:
- ✅ Recipients are validated (try adding invalid email)
- ✅ CSV import works (drag & drop)
- ✅ Campaign preview shows estimated completion time

---

## Demo 2: Dashboard with Scheduled & Sent Emails (1 min)

### Steps:
1. Go to **Scheduled** page
   - Shows emails waiting to be sent
   - Status: `SCHEDULED` with pulsing indicator
   - **Page auto-refreshes every 10 seconds** (no manual refresh needed!)

2. Watch emails move from Scheduled → Sent
   - First email sends immediately
   - Second email sends after 10 seconds (delay)
   - Third email gets **rate limited** (only 2/minute allowed)

3. Go to **Sent** page
   - Shows delivered emails with timestamps
   - Message ID from SMTP provider

### What to show evaluator:
- ✅ Real-time updates without page refresh
- ✅ Status transitions: SCHEDULED → PROCESSING → SENT
- ✅ Stats cards update automatically

---

## Demo 3: Restart Recovery Scenario (2 min) ⭐ IMPORTANT

This demonstrates **crash recovery** - a key production feature!

### Setup:
1. Create a new campaign with:
   - 5 recipients
   - Start time: **2 minutes in the future**
   - Delay: 30 seconds between emails

2. Go to **Scheduled** page - see 5 emails waiting

### Simulate Server Crash:
3. **Kill the worker process** (Ctrl+C in worker terminal)
   ```bash
   # Or just close Terminal 3 where worker is running
   ```

4. **Wait 30 seconds** - Show evaluator:
   - Emails are still in "Scheduled" in the UI
   - They're stored in PostgreSQL database
   - BullMQ jobs are persisted in Redis

### Recovery:
5. **Restart the worker**:
   ```bash
   cd backend && npm run dev:worker
   ```

6. **Watch the logs** - you'll see:
   ```
   [info]: Starting startup reconciliation...
   [info]: Reconciliation complete { total: 5, reconciled: 5, skipped: 0 }
   ```

7. **Watch the Scheduled page** - emails start sending again!

### What to show evaluator:
- ✅ Jobs survive server restart
- ✅ Automatic reconciliation on startup
- ✅ No duplicate sends (idempotency)
- ✅ Worker logs show recovery process

---

## Demo 4: Rate Limiting Under Load (2 min) ⭐ BONUS

### Setup (rate limit is set to 1-minute window for demo):

1. Create campaign with:
   - **10 recipients** (or more)
   - Rate Limit: `3 emails per hour` (actually per minute in demo)
   - Delay: `0` seconds (send all at once)

2. Click **Schedule Campaign**

### What Happens:
- First 3 emails send immediately
- Emails 4-10 get **rate limited**
- Worker logs show:
  ```
  [warn]: Rate limit reached — rescheduling email job
  [info]: Email job rescheduled for next rate limit window
  ```

3. **Wait ~60 seconds** → Next batch of 3 emails sends
4. Check **Slack** (if connected) - rate limit notification received!

### What to show evaluator:
- ✅ Distributed rate limiting with Redis
- ✅ Automatic rescheduling (not failed, just delayed)
- ✅ Slack notification on rate limit
- ✅ No emails lost, all eventually delivered

---

## Key Technical Points to Mention

### 1. Idempotency
> "Each email job has a unique ID. Even if we process the same job twice, the worker checks the database status first and skips already-sent emails."

### 2. Distributed Rate Limiting
> "Rate limits use Redis with atomic Lua scripts. Multiple workers can run simultaneously without exceeding the limit."

### 3. State Machine
> "Emails follow a strict state machine: PENDING → SCHEDULED → PROCESSING → SENT/FAILED. This prevents race conditions."

### 4. Crash Recovery
> "On startup, the worker reconciles BullMQ queue with database state. Any missed jobs are re-enqueued automatically."

---

## Architecture Diagram (Draw or Show)

```
User → React Frontend → Express API → PostgreSQL (persistent state)
                             ↓
                         BullMQ Queue (Redis)
                             ↓
                      Email Worker(s) → SMTP → Recipient
```

---

## Quick Commands Reference

```bash
# Clear all data for fresh demo
docker exec outbox_redis redis-cli FLUSHDB
cd backend && npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.emailJob.deleteMany().then(() => prisma.emailCampaign.deleteMany()).then(() => console.log('Cleared!'));
"

# Check worker logs
# Look at Terminal 3 where worker is running

# Check Redis rate limit keys
docker exec outbox_redis redis-cli KEYS "rate_limit:*"

# Check BullMQ queue
docker exec outbox_redis redis-cli KEYS "bull:*"
```

---

## Troubleshooting

**Emails not sending?**
- Check worker is running (`npm run dev:worker`)
- Check SMTP credentials in `.env`

**Rate limit not resetting?**
- Wait 60 seconds (demo uses 1-minute window)
- Or clear Redis: `docker exec outbox_redis redis-cli FLUSHDB`

**OAuth error?**
- Check Google credentials in `.env`
- Verify callback URL matches exactly

---

Good luck with your evaluation! 🚀
