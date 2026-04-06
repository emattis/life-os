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
│   │       ├── optimize/route.ts
│   │       └── command/route.ts      # AI command bar — parses natural language into items
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
  type          String   @default("to_do") // "goal_task" | "to_do" | "event"
  priority      Int      @default(2) // 1=urgent, 2=high, 3=medium, 4=low
  status        String   @default("pending") // pending, in_progress, completed, deferred
  estimatedMins Int      @default(30) // estimated duration
  dueDate       DateTime?
  scheduledDate DateTime? // specific date/time for events
  goalId        String?
  goal          Goal?    @relation(fields: [goalId], references: [id])
  recurring     String?  // null, "daily", "weekly", "monthly"
  energyLevel   String   @default("medium") // low, medium, high (mental energy needed)
  tags          String?  // comma-separated
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Task Type Behaviors:
// - "goal_task": Linked to a goal, gets highest scheduling priority based on goal rank.
//   The optimizer actively pushes these into your day.
// - "to_do": Standalone action (errands, articles, calls). No goal link required.
//   Optimizer fits these into available slots after goal tasks.
// - "event": Time-specific activity (party, concert, TV show). Has a scheduledDate.
//   Optimizer treats these like fixed blocks — plans around them, not over them.

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
- **AI Command Bar** (see below)

### 1b. AI Command Bar (Dashboard Chat Interface)
A small, persistent chat-like input on the dashboard where the user can type natural language and the AI creates structured items automatically.

**How it works:**
1. User types something like: "I need to prep for my investor meeting Friday, it's critical"
2. The message is sent to Claude API along with the user's existing goals, task types, and context
3. Claude parses the intent and returns structured JSON for one or more items to create
4. The app shows a confirmation card with the parsed details before saving
5. User can accept, edit, or dismiss

**Example interactions:**
- "Prep investor deck by Thursday" → creates a goal_task, links to "Career" goal, priority 1, est. 120 min, high energy, due Thursday
- "Jake's birthday party Saturday 7-10pm" → creates an event, scheduledDate Saturday 7pm, est. 180 min, low energy
- "I want to start reading more" → creates a goal under "Personal Growth", then suggests a to_do like "Read for 30 minutes" as a recurring daily task
- "Dentist appointment tomorrow at 2pm" → creates an event, scheduledDate tomorrow 2pm, est. 60 min
- "I should probably start working out 3x a week" → creates a goal under "Health", suggests recurring goal_tasks for Mon/Wed/Fri

**Claude API prompt for the command bar:**
```
You are an assistant that converts natural language into structured tasks, goals, and events.

**User's existing goals:**
{list of current goals with IDs and categories}

**Available goal categories:** Health, Career, Personal Growth, Financial, Relationships, Creative

**Today's date:** {date}

The user said: "{user input}"

Determine what the user wants to create. Return JSON:
{
  "items": [
    {
      "action": "create_task" | "create_goal" | "create_both",
      "goal": {  // only if creating a goal
        "title": "...",
        "category": "...",
        "priority": 1-5,
        "targetDate": "ISO date or null"
      },
      "task": {  // only if creating a task
        "title": "...",
        "type": "goal_task" | "to_do" | "event",
        "priority": 1-4,
        "estimatedMins": number,
        "energyLevel": "low" | "medium" | "high",
        "dueDate": "ISO date or null",
        "scheduledDate": "ISO datetime or null",
        "goalId": "existing goal ID or null",
        "recurring": "daily" | "weekly" | "monthly" | null,
        "tags": "comma-separated or null"
      },
      "explanation": "Brief reason for the choices made"
    }
  ],
  "followUp": "Optional question if the input is ambiguous"
}

Rules:
- Infer priority from urgency cues ("critical", "important", "whenever", "low priority")
- Infer energy level from task type (deep work = high, errands = low, meetings = medium)
- Estimate duration based on common sense (workout = 60min, email = 15min, presentation prep = 120min)
- Link to existing goals when the task clearly relates to one
- If the user describes a habit or ongoing commitment, suggest a goal + recurring task
- If ambiguous, include a followUp question rather than guessing wrong
```

**UI details:**
- Appears as a compact chat bar at the bottom or side of the dashboard
- Shows a text input with placeholder: "Tell me what you need to get done..."
- After AI responds, show a preview card with all parsed fields
- Card has "Create", "Edit", and "Dismiss" buttons
- Successful creation shows a brief toast confirmation
- Supports multi-item creation (e.g., "Set up workout routine" → goal + 3 recurring tasks)
- Chat history persists during the session so user can see what they've added

### 2. Goals Management
- Create/edit/archive goals with categories
- Set target dates and priority levels
- Link tasks to goals
- Visual progress tracking (% of linked tasks complete)
- Categories: Health, Career, Personal Growth, Financial, Relationships, Creative

### 3. Task Management
- Full CRUD for tasks
- **Task type selector** at creation: Goal Task, To-Do, or Event
  - **Goal Task**: Shows goal picker (required), optimizer gives these highest priority
  - **To-Do**: Standalone action, no goal link needed (errands, articles, calls)
  - **Event**: Time-specific activity (party, concert, TV night), shows date/time picker for scheduledDate, optimizer treats as a fixed block
- Fields: title, description, type, priority (1-4), estimated duration, due date, energy level, tags
- Link goal tasks to goals (required for goal_task type)
- Recurring task support (daily/weekly/monthly)
- Status workflow: pending → in_progress → completed
- Filters: by type, status, priority, goal, due date, energy level
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
1. Gather: today's date, day of week, all pending tasks grouped by type (goal_task, to_do, event), linked goals, fixed daily blocks, Google Calendar events
2. Send to Claude API with a structured prompt
3. Claude returns an optimized schedule that:
   - Respects fixed blocks, existing calendar events, AND scheduled events (type: "event")
   - Schedules goal_tasks first, weighted by their parent goal's priority
   - Fits to_dos into remaining available slots
   - Treats events as immovable time blocks (like a party at 7pm)
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

**Goal Tasks (linked to goals — schedule these with highest priority):**
{goal_tasks with priority, duration, energy level, due dates, parent goal}

**To-Dos (standalone tasks — fit into available time):**
{to_dos with priority, duration, energy level, due dates}

**Events (fixed-time activities — plan around these):**
{events with scheduled date/time, duration}

**Fixed Daily Blocks (cannot be moved):**
{blocks marked as fixed}

**Flexible Daily Blocks (can be rearranged):**
{blocks marked as flexible}

**Existing Calendar Events:**
{Google Calendar events for today}

**Today:** {date, day of week}

Create a minute-by-minute schedule for the day. Rules:
1. Never overlap with fixed blocks, existing calendar events, or scheduled events
2. Schedule goal_tasks first, prioritized by their parent goal's rank
3. Fit to_dos into remaining open slots, ordered by priority then due date
4. Events are immovable — treat them like fixed blocks
5. Schedule high-energy tasks during morning hours (9am-12pm)
6. Schedule medium-energy tasks early afternoon (1pm-3pm)
7. Schedule low-energy tasks late afternoon (3pm-5pm)
8. Include 10-min buffers between task blocks
9. Don't schedule more than 90 minutes of deep work without a break
10. Leave at least 1 hour of unscheduled "flex time" for unexpected things

Respond in JSON format:
{
  "schedule": [
    { "start": "07:00", "end": "08:00", "activity": "...", "type": "block|goal_task|to_do|event|calendar|buffer", "taskId": "..." }
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
4. **Tasks**: Full task management with goal linking and three task types
5. **Dashboard**: Main view pulling everything together
6. **Google Auth**: NextAuth.js with Google OAuth
7. **Calendar integration**: Read/write Google Calendar events
8. **AI Optimizer**: Claude API integration for day optimization
9. **AI Command Bar**: Natural language input on dashboard that creates tasks/goals/events
10. **Polish**: Animations, responsive design, edge cases

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
