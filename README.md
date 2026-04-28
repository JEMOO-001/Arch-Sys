# Sentinel Map Archive System

Enterprise GIS archiving tool for ArcGIS Pro with web dashboard.

## Project Structure

```
.
├── addin/          # ArcGIS Pro add-in (C#/.NET)
├── backend/         # FastAPI Python backend
├── frontend/       # React TypeScript frontend
├── database/       # SQL database scripts
└── GIS Archiving Sys.sln
```

## Features

- **ArcGIS Pro Add-in**: Archive map layouts directly from ArcGIS Pro
- **Category Management**: Categories fetched from API (e.g., Base Map, Cadastral, Topographic)
- **Web Dashboard**: Monitor archived maps with search, filter, and status tracking
- **View/Download**: Open maps inline or download as PDF/JPEG
- **Edit Records**: Update status, comments, and assignment info

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS
- **Add-in**: ArcGIS Pro SDK for .NET
- **Database**: PostgreSQL

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn src.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Add-in
```bash
cd addin
dotnet build -c Release
```

The add-in will be built to `addin/bin/Release/ArcLayoutSentinel.esriAddInX`

## API Endpoints

- `POST /auth/login` - User login
- `GET /categories/` - List categories
- `GET /maps/` - List all archived maps
- `POST /maps/` - Archive a new map
- `PATCH /maps/{id}` - Update map record
- `GET /proxy/file/{id}` - View/Download files
- `GET /stats/summary` - Dashboard statistics

## Users

- **Owner/Admin**: Full access (View, Edit, Delete)
- **Analyst**: View own records, Edit own records
