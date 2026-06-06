from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.websocket import manager
from ..dependencies.auth import verify_token
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Verify token manually since WebSockets pass token in URL
    user_data = verify_token(token)
    if not user_data or user_data.user_id is None:
        logger.warning("WebSocket connection rejected: Invalid token")
        await websocket.close(code=1008) # Policy Violation
        return

    user_id = user_data.user_id
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            # Wait for messages from client (e.g. heartbeats)
            # Currently we mostly push server -> client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        manager.disconnect(user_id, websocket)
