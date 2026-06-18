# AttendX 📱

> Offline-first attendance tracker for BTech students. AI-powered. Zero server. Just an APK.

## Features

- **Attendance Tracker** — 75% guard with "can skip X more" calculator
- **Task Manager** — AI NLP input ("Physics assignment due Friday")
- **Timetable** — Weekly schedule with timeline view
- **Dashboard** — Today's classes, danger alerts, AI advisor
- **BYOK AI** — Groq / OpenAI / Gemini / Custom endpoint. Key stored on-device only.

## Tech Stack

- Expo SDK 51 (React Native)
- expo-sqlite — all data stored locally
- expo-secure-store — API keys encrypted on device
- expo-notifications — local deadline reminders
- Zero backend. Zero accounts. Zero cloud dependency.

---

## Build the APK (3 steps, ~5 minutes)

### Prerequisites
- Node.js 18+ installed
- Free Expo account at expo.dev

### Step 1 — Install dependencies
```bash
cd attendx
npm install
```

### Step 2 — Login to EAS (free)
```bash
npm install -g eas-cli
eas login
eas init   # creates your project ID, updates app.json automatically
```

### Step 3 — Build APK
```bash
npm run build:apk
# or: eas build --platform android --profile preview
```

EAS compiles the APK on their free build servers (~5 min).
When done, you get a download link. Share the APK via WhatsApp/Telegram/Drive.

> **Note:** EAS is just a build compiler — like GitHub Actions for Android.  
> The resulting APK has zero server dependency. Your data never leaves your phone.

---

## Run locally (testing)
```bash
npm install
npx expo start
# Scan QR with Expo Go app
```

---

## Folder Structure

```
attendx/
├── App.js                    ← root, initializes SQLite
├── src/
│   ├── constants/
│   │   ├── colors.js         ← color palette
│   │   └── index.js          ← days, priorities, AI providers
│   ├── db/
│   │   └── database.js       ← SQLite schema + all CRUD
│   ├── services/
│   │   └── ai.js             ← multi-provider AI (BYOK)
│   ├── navigation/
│   │   └── index.js          ← bottom tab navigator
│   └── screens/
│       ├── DashboardScreen.js
│       ├── AttendanceScreen.js
│       ├── TasksScreen.js
│       ├── TimetableScreen.js
│       └── SettingsScreen.js
```

---

## AI Setup (in-app)

1. Open **Settings → AI Configuration**
2. Choose provider (Groq is free and fastest)
3. Paste your API key
4. Tap **Save**, then **Test Connection**

Free API keys:
- **Groq**: https://console.groq.com (no credit card)
- **Gemini**: https://aistudio.google.com (no credit card)

---

## Database Schema

All data lives in `attendx.db` (SQLite) on the device:

```sql
subjects    (id, name, code, teacher, color, threshold)
timetable   (id, subject_id, day, start_time, end_time, room)
attendance  (id, subject_id, date, status)   -- present/absent/cancelled
tasks       (id, title, subject_id, due_date, priority, status)
```
