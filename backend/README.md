# PMIS Backend API

Enterprise-grade backend for the Project Management Information System (PMIS), built with Django and PostgreSQL.

## Prerequisites
- Python 3.10+
- PostgreSQL 14+

## Setup & Installation

1.  **Navigate to backend directory**:
    ```bash
    cd backend
    ```

2.  **Create Virtual Environment**:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate  # Linux/Mac
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Environment Configuration**:
    - Copy `.env.example` to `.env`.
    - Update `.env` with your PostgreSQL credentials.
    ```env
    DB_NAME=pmis_db
    DB_USER=postgres
    DB_PASSWORD=your_password
    DB_HOST=localhost
    DB_PORT=5432
    ```

5.  **Initialize Database**:
    ```bash
    # Creates the database 'pmis_db' if it doesn't exist
    python create_db.py
    ```

6.  **Run Migrations**:
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

7.  **Create Superuser (Admin)**:
    ```bash
    # Creates user 'admin' with password 'admin'
    python create_superuser.py
    ```

## Running the Server
```bash
python manage.py runserver
```
API will be available at: http://127.0.0.1:8000/

## Project Structure
- `config/`: Global project settings, URL routing, WSGI application.
- `users/`: Custom User model, Role-based access control, Authentication.
- `requirements.txt`: Python dependency list.

## Authentication
- Uses JWT (JSON Web Tokens).
- Default login: `admin` / `admin` (Created via script).
