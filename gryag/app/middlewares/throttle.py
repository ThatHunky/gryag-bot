from __future__ import annotations

import time
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import Message

from app.config import Settings
from app.services.context_store import ContextStore
from app.services.triggers import addressed_to_bot

try:  # Optional dependency for Redis support.
    from redis.asyncio import Redis
except ImportError:  # pragma: no cover - redis optional.
    Redis = Any  # type: ignore

SNARKY_REPLY = "Пригальмуй, балакучий. За годину вже досить."


class ThrottleMiddleware(BaseMiddleware):
    """Limit addressed interactions per user per chat."""

    def __init__(
        self,
        store: ContextStore,
        settings: Settings,
        redis_client: Redis | None = None,
    ) -> None:
        self._store = store
        self._settings = settings
        self._redis: Redis | None = redis_client

    async def __call__(self, handler, event: Message, data):  # type: ignore[override]
        if not isinstance(event, Message):
            return await handler(event, data)

        bot_username: str | None = data.get("bot_username")
        if not bot_username or event.from_user is None:
            return await handler(event, data)

        if not addressed_to_bot(event, bot_username):
            return await handler(event, data)

        chat_id = event.chat.id
        user_id = event.from_user.id
        limit = self._settings.per_user_per_hour

        redis_meta: tuple[str, int] | None = None
        if self._redis is not None:
            now = int(time.time())
            key = f"gryag:quota:{chat_id}:{user_id}"
            await self._redis.zremrangebyscore(key, 0, now - 3600)
            redis_count = await self._redis.zcard(key)
            if redis_count >= limit:
                await event.reply(SNARKY_REPLY)
                return None
            redis_meta = (key, now)
        else:
            count = await self._store.count_requests_last_hour(chat_id, user_id)
            if count >= limit:
                await event.reply(SNARKY_REPLY)
                return None

        if redis_meta:
            data["redis_quota"] = redis_meta

        return await handler(event, data)
