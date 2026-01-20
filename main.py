import os
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- إعدادات النظام ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"

# --- كود البقاء حياً ---
app = Flask('')
@app.route('/')
def home(): return "Shadow Bot is Online!"
def run(): app.run(host='0.0.0.0', port=8080)

# --- محرك التحميل ---
def download_tiktok(url, mode='video'):
    ydl_opts = {
        'format': 'best',
        'outtmpl': 'download_file.%(ext)s',
        'quiet': True,
    }
    if mode == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{'key': 'FFmpegExtractAudio','preferredcodec': 'mp3','preferredquality': '192'}]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- المهام ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🌟 مرحباً! أرسل رابط تيك توك للتحميل بسرعة البرق.")

async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        keyboard = [[InlineKeyboardButton("🎬 فيديو", callback_data=f"vid|{url}"), 
                     InlineKeyboardButton("🎵 صوت", callback_data=f"aud|{url}")]]
        await update.message.reply_text("اختر الصيغة:", reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data, url = query.data.split('|')
    await query.edit_message_text("⏳ جاري التحميل... انتظر ثواني.")
    
    try:
        path = download_tiktok(url, 'video' if data == 'vid' else 'audio')
        with open(path, 'rb') as f:
            if data == 'vid': await context.bot.send_video(chat_id=query.message.chat_id, video=f)
            else: await context.bot.send_audio(chat_id=query.message.chat_id, audio=f)
        os.remove(path)
    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text="❌ فشل التحميل، الرابط قد يكون خاصاً.")

if name == 'main':
    Thread(target=run).start()
    app_tg = ApplicationBuilder().token(TOKEN).build()
    app_tg.add_handler(CommandHandler("start", start))
    app_tg.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    app_tg.add_handler(CallbackQueryHandler(handle_button))
    app_tg.run_polling()
