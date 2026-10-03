# CRM System

A full-featured CRM system built with React (TypeScript), Node.js (Express), and MySQL (Prisma).

## Features

*   **Authentication & RBAC**: Secure login with JWT, Role-Based Access Control, and granular privilege management.
*   **Master Data Management**: Admin interface to manage dynamic masters (Company, SBU, Product, Lead Source, etc.).
*   **Lead Management**:
    *   Lead lifecycle tracking (New -> Contacted -> Qualified -> Proposal -> Negotiation -> Closed).
    *   BANT Qualification (Budget, Authority, Need, Timeline).
    *   Quadrant Logic: Auto-categorization of leads (Q1-Q4) based on expected closure date.
    *   Auto-movement of quadrants via daily Cron jobs.
*   **Activity & Call Logging**: Log calls (Inbound/Outbound), track duration and outcomes.
*   **Reports & Dashboards**:
    *   Role-specific dashboards (Sales Person vs Manager vs CEO).
    *   MIS Reports (Lead Status, Quadrant Analysis, etc.).

## Tech Stack

*   **Frontend**: React, Vite, TypeScript, TailwindCSS, React Query, React Hook Form, Axios.
*   **Backend**: Node.js, Express, TypeScript, Prisma ORM, MySQL.
*   **Tools**: ESLint, Prettier, Zod (Validation).

## Setup Instructions

### Prerequisites

*   Node.js (v18+)
*   MySQL Database

### Backend Setup

1.  Navigate to `server/`:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    *   Create `.env` file based on `.env.example` (or use the provided one).
    *   Update `DATABASE_URL` with your MySQL credentials.
4.  Run Database Migrations & Seed:
    ```bash
    npx prisma migrate dev --name init
    npx ts-node prisma/seed.ts
    ```
5.  Start the server:
    ```bash
    npm run dev
    ```

### Frontend Setup

1.  Navigate to `client/`:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## API Documentation

The backend exposes a RESTful API. Key endpoints:

*   `POST /api/auth/login`: User login.
*   `GET /api/leads`: Fetch leads (filtered by RBAC).
*   `POST /api/leads`: Create a new lead.
*   `GET /api/masters/:type`: Fetch master data.

*   `POST /api/calls`: Log a call.

## Cron Jobs

*   **Quadrant Auto-Move**: Runs daily at midnight to update lead quadrants based on the number of days until expected closure.

## License

MIT
