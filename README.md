# 🛡️ Sentinel

### Layout Monitoring & Archiving System for ArcGIS Pro

[![ArcGIS Pro](https://img.shields.io/badge/ArcGIS_Pro-3.0+-005e95?style=for-the-badge&logo=esri&logoColor=white)](https://pro.arcgis.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-Enterprise-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server)
[![.NET](https://img.shields.io/badge/.NET_8-WPF-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)

---

**Sentinel** is an enterprise-grade archiving ecosystem that bridges the gap between desktop GIS analysis in ArcGIS Pro and organizational oversight. It provides one-click layout archival, automated version control, real-time collaboration, and a governance dashboard — all connected through a secure REST API.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph "Desktop Environment"
        A["🖥️ ArcGIS Pro Add-in<br/>(C# / .NET 8 / WPF)"] -->|REST API| B
        A -->|"PDF / JPEG Export"| C
    end

    subgraph "Server Layer"
        B["⚡ FastAPI Backend<br/>(Python 3.10+)"] -->|SQLAlchemy| D
        B -->|WebSocket| E["🔔 Notification Engine"]
    end

    subgraph "Storage"
        C["📁 Network Share<br/>(UNC Path)"]
        D["🗄️ MS SQL Server"]
    end

    subgraph "Web Interface"
        F["📊 React Dashboard<br/>(TypeScript / Vite)"] -->|JWT Auth| B
        F -->|Live Updates| E
        F -->|File Preview| B
    end

    style A fill:#005e95,color:#fff,stroke:#003d66
    style B fill:#009688,color:#fff,stroke:#00695c
    style F fill:#1a1a2e,color:#61dafb,stroke:#61dafb
    style D fill:#f29111,color:#fff,stroke:#c77700
    style C fill:#4a5568,color:#fff,stroke:#2d3748
    style E fill:#e53e3e,color:#fff,stroke:#c53030
```

| Component | Purpose | Tech |
|:---|:---|:---|
| **Add-in** | One-click archiving from ArcGIS Pro ribbon | C#, .NET 8, WPF, ArcGIS Pro SDK |
| **Backend** | REST API, auth, file proxy, WebSocket server | Python, FastAPI, SQLAlchemy, Uvicorn |
| **Frontend** | Admin dashboard, approvals, real-time chat | React 18, TypeScript, Vite, TailwindCSS |
| **Database** | Metadata storage, audit logs, sequences | MS SQL Server Enterprise |
| **Network Share** | Archived PDF/JPEG layout files | UNC path on internal server |

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🛠️ ArcGIS Pro Add-in
- **One-Click Archiving** — Export layouts directly from the Pro ribbon
- **Auto MAC Detection** — Machine identity via MAC address
- **Dual Workflow** — New layouts or re-versions of existing records
- **DPAPI Encryption** — API tokens encrypted at rest
- **Native Theming** — Adapts to Pro's light/dark mode

</td>
<td width="50%">

### 📊 Web Dashboard
- **Live Collaboration** — Real-time chat & WebSocket notifications
- **Approval Workflow** — Approve, Request Edits, or Hold layouts
- **Inline Preview** — Secure PDF/Image viewer with proxy
- **Audit Trail** — Full change history for every record
- **AI Chat** — Built-in assistant for quick lookups

</td>
</tr>
<tr>
<td>

### 🔐 Security
- **JWT Authentication** with HS256 signing
- **RBAC** — `admin` and `edit` roles
- **Tenant Isolation** — Every query scoped by `tenant_id`
- **Security Headers** — HSTS, CSP, Referrer-Policy
- **Rate Limiting** — Login & AI chat endpoints

</td>
<td>

### 📋 Data Management
- **Auto ID Generation** — `AB-0001` format per category prefix
- **Category Sequences** — SQL Server sequences for unique IDs
- **Attachment Uploads** — Image-only, chunked, 10 MB cap
- **Status Tracking** — In Progress → Complete → Approved

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|:---|:---|
| Python | 3.10+ |
| Node.js | 18+ |
| SQL Server | 2019+ (Enterprise recommended) |
| ODBC Driver | Microsoft ODBC Driver 17 for SQL Server |
| ArcGIS Pro | 3.0+ (for add-in only) |
| Visual Studio | 2022+ with .NET 8 (for add-in only) |

---

### 1️⃣ Database Setup

Create a SQL Server database and run the schema:

```sql
-- Create the database
CREATE DATABASE GIS_Archiving;
```

Then use `init_db.py` to create tables and seed data (see Step 2).

---

### 2️⃣ Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=mssql+pyodbc://user:pass@host/GIS_Archiving?driver=ODBC+Driver+17+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no
SECRET_KEY=<generate-with: python -c "import secrets; print(secrets.token_urlsafe(48))">
ARCHIVE_ROOT_PATH=\\server\share\archive
ALLOWED_ORIGINS=http://localhost:5173
```

> ⚠️ `SECRET_KEY` must be **at least 32 characters**. The app will refuse to start otherwise.

```bash
# Initialize database (tables + seed users)
set SEED_ADMIN_PASSWORD=YourStrongAdminPass!1
set SEED_EDIT_PASSWORD=YourStrongEditPass!2
python init_db.py

# Start the server
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Docs at `/docs`.

---

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The dashboard opens at `http://localhost:5173`.

> 💡 **Default credentials** are whatever you set in `SEED_ADMIN_PASSWORD` / `SEED_EDIT_PASSWORD`.
> - Admin: `admin` / `<your SEED_ADMIN_PASSWORD>`
> - Analyst: `edit` / `<your SEED_EDIT_PASSWORD>`

---

### 4️⃣ Add-in Setup (Optional — ArcGIS Pro)

```bash
# Open solution in Visual Studio
start "GIS Archiving Sys.sln"
```

1. Build the `ArcLayoutSentinel` project
2. The `.esriAddInX` file is generated in `addin/bin/`
3. Double-click it to install into ArcGIS Pro
4. Open Pro → **Add-In tab** → Click **Settings** → Configure your server URL and archive path
5. Login with your credentials → Start archiving layouts

---

## 🔄 Workflow

```mermaid
sequenceDiagram
    participant Analyst as 🧑‍💻 GIS Analyst
    participant Pro as 🖥️ ArcGIS Pro
    participant API as ⚡ Backend API
    participant DB as 🗄️ SQL Server
    participant Share as 📁 Network Share
    participant Dash as 📊 Dashboard
    participant Admin as 👤 Administrator

    Analyst->>Pro: Open layout
    Pro->>Pro: Click "Archive" on ribbon
    Pro->>API: POST /api/v1/maps (metadata)
    Pro->>Share: Export PDF/JPEG
    API->>DB: Insert record + generate ID
    API-->>Dash: WebSocket notification
    Dash-->>Admin: 🔔 New layout submitted
    Admin->>Dash: Review & Approve
    Dash->>API: PATCH /api/v1/maps/{id}
    API->>DB: Update approval_status
    API-->>Dash: WebSocket notification
    Dash-->>Analyst: 🔔 Layout approved
```

---

## ⚙️ Configuration Reference

### Environment Variables (`.env`)

| Variable | Required | Description |
|:---|:---:|:---|
| `DATABASE_URL` | ✅ | SQL Server connection string (pyodbc format) |
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `ARCHIVE_ROOT_PATH` | ✅ | UNC path to network share for exported files |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `ALGORITHM` | — | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | Token TTL in minutes (default: `480`) |
| `UPLOAD_DIR` | — | Comment attachment upload path (default: `static/uploads`) |
| `GEMINI_API_KEY` | — | Google Gemini API key for AI chat |
| `LM_STUDIO_BASE_URL` | — | Local LLM server URL |

### Add-in Settings

Configured via **Settings dialog** in ArcGIS Pro:

| Setting | Description |
|:---|:---|
| **Server URL** | Backend API base URL (e.g., `http://server:8000/api/v1`) |
| **Archive Root** | Network share path for exported layouts |

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

> Tests use **SQLite** (via `aiosqlite`) as a local substitute for SQL Server.

---

## 🛡️ Security Highlights

- 🔑 **JWT tokens** with enforced minimum key strength (32+ chars)
- 🔒 **DPAPI encryption** for stored tokens in the desktop add-in
- 🚫 **No credentials** in shared project files or console output
- 🛑 **Rate limiting** — 5/min login, 20/min AI chat
- 📏 **Upload caps** — 10 MB max, image-only, chunked writes
- 🧱 **Security headers** — HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy
- 🏢 **Tenant isolation** — every query scoped by `tenant_id`

For full details, see [`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Desktop** | .NET 8 · ArcGIS Pro SDK · WPF · XAML · Serilog |
| **Backend** | Python 3.10+ · FastAPI · SQLAlchemy (async) · Uvicorn · SlowAPI |
| **Frontend** | React 18 · Vite · TypeScript · TailwindCSS · Framer Motion · Lucide |
| **Database** | MS SQL Server Enterprise · T-SQL · Sequences |
| **Real-time** | WebSockets · JWT Bearer Auth |
| **Security** | DPAPI · PBKDF2-SHA256 · bcrypt (legacy) · HSTS · CSP |

---

<p align="center">
  <strong>Sentinel</strong> — Enterprise GIS Archiving & Layout Monitoring<br/>
  <sub>Built for organizations that need oversight over their GIS outputs · 2026</sub>
</p>
