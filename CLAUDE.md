# Life OS — Personal Daily Optimizer

## Project Overview

Life OS is a web application that acts as a personal operating system for daily life. It combines a built-in task manager, Google Calendar integration, and AI-powered scheduling (via Claude API) to help the user optimize each day around their goals, tasks, and fixed routines.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite via Prisma ORM (local, file-based — no server needed)
- **Auth**: NextAuth.js with Google OAuth (for Calendar access)
- **Calendar**: Google Calendar API (read + write)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514) for intelligent scheduling
- **State**: React Context + SWR for data fetching

## Architecture

```
life-os/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Dashboard (main view)
│   │   ├── goals/page.tsx     # Goals management
│   │   ├── tasks/page.tsx     # Task management
│   │   ├── blocks/page.tsx    # Daily blocks config
│   │   ├── optimize/page.tsx  # AI day optimizer
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── tasks/route.ts
│   │       ├── goals/route.ts
│   │       ├── blocks/route.ts
│   │       ├── calendar/route.ts
│   │       └── optimize/route.ts
│   ├── components/
│   │   ├── layout/            # Sidebar, header, nav
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── tasks/             # Task CRUD components
│   │   ├── goals/             # Goal management
│   │   ├── calendar/          # Calendar display
│   │   ├── blocks/            # Daily block config
│   │   └── optimize/          # AI optimization UI
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── google-calendar.ts # Google Calendar helpers
│   │   ├── claude.ts          # Claude API integration
│   │   ├── optimizer.ts       # Day optimization logic
│   │   └── utils.ts           # Utilities
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.local                 # Environment variables
├── SETUP_GOOGLE.md            # Google Cloud setup guide
└── package.json
```

## Database Schema (Prisma)

```prisma
model Goal {
  id          String   @id @default(cuid())
  title       String
  description String?
  category    String   // e.g., "health", "career", "personal", "financial"
  priority    Int      @default(1) // 1=highest
  targetDate  DateTime?
  status      String   @default("active") // active, completed, paused
  tasks       Task[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Task {
  id            String   @id @default(cuid())
  title         String
  description   String?
  priority      Int      @default(2) // 1=urgent, 2=high, 3=medium, 4=low
  status        String   @default("pending") // pending, in_progress, completed, deferred
  estimatedMins Int      @default(30) // estimated duration
  dueDate       DateTime?
  goalId        String?
  goal          Goal?    @relation(fields: [goalId], references: [id])
  recurring     String?  // null, "daily", "weekly", "monthly"
  energyLevel   String   @default("medium") // low, medium, high (mental energy needed)
  tags          String?  // comma-separated
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model DailyBlock {
  id        String @id @default(cuid())
  name      String // e.g., "Sleep", "Workout", "Commute", "Lunch"
  startTime String // "07:00" (24hr format)
  endTime   String // "08:00"
  days      String @default("mon,tue,wed,thu,fri,sat,sun") // which days this applies
  category  String // "sleep", "meal", "exercise", "commute", "routine", "work"
  flexible  Boolean @default(false) // can AI move this block?
  color     String @default("#6366f1")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OptimizedDay {
  id        String   @id @default(cuid())
  date      String   // "2026-04-05"
  plan      String   // JSON string of the optimized schedule
  reasoning String?  // AI's reasoning for the schedule
  accepted  Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

## Core Features

### 1. Dashboard (Main View)
- Today's date and greeting
- Quick view of today's optimized schedule (timeline/agenda view)
- Upcoming calendar events (from Google Calendar)
- Active tasks with priority indicators
- Goal progress summary
- Quick-add task button
- "Optimize My Day" prominent CTA button

### 2. Goals Management
- Create/edit/archive goals with categories
- Set target dates and priority levels
- Link tasks to goals
- Visual progress tracking (% of linked tasks complete)
- Categories: Health, Career, Personal Growth, Financial, Relationships, Creative

### 3. Task Management
- Full CRUD for tasks
- Fields: title, description, priority (1-4), estimated duration, due date, energy level, tags
- Link tasks to goals (optional)
- Recurring task support (daily/weekly/monthly)
- Status workflow: pending → in_progress → completed
- Filters: by status, priority, goal, due date, energy level
- Bulk actions (complete, defer, delete)

### 4. Daily Blocks (Customizable Routines)
- User defines their non-negotiable daily blocks
- Examples they might add: Sleep (11pm-7am), Morning Routine (7-8am), Workout (6-7am), Breakfast (8-8:30am), Commute (8:30-9am), Lunch (12-1pm), Dinner (7-8pm)
- Per-day-of-week configuration (different schedule on weekends)
- Mark blocks as "flexible" (AI can move them) or "fixed"
- Color coding by category

### 5. Google Calendar Integration
- OAuth2 login via Google
- Read events for any given day/week
- Write optimized schedule back to calendar as events
- Show calendar events alongside daily blocks and tasks
- Sync indicator (last synced timestamp)

### 6. AI Day Optimizer (Core Feature)
When user clicks "Optimize My Day":
1. Gather: today's date, day of week, all pending tasks (with priorities, durations, energy levels), linked goals, fixed daily blocks, Google Calendar events
2. Send to Claude API with a structured prompt
3. Claude returns an optimized schedule that:
   - Respects fixed blocks and existing calendar events
   - Schedules high-priority / goal-aligned tasks first
   - Matches task energy levels to optimal times (hard tasks in AM, low-energy tasks in PM)
   - Includes buffer time between activities
   - Accounts for meals, breaks, and transition time
   - Provides reasoning for the schedule
4. Display the proposed schedule as a visual timeline
5. User can accept (pushes to Google Calendar), modify, or regenerate

### Claude API Prompt Structure
```
You are a personal productivity optimizer. Given the following information about the user's day, create an optimized schedule.

**User's Goals (by priority):**
{goals list}

**Pending Tasks:**
{tasks with priority, duration, energy level, due dates, goal associations}

**Fixed Daily Blocks (cannot be moved):**
{blocks marked as fixed}

**Flexible Daily Blocks (can be rearranged):**
{blocks marked as flexible}

**Existing Calendar Events:**
{Google Calendar events for today}

**Today:** {date, day of week}

Create a minute-by-minute schedule for the day. Rules:
1. Never overlap with fixed blocks or existing calendar events
2. Prioritize tasks linked to highest-priority goals
3. Schedule high-energy tasks during morning hours (9am-12pm)
4. Schedule medium-energy tasks early afternoon (1pm-3pm)
5. Schedule low-energy tasks late afternoon (3pm-5pm)
6. Include 10-min buffers between task blocks
7. Don't schedule more than 90 minutes of deep work without a break
8. Leave at least 1 hour of unscheduled "flex time" for unexpected things

Respond in JSON format:
{
  "schedule": [
    { "start": "07:00", "end": "08:00", "activity": "...", "type": "block|task|event|buffer", "taskId": "..." }
  ],
  "reasoning": "...",
  "tasksDeferred": ["task IDs that couldn't fit today"],
  "suggestions": ["any productivity tips based on the day's workload"]
}
```

## UI/UX Design Direction

### Aesthetic: "Calm Command Center"
- Dark mode primary with optional light mode
- Muted color palette: deep navy (#0f172a) background, slate grays, with accent colors for categories
- Clean typography: use "Geist" for UI, "Geist Mono" for timestamps/data
- Generous whitespace, card-based layout
- Subtle animations on state changes (task completion, schedule generation)
- Left sidebar navigation with icons
- Main content area with contextual panels

### Layout
- **Sidebar** (left, collapsible): Navigation — Dashboard, Tasks, Goals, Blocks, Optimize
- **Main area**: Content for current page
- **Right panel** (dashboard only): Today's mini calendar + upcoming events

### Key UI Components
- Timeline view: vertical time axis showing the optimized day
- Task cards: draggable, show priority badge + estimated time + goal tag
- Goal cards: progress bar, linked task count
- Block editor: visual time-range picker
- Optimization result: animated timeline that "builds" the schedule

## Environment Variables (.env.local)

```
# Database
DATABASE_URL="file:./dev.db"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# NextAuth
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Anthropic
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Google Cloud Setup Guide (include as SETUP_GOOGLE.md)

Write a step-by-step guide covering:
1. Go to console.cloud.google.com
2. Create a new project called "Life OS"
3. Enable the Google Calendar API
4. Configure OAuth consent screen (External, test mode)
5. Create OAuth 2.0 credentials (Web application type)
6. Set authorized redirect URI to `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to .env.local
8. Add your Google account as a test user

## Implementation Order

Build in this sequence:
1. **Project scaffold**: Next.js + Prisma + Tailwind setup, database schema
2. **Daily blocks**: CRUD for customizable routine blocks (no auth needed yet)
3. **Goals**: CRUD for goals management
4. **Tasks**: Full task management with goal linking
5. **Dashboard**: Main view pulling everything together
6. **Google Auth**: NextAuth.js with Google OAuth
7. **Calendar integration**: Read/write Google Calendar events
8. **AI Optimizer**: Claude API integration for day optimization
9. **Polish**: Animations, responsive design, edge cases

## Development Commands

```bash
npm run dev        # Start development server
npx prisma studio  # Visual database browser
npx prisma db push # Push schema changes to DB
```

## Key Behaviors

- Task list should always show what's pending, what's overdue, and what's coming up
- When a task is completed, update its status and completedAt timestamp
- Recurring tasks should auto-generate the next instance when completed
- The optimizer should never schedule past the user's sleep block
- Calendar sync should be pull-on-demand (not real-time) to avoid API quota issues
- All times should be in the user's local timezone
