# PMIS ZIA - Programme Management Information System

The Programme Management Information System (PMIS) for Zaheerabad Industrial Area is a comprehensive, full-stack digital platform designed to serve as the "Single Source of Truth" for infrastructure development. It acts as a central command center for monitoring progress, financial tracking, document management, and decision-making.

##  Overview

This platform integrates various project management domains into a seamless interface, providing real-time analytics, geospatial data, and workflow automation for the Special Purpose Vehicle (SPV), Project Management Consultants (PMNC), and Contractors.

##  Tech Stack

### Frontend
- **Framework**: React.js 18
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React Hooks & Context API
- **Maps**: Leaflet (OpenStreetMap)
- **Charts**: Recharts
- **UI Components**: Lucide React Icons, Framer Motion (Animations), Sonner (Toasts)

### Backend
- **Framework**: Django REST Framework (Python)
- **Database**: PostgreSQL 
- **Authentication**: JWT & Session-based
- **API**: RESTful Endpoints

##  Key Features

### 1. Unified Dashboard
- **Centralized View**: Real-time KPIs for physical and financial progress.
- **Interactive Widgets**: Interactive charts and metric cards for quick insights.

### 2. User & Master Data Management
- **Role-Based Access Control (RBAC)**: secure access for SPV Officials, PMNC Teams, Contractors, and Consultants.
- **Interactive Status Badges**: **[NEW]** Easily activate or deactivate entities (Users, Contractors, ETP Charges) with a single click and secure confirmation modal.
- **Dynamic Master Data**: Configurable hierarchies (Zones, Circles), geography, and classification systems.

### 3. Financial Management
- **Bill Tracking**: Streamlined bill submission and approval workflow.
- **ETP Charges**: Configurable generic charges (Deductions, Recoveries) with active/inactive status toggles.
- **Cost Forecasting**: Earned value analysis and budget tracking.

### 4. Electronic Document Management System (EDMS)
- **Repository**: Centralized storage for drawings, reports, and contracts.
- **Version Control**: Track document revisions and history.

### 5. GIS & Visualisation
- **Interactive Maps**: Layered GIS data viewing project sites and utilities.
- **3D Viewer**: (Placeholder) Infrastructure component visualization.

##  Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- npm or yarn

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/kedar2812/pmis-2.0.git
    cd pmis-zia
    ```

2.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver
    ```

## Project Structure

```
pmis-zia/
├── frontend/               # React Frontend
│   ├── src/               # Source Code
│   │   ├── api/           # API Services & Client
│   │   ├── components/    # Reusable UI Components
│   │   │   ├── ui/        # Generic UI (Buttons, StatusBadge, etc.)
│   │   │   └── ...
│   │   ├── pages/         # Application Pages
│   │   └── ...
│   ├── public/            # Static Assets
│   ├── package.json
│   └── vite.config.js
│
├── backend/               # Django Backend
│   ├── masters/           # Master Data App
│   ├── users/             # User Management App
│   ├── projects/          # Project Management App
│   ├── finance/           # Finance & Billing App
│   └── ...
│
├── README.md
└── ...
```

## Roles & Permissions

- **SPV Official**: Full generic administrative access.
- **PMNC Team**: Project manager access with configuration rights.
- **EPC Contractor**: Restricted access to specific packages and bill submissions.
- **Design Consultant**: Document upload and viewing rights.

##  License

Proprietary software developed for the Zaheerabad Industrial Area development project.
