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

4. Set up database
   - Install PostgreSQL if not already installed
   - Create a database called jsrems_db
     psql -U your_username -d postgres -c "CREATE DATABASE jsrems_db;"

5. Set up .env file
   - Copy .env.example to .env
     cp .env.example .env
   - Open .env and change DB_USER to your Mac username
     (run: whoami in terminal to find your username)

6. Run migrations
   python manage.py migrate

7. Start server
   python manage.py runserver

Server runs at http://127.0.0.1:8000