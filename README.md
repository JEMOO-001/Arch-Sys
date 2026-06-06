# 🛡️ Sentinel | Layout Monitoring & Archiving System

[![ArcGIS Pro](https://img.shields.io/badge/ArcGIS%20Pro-3.0%2B-blue?logo=esri&logoColor=white)](https://pro.arcgis.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.100%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Sentinel** is an enterprise-grade GIS archiving ecosystem designed for ArcGIS Pro. It bridges the gap between desktop GIS analysis and organizational oversight by providing real-time archival, version control, and a collaborative decision-making dashboard.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph "Desktop Environment"
        A[ArcGIS Pro Add-in] -->|REST API| B(FastAPI Gateway)
        A -->|PDF/JPEG| C{Network Storage}
    end

    subgraph "Server Layer"
        B -->|SQL Queries| D[(MS SQL Server)]
        B -->|WebSocket| E[Real-time Notification Engine]
    end

    subgraph "Web Interface"
        F[React Dashboard] -->|Auth/Data| B
        F -->|Live Updates| E
        F -->|Preview| C
    end

    style A fill:#005e95,color:#fff
    style F fill:#61dafb,color:#000
    style B fill:#009688,color:#fff
    style D fill:#f29111,color:#fff
```

---

## ✨ Core Capabilities

### 🛠️ ArcGIS Pro Integration (Add-in)
*   **One-Click Archiving:** Export and log layouts directly from the Pro ribbon.
*   **Smart Identity:** Automatic MAC-based machine identification and secure JWT auth.
*   **Dual Workflow:** Seamlessly handle **New Layouts** or **Re-versions** of existing records.
*   **Native UI:** Fully themed WPF dialogs that respect ArcGIS Pro's light/dark modes.

### 📊 Governance Dashboard (Web)
*   **Real-time Collaboration:** Live chat and notifications via WebSockets.
*   **Deep Linking:** Persistent URLs for specific reviews (`/approval/:id`).
*   **Audit Trails:** Exhaustive history tracking for every metadata change.
*   **Media Preview:** High-performance inline PDF/Image viewer with proxy security.

### 🛡️ Enterprise Security
*   **Role-Based Access (RBAC):** Distinct permissions for Analysts and Administrators.
*   **Data Integrity:** Unique ID generation (`AB-0000`) and SQL Server ACID compliance.

---

## 🚀 Quick Start

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### 3. Add-in (C#/.NET)
Open `GIS Archiving Sys.sln` in Visual Studio and build the `ArcLayoutSentinel` project. The `.esriAddInX` file will be generated in the `bin` folder.

---

## 📂 Repository Structure

*   📂 `addin/` — ArcGIS Pro Desktop Extension (C# SDK).
*   📂 `backend/` — REST API & WebSocket Server (Python/FastAPI).
*   📂 `frontend/` — Collaborative Management Dashboard (React/TS).
*   📂 `database/` — SQL Server Schema and Migrations.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop** | .NET 6, ArcGIS Pro SDK, WPF, XAML |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, MS SQL Server |
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Lucide |
| **Real-time** | WebSockets, JWT Authentication |

---

<p align="center">
  <i>Developed for Enterprise GIS Workflows | 2026</i>
</p>
