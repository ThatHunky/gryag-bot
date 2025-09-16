from __future__ import annotations

import base64
import asyncio
import json
from typing import Any, Awaitable, Callable, Iterable
import logging

import google.generativeai as genai
from google.generativeai.types import (
    HarmBlockThreshold,
    HarmCategory,
    SafetySetting,
)


class GeminiError(Exception):
    """Raised when Gemini generation fails."""


class GeminiClient:
    """Async wrapper around Google Gemini models."""

    def __init__(self, api_key: str, model: str, embed_model: str) -> None:
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name=model)
        self._embed_model = embed_model
        self._logger = logging.getLogger(__name__)
        self._search_grounding_supported = True
        self._safety_settings = [
            SafetySetting(category=category, threshold=HarmBlockThreshold.BLOCK_NONE)
            for category in (
                HarmCategory.HARM_CATEGORY_HARASSMENT,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                HarmCategory.HARM_CATEGORY_SEXUAL,
                HarmCategory.HARM_CATEGORY_SELF_HARM,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            )
        ]

    def _filter_tools(self, tools: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
        if not tools:
            return None
        if self._search_grounding_supported:
            return tools
        filtered: list[dict[str, Any]] = []
        for item in tools:
            if isinstance(item, dict) and "google_search_retrieval" in item:
                continue
            filtered.append(item)
        return filtered

    def _maybe_disable_search_grounding(self, error_message: str) -> bool:
        if "Search Grounding is not supported" in error_message and self._search_grounding_supported:
            self._search_grounding_supported = False
            self._logger.warning("Disabling google_search_retrieval: %s", error_message)
            return True
        return False

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
        tools: list[dict[str, Any]] | None = None,
        tool_callbacks: dict[str, Callable[[dict[str, Any]], Awaitable[str]]] | None = None,
    ) -> str:
        contents: list[dict[str, Any]] = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": system_prompt}]})
        if history:
            contents.extend(list(history))
        contents.append({"role": "user", "parts": list(user_parts)})

        filtered_tools = self._filter_tools(tools)
        try:
            response = await self._model.generate_content_async(
                contents,
                tools=filtered_tools,
                safety_settings=self._safety_settings,
            )
        except Exception as exc:  # pragma: no cover - network failure paths
            err_text = str(exc)
            self._logger.exception("Gemini request failed with tools; retrying without tools")
            retried = False
            if self._maybe_disable_search_grounding(err_text):
                filtered_tools = self._filter_tools(tools)
                if filtered_tools:
                    try:
                        response = await self._model.generate_content_async(
                            contents,
                            tools=filtered_tools,
                            safety_settings=self._safety_settings,
                        )
                        retried = True
                    except Exception:
                        self._logger.exception("Gemini retry with filtered tools failed")
            if not retried:
                if filtered_tools:
                    try:
                        response = await self._model.generate_content_async(
                            contents,
                            safety_settings=self._safety_settings,
                        )
                    except Exception as fallback_exc:  # pragma: no cover
                        self._logger.exception("Gemini retry without tools also failed")
                        raise GeminiError("Gemini request failed") from fallback_exc
                else:
                    raise GeminiError("Gemini request failed") from exc

        if tool_callbacks:
            response = await self._handle_tools(
                initial_contents=contents,
                response=response,
                tools=tools,
                callbacks=tool_callbacks,
            )

        text = getattr(response, "text", None)
        return text.strip() if isinstance(text, str) else ""

    async def _handle_tools(
        self,
        initial_contents: list[dict[str, Any]],
        response: Any,
        tools: list[dict[str, Any]] | None,
        callbacks: dict[str, Callable[[dict[str, Any]], Awaitable[str]]],
    ) -> Any:
        contents = list(initial_contents)
        attempt = 0
        current_response = response
        while attempt < 2:  # allow one round-trip
            attempt += 1
            candidates = getattr(current_response, "candidates", None) or []
            function_called = False
            for candidate in candidates:
                content = getattr(candidate, "content", None)
                if not content or not getattr(content, "parts", None):
                    continue
                parts_payload: list[dict[str, Any]] = []
                tool_calls: list[tuple[str, dict[str, Any]]] = []
                for part in content.parts:
                    function_call = getattr(part, "function_call", None)
                    if function_call:
                        name = getattr(function_call, "name", "")
                        raw_args = getattr(function_call, "args", {}) or {}
                        if isinstance(raw_args, dict):
                            args = raw_args
                        else:
                            try:
                                args = dict(raw_args)
                            except TypeError:
                                args = {}
                        tool_calls.append((name, args))
                        parts_payload.append({
                            "function_call": {
                                "name": name,
                                "args": args,
                            }
                        })
                    elif getattr(part, "text", None) is not None:
                        parts_payload.append({"text": part.text})
                if not tool_calls:
                    continue

                contents.append({"role": getattr(content, "role", "model"), "parts": parts_payload})

                for name, args in tool_calls:
                    callback = callbacks.get(name)
                    if not callback:
                        continue
                    function_called = True
                    try:
                        result = await callback(args)
                    except Exception as exc:  # pragma: no cover - runtime handler errors
                        result = json.dumps({"error": str(exc)})
                    if not isinstance(result, str):
                        result = json.dumps(result)
                    contents.append(
                        {
                            "role": "tool",
                            "parts": [
                                {
                                    "function_response": {
                                        "name": name,
                                        "response": result,
                                    }
                                }
                            ],
                        }
                    )

            if not function_called:
                break

            filtered_tools = self._filter_tools(tools)
            try:
                current_response = await self._model.generate_content_async(
                    contents,
                    tools=filtered_tools,
                    safety_settings=self._safety_settings,
                )
            except Exception as exc:  # pragma: no cover
                err_text = str(exc)
                self._logger.exception("Gemini tool-followup failed; retrying without tools")
                if self._maybe_disable_search_grounding(err_text):
                    filtered_tools = self._filter_tools(tools)
                    if filtered_tools:
                        try:
                            current_response = await self._model.generate_content_async(
                                contents,
                                tools=filtered_tools,
                                safety_settings=self._safety_settings,
                            )
                            continue
                        except Exception:
                            self._logger.exception("Gemini follow-up retry with filtered tools failed")
                try:
                    current_response = await self._model.generate_content_async(
                        contents,
                        safety_settings=self._safety_settings,
                    )
                except Exception as fallback_exc:  # pragma: no cover
                    self._logger.exception("Gemini fallback follow-up failed")
                    raise GeminiError("Gemini tool-followup failed") from fallback_exc

        return current_response

    async def embed_text(self, text: str) -> list[float]:
        if not text or not text.strip():
            return []

        def _embed() -> list[float]:
            result = genai.embed_content(model=self._embed_model, content=text)
            embedding = result.get("embedding") if isinstance(result, dict) else None
            return list(embedding) if embedding else []

        return await asyncio.to_thread(_embed)
