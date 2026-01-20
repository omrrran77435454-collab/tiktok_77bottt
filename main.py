import os
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- إعدادات النظام ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"

# --- نظام البقاء حياً (Flask) ---
app = Flask('')
@app.route('/')
def home(): return "Shadow Bot is Active! 🚀"
def run(): app.run(host='0.0.0.0', port=8080)

# --- محرك التحميل الذكي ---
def download_tiktok(url, mode='video'):
    # إعدادات التحميل السريع
    ydl_opts = {
        'format': 'best',
        'outtmpl': 'shadow_download.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    if mode == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- معالجة الأوامر ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_text = (
        "🌟 أهلاً بك في TikPro Downloader 2026\n"
        "━━━━━━━━━━━━━━\n"
        "أرسل رابط فيديو تيك توك للبدء فوراً!"
    )
    await update.message.reply_text(welcome_text)

async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        keyboard = [[
            InlineKeyboardButton("🎬 فيديو (HD)", callback_data=f"vid|{url}"),
            InlineKeyboardButton("🎵 صوت (MP3)", callback_data=f"aud|{url}")
        ]]
        await update.message.reply_text("اختر ماذا تريد استخراجه:", reply_markup=InlineKeyboardMarkup(keyboard))
    else:
        await update.message.reply_text("⚠️ يرجى إرسال رابط تيك توك صحيح.")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data, url = query.data.split('|')
    
    status_msg = await query.edit_message_text("⏳ جاري سحب البيانات من الهاوية... انتظر ثواني.")
    
    try:
        path = download_tiktok(url, 'video' if data == 'vid' else 'audio')
        with open(path, 'rb') as f:
            if data == 'vid':
                await context.bot.send_video(chat_id=query.message.chat_id, video=f, caption="✅ تم التحميل بنجاح!")
            else:
                await context.bot.send_audio(chat_id=query.message.chat_id, audio=f, caption="🎵 تم استخراج الصوت!")
        
        # تنظيف الذاكرة
        if os.path.exists(path): os.remove(path)
        await status_msg.delete()

    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text=f"❌ فشل التحميل: {str(e)}")

# --- تشغيل الكيان الرقمي ---
if name == 'main':
    # تشغيل خادم الويب في الخلفية
    Thread(target=run).start()
    
    # بناء تطبيق التلجرام
    application = ApplicationBuilder().token(TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print("Shadow Hacker Bot is Running Successfully...")
    application.run_polling()
