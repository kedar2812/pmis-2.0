# PMIS ZIA Frontend

Programme Management Information System for Zaheerabad Industrial Area - Frontend Application

## Overview

A centralized, cloud-hosted digital platform serving as a single source of truth for infrastructure development, acting as a command center for monitoring, reporting, and analytics.

## Tech Stack

- **Framework**: React.js 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Maps**: Leaflet (OpenStreetMap)
- **3D Viewer**: Three.js

## Features

### Core Modules

1. **Unified Dashboard** - Visual interface showing KPIs, milestones, alerts, and multi-domain data summary
2. **Electronic Document Management System (EDMS)** - Version control, workflow approvals, repository for drawings and reports
3. **Project Scheduling** - Timeline tracking, critical path visualization (Gantt charts)
4. **Cost Management & Procurement** - Budget forecasting, earned value analysis, contract lifecycle tracking
5. **GIS & Spatial Mapping** - Visualization of project sites, utilities, and parcel boundaries
6. **3D Model Viewer** - Interactive model of infrastructure components
7. **Risk Management** - Risk register, mitigation plans, early warning alerts

### Authentication & Access Control

The system supports role-based access control with the following roles:

- **SPV_Official** - Admin (Full access)
- **PMNC_Team** - Manager (Full control with configuration rights)
- **EPC_Contractor** - Contributor (Restricted access)
- **Consultant_Design** - Limited (Document upload, BIM viewer only)
- **Govt_Department** - Read-Only (Dashboards and reports)
- **NICDC_HQ** - Read-Only High Level (KPIs and summaries)

### Localization

Supports three languages:
- English
- Hindi (हिंदी)
- Telugu (తెలుగు)

## GIS Mapping

The GIS mapping features use Leaflet with OpenStreetMap, which requires no API key and is completely free to use. The map includes:
- Interactive project markers
- Layer controls (Satellite, Street, Parcels, Utilities)
- GIS feature overlays (Polygons, Polylines, Points)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Sidebar, Header)
│   └── ui/             # Basic UI components (Button, Card, etc.)
├── contexts/           # React contexts (Auth, Language)
├── mock/               # Mock data and interfaces
│   ├── data/           # JSON data files
│   └── interfaces.ts   # TypeScript interfaces
├── pages/              # Page components
├── lib/                # Utility functions
├── App.tsx             # Main app component with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Mock Data

The application uses mock data stored in `src/mock/data/` directory. All data is in JSON format and simulates backend API responses. The mock data includes:

- Projects
- KPIs
- Documents
- Tasks/Schedules
- Budgets
- Cost Forecasts
- Risks
- Notifications
- GIS Features
- Users

## Usage

1. Start the application
2. On the login page, select a role from the dropdown
3. Click "Enter System" to login
4. Navigate through different modules using the sidebar
5. Use the language toggle in the header to switch languages

## Development Notes

- All data is mock data - no backend API is required
- Role-based access control is implemented at the UI level
- The application is fully responsive and works on mobile devices
- Charts and visualizations use Recharts library
- Maps use Leaflet with OpenStreetMap (no API key required)
- 3D viewer uses Three.js for basic 3D visualization

## License

This project is developed for the Zaheerabad Industrial Area Programme Management Information System.


