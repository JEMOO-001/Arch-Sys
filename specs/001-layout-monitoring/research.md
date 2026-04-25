# Research: Layout Monitoring & Archiving System

## ArcGIS Pro SDK Export Logic
**Decision**: Use `ArcGIS.Desktop.Layouts.Layout.Export()` within the `QueuedTask.Run()` context.
**Rationale**: This ensures thread safety within ArcGIS Pro and allows access to the full range of export settings (DPI, Color Space) requested in the spec.
**Alternatives Considered**: Python `arcpy` scripting (Rejected due to the need for a dynamic, real-time UI list of open layouts).

## FastAPI File Streaming (File Proxy)
**Decision**: Use `fastapi.responses.FileResponse` with a dedicated service to validate network paths.
**Rationale**: Provides a secure way to serve files from a static network path to a web browser while bypassing `file://` protocol restrictions.
**Alternatives Considered**: Direct Nginx file serving (Rejected because we need application-level authentication checks before serving the file).

## SQL Server Row-Level Security (RLS)
**Decision**: Implement RLS at the **Application Layer** (FastAPI) using UserIDs.
**Rationale**: While SQL Server has native RLS, implementing it in the API allows for more flexible UI feedback (e.g., showing a "Read-Only" badge) and easier integration with the Audit Log service.
**Alternatives Considered**: Native SQL RLS (Rejected for increased complexity in connection pooling and UI synchronization).

## Database Integration Strategy
**Decision**: Use **Standard SQL Tables** (T-SQL) within the `GIS_Archiving` database.
**Rationale**: Even though the database is Enterprise Geodatabase enabled, using standard tables ensures high performance for the React/FastAPI dashboard and simplifies the "File Proxy" logic. No spatial linking is required for metadata.
**Alternatives Considered**: Enterprise Geodatabase/SDE features (Rejected for simplicity and web performance).
