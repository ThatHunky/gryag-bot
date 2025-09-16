from __future__ import annotations

from typing import Any

from aiogram import Bot, Router
from aiogram.types import Message

from app.config import Settings
from app.persona import SYSTEM_PERSONA
from app.services.context_store import ContextStore, format_metadata
from app.services.gemini import GeminiClient, GeminiError
from app.services.media import collect_media_parts
from app.services.triggers import addressed_to_bot

try:  # Optional dependency for redis throttling metadata.
    from redis.asyncio import Redis
except ImportError:  # pragma: no cover - redis optional.
    Redis = Any  # type: ignore

router = Router()

ERROR_FALLBACK = "Ґеміні знову туплять. Спробуй пізніше."
EMPTY_REPLY = "Скажи конкретніше, бо зараз з цього нічого не зробити."


def _normalize_username(username: str | None) -> str | None:
    if not username:
        return None
    return f"@{username.lstrip('@')}"


def _extract_text(message: Message | None) -> str | None:
    if message is None:
        return None
    text = message.text or message.caption
    if not text:
        return None
    cleaned = " ".join(text.strip().split())
    return cleaned if cleaned else None


def _build_user_metadata(message: Message, chat_id: int, thread_id: int | None) -> dict[str, Any]:
    from_user = message.from_user
    meta: dict[str, Any] = {
        "chat_id": chat_id,
        "thread_id": thread_id,
        "message_id": message.message_id,
        "user_id": from_user.id if from_user else None,
        "name": from_user.full_name if from_user else None,
        "username": _normalize_username(from_user.username if from_user else None),
    }
    reply = message.reply_to_message
    if reply:
        meta["reply_to_message_id"] = reply.message_id
        if reply.from_user:
            meta["reply_to_user_id"] = reply.from_user.id
            meta["reply_to_name"] = reply.from_user.full_name
            meta["reply_to_username"] = _normalize_username(reply.from_user.username)
        excerpt = _extract_text(reply)
        if excerpt:
            meta["reply_excerpt"] = excerpt[:200]
    return {key: value for key, value in meta.items() if value not in (None, "")}


def _build_model_metadata(
    response: Message,
    chat_id: int,
    thread_id: int | None,
    bot_username: str,
    original: Message,
    original_text: str,
) -> dict[str, Any]:
    origin_user = original.from_user
    meta: dict[str, Any] = {
        "chat_id": chat_id,
        "thread_id": thread_id,
        "message_id": response.message_id,
        "user_id": None,
        "name": "gryag",
        "username": _normalize_username(bot_username),
        "reply_to_message_id": original.message_id,
    }
    if origin_user:
        meta["reply_to_user_id"] = origin_user.id
        meta["reply_to_name"] = origin_user.full_name
        meta["reply_to_username"] = _normalize_username(origin_user.username)
    excerpt = original_text.strip()
    if excerpt:
        meta["reply_excerpt"] = " ".join(excerpt.split())[:200]
    return {key: value for key, value in meta.items() if value not in (None, "")}


@router.message()
async def handle_group_message(
    message: Message,
    bot: Bot,
    settings: Settings,
    store: ContextStore,
    gemini_client: GeminiClient,
    bot_username: str,
    redis_client: Redis | None = None,
    redis_quota: tuple[str, int] | None = None,
):
    if message.from_user is None:
        return

    if not addressed_to_bot(message, bot_username):
        return

    chat_id = message.chat.id
    thread_id = message.message_thread_id
    user_id = message.from_user.id

    await store.log_request(chat_id, user_id)

    if redis_client is not None and redis_quota is not None:
        key, ts = redis_quota
        member = f"{ts}:{message.message_id}"
        try:
            await redis_client.zadd(key, {member: ts})
            await redis_client.expire(key, 3600)
        except Exception:
            pass

    history = await store.recent(
        chat_id=chat_id,
        thread_id=thread_id,
        max_turns=settings.max_turns,
    )

    media_raw = await collect_media_parts(bot, message)
    media_parts = gemini_client.build_media_parts(media_raw)

    text_content = message.text or message.caption or ""
    user_meta = _build_user_metadata(message, chat_id, thread_id)
    user_parts: list[dict[str, Any]] = [{"text": format_metadata(user_meta)}]
    if text_content:
        user_parts.append({"text": text_content})
    if media_parts:
        user_parts.extend(media_parts)
    if not user_parts:
        user_parts.append({"text": ""})

    await store.add_turn(
        chat_id=chat_id,
        thread_id=thread_id,
        user_id=user_id,
        role="user",
        text=text_content,
        media=media_parts,
        metadata=user_meta,
    )

    try:
        reply_text = await gemini_client.generate(
            system_prompt=SYSTEM_PERSONA,
            history=history,
            user_parts=user_parts,
        )
    except GeminiError:
        reply_text = ERROR_FALLBACK

    if not reply_text:
        reply_text = EMPTY_REPLY

    reply_trimmed = reply_text[:4096]
    response_message = await message.reply(reply_trimmed)

    model_meta = _build_model_metadata(
        response=response_message,
        chat_id=chat_id,
        thread_id=thread_id,
        bot_username=bot_username,
        original=message,
        original_text=text_content,
    )

    await store.add_turn(
        chat_id=chat_id,
        thread_id=thread_id,
        user_id=None,
        role="model",
        text=reply_trimmed,
        media=None,
        metadata=model_meta,
    )
