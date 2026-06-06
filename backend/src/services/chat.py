"""
Sentinel AI Chat Service
========================
Uses a local LM Studio server at localhost:1234 with OpenAI-compatible
tool calling to answer questions about the GIS archiving system.
All database queries are READ-ONLY and filtered by the authenticated caller's tenant_id.
"""

import json
import logging
from typing import Optional
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 2000
MAX_TOOL_LIMIT = 50


def _tenant_from(kwargs: dict) -> int:
    tenant_id = kwargs.get("tenant_id")
    if tenant_id is None:
        raise ValueError("tenant_id is required")
    return int(tenant_id)


def _safe_limit(value: Optional[int], default: int = 20, max_value: int = MAX_TOOL_LIMIT) -> int:
    try:
        limit = int(value if value is not None else default)
    except (TypeError, ValueError):
        limit = default
    return max(1, min(limit, max_value))


def _clean_message(message: str) -> str:
    cleaned = (message or "").strip()
    if not cleaned:
        raise ValueError("Message cannot be empty.")
    if len(cleaned) > MAX_MESSAGE_LENGTH:
        raise ValueError(f"Message exceeds {MAX_MESSAGE_LENGTH} characters.")
    return cleaned


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are Sentinel AI, an intelligent assistant for the GIS Archiving System.
Your role is to help users query and understand their archived map data, user accounts, comments, notifications, and projects.

Guidelines:
- When a user asks about comments or notes, ALWAYS query the database using get_map_comments or search_comments.
- CRITICAL: You must return the EXACT, verbatim text/comments from the database (especially the 'message' column in Map_Comments or approval comments). DO NOT summarize, paraphrase, shorten, or predict comments or user messages. Print them EXACTLY as they are stored in the database.
- Print database records exactly as they are returned, including map unique IDs (e.g., 'AB-0023'), names of analysts, categories, and audit values.
- SUPPORT RTL & ARABIC: If the user writes their request in Arabic, you MUST reply in Arabic. Write the response with clear Arabic grammar and phrasing, presenting the database results beautifully.
- If a user asks something outside the scope of the archiving system, politely redirect them.
- When asked about statistics, use the get_statistics function.
- If the user asks about a specific map, use get_map_details with its unique_id.
- If the user asks for comments, feedback, or attachments for a map, use get_map_comments.
- If you need to search comments by keywords, message text, or analyst name, use the search_comments function.
- If the user asks about system users, accounts, or roles, use get_users.
- If the user asks about clients or projects, use get_projects.
- If the user asks about recent system alerts or notifications, use get_recent_notifications.
"""

# ---------------------------------------------------------------------------
# OpenAI-compatible Tool / Function Schema Definition
# ---------------------------------------------------------------------------
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_maps",
            "description": "Search archived maps with optional filters. Returns matching layout records.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by map status ('Complete' or 'In Progress')."},
                    "category": {"type": "string", "description": "Filter by map category name."},
                    "analyst_name": {"type": "string", "description": "Filter by analyst full name (partial match supported)."},
                    "project_name": {"type": "string", "description": "Filter by project name (partial match supported)."},
                    "unique_id": {"type": "string", "description": "Filter by unique map ID (e.g. 'AB-0023', partial match supported)."},
                    "limit": {"type": "integer", "description": "Maximum number of results to return. Default 20, max 50."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_map_details",
            "description": "Get full details of a specific map by its unique_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unique_id": {"type": "string", "description": "The unique map identifier, e.g. 'AB-0023'."}
                },
                "required": ["unique_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_statistics",
            "description": "Get aggregate counts and statistics about archived maps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "group_by": {
                        "type": "string",
                        "description": "How to group the statistics.",
                        "enum": ["status", "category", "analyst", "approval_status"]
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_activity",
            "description": "Get recently created or approved maps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "activity_type": {
                        "type": "string",
                        "description": "Type of activity.",
                        "enum": ["created", "approved", "all"]
                    },
                    "limit": {"type": "integer", "description": "Maximum number of results. Default 10, max 50."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_audit_history",
            "description": "Get the full audit/change history for a specific map by its unique_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unique_id": {"type": "string", "description": "The unique map identifier, e.g. 'AB-0023'."}
                },
                "required": ["unique_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_categories",
            "description": "List all available map categories with their prefixes and descriptions.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_analyst_performance",
            "description": "Get performance statistics for analysts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "analyst_name": {"type": "string", "description": "Specific analyst full name. Omit to get stats for all analysts."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_map_comments",
            "description": "Get all comments, feedback, and attachments for a specific map by its unique_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unique_id": {"type": "string", "description": "The unique map identifier, e.g. 'AB-0023'."}
                },
                "required": ["unique_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_users",
            "description": "List all active user accounts (analysts and administrators) in the archiving system.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_projects",
            "description": "List all projects and clients registered in the database.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_notifications",
            "description": "Get recent system alerts, actions, and notifications.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Maximum number of alerts to return. Default 15, max 50."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_comments",
            "description": "Search comments/feedback messages by keyword query, map unique_id, or analyst name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Keyword or phrase to search for inside the comment message text."},
                    "unique_id": {"type": "string", "description": "Filter comments by map unique ID (e.g. 'AB-0023')."},
                    "analyst_name": {"type": "string", "description": "Filter comments by the name of the commenting user or layout analyst."},
                    "limit": {"type": "integer", "description": "Maximum number of comments to return. Default 20, max 50."}
                }
            }
        }
    }
]


# ---------------------------------------------------------------------------
# Async DB handlers — executed when model calls a tool
# ---------------------------------------------------------------------------

async def _exec_search_maps(db: AsyncSession, **kwargs) -> list[dict]:
    from ..models.maps import Map as MapModel
    from ..models.base import User as UserModel
    tenant_id = _tenant_from(kwargs)
    limit = _safe_limit(kwargs.get("limit"), default=20)

    q = (
        text("""
            SELECT TOP(:limit)
                m.unique_id, m.layout_name, m.project_name, m.category,
                m.status, m.approval_status, u.full_name AS analyst_name,
                m.created_at
            FROM Maps m
            LEFT JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id
              {status_clause}
              {category_clause}
              {analyst_clause}
              {project_clause}
              {uid_clause}
            ORDER BY m.created_at DESC
        """.format(
            status_clause  = "AND m.status = :status"        if kwargs.get("status")        else "",
            category_clause= "AND m.category = :category"    if kwargs.get("category")      else "",
            analyst_clause = "AND u.full_name LIKE :analyst_name" if kwargs.get("analyst_name") else "",
            project_clause = "AND m.project_name LIKE :project_name" if kwargs.get("project_name") else "",
            uid_clause     = "AND m.unique_id LIKE :unique_id" if kwargs.get("unique_id")   else "",
        ))
    )
    params: dict = {"limit": limit, "tenant_id": tenant_id}
    if kwargs.get("status"):        params["status"]       = kwargs["status"]
    if kwargs.get("category"):      params["category"]     = kwargs["category"]
    if kwargs.get("analyst_name"):  params["analyst_name"] = f"%{kwargs['analyst_name']}%"
    if kwargs.get("project_name"):  params["project_name"] = f"%{kwargs['project_name']}%"
    if kwargs.get("unique_id"):     params["unique_id"]    = f"%{kwargs['unique_id']}%"

    result = await db.execute(q, params)
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_map_details(db: AsyncSession, **kwargs) -> dict:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT
            m.map_id, m.unique_id, m.layout_name, m.project_path,
            m.project_name, m.category, m.income_num, m.outcome_num,
            m.to_whom, m.status, m.comment, m.approval_status,
            m.approval_comment, m.approved_by, m.approved_at,
            m.file_path, m.created_at, m.updated_at,
            u.full_name AS analyst_name
        FROM Maps m
        LEFT JOIN Users u ON m.analyst_id = u.user_id
        WHERE m.unique_id = :unique_id AND m.tenant_id = :tenant_id
    """)
    result = await db.execute(sql, {"unique_id": kwargs["unique_id"], "tenant_id": tenant_id})
    row = result.mappings().first()
    if not row:
        return {"error": f"Map with unique_id '{kwargs['unique_id']}' not found."}
    return dict(row)


async def _exec_get_statistics(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    group_by = kwargs.get("group_by")

    if group_by == "status":
        sql = text("""
            SELECT status AS label, COUNT(*) AS count
            FROM Maps WHERE tenant_id = :tenant_id
            GROUP BY status ORDER BY count DESC
        """)
    elif group_by == "category":
        sql = text("""
            SELECT category AS label, COUNT(*) AS count
            FROM Maps WHERE tenant_id = :tenant_id
            GROUP BY category ORDER BY count DESC
        """)
    elif group_by == "analyst":
        sql = text("""
            SELECT u.full_name AS label, COUNT(*) AS count
            FROM Maps m
            LEFT JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id
            GROUP BY u.full_name ORDER BY count DESC
        """)
    elif group_by == "approval_status":
        sql = text("""
            SELECT COALESCE(approval_status, 'Pending Approval') AS label, COUNT(*) AS count
            FROM Maps WHERE tenant_id = :tenant_id
            GROUP BY approval_status ORDER BY count DESC
        """)
    else:
        sql = text("""
            SELECT
                COUNT(*) AS total_maps,
                SUM(CASE WHEN status = 'Complete' THEN 1 ELSE 0 END) AS complete,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN approval_status = 'Approve' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN approval_status = 'Editing Required' THEN 1 ELSE 0 END) AS editing_required,
                SUM(CASE WHEN approval_status = 'On Hold' THEN 1 ELSE 0 END) AS on_hold,
                SUM(CASE WHEN approval_status IS NULL THEN 1 ELSE 0 END) AS pending_review
            FROM Maps WHERE tenant_id = :tenant_id
        """)

    result = await db.execute(sql, {"tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_recent_activity(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    activity_type = kwargs.get("activity_type", "all")
    limit = _safe_limit(kwargs.get("limit"), default=10)

    if activity_type == "created":
        sql = text("""
            SELECT TOP(:limit)
                m.unique_id, m.layout_name, m.project_name, m.category,
                m.status, u.full_name AS analyst_name, m.created_at
            FROM Maps m
            LEFT JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id
            ORDER BY m.created_at DESC
        """)
    elif activity_type == "approved":
        sql = text("""
            SELECT TOP(:limit)
                m.unique_id, m.layout_name, m.project_name,
                m.approval_status, m.approved_at
            FROM Maps m
            WHERE m.tenant_id = :tenant_id AND m.approved_at IS NOT NULL
            ORDER BY m.approved_at DESC
        """)
    else:
        sql = text("""
            SELECT TOP(:limit)
                m.unique_id, m.layout_name, m.project_name, m.category,
                m.status, m.approval_status, u.full_name AS analyst_name,
                m.created_at, m.updated_at
            FROM Maps m
            LEFT JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id
            ORDER BY COALESCE(m.updated_at, m.created_at) DESC
        """)

    result = await db.execute(sql, {"limit": limit, "tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_audit_history(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT
            a.field_name, a.old_value, a.new_value,
            u.full_name AS changed_by, a.changed_at
        FROM Audit_Log a
        INNER JOIN Maps m ON a.map_id = m.map_id
        LEFT JOIN Users u ON a.changed_by = u.user_id
        WHERE m.unique_id = :unique_id AND a.tenant_id = :tenant_id
        ORDER BY a.changed_at DESC
    """)
    result = await db.execute(sql, {"unique_id": kwargs["unique_id"], "tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_categories(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT category_id, name, prefix, description
        FROM Categories
        WHERE tenant_id = :tenant_id
        ORDER BY name
    """)
    result = await db.execute(sql, {"tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_analyst_performance(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    analyst_name = kwargs.get("analyst_name")

    if analyst_name:
        sql = text("""
            SELECT
                u.full_name AS analyst_name,
                COUNT(*) AS total_maps,
                SUM(CASE WHEN m.status = 'Complete' THEN 1 ELSE 0 END) AS complete,
                SUM(CASE WHEN m.approval_status = 'Approve' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN m.approval_status = 'Editing Required' THEN 1 ELSE 0 END) AS editing_required,
                MIN(m.created_at) AS first_map,
                MAX(m.created_at) AS last_map
            FROM Maps m
            INNER JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id AND u.full_name LIKE :analyst_name
            GROUP BY u.full_name
        """)
        result = await db.execute(sql, {"analyst_name": f"%{analyst_name}%", "tenant_id": tenant_id})
    else:
        sql = text("""
            SELECT
                u.full_name AS analyst_name,
                COUNT(*) AS total_maps,
                SUM(CASE WHEN m.status = 'Complete' THEN 1 ELSE 0 END) AS complete,
                SUM(CASE WHEN m.approval_status = 'Approve' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN m.approval_status = 'Editing Required' THEN 1 ELSE 0 END) AS editing_required
            FROM Maps m
            INNER JOIN Users u ON m.analyst_id = u.user_id
            WHERE m.tenant_id = :tenant_id
            GROUP BY u.full_name
            ORDER BY total_maps DESC
        """)
        result = await db.execute(sql, {"tenant_id": tenant_id})

    return [dict(r) for r in result.mappings().all()]


async def _exec_get_map_comments(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT 
            c.comment_id, c.message, c.attachment_path, c.created_at, 
            u.full_name AS commented_by
        FROM Map_Comments c
        INNER JOIN Maps m ON c.map_id = m.map_id
        INNER JOIN Users u ON c.user_id = u.user_id
        WHERE m.unique_id = :unique_id AND c.tenant_id = :tenant_id AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC
    """)
    result = await db.execute(sql, {"unique_id": kwargs["unique_id"], "tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_users(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT user_id, username, full_name, role, active, created_at
        FROM Users
        WHERE tenant_id = :tenant_id
        ORDER BY role, full_name
    """)
    result = await db.execute(sql, {"tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_projects(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    sql = text("""
        SELECT project_id, project_code, client_name, active
        FROM Projects
        WHERE tenant_id = :tenant_id
        ORDER BY project_code
    """)
    result = await db.execute(sql, {"tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_get_recent_notifications(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    limit = _safe_limit(kwargs.get("limit"), default=15)
    sql = text("""
        SELECT TOP (:limit)
            n.id, n.type, n.message, n.is_read, n.created_at,
            u.full_name AS recipient, m.unique_id AS map_unique_id, m.layout_name AS map_layout
        FROM notifications n
        INNER JOIN Users u ON n.user_id = u.user_id
        INNER JOIN Maps m ON n.map_id = m.map_id
        WHERE n.tenant_id = :tenant_id
        ORDER BY n.created_at DESC
    """)
    result = await db.execute(sql, {"limit": limit, "tenant_id": tenant_id})
    return [dict(r) for r in result.mappings().all()]


async def _exec_search_comments(db: AsyncSession, **kwargs) -> list[dict]:
    tenant_id = _tenant_from(kwargs)
    limit = _safe_limit(kwargs.get("limit"), default=20)

    q = text("""
        SELECT TOP(:limit)
            c.comment_id, c.message, c.created_at,
            m.unique_id AS map_unique_id, m.layout_name AS map_layout,
            u.full_name AS commented_by, u2.full_name AS map_analyst
        FROM Map_Comments c
        INNER JOIN Maps m  ON c.map_id   = m.map_id
        INNER JOIN Users u ON c.user_id  = u.user_id
        LEFT  JOIN Users u2 ON m.analyst_id = u2.user_id
        WHERE c.tenant_id = :tenant_id
          AND c.deleted_at IS NULL
          {query_clause}
          {uid_clause}
          {analyst_clause}
        ORDER BY c.created_at DESC
    """.format(
        query_clause  = "AND c.message LIKE :query"  if kwargs.get("query")       else "",
        uid_clause    = "AND m.unique_id = :unique_id" if kwargs.get("unique_id") else "",
        analyst_clause= "AND (u.full_name LIKE :analyst_name OR u2.full_name LIKE :analyst_name)"
                        if kwargs.get("analyst_name") else "",
    ))

    params: dict = {"limit": limit, "tenant_id": tenant_id}
    if kwargs.get("query"):        params["query"]       = f"%{kwargs['query']}%"
    if kwargs.get("unique_id"):    params["unique_id"]   = kwargs["unique_id"]
    if kwargs.get("analyst_name"): params["analyst_name"]= f"%{kwargs['analyst_name']}%"

    result = await db.execute(q, params)
    return [dict(r) for r in result.mappings().all()]


# ---------------------------------------------------------------------------
# Mapping: function name → async handler
# ---------------------------------------------------------------------------
_FUNCTION_HANDLERS = {
    "search_maps": _exec_search_maps,
    "get_map_details": _exec_get_map_details,
    "get_statistics": _exec_get_statistics,
    "get_recent_activity": _exec_get_recent_activity,
    "get_audit_history": _exec_get_audit_history,
    "get_categories": _exec_get_categories,
    "get_analyst_performance": _exec_get_analyst_performance,
    "get_map_comments": _exec_get_map_comments,
    "get_users": _exec_get_users,
    "get_projects": _exec_get_projects,
    "get_recent_notifications": _exec_get_recent_notifications,
    "search_comments": _exec_search_comments,
}


# ---------------------------------------------------------------------------
# JSON serialiser helper (handles datetime, etc.)
# ---------------------------------------------------------------------------
def _serialise(obj):
    """Convert non-serialisable types so json.dumps succeeds."""
    import datetime as _dt

    if isinstance(obj, (_dt.datetime, _dt.date)):
        return obj.isoformat()
    if isinstance(obj, _dt.timedelta):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


# ---------------------------------------------------------------------------
# Main chat function
# ---------------------------------------------------------------------------
async def chat(message: str, db: AsyncSession, tenant_id: int) -> dict:
    try:
        cleaned_message = _clean_message(message)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": cleaned_message}
        ]

        collected_data: list[dict] = []
        max_turns = 8

        async with httpx.AsyncClient(timeout=60.0) as client:
            for turn in range(max_turns):
                payload = {
                    "model": settings.LM_STUDIO_MODEL,
                    "messages": messages,
                    "tools": TOOLS_SCHEMA,
                    "tool_choice": "auto"
                }

                response = await client.post(
                    f"{settings.LM_STUDIO_BASE_URL}/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code != 200:
                    return {
                        "reply": f"Error: LM Studio server returned status code {response.status_code}. Detail: {response.text}",
                        "data": None
                    }

                resp_data = response.json()
                choices = resp_data.get("choices", [])
                if not choices:
                    break

                choice_msg = choices[0].get("message", {})
                tool_calls = choice_msg.get("tool_calls", [])
                messages.append(choice_msg)

                if not tool_calls:
                    break

                for tool_call in tool_calls:
                    call_id = tool_call.get("id")
                    fn_info = tool_call.get("function", {})
                    fn_name = fn_info.get("name")
                    fn_args_str = fn_info.get("arguments", "{}")

                    try:
                        fn_args = json.loads(fn_args_str) if isinstance(fn_args_str, str) else fn_args_str
                    except Exception:
                        fn_args = {}

                    handler = _FUNCTION_HANDLERS.get(fn_name)
                    if not handler:
                        fn_result = {"error": f"Unknown function: {fn_name}"}
                    else:
                        try:
                            fn_result = await handler(db, tenant_id=tenant_id, **fn_args)
                        except Exception as exc:
                            logger.error("Function %s failed: %s", fn_name, exc, exc_info=True)
                            fn_result = {"error": f"Query failed: {str(exc)}"}

                    if isinstance(fn_result, list):
                        collected_data.extend(fn_result)
                    elif isinstance(fn_result, dict) and "error" not in fn_result:
                        collected_data.append(fn_result)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "name": fn_name,
                        "content": json.dumps(fn_result, default=_serialise)
                    })

        final_reply = ""
        for m in reversed(messages):
            if m.get("role") == "assistant" and m.get("content"):
                final_reply = m["content"]
                break

        return {
            "reply": final_reply or "I processed your request but couldn't generate a summary. Please try rephrasing.",
            "data": collected_data if collected_data else None,
        }

    except ValueError as exc:
        return {"reply": str(exc), "data": None}
    except Exception:
        logger.exception("LM Studio chat service error")
        return {
            "reply": "I'm sorry, I encountered an error communicating with the local LM Studio server. Please make sure LM Studio is running at localhost:1234.",
            "data": None,
        }
