# Wordwise

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Azure Speech](https://img.shields.io/badge/Azure-Pronunciation%20Assessment-0078D4?logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/products/ai-services/ai-speech)

**Wordwise** is an AI-integrated English learning platform that focuses on three core skill areas: **Writing**, **Speaking**, and **Vocabulary retention**. The application combines large language models with cloud-based speech assessment to deliver adaptive exercises, automatic scoring, and personalized feedback for every learner.

---

## Features

### Writing Module
- **Reverse Translation** &mdash; Read a Vietnamese passage and translate it sentence by sentence into English, with AI-powered grammar and meaning evaluation.
- **Image-based Writing** &mdash; Observe an image and produce a written description that is graded against contextual relevance and language quality.
- **Paraphrasing** &mdash; Rewrite English sentences while preserving the original meaning, supported by AI feedback on grammar, structure, and word choice.

### Speaking Module
- **Role-play Conversations** &mdash; Engage in immersive, scenario-based dialogues with an AI partner. Spoken responses are transcribed and scored for pronunciation accuracy, fluency, and completeness.

### Vocabulary Module
- **Personalized Flashcards** &mdash; A customizable flashcard system that adapts to each learner's vocabulary list and progress.
- **Word Chain Game** &mdash; A timed word-linking game that reinforces lexical recall under pressure.

### System Management
- **Freemium Account Tiers** &mdash; Tiered access with Free and Premium plans, including configurable usage limits per feature.
- **Admin Panel** &mdash; Administrative tools for managing the learning content library, user accounts, and platform configuration.

---

## Architecture & Tech Stack

| Layer            | Technology                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Architecture     | Client &ndash; Server (RESTful API)                                        |
| Frontend         | React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui                    |
| Backend          | Node.js, Express 5                                                         |
| Database         | MongoDB (Mongoose 9)                                                       |
| AI / NLP         | Google Gemini 2.5 Flash &mdash; grammar scoring, dialogue generation, NLP  |
| Speech Services  | Microsoft Azure Pronunciation Assessment &mdash; Speech-to-Text & scoring  |

---

## Prerequisites

Before installing the project, make sure the following tools and accounts are available:

- **Node.js** 18 LTS or later
- **pnpm** (recommended) or **npm**
- **MongoDB** instance (local or MongoDB Atlas cluster)
- **Google Cloud** project with access to the Gemini API
- **Microsoft Azure** subscription with the Speech (Pronunciation Assessment) service enabled
- **Google OAuth 2.0** Client credentials (for social login)
- A POSIX-compatible shell is recommended for the server scripts (Git Bash, WSL, macOS, or Linux), since they rely on `rm -rf`.

---

## Installation & Setup

Clone the repository and navigate to the project root:

```bash
git clone <repository-url>
cd e-project
```

The project is organized as a monorepo with two independent applications: `client` and `server`. Each must be installed and configured separately.

### 1. Server (Backend)

```bash
cd server
pnpm install
```

Create the environment file and fill in the required values (see [Environment Variables](#environment-variables)):

```bash
cp .env.example .env
```

Available scripts (defined in `server/package.json`):

| Command            | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| `pnpm dev`         | Builds with Babel and runs the server in watch mode using `concurrently` + `--watch`.|
| `pnpm production`  | Builds the project and starts the compiled server from `lib/index.js`.               |
| `pnpm test`        | Runs the Jest test suite in verbose mode.                                            |

Start the development server:

```bash
pnpm dev
```

By default the API will be served at `http://<LOCAL_HOST>:<LOCAL_PORT>` (e.g. `http://localhost:5000`).

### 2. Client (Frontend)

In a separate terminal:

```bash
cd client
pnpm install
```

Create the environment file:

```bash
cp .env.example .env
```

Available scripts (defined in `client/package.json`):

| Command           | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `pnpm dev`        | Starts the Vite development server.                        |
| `pnpm build`      | Type-checks the project (`tsc -b`) and builds for production.|
| `pnpm lint`       | Runs ESLint across the project.                            |
| `pnpm preview`    | Serves the production build locally for preview.           |

Start the development client:

```bash
pnpm dev
```

The Vite dev server will typically be available at `http://localhost:5173`.

---

## Environment Variables

### Server (`server/.env`)

Copy `server/.env.example` to `server/.env` and configure the following variables:

```env
# --- SERVER CONFIGURATION ---
NODE_ENV=development
LOCAL_PORT=5000
LOCAL_HOST=localhost

# --- DATABASE (MONGODB) ---
MONGODB_URI=your_mongodb_uri_here
DATABASE_NAME=your_database_name_here

# --- JWT CONFIGURATION ---
ACCESS_TOKEN_SECRET=your_access_token_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# --- GOOGLE ---
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
AI_PRIMARY_PROVIDER=vertex
VERTEX_PROJECT_ID=your_vertex_project_id_here
VERTEX_LOCATION=your_vertex_location_here

# --- EMAIL ---
GMAIL_USER=your_gmail_user_here
GMAIL_APP_PASSWORD=your_gmail_app_password_here
EMAIL_FROM_NAME=your_email_from_name_here

# --- CLAUDE ---
CLAUDE_API_KEY=your_claude_api_key_here

# --- CLOUDINARY ---
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
```

| Variable                                                 | Description                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                               | Runtime environment: `development` or `production`.                                          |
| `LOCAL_PORT`, `LOCAL_HOST`                               | Port and host the Express server listens on.                                                 |
| `MONGODB_URI`, `DATABASE_NAME`                           | Connection string and database name for MongoDB.                                             |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`            | Secrets used to sign JWT access and refresh tokens.                                          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`               | Google OAuth 2.0 credentials used for social authentication.                                 |
| `AI_PRIMARY_PROVIDER`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION` | AI provider configuration for invoking Gemini via Google Vertex AI.                       |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`    | SMTP credentials for transactional email (account verification, password reset, etc.).      |
| `CLAUDE_API_KEY`                                         | API key for the secondary AI provider.                                                       |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials for storing user-generated and lesson media assets.   |

### Client (`client/.env`)

Copy `client/.env.example` to `client/.env` and configure the following variables:

```env
# --- CLIENT CONFIGURATION ---
VITE_BASE_URL=your_base_url

# --- GOOGLE CONFIG ---
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

| Variable                | Description                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `VITE_BASE_URL`         | Base URL of the backend API the client should call (e.g. `http://localhost:5000/api`).               |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID used by the frontend for Google Sign-In.                                  |

> **Note:** Variables consumed by Vite **must** be prefixed with `VITE_` in order to be exposed to the browser at build time.

---

## Project Structure

```
e-project/
├── client/        Frontend application (React + Vite)
│   ├── src/
│   ├── .env.example
│   └── package.json
└── server/        Backend application (Express + Node.js)
    ├── src/
    ├── .env.example
    └── package.json
```

---

## License

This project is intended for academic and educational use. Please contact the project maintainers before any commercial distribution.
