# PaperBridge

PaperBridge is a research portal prototype for discovering papers, accessing training modules, and supporting manuscript submission, peer review, editorial decisions, and admin management.

## Project Structure

```text
FYP/
|-- frontend/     # Vite + React frontend
|-- backend/      # Django backend scaffold
|-- ml_service/   # ML service workspace
`-- README.md
```

## Current Frontend Roles

Everyone can sign up as a normal user. Some demo users also have extended workspace access.

| Role | Main Route | Notes |
|---|---|---|
| User | `/user/papers` | Discover papers, access training modules, resources, and progress |
| Author | `/author/dashboard` | Extended role for paper submission and author workflow |
| Reviewer | `/reviewer/dashboard` | Extended role for assigned reviews |
| Editor | `/editor/dashboard` | Hidden/internal role appointed by admin |
| Admin | `/admin/dashboard` | Hidden/internal role for user and system management |

## Demo Credentials

| Account | Email | Password | Roles |
|---|---|---|---|
| Normal user | `user@utm.edu.my` | `User@123` | User |
| Author demo | `author@utm.edu.my` | `Author@123` | User + Author |
| Reviewer demo | `reviewer@um.edu.my` | `Reviewer@123` | User + Reviewer |
| Editor demo | `editor@usm.my` | `Editor@123` | User + Editor |
| Admin demo | `admin@paperbridge.edu.my` | `Admin@123` | User + Admin |

Users with extended roles can switch workspace from the sidebar.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

To create a production build:

```bash
npm run build
```

## Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run migrations:

```bash
python manage.py migrate
```

Start the backend server:

```bash
python manage.py runserver
```

The backend runs at:

```text
http://127.0.0.1:8000
```

## Training Module

The training module is frontend-only for now and lives at:

```text
/user/training
```

Current learning materials include:

- Citation Basics
- Avoiding Plagiarism
- Research Paper Structure
- Abstracts and Keywords
- Read Like a Reviewer
- Publishing Your First Paper
