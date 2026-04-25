# API Documentation - Sentinel Map Archive System

## Base URL
`http://localhost:8000`

## Authentication
All endpoints (except `/auth/login`) require a JWT Bearer token in the `Authorization` header.

### Login
`POST /auth/login`
- **Body**: `username`, `password`
- **Returns**: `access_token`, `token_type`

## Maps Archival
### Create Record (Add-in)
`POST /maps/`
- **Body**: See `MapCreate` schema.
- **Rules**: Automatically generates `AB-####` ID and logs initial audit entry.

### List Maps (Dashboard)
`GET /maps/`
- **Query Params**: `search`, `status`
- **RBAC**: All roles can read.

### Update Map (Dashboard)
`PATCH /maps/{map_id}`
- **RBAC**: 
  - Analysts: Only own records.
  - Owners/Admins: All records.
- **Audit**: Every change is logged.

## File Proxy
### Stream File
`GET /proxy/file/{map_id}`
- **Security**: Requires valid JWT.
- **Function**: Streams PDF/JPEG from UNC network path to browser.
