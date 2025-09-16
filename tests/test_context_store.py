import asyncio
import os
import sys
import tempfile
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "gryag"))

import aiosqlite
import unittest

from app.services.context_store import ContextStore


class ContextStoreTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tempdir.name) / "test.db"
        self.store = ContextStore(self.db_path)
        await self.store.init()

    async def asyncTearDown(self) -> None:
        await asyncio.sleep(0)
        self.tempdir.cleanup()

    async def test_add_and_recent(self):
        await self.store.add_turn(
            chat_id=1,
            thread_id=None,
            user_id=42,
            role="user",
            text="Перше повідомлення",
            media=None,
            metadata={"user_id": 42},
        )
        await self.store.add_turn(
            chat_id=1,
            thread_id=None,
            user_id=None,
            role="model",
            text="Відповідь",
            media=None,
            metadata={"user_id": None},
        )

        history = await self.store.recent(chat_id=1, thread_id=None, max_turns=5)
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[1]["parts"][1]["text"], "Відповідь")

    async def test_should_send_notice(self):
        first = await self.store.should_send_notice(1, 42, "quota", ttl_seconds=3600)
        second = await self.store.should_send_notice(1, 42, "quota", ttl_seconds=3600)
        self.assertTrue(first)
        self.assertFalse(second)

    async def test_prune_old_removes_notices(self):
        await self.store.log_request(1, 1)
        await self.store.should_send_notice(1, 1, "quota", ttl_seconds=None)
        await self.store.add_turn(
            chat_id=1,
            thread_id=None,
            user_id=1,
            role="user",
            text="старе",
            media=None,
            metadata={},
        )
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE messages SET ts = 0")
            await db.execute("UPDATE quotas SET ts = 0")
            await db.execute("UPDATE notices SET ts = 0")
            await db.commit()
        await self.store.prune_old(retention_days=1)
        history = await self.store.recent(chat_id=1, thread_id=None, max_turns=5)
        self.assertEqual(history, [])
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT COUNT(*) FROM notices") as cursor:
                count = (await cursor.fetchone())[0]
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
