import asyncio
import os
from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]

# TARGET_GROUP: raqamli ID bo'lsa int ga o'tkazamiz, @username bo'lsa satr holda qoladi, bo'sh bo'lsa None
raw_group = os.getenv("TARGET_GROUP", "").strip()
if not raw_group:
  TARGET_GROUP = None
elif raw_group.lstrip("-").isdigit():
  TARGET_GROUP = int(raw_group)
else:
  TARGET_GROUP = raw_group

# \n ketma-ketligini haqiqiy yangi qatorga aylantirish
raw_message = os.getenv("ELON_MATNI", "Assalomu alaykum!")
ELON_MATNI = raw_message.replace("\\n", "\n")

INTERVAL_SONIYA = int(os.getenv("INTERVAL_SONIYA", "120"))

client = TelegramClient("mening_sessiyam", API_ID, API_HASH)


async def dialoglarni_chiqarish():
  async for dialog in client.iter_dialogs():
    print(
        f"Nomi: {dialog.name} | ID: {dialog.id} | Guruhmi:"
        f" {dialog.is_group} | Kanalmi: {dialog.is_channel}"
    )


async def yuborish_tsikli(chat_id: int | str):
  while True:
    try:
      await client.send_message(chat_id, ELON_MATNI)
      print("E'lon yuborildi.")
    except Exception as e:
      print(f"Xatolik: {e}")
    await asyncio.sleep(INTERVAL_SONIYA)


async def main():
  await client.start()
  await dialoglarni_chiqarish()

  if TARGET_GROUP is not None:
    print(f"\nXabar yuborish boshlandi -> {TARGET_GROUP} (har {INTERVAL_SONIYA}s)")
    await yuborish_tsikli(TARGET_GROUP)
  else:
    print(
        "\n.env ichida TARGET_GROUP ko'rsatilmagan. Yuqoridagi ro'yxatdan"
        " kerakli guruh ID'sini olib .env ga yozing."
    )


if __name__ == "__main__":
  asyncio.run(main())