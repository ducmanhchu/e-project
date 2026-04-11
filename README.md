# English Learning Platform with AI

Full-stack platform for teaching English writing skills using AI (Claude + Gemini).

## Features

### 4 Exercise Types

| Type | Description | AI Grading |
|------|-------------|------------|
| **Reverse Translation** | Read Vietnamese, translate to English per sentence | 5 criteria (100 points) |
| **See & Write** | View image, keyword quiz, write description | 4 IELTS criteria (100 points) |
| **Rewrite** | Paraphrase English sentences | 4 criteria: meaning, structure, grammar, vocab |
| **Exam (IELTS)** | Task 1 (chart/diagram) + Task 2 (essay) | Band 1-9, 4 IELTS criteria |

### Other Features

- **Vocabulary** - Add words, AI enrichment (definitions, IPA, audio), spaced review quiz
- **Admin** - Create lessons, upload media, AI-assisted content generation
- **AI Grading** - Claude primary, Gemini fallback, per-feature dedicated prompts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express 5 + Babel |
| Database | MongoDB Atlas + Mongoose 9 |
| AI | Claude Haiku 4.5 (primary) + Gemini 2.5 Flash (fallback) |
| Frontend | React + Vite + TypeScript + TailwindCSS v4 + shadcn/ui |
| Auth | JWT + Google OAuth2 |
| Media | Cloudinary |

## Getting Started

```bash
# Clone
git clone <repo-url>
cd e_platform_ai

# Backend
cd server
pnpm install
cp .env.example .env  # Configure env vars
pnpm dev              # http://localhost:5000

# Frontend
cd front
pnpm install
pnpm dev              # http://localhost:5173
```

## Environment Variables

```env
# MongoDB
CONNECT_DB=mongodb+srv://...

# AI
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...

# Auth
JWT_SECRET=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
```

## Architecture

```
Controller → Service → Model (3-layer)

server/src/
├── const/         Constants (exercise, pagination, auth, upload)
├── controllers/   HTTP handlers (per module)
├── services/      Business logic
│   └── ai/        AI grading (per feature, dedicated prompts)
├── models/
│   ├── writing/   4 writing models (separate collections)
│   └── attempt/   Attempt (progress) + Submission (history)
├── helpers/       attemptHelper, writing helpers
└── routes/        API routes
```

### Database Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `reverseTranslations` | RT lessons |
| `seeWrites` | SW lessons |
| `rewrites` | RW lessons |
| `exams` | IELTS exam lessons |
| `attempts` | Exercise progress (lightweight) |
| `submissions` | Submit history + AI feedback (separate, paginated) |
| `vocabularies` | Shared word cache |
| `userVocabularies` | Per-user vocabulary |

## API Documentation

Full API documentation available on [Notion](https://www.notion.so/33fe7deb40268197a532e9faab9ddce9) with:
- 7 endpoint tables (per module)
- Database schema documentation
- Request/response examples for every endpoint
