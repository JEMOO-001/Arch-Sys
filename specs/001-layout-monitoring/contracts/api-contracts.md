# API Contracts: Layout Monitoring System

## Auth
- `POST /auth/login`: Authenticate and receive JWT.
- `GET /auth/me`: Validate current session.

## Archiving (Used by Add-in)
- `POST /archive/create`: Log a new layout export.
- `POST /archive/media`: Attach a file path to an existing record.

## Dashboard (Used by React)
- `GET /records`: Fetch layout records (with pagination & filters).
- `GET /records/{unique_id}`: Get specific record details and audit log.
- `PATCH /records/{unique_id}`: Update metadata (Subject to RLS).
- `GET /files/{media_id}`: File Proxy endpoint to download/stream PDF or JPEG.

## Audit
- `GET /audit/{record_id}`: Retrieve the full change history for a record.
