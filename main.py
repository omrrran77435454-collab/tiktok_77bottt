‌🇴‌🇲‌🇷‌🇦‌🇳, [02/08/47 01:16 ص]
import os
import time
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- إعدادات السيادة المطلقة ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"
ADMIN_ID = 5559869840

# --- نظام البقاء حياً (Render Support) ---
app = Flask('')
@app.route('/')
def home(): return "Shadow Bot 2026: Active"
def run_web(): app.run(host='0.0.0.0', port=8080)

# --- محرك التحميل (الإصدار الاحترافي الصامت) ---
def download_sync(url, is_audio=False):
    timestamp = int(time.time())
    opts = {
        'format': 'bestaudio/best' if is_audio else 'best',
        'outtmpl': f'shd_{timestamp}.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    if is_audio:
        opts['postprocessors'] = [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}]
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- دوال الواجهة (UI) ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # إذا كان المستخدم هو الآدمن، تظهر لوحة التحكم كاملة فوراً
    if user_id == ADMIN_ID:
        keyboard = [
            [InlineKeyboardButton("📊 إحصائيات النظام", callback_data="admin_stats"), InlineKeyboardButton("📢 إذاعة عامة", callback_data="admin_broadcast")],
            [InlineKeyboardButton("👤 إدارة المستخدمين", callback_data="admin_users")],
            [InlineKeyboardButton("🛠️ إعدادات البوت", callback_data="admin_settings")],
            [InlineKeyboardButton("🌐 فتح الموقع", url="https://render.com")]
        ]
        text = "⚙️ مرحباً سيدي المطور (الآدمن)\n\nلقد تم تفعيل لوحة التحكم المركزية لعام 2026. كل شيء تحت سيطرتك."
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
    else:
        # واجهة المستخدم العادي الجذابة
        keyboard = [[InlineKeyboardButton("👨‍💻 المطور", url=f"tg://user?id={ADMIN_ID}")]]
        text = "🌀 TikPro Downloader 2026\n\nأرسل رابط تيك توك الآن لتحميله بأعلى جودة متوفرة."
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")

async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        btns = [
            [InlineKeyboardButton("🎬 تحميل فيديو HD", callback_data=f"v|{url}")],
            [InlineKeyboardButton("🎵 تحميل صوت MP3", callback_data=f"a|{url}")],
            [InlineKeyboardButton("❌ إلغاء", callback_data="cancel")]
        ]
        await update.message.reply_text("💎 تم رصد الهدف! اختر الصيغة:", reply_markup=InlineKeyboardMarkup(btns))
    else:
        await update.message.reply_text("⚠️ الرابط المرسل غير مدعوم حالياً.")

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel":
        await query.edit_message_text("🗑️ تم إلغاء العملية بنجاح.")
        return
    elif query.data.startswith("admin_"):
        await query.message.reply_text(f"🛠️ ميزة [{query.data}] قيد البرمجة في التحديث القادم سيدي.")
        return

    mode, url = query.data.split('|')
    msg = await query.edit_message_text("⚡ جاري الاختراق والتحميل... يرجى الانتظار.")
    
    try:
        # حل مشكلة الـ Event Loop نهائياً باستخدام run_in_executor
        loop = asyncio.get_running_loop()
        file_path = await loop.run_in_executor(None, download_sync, url, mode == 'a')
        
        with open(file_path, 'rb') as f:

‌🇴‌🇲‌🇷‌🇦‌🇳, [02/08/47 01:16 ص]
if mode == 'v':
                await context.bot.send_video(chat_id=query.message.chat_id, video=f, caption="🔥 تم التحميل بواسطة TikPro 2026")
            else:
                await context.bot.send_audio(chat_id=query.message.chat_id, audio=f, caption="🎶 صوت الفيديو المستخرج")
        
        if os.path.exists(file_path): os.remove(file_path)
        await msg.delete()
    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text=f"❌ فشل النظام: {str(e)}")

# --- النواة المركزية (The Expert Main) ---
if __name__ == '__main__':
    # تشغيل خادم الويب
    Thread(target=run_web, daemon=True).start()
    
    # بناء التطبيق
    bot_app = ApplicationBuilder().token(TOKEN).build()
    
    # ربط المعالجات
    bot_app.add_handler(CommandHandler("start", start))
    bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    bot_app.add_handler(CallbackQueryHandler(button_callback))
    
    print(">>> SHADOW SYSTEM 2026: DEPLOYED SUCCESSFULLY <<<")
    bot_app.run_polling()
