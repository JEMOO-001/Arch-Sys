# Sentinel Map Archive System

Enterprise GIS archiving tool for ArcGIS Pro with web dashboard.

## Project Structure

```
.
├── addin/          # ArcGIS Pro add-in (C#/.NET)
├── backend/         # FastAPI Python backend
├── frontend/       # React TypeScript frontend
├── database/       # SQL database scripts
└── README.md
```

## Features

### ArcGIS Pro Add-in
- Archive map layouts directly from ArcGIS Pro
- Two-stage workflow: Create New or Edit Existing maps
- Auto-detect Windows dark/light theme
- Category selection from API
- Map layout selection with preview
- Metadata input (Income/Outcome numbers, To Whom, Status)

### Web Dashboard
- **Monitor View**: View all archived maps with icons
- **Summary View**: Analytics by analyst
- **Search & Filter**: Search by ID, Layout, Project, Status, To Whom
- **Auto-refresh**: Automatically fetches new records every 10 seconds
- **View/Download**: Open maps inline or download as PDF/JPEG
- **Edit Records**: Update status, comments, and assignment info
- **Audit Log**: Track all changes with timestamp

### Action Icons
- Eye icon: View map in new tab
- Download icon: Download PDF/JPEG
- Pen icon: Edit record (only for owner/admin or original analyst)
- Clock icon: View change history (only if changes exist)

### Audit Logging
- Records all field changes (status, comment, income_num, outcome_num, to_whom)
- Shows combined changes in single entry with newlines
- Displays user-friendly format: "field: old -> new"
- Timestamps in Cairo timezone (UTC+3)

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + MS SQL Server
- **Frontend**: React + TypeScript + Tailwind CSS
- **Add-in**: ArcGIS Pro SDK for .NET
- **Database**: MS SQL Server

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

### Authentication
- `POST /auth/login` - User login (returns JWT token)

### Maps
- `GET /maps/` - List all archived maps
- `POST /maps/` - Archive a new map
- `GET /maps/{id}` - Get single map
- `PATCH /maps/{id}` - Update map record
- `GET /maps/next-id` - Generate next unique ID
- `PUT /maps/{id}/reexport` - Re-export map file

### Audit
- `GET /maps/{id}/audit` - Get audit log for map
- `POST /maps/audit/batch` - Check which maps have audit logs

### Categories
- `GET /categories/` - List categories

### Stats
- `GET /stats/summary` - Dashboard statistics
- `GET /stats/analysts` - Analyst performance

### Proxy
- `GET /proxy/file/{id}` - View/Download files

### Users
- `GET /users/me` - Get current user info
- `GET /users/` - List all users (admin only)

## User Roles

- **Owner/Admin**: Full access (View, Edit, Delete all records)
- **Analyst**: View all records, Edit only own records

## Environment Variables

### Backend (.env)
```
DATABASE_URL=mssql+pyodbc://user:pass@server/database?driver=ODBC+Driver+17+for+SQL+Server
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ARCHIVE_ROOT_PATH=\\server\share
```

## Archive Workflow

1. Open ArcGIS Pro
2. Run ArcLayoutSentinel add-in
3. Choose "Create New" or "Edit Existing"
4. Select category and map layout
5. Fill metadata (Income/Outcome numbers, To Whom)
6. Save - Map is archived with unique ID

## Database Schema

### Tables
- **Users**: System users
- **Maps**: Archived maps
- **Audit_Log**: Change history
- **Categories**: Map categories
- **Projects**: Project references