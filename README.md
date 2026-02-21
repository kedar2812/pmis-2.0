# PMIS 2.0 - Project Management Information System

> **Government-Grade Project Management Platform**  
> Enterprise solution for infrastructure project lifecycle management, budget tracking, and multi-stakeholder collaboration.

[![Django 5.0+](https://img.shields.io/badge/Django-5.0+-green.svg)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL 14+](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployment](#-deployment)
- [Core Modules](#-core-modules)
- [Security](#-security)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Support](#-support)

---

## Overview

**PMIS 2.0** is a comprehensive project management information system designed for government infrastructure projects. It provides end-to-end lifecycle management from planning to execution, with robust financial tracking, document management, and compliance features.

### Built For

- **SPV Officials** - Project oversight and decision-making
- **PMNC Teams** - Project monitoring and coordination
- **EPC Contractors** - Execution and billing
- **Consultants** - Design reviews and technical support
- **Government Departments** - Compliance and approvals
- **NICDC HQ** - Central monitoring and analytics

---

## Key Features

### Project Management
- **Multi-Project Dashboard** - Real-time overview of all projects
- **Work Package Management** - Granular project breakdown
- **Milestone Tracking** - Critical path monitoring
- **Risk Management** - Comprehensive risk register with mitigation plans
- **Progress Tracking** - Physical and financial progress monitoring

### Financial Management
- **Budget Planning & Allocation** - Multi-source fund management
- **RA Bill Processing** - Running Account bill generation and approval
- **EVM Analytics** - Earned Value Management with S-curves
- **Payment Tracking** - Contractor payment ledger
- **Fund Source Management** - Track central/state funding

### Document Management (EDMS)
- **Hierarchical File System** - Organized by project/category
- **Version Control** - Complete audit trail of document revisions
- **E-Notings** - Digital noting sheets with approval workflows
- **Auto-Routing** - Smart document filing based on 35+ categories
- **Secure Access Control** - Role-based document permissions

### Workflow Engine
- **Configurable Workflows** - Multi-stage approval processes
- **SLA Tracking** - Automated escalation on delays
- **Digital Signatures** - Secure approval chain
- **Audit Logging** - Complete action history

### Communications
- **Contextual Messaging** - Thread-based discussions linked to projects/documents
- **End-to-End Encryption** - AES-256-GCM for message content
- **Role-Based Access** - Controlled communication channels
- **Notification System** - Real-time alerts and updates

### Scheduling
- **Gantt Charts** - Visual timeline management
- **Task Dependencies** - Critical path analysis
- **MSP/P6 Import** - Import from Microsoft Project and Primavera P6
- **Progress Tracking** - Task completion monitoring

### GIS Integration
- **Interactive Maps** - Leaflet-based project location mapping
- **Spatial Analysis** - Geographic project distribution
- **Land Acquisition Tracking** - Plot-level status monitoring

### Advanced Search
- **Global Search** - Search across all modules
- **Faceted Filters** - Filter by type, status, date, etc.
- **Smart Suggestions** - AI-powered search recommendations

### IFSC Database
- **Self-Hosted Bank Data** - 177,000+ bank branches
- **Offline Validation** - No external API dependencies
- **Auto-Complete** - Smart bank/branch selection

### Security & Compliance
- **Role-Based Access Control (RBAC)** - 7 user roles with granular permissions
- **JWT Authentication** - Secure token-based auth
- **Audit Logging** - Immutable action trails
- **Data Encryption** - At-rest encryption for sensitive data
- **CORS Protection** - Configurable origin policies

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.10+ | Core language |
| **Django** | 5.0+ | Web framework |
| **Django REST Framework** | 3.14+ | API development |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 5.0+ | Caching & sessions |
| **Gunicorn** | 21.2+ | WSGI server |
| **Pillow** | 10.0+ | Image processing |
| **ReportLab** | 4.0+ | PDF generation |
| **openpyxl** | 3.1+ | Excel import/export |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework |
| **Vite** | Latest | Build tool |
| **Tailwind CSS** | 3+ | Styling |
| **Recharts** | 2+ | Data visualization |
| **Leaflet** | 1.9+ | GIS mapping |
| **Axios** | 1.6+ | HTTP client |
| **React Router** | 6+ | Routing |
| **i18next** | 23+ | Internationalization |

### Infrastructure
- **Windows Server** - Production hosting
- **IIS** - Frontend web server
- **NSSM** - Backend service management
- **PostgreSQL** - Database server

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │Dashboard │  │ Projects │  │   EDMS   │  │ Messaging   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          API Client (Axios + JWT Auth)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Django)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  API Layer (DRF)                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Projects │  │ Finance  │  │   EDMS   │  │  Workflow   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Users   │  │ Masters  │  │  Comms   │  │ Scheduling  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             Business Logic & Services                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Projects │  │ Finance  │  │Documents │  │   Users     │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
- **Modularity** - Each Django app is self-contained
- **API-First** - Frontend consumes RESTful APIs
- **Security by Design** - Authentication, encryption, audit logging
- **Scalability** - Caching, pagination, optimized queries
- **Government Compliance** - Audit trails, role-based access, data sovereignty

---

## Getting Started

### Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **Git** for version control

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pmis-2.0
   ```

2. **Navigate to backend directory**
   ```bash
   cd backend
   ```

3. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your settings
   # - Database credentials
   # - Secret key
   # - CORS origins
   # - Encryption key
   ```

6. **Setup database**
   ```bash
   # Create database (if needed)
   python create_db.py
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python create_superuser.py
   # Default: username=admin, password=admin
   ```

7. **Import master data**
   ```bash
   # Import IFSC bank data (177K+ branches)
   python manage.py import_ifsc --clear
   
   # Populate Indian geography (optional)
   python manage.py populate_geography
   ```

8. **Run development server**
   ```bash
   python manage.py runserver
   ```
   
   Backend API: http://localhost:8000  
   Admin Panel: http://localhost:8000/admin

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Frontend uses Vite's env system
   # Update API endpoint in src/api/client.js if needed
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Frontend: http://localhost:5173

5. **Build for production**
   ```bash
   npm run build
   # Output: dist/
   ```

---

## Deployment

### Windows Server Deployment

#### Prerequisites
- Windows Server 2019/2022
- IIS installed and configured
- PostgreSQL installed
- NSSM (Non-Sucking Service Manager)

#### Backend Deployment

1. **Clone repository**
   ```powershell
   cd C:\
   git clone <repository-url> pmis
   cd pmis\backend
   ```

2. **Setup virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure production environment**
   ```powershell
   # Create .env file with production settings
   # Set DEBUG=False
   # Configure production database
   # Set secure SECRET_KEY
   # Configure EMAIL settings
   ```

4. **Run migrations and collect static**
   ```powershell
   python manage.py migrate
   python manage.py collectstatic --noinput
   ```

5. **Install as Windows Service**
   ```powershell
   # Install NSSM
   nssm install PMISBackend "C:\pmis\backend\venv\Scripts\python.exe" "C:\pmis\backend\manage.py runserver 0.0.0.0:8000"
   
   # Set working directory
   nssm set PMISBackend AppDirectory "C:\pmis\backend"
   
   # Start service
   nssm start PMISBackend
   ```

#### Frontend Deployment (IIS)

1. **Build frontend**
   ```powershell
   cd C:\pmis\frontend
   npm install
   npm run build
   ```

2. **Copy to IIS directory**
   ```powershell
   Copy-Item -Path dist\* -Destination C:\inetpub\wwwroot\pmis -Recurse -Force
   ```

3. **Configure IIS**
   - Create new website in IIS Manager
   - Point to `C:\inetpub\wwwroot\pmis`
   - Set up SSL certificate (recommended)
   - Configure URL rewrite for React Router (if needed)

#### Automated Deployment

Use the provided PowerShell scripts:

```powershell
# Full update (backend + frontend)
.\update.ps1

# Backend only
cd backend
.\deploy.ps1
```

---

## Core Modules

### Users & Authentication
- Custom user model with 7 role types
- JWT-based authentication
- Role-based access control (RBAC)
- Password reset via email
- User management dashboard

**API Endpoints:**
- `POST /api/users/register/` - Register new user
- `POST /api/users/login/` - Login (get JWT token)
- `GET /api/users/me/` - Get current user profile
- `GET /api/users/` - List users (admin only)

### Projects
- Project lifecycle management
- Work package breakdown
- Risk register and mitigation plans
- Progress tracking (physical & financial)
- EVM metrics (CPI, SPI, EAC)

**API Endpoints:**
- `GET /api/projects/` - List projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/` - Project details
- `GET /api/projects/{id}/risks/` - Project risks

### Finance
- Budget allocation and tracking
- RA bill generation and approval
- Fund source management
- Retention ledger
- Payment tracking
- EVM calculations

**API Endpoints:**
- `GET /api/finance/bills/` - List RA bills
- `POST /api/finance/bills/` - Create bill
- `GET /api/finance/budgets/` - Budget line items
- `GET /api/finance/evm/{project_id}/` - EVM data

### EDMS (Document Management)
- Hierarchical folder structure
- Document versioning
- E-noting sheets
- Auto-routing (35+ categories)
- Access control
- Audit trails

**API Endpoints:**
- `GET /api/edms/folders/` - Folder tree
- `POST /api/edms/upload/` - Upload document
- `GET /api/edms/documents/{id}/` - Document details
- `POST /api/edms/documents/{id}/note/` - Add note

### Communications
- Contextual threaded messaging
- End-to-end encryption (AES-256-GCM)
- Direct messages and group chats
- Notifications
- Read receipts

**API Endpoints:**
- `GET /api/communications/threads/` - List threads
- `POST /api/communications/threads/` - Create thread
- `POST /api/communications/messages/` - Send message
- `GET /api/communications/notifications/` - Get notifications

### Workflow
- Configurable approval workflows
- Multi-stage approvals
- SLA tracking and escalation
- Delegation support
- Workflow templates

**API Endpoints:**
- `GET /api/workflow/definitions/` - Workflow templates
- `POST /api/workflow/instances/` - Start workflow
- `POST /api/workflow/actions/` - Take action (approve/reject)

### Masters
- Geography (countries, states, districts, cities)
- Organizational hierarchy
- Contractors and vendors
- Classifications and categories
- Finance configuration

**API Endpoints:**
- `GET /api/masters/states/` - List states
- `GET /api/masters/districts/?state={id}` - Districts by state
- `GET /api/masters/contractors/` - List contractors

### Scheduling
- Gantt chart visualization
- Task dependencies
- Critical path analysis
- Import from MSP/P6
- Progress tracking

**API Endpoints:**
- `GET /api/scheduling/tasks/` - List tasks
- `POST /api/scheduling/import/` - Import schedule
- `PATCH /api/scheduling/tasks/{id}/` - Update progress

### Banks (IFSC)
- Self-hosted IFSC database (177K+ branches)
- Offline validation
- Bank/branch search
- Auto-complete support

**API Endpoints:**
- `GET /api/banks/list/` - List bank names
- `GET /api/banks/ifsc/{code}/` - Lookup IFSC
- `GET /api/banks/stats/` - Database stats (admin)

---

## Security

### Authentication & Authorization
- **JWT Tokens** - Stateless authentication
- **Role-Based Access Control** - 7 predefined roles
- **Permission Classes** - Granular endpoint protection
- **Password Policies** - Strong password requirements

### Data Protection
- **Encryption at Rest** - AES-256-GCM for sensitive data
- **Encryption in Transit** - HTTPS/TLS required in production
- **Database Credentials** - Environment variables only
- **Secret Key Management** - Never committed to repository

### Audit & Compliance
- **Immutable Audit Logs** - Every action logged
- **User Activity Tracking** - IP address, user agent
- **Document Version Control** - Complete revision history
- **Regulatory Compliance** - Government-grade standards

### Best Practices
- **CORS Protection** - Configurable allowed origins
- **Rate Limiting** - Throttling for API endpoints
- **SQL Injection Prevention** - ORM-based queries
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Django middleware enabled

---

## API Documentation

### Base URL
- **Development:** `http://localhost:8000/api/`
- **Production:** `https://your-domain.com/api/`

### Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

**Get Token:**
```http
POST /api/users/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "SPV_Official"
  }
}
```

### Pagination

List endpoints support pagination:

```http
GET /api/projects/?page=1&page_size=50
```

**Response:**
```json
{
  "count": 150,
  "next": "http://localhost:8000/api/projects/?page=2",
  "previous": null,
  "results": [...]
}
```

### Filtering & Search

Many endpoints support filtering:

```http
GET /api/projects/?status=ONGOING&search=highway
GET /api/finance/bills/?project={uuid}&status=PENDING
```

### Error Handling

Standard HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": {
    "field_name": ["Error message"]
  }
}
```

---

## Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow PEP 8 for Python code
   - Use ESLint for JavaScript/React code
   - Write meaningful commit messages

3. **Test your changes**
   ```bash
   # Backend tests
   python manage.py test
   
   # Frontend tests (if applicable)
   npm test
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Describe your changes
   - Reference related issues
   - Request code review

### Code Style

**Backend (Python):**
- Follow PEP 8
- Use type hints where applicable
- Write docstrings for functions and classes
- Keep functions focused and small

**Frontend (React):**
- Use functional components with hooks
- Follow Airbnb JavaScript Style Guide
- Use Tailwind CSS utility classes
- Create reusable components

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug in module
docs: Update documentation
style: Format code
refactor: Refactor component
test: Add tests
chore: Update dependencies
```

---



### Documentation
- **Backend:** See `backend/README.md`
- **IFSC Database:** See `backend/banks/CUSTOMER_GUIDE.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Security:** See `docs/SECURITY.md`

### Troubleshooting

**Database Connection Errors:**
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database exists

**CORS Errors:**
- Update `CORS_ALLOWED_ORIGINS` in `.env`
- Verify frontend URL matches

**Encryption Errors:**
- Set `MESSAGE_ENCRYPTION_KEY` in `.env`
- Use: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

**IFSC Data Missing:**
- Run: `python manage.py import_ifsc --clear`
- Requires internet to download data

---

## 📄 License

**Proprietary Software** - All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

**Technology Stack:**
- Django & Django REST Framework
- React & Vite
- PostgreSQL
- Tailwind CSS
- Recharts, Leaflet, and more

---


