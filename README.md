# JSRMS

Journal Submission and Review Management System.

JSRMS is a research portal prototype for managing manuscript submission, peer review, editorial decisions, and student learning materials. The current workspace contains a React frontend, a Django backend scaffold, and an ML service folder.

## Project Structure

```text
FYP/
|-- frontend/     # Vite + React frontend
|-- backend/      # Django backend scaffold
|-- ml_service/   # ML service workspace
`-- README.md
```

## Current Frontend Roles

The frontend currently supports these role areas:

| Role | Main Route | Notes |
|---|---|---|
| Student | `/student/training` | Training modules for citation, publishing, abstracts, keywords, and reviewer skills |
| Author | `/author/dashboard` | Paper submission and author workflow |
| Reviewer | `/reviewer/dashboard` | Assigned reviews and review form |
| Editor | `/editor/dashboard` | Editorial decisions; editors are appointed by admin |
| Admin | `/admin/dashboard` | User and system management |

Public signup is available for:

- Student
- Author
- Reviewer applicant

Editors and admins cannot self-register. Editor accounts are intended to be appointed by an admin.

## Demo Credentials

These are frontend-only demo credentials for navigation testing:

| Role | Email | Password |
|---|---|---|
| Student | `student@utm.edu.my` | `Student@123` |
| Author | `author@utm.edu.my` | `Author@123` |
| Reviewer | `reviewer@um.edu.my` | `Reviewer@123` |
| Editor | `editor@usm.my` | `Editor@123` |
| Admin | `admin@jsrms.edu.my` | `Admin@123` |

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

Set up environment variables:

```bash
cp .env.example .env
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

http://127.0.0.1:8000/api/auth/login/

```

## Email Testing

Mailpit can be used for local email testing.

```bash
brew install mailpit
brew services start mailpit
```

Open:

```text
http://localhost:8025
```

## Training Module

The student training module is frontend-only for now and lives at:

```text
/student/training
```

Current learning materials include:

- Citation Basics
- Avoiding Plagiarism
- Research Paper Structure
- Abstracts and Keywords
- Read Like a Reviewer
- Publishing Your First Paper
