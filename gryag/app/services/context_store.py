from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any, Iterable

import aiosqlite

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


META_KEY_ORDER = [
    "chat_id",
    "thread_id",
    "message_id",
    "user_id",
    "name",
    "username",
    "reply_to_message_id",
    "reply_to_user_id",
    "reply_to_username",
    "reply_to_name",
    "reply_excerpt",
]


def format_metadata(meta: dict[str, Any]) -> str:
    """Format metadata dict into a compact text snippet for Gemini."""

    pieces: list[str] = []
    for key in META_KEY_ORDER:
        if key not in meta:
            continue
        value = meta[key]
        if value is None or value == "":
            continue
        if isinstance(value, str):
            sanitized = value.replace("\n", " ").replace('"', '\\"')
            pieces.append(f'{key}="{sanitized}"')
        else:
            pieces.append(f"{key}={value}")
    return "[meta] " + " ".join(pieces) if pieces else "[meta]"


class ContextStore:
    """SQLite-backed storage for chat history and per-user quotas."""

    def __init__(self, db_path: Path | str) -> None:
        self._db_path = Path(db_path)
        self._init_lock = asyncio.Lock()
        self._initialized = False

    async def init(self) -> None:
        async with self._init_lock:
            if self._initialized:
                return
            self._db_path.parent.mkdir(parents=True, exist_ok=True)
            async with aiosqlite.connect(self._db_path) as db:
                with SCHEMA_PATH.open("r", encoding="utf-8") as fh:
                    await db.executescript(fh.read())
                await db.commit()
            self._initialized = True

    async def add_turn(
        self,
        chat_id: int,
        thread_id: int | None,
        user_id: int | None,
        role: str,
        text: str | None,
        media: Iterable[dict[str, Any]] | None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.init()
        ts = int(time.time())
        payload: dict[str, Any] = {
            "media": list(media) if media else [],
            "meta": metadata or {},
        }
        media_json = json.dumps(payload)
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute(
                """
                INSERT INTO messages (chat_id, thread_id, user_id, role, text, media, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (chat_id, thread_id, user_id, role, text, media_json, ts),
            )
            await db.commit()

    async def recent(
        self,
        chat_id: int,
        thread_id: int | None,
        max_turns: int,
    ) -> list[dict[str, Any]]:
        await self.init()
        if thread_id is None:
            query = (
                "SELECT role, text, media FROM messages "
                "WHERE chat_id = ? AND thread_id IS NULL "
                "ORDER BY id DESC LIMIT ?"
            )
            params: tuple[Any, ...] = (chat_id, max_turns)
        else:
            query = (
                "SELECT role, text, media FROM messages "
                "WHERE chat_id = ? AND thread_id = ? "
                "ORDER BY id DESC LIMIT ?"
            )
            params = (chat_id, thread_id, max_turns)

        async with aiosqlite.connect(self._db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()

        history: list[dict[str, Any]] = []
        for row in reversed(rows):
            parts: list[dict[str, Any]] = []
            text = row["text"]
            media_json = row["media"]
            stored_media: list[dict[str, Any]] = []
            stored_meta: dict[str, Any] = {}
            if media_json:
                try:
                    payload = json.loads(media_json)
                    if isinstance(payload, dict):
                        stored_media = [
                            part for part in payload.get("media", []) if isinstance(part, dict)
                        ]
                        meta = payload.get("meta", {})
                        if isinstance(meta, dict):
                            stored_meta = meta
                    elif isinstance(payload, list):
                        stored_media = [part for part in payload if isinstance(part, dict)]
                except json.JSONDecodeError:
                    pass

            if stored_meta:
                parts.append({"text": format_metadata(stored_meta)})
            if text:
                parts.append({"text": text})
            if stored_media:
                parts.extend(stored_media)
            history.append({"role": row["role"], "parts": parts or [{"text": ""}]})
        return history

    async def count_requests_last_hour(self, chat_id: int, user_id: int) -> int:
        await self.init()
        cutoff = int(time.time()) - 3600
        async with aiosqlite.connect(self._db_path) as db:
            async with db.execute(
                "SELECT COUNT(1) FROM quotas WHERE chat_id = ? AND user_id = ? AND ts >= ?",
                (chat_id, user_id, cutoff),
            ) as cursor:
                row = await cursor.fetchone()
                return int(row[0]) if row and row[0] is not None else 0

    async def log_request(self, chat_id: int, user_id: int) -> None:
        await self.init()
        ts = int(time.time())
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute(
                "INSERT INTO quotas (chat_id, user_id, ts) VALUES (?, ?, ?)",
                (chat_id, user_id, ts),
            )
            await db.commit()
