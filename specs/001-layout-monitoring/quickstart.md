# Quickstart: Layout Monitoring & Archiving System

## Prerequisites
- **SQL Server Enterprise Edition** (Accessible on local network)
- **ArcGIS Pro 3.x** (with SDK for .NET installed)
- **Python 3.11+**
- **Node.js 18+**

## 1. Database Setup
1. Create a new database named `GIS_Archiving`.
2. Run the schema script (to be generated in Phase 2) to create tables and sequences.
3. Seed the `Users` table with an initial admin account.

## 2. Backend (FastAPI)
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Create a `.env` file with your SQL Connection String and JWT Secret.
4. Run the server: `uvicorn src.main:app --reload`.

## 3. Frontend (React + Tailwind)
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Run the development server: `npm run dev`.

## 4. ArcGIS Pro Add-in
1. Open the solution in **Visual Studio 2022**.
2. Build the project (`ArcLayoutSentinel.sln`).
3. Launch ArcGIS Pro; the "Sentinel" tab will appear in the Ribbon.

## Configuration
- **Static Network Path**: Update the `app_settings.json` in the Add-in and the `.env` in the Backend to point to your enterprise file share.
