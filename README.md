# 🏆 AtomQuest Goal Setting & Tracking Portal


---

## 🚀 QUICK START (5 Minutes to Running Demo)

### Prerequisites
```bash
node --version    # Need Node.js 18+
mongod --version  # Need MongoDB 6+ (or use MongoDB Atlas free tier)
```

### Step 1 — Install MongoDB (if not installed)
```bash
# Windows — download installer from:
# https://www.mongodb.com/try/download/community

# OR use MongoDB Atlas (free, no install needed):
# 1. Go to https://cloud.mongodb.com
# 2. Create free cluster
# 3. Get connection string
# 4. Replace MONGO_URI in server/.env
```

### Step 2 — Install all dependencies
```bash
# From the project root (atomquest-portal/)
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Step 3 — Configure environment
```bash
# Edit server/.env:
# MONGO_URI=mongodb://localhost:27017/atomquest   (local)
# OR
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/atomquest  (Atlas)

# ANTHROPIC_API_KEY=your_key_here  (get free at console.anthropic.com)
# JWT_SECRET=any_long_random_string_here
```

### Step 4 — Run the application
```bash
# Terminal 1 — Start MongoDB (if local)
mongod

# Terminal 2 — Start server (from server/ directory)
cd server
npm run dev

# Terminal 3 — Start client (from client/ directory)
cd client
npm start
```

### Step 5 — Seed demo data
```bash
# Open browser: http://localhost:3000
# Click "Seed Demo Data" button on the login page
# OR run directly:
curl -X POST http://localhost:5000/api/auth/seed
```

### Step 6 — Login with demo accounts
| Role     | Email                      | Password     |
|----------|---------------------------|--------------|
| Admin    | admin@atomquest.com        | Admin@123    |
| Manager  | manager@atomquest.com      | Manager@123  |
| Employee | employee@atomquest.com     | Employee@123 |

---

## 📦 ONE-COMMAND INSTALL (copy-paste)
```bash
# From atomquest-portal/ root:
npm install && cd server && npm install && cd ../client && npm install && cd ..
echo "✅ All dependencies installed!"
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Employee Portal │ Manager Portal │ Admin Portal         │
│  (React 18 + React Router + Recharts + Framer Motion)   │
└─────────────────────────┬───────────────────────────────┘
                          │ REST API (Axios + JWT)
┌─────────────────────────▼───────────────────────────────┐
│               Express.js API Server                      │
│  Auth │ Goals │ Check-ins │ Reports │ AI │ Notifications │
│  (Express 4 + JWT + Helmet + Rate Limiting)              │
└───────────────┬─────────────────┬───────────────────────┘
                │                 │
    ┌───────────▼──────┐  ┌───────▼──────────────────┐
    │   MongoDB        │  │   Anthropic Claude API    │
    │   (Mongoose ODM) │  │   (Goal analysis,         │
    │   - Users        │  │    AI suggestions,        │
    │   - GoalSheets   │  │    Progress insights)     │
    │   - Notifications│  └───────────────────────────┘
    │   - CycleConfig  │
    └──────────────────┘
```

---

## ✅ Features Implemented

### Phase 1 — Goal Creation & Approval
- [x] Employee goal sheet with up to 8 goals
- [x] Thrust Area selection (6 configurable areas)
- [x] UoM types: Min, Max, Timeline, Zero-based
- [x] Target + Weightage per goal
- [x] Validation: total = 100%, min 10% per goal, max 8 goals
- [x] Manager approval workflow with inline editing
- [x] Return for rework with feedback comments
- [x] Goal locking on approval
- [x] Shared Goals — push KPIs to multiple employees

### Phase 2 — Achievement Tracking
- [x] Quarterly achievement logging (Q1–Q4)
- [x] Status: Not Started / On Track / At Risk / Completed
- [x] Auto-computed scores per UoM formula
- [x] Weighted overall score per quarter
- [x] Manager check-in module with structured comments
- [x] Check-in completion tracking

### Reporting & Governance
- [x] Achievement Report (CSV + Excel export)
- [x] Completion Dashboard with real-time rates
- [x] Full Audit Trail for post-lock changes
- [x] Admin unlock with reason logging

### Bonus Features
- [x] **Analytics Module** — QoQ trends, dept heatmaps, thrust area breakdown, manager effectiveness
- [x] **Escalation Module** — Automated cron-based reminders for submission/approval/check-in delays
- [x] **AI Integration** — Goal quality analysis, smart suggestions, progress coaching insights
- [x] **Broadcast Notifications** — Admin can push messages to all/role-specific users
- [x] **Org Hierarchy Management** — Admin manages users, roles, manager assignments


---

## 🔧 Tech Stack
- **Frontend**: React 18, React Router 6, Recharts, Framer Motion, React Hot Toast, Lucide Icons
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT Auth, node-cron
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Exports**: SheetJS (xlsx), CSV generation
- **Security**: Helmet, Express Rate Limit, bcryptjs
- **Dev**: Nodemon, Concurrently


## 💰 Cost Optimization (Evaluation Criterion)
- MongoDB free tier / local — $0
- Anthropic API — pay-per-token, hackathon usage < $1
- No cloud hosting needed for demo — runs locally
- React proxy configured — single port in prod
- Rate limiting prevents API abuse
- Cron jobs replace polling — minimal server load
