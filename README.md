# JSREMS - Journal Submission, Review and Editorial Management System

## Backend Setup

1. Clone the repo
   git clone https://github.com/Ash-CS2000/FYP.git
   cd FYP/backend

2. Create virtual environment
   python -m venv venv
   source venv/bin/activate

3. Install dependencies
   pip install -r requirements.txt

4. Set up .env file
   - Copy .env.example to .env
     cp .env.example .env
   - password is already there

5. Run migrations
   python manage.py migrate

6. Start server
   python manage.py runserver

Server runs at http://127.0.0.1:8000

## Email Testing (Mailpit)

7. Install Mailpit
   brew install mailpit

8. Start Mailpit
   brew services start mailpit

9. Open http://localhost:8025 to see emails