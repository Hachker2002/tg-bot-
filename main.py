import asyncio
import os
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.errors import FloodWaitError

load_dotenv()

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]

raw_group = os.getenv("TARGET_GROUP", "").strip()
if not raw_group:
  TARGET_GROUP = None
elif raw_group.lstrip("-").isdigit():
  TARGET_GROUP = int(raw_group)
else:
  TARGET_GROUP = raw_group

ELON_MATNI = os.getenv("ELON_MATNI", "Assalomu alaykum!").replace("\\n", "\n")
BOSHQA_MATN = os.getenv(
    "BOSHQA_MATN", "Va alaykum assalom! Boshqa xabar."
).replace("\\n", "\n")
INTERVAL_SONIYA = int(os.getenv("INTERVAL_SONIYA", "120"))

client = TelegramClient("mening_sessiyam", API_ID, API_HASH)


async def dialoglarni_chiqarish():
  async for dialog in client.iter_dialogs():
    oxirgi_xabar = ""
    if dialog.message:
      oxirgi_xabar = (dialog.message.text or "[Media/Fayl]").replace("\n", " ")

    print(
        f"Nomi: {dialog.name} | ID: {dialog.id} | Guruhmi:"
        f" {dialog.is_group} | Kanalmi: {dialog.is_channel} | Oxirgi xabar:"
        f" {oxirgi_xabar}"
    )


async def yuborish_tsikli(chat_id: int | str):
  while True:
    try:
      # Chatdagi eng oxirgi 1 ta xabarni olish
      oxirgi_xabarlar = await client.get_messages(chat_id, limit=1)
      oxirgi_matn = ""
      if oxirgi_xabarlar and oxirgi_xabarlar[0].text:
        oxirgi_matn = oxirgi_xabarlar[0].text.strip().lower()

      # Oxirgi xabar "salom" bo'lsa (katta-kichik harf farqsiz), boshqa matn tanlanadi
      if oxirgi_matn == "a":
        yuboriladigan_matn = BOSHQA_MATN
        print("Oxirgi xabar 'a' ekan -> BOSHQA_MATN yuborilmoqda.")
      else:
        yuboriladigan_matn = ELON_MATNI
        print("Oddiy ELON_MATNI yuborilmoqda.")

      await client.send_message(chat_id, yuboriladigan_matn)
      print("E'lon yuborildi.")
      await asyncio.sleep(INTERVAL_SONIYA)

    except FloodWaitError as e:
      kutish = e.seconds + 5
      print(f"FloodWait: {kutish} soniya kutilmoqda...")
      await asyncio.sleep(kutish)
    except Exception as e:
      print(f"Xatolik: {e}")
      await asyncio.sleep(INTERVAL_SONIYA)


async def main():
  await client.start()
  await dialoglarni_chiqarish()

  if TARGET_GROUP is not None:
    print(
        f"\nXabar yuborish boshlandi -> {TARGET_GROUP} (har {INTERVAL_SONIYA}s)"
    )
    await yuborish_tsikli(TARGET_GROUP)
  else:
    print(
        "\n.env ichida TARGET_GROUP ko'rsatilmagan. Yuqoridagi ro'yxatdan"
        " kerakli guruh ID'sini olib .env ga yozing."
    )


if __name__ == "__main__":
  asyncio.run(main())