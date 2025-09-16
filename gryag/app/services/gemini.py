from __future__ import annotations

import base64
from typing import Any, Iterable

import google.generativeai as genai


class GeminiError(Exception):
    """Raised when Gemini generation fails."""


class GeminiClient:
    """Async wrapper around Google Gemini models."""

    def __init__(self, api_key: str, model: str) -> None:
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name=model)

    @staticmethod
    def build_media_parts(media_items: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
        parts: list[dict[str, Any]] = []
        for item in media_items:
            blob = item.get("bytes")
            mime = item.get("mime")
            if not blob or not mime:
                continue
            data = base64.b64encode(blob).decode("ascii")
            parts.append({"inline_data": {"mime_type": mime, "data": data}})
        return parts

    async def generate(
        self,
        system_prompt: str,
        history: Iterable[dict[str, Any]] | None,
        user_parts: Iterable[dict[str, Any]],
    ) -> str:
        contents: list[dict[str, Any]] = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": system_prompt}]})
        if history:
            contents.extend(list(history))
        contents.append({"role": "user", "parts": list(user_parts)})

        try:
            response = await self._model.generate_content_async(contents)
        except Exception as exc:  # pragma: no cover - network failure paths
            raise GeminiError("Gemini request failed") from exc

        text = getattr(response, "text", None)
        return text.strip() if isinstance(text, str) else ""
