# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PaperBridge / JSREMS** — Journal Submission and Review Management System. A full-stack web app with a React + Vite frontend and a Django REST Framework backend, backed by PostgreSQL (hosted on Supabase).

## Development Commands

### Frontend (React + Vite)

```bash
cd frontend
npm install          # first-time setup
npm run dev          # dev server at http://localhost:5173
npm run build        # production build → /dist
npm run preview      # preview production build
```

### Backend (Django)

```bash
cd backend

# Activate venv first:
.\venv\Scripts\Activate.ps1          # PowerShell
# source venv/bin/activate           # bash

pip install -r requirements.txt      # first-time setup
python manage.py migrate
python manage.py runserver           # API at http://localhost:8000

# Run tests
pytest
pytest apps/users/tests.py           # single test module
```

### Environment setup

Copy `backend/.env.example` to `backend/.env` and fill in DB credentials. The backend uses Supabase PostgreSQL with schema `fyp` (set via `DB_SCHEMA` env var).

## Architecture

### Overall structure

```
FYP/
├── frontend/    # React SPA
└── backend/     # Django REST API
```

The frontend calls the backend at `http://localhost:8000` (hardcoded as `API_URL` in `LoginPage.jsx` and `RegisterPage.jsx`). CORS is whitelisted for ports 3000 and 5173.

### Frontend

- **Entry**: `src/main.jsx` wraps `App.jsx` in `BrowserRouter`
- **Routing**: `src/App.jsx` — flat `<Routes>` definition; no route guards (redirect logic lives inside each page component)
- **Layout**: Authenticated pages use `AppShell` (sidebar + topbar wrapper). Public pages use `PublicNav`. Sidebar collapse state is persisted to `localStorage` under `paperbridge-sidebar-open`.
- **Auth flow**: Login POSTs to `/api/auth/login/`, stores `access`, `refresh`, and `user` JSON in `localStorage`. After login, users are redirected by role using `ROLE_ROUTES` maps defined in each auth page.
- **Demo mode**: `src/data/demoAccounts.js` has hardcoded credentials that bypass the real API (for UI demos without a live backend). `saveDemoSession()` / `getDemoSession()` / `clearDemoSession()` manage this in `localStorage`.
- **Sidebar nav**: `src/data/sidebarConfig.jsx` — role-keyed nav sections. Add new nav items here.
- **Design system**: All CSS custom properties (colors, spacing, typography) live in `src/styles.css`. Fonts: Fraunces (display), Inter (body), JetBrains Mono (labels). Palette: navy `#042C53` dominant, amber `#EF9F27` accent.

### Backend

Django project name is `jsrems`. Apps live under `backend/apps/`:

| App | Status | Purpose |
|---|---|---|
| `users` | Active | Auth, registration, `UserProfile` model |
| `manuscripts` | Stub | Paper submission (models not yet implemented) |
| `reviews` | Stub | Peer review workflow (models not yet implemented) |
| `notifications` | Stub | User notifications |
| `analysis` | Stub | Analytics/reporting |
| `publications` | Stub | Published papers |

**Auth**: JWT via `djangorestframework-simplejwt`. Login accepts `email` (not `username`) via `EmailTokenObtainPairSerializer`. JWT tokens embed `role` and `status` claims. Access token: 1 hour; refresh: 7 days with rotation.

**UserProfile** (`apps/users/models.py`): extends Django's built-in `User` via `OneToOneField`. Roles: `student`, `author`, `reviewer`, `editor`, `admin`. Reviewers start as `status=pending` until admin approves. A `post_save` signal auto-creates a profile for every new User.

**Rate limiting**: anon 30/min, authenticated users 100/min, auth endpoints (login/register) 5/min.

**Key API endpoints**:
- `POST /api/auth/login/` → `{ access, refresh, user }`
- `POST /api/auth/register/` — student/author/reviewer only (editor/admin cannot self-register)
- `POST /api/auth/refresh/`
- `GET/PATCH /api/users/me/`

### User roles and their home routes

| Role | Home route | Notes |
|---|---|---|
| `student` / `user` | `/user/papers` | Browse papers, training modules |
| `author` | `/author/dashboard` | Submit and track manuscripts |
| `reviewer` | `/reviewer/dashboard` | Review assigned papers; starts as `pending` |
| `editor` | `/editor/dashboard` | Manage submissions, assign reviewers |
| `admin` | `/admin/dashboard` | Manage users and system settings |

`student` and `user` are treated as the same role in the frontend. Old `/student/*` routes redirect to `/user/training`.
