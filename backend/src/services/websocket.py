from fastapi import WebSocket
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of (tenant_id, WebSocket)
        self._connections: Dict[int, List[Tuple[int, WebSocket]]] = {}

    async def connect(self, user_id: int, tenant_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append((tenant_id, websocket))
        logger.info("User %d (tenant %d) connected via WS. Sockets: %d",
                    user_id, tenant_id, len(self._connections[user_id]))

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self._connections:
            self._connections[user_id] = [
                (tid, ws) for tid, ws in self._connections[user_id] if ws is not websocket
            ]
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info("User %d disconnected from WS.", user_id)

    async def send_personal_message(self, message: dict, user_id: int):
        for _, ws in self._connections.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error("Error sending to user %d: %s", user_id, e)

    async def broadcast_to_tenant(self, message: dict, tenant_id: int):
        """Send message ONLY to connections whose tenant_id matches. Prevents cross-tenant leakage."""
        for user_id, sockets in list(self._connections.items()):
            for tid, ws in sockets:
                if tid == tenant_id:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.error("Error broadcasting to user %d (tenant %d): %s",
                                     user_id, tenant_id, e)

    async def broadcast(self, message: dict):
        """Global broadcast — only use for system-wide events (maintenance, etc.)."""
        for user_id, sockets in list(self._connections.items()):
            for _, ws in sockets:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error("Error broadcasting to user %d: %s", user_id, e)


manager = ConnectionManager()
