from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..services.websocket import manager
from ..dependencies.auth import verify_token
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint.
    Token is passed as a query parameter (?token=...) instead of the URL path,
    preventing exposure in server access logs and browser history.
    """
    user_data = verify_token(token)
    if not user_data or user_data.user_id is None:
        logger.warning("WebSocket rejected: invalid token")
        await websocket.close(code=1008)  # Policy Violation
        return

    user_id  = user_data.user_id
    tenant_id = user_data.tenant_id

    await manager.connect(user_id, tenant_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error("WebSocket error for user %d: %s", user_id, e)
        manager.disconnect(user_id, websocket)
