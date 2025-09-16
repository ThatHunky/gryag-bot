import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.append(str(Path(__file__).resolve().parents[1] / "gryag"))

from aiogram.types import MessageEntity, User

from app.services.triggers import addressed_to_bot


def _message(*, text=None, caption=None, entities=None, caption_entities=None, reply_to=None):
    return SimpleNamespace(
        text=text,
        caption=caption,
        entities=entities,
        caption_entities=caption_entities,
        reply_to_message=reply_to,
    )


def test_addressed_by_mention():
    entities = [MessageEntity(type="mention", offset=0, length=6)]
    msg = _message(text="@gryag привіт", entities=entities)
    assert addressed_to_bot(msg, "gryag")


def test_addressed_by_keyword_case_insensitive():
    msg = _message(text="хей, ГРЯГ, ти тут?")
    assert addressed_to_bot(msg, "gryag")


def test_addressed_by_reply_to_bot():
    bot_user = User(id=1, is_bot=True, first_name="gryag", username="gryag")
    reply = _message()
    reply.from_user = bot_user  # type: ignore[attr-defined]
    msg = _message(text="йо", reply_to=reply)
    assert addressed_to_bot(msg, "gryag")


def test_not_addressed_returns_false():
    msg = _message(text="привіт всім")
    assert not addressed_to_bot(msg, "gryag")
