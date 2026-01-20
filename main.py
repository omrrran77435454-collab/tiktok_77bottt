import os
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- بيانات الهوية المطلقة ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"
ADMIN_ID = 5559869840

# --- نظام البقاء (Web Server) ---
app = Flask('')
@app.route('/')
def home(): return "Shadow Kernel 2026: Online"
def run_web(): app.run(host='0.0.0.0', port=8080)

# --- المحرك العكسي للتحميل (Fast-Engine) ---
def get_video(url, is_audio=False):
    opts = {
        'format': 'bestaudio/best' if is_audio else 'best',
        'outtmpl': 'shd_%(id)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    if is_audio:
        opts['postprocessors'] = [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}]
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- واجهة المستخدم الذكية ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = [
        [InlineKeyboardButton("💎 قناة المطور", url=f"tg://user?id={ADMIN_ID}")],
        [InlineKeyboardButton("⚙️ المساعدة", callback_data="help")]
    ]
    text = "🌀 TikPro Ultra 2026\n\nأرسل رابط تيك توك الآن وسيتم اختراقه وتحميله فوراً."
    await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(kb), parse_mode="Markdown")

async def process_link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        kb = [
            [InlineKeyboardButton("🎬 تحميل الفيديو", callback_data=f"v|{url}")],
            [InlineKeyboardButton("🎵 تحميل الصوت", callback_data=f"a|{url}")]
        ]
        await update.message.reply_text("✨ تم تحليل الرابط، اختر الصيغة:", reply_markup=InlineKeyboardMarkup(kb))
    else:
        await update.message.reply_text("⚠️ الرابط غير مدعوم في بروتوكولنا.")

async def action_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "help":
        await query.edit_message_text("أرسل الرابط مباشرة، وسأقوم بالباقي. البوت يدعم التحميل بدون علامة مائية.")
        return

    mode, url = query.data.split('|')
    await query.edit_message_text("⏳ جاري سحب البيانات من الهاوية...")
    
    try:
        path = await asyncio.to_thread(get_video, url, mode == 'a')
        with open(path, 'rb') as f:
            if mode == 'v':
                await context.bot.send_video(chat_id=query.message.chat_id, video=f, caption="✅ تم الاختراق بنجاح.")
            else:
                await context.bot.send_audio(chat_id=query.message.chat_id, audio=f, caption="🎵 ملف الصوت جاهز.")
        os.remove(path)
    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text=f"❌ خطأ: {str(e)}")

# --- الإدارة (Admin Only) ---
async def admin_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id == ADMIN_ID:
        await update.message.reply_text(f"مرحباً سيدي الآدمن. البوت يعمل بكامل طاقته.")

# --- تشغيل النواة المركزية ---
if __name__ == '__main__':
    # تشغيل خادم الويب لتجنب إيقاف Render
    Thread(target=run_web).start()
    
    # بناء التطبيق مع تصحيح كافة الدوال
    application = ApplicationBuilder().token(TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("admin", admin_cmd))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, process_link))
    application.add_handler(CallbackQueryHandler(action_handler))
    
    print("Shadow Bot 2026 is Alive and Unleashed!")
    application.run_polling()
