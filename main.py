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

‌🇴‌🇲‌🇷‌🇦‌🇳, [02/08/47 01:20 ص]
import os
import time
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- الإعدادات (التوكن والآدمن) ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"
ADMIN_ID = 5559869840

# --- نظام الحفاظ على الخدمة (Render) ---
app = Flask('')
@app.route('/')
def home():
    return "Shadow Bot 2026: Working Perfectly"

def run_web():
    app.run(host='0.0.0.0', port=8080)

# --- محرك التحميل (نظام المزامنة) ---
def download_sync(url, is_audio=False):
    filename = f"dl_{int(time.time())}"
    opts = {
        'format': 'bestaudio/best' if is_audio else 'best',
        'outtmpl': f'{filename}.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    if is_audio:
        opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- واجهة المستخدم ولوحة التحكم ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if user_id == ADMIN_ID:
        # لوحة تحكم الآدمن كاملة
        kb = [
            [InlineKeyboardButton("📊 إحصائيات", callback_data="adm_stats"), InlineKeyboardButton("📢 إذاعة", callback_data="adm_bc")],
            [InlineKeyboardButton("👤 إدارة المستخدمين", callback_data="adm_users")],
            [InlineKeyboardButton("🛠️ إعدادات البوت", callback_data="adm_set")],
            [InlineKeyboardButton("🌐 فتح Render", url="https://dashboard.render.com")]
        ]
        text = "⚙️ لوحة التحكم المركزية (سيدي المطور)\n\nأهلاً بك. جميع أدوات السيادة متاحة لك الآن."
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(kb), parse_mode="Markdown")
    else:
        # واجهة المستخدم العادي
        kb = [[InlineKeyboardButton("👨‍💻 المطور", url=f"tg://user?id={ADMIN_ID}")]]
        text = "🌀 TikPro Downloader 2026\n\nأرسل رابط تيك توك الآن لتحميله فوراً."
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(kb), parse_mode="Markdown")

async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        kb = [
            [InlineKeyboardButton("🎬 تحميل فيديو HD", callback_data=f"v|{url}")],
            [InlineKeyboardButton("🎵 تحميل صوت MP3", callback_data=f"a|{url}")],
            [InlineKeyboardButton("❌ إلغاء", callback_data="cancel")]
        ]
        await update.message.reply_text("💎 تم رصد الرابط! اختر الصيغة:", reply_markup=InlineKeyboardMarkup(kb))
    else:
        await update.message.reply_text("⚠️ الرابط غير مدعوم.")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel":
        await query.edit_message_text("🗑️ تم الإلغاء.")
        return
    elif query.data.startswith("adm_"):
        await query.message.reply_text("🛠️ هذه الميزة قيد التطوير سيدي.")
        return

    mode, url = query.data.split('|')
    msg = await query.edit_message_text("⚡ جاري التحميل... انتظر ثواني.")
    
    try:
        # الحل النهائي لمشكلة الـ Event Loop في Render
        loop = asyncio.get_event_loop()
        file_path = await loop.run_in_executor(None, download_sync, url, mode == 'a')
        
        with open(file_path, 'rb') as f:
            if mode == 'v':
                await context.bot.send_video(chat_id=query.message.chat_id, video=f, caption="✅ تم التحميل بواسطة TikPro")

‌🇴‌🇲‌🇷‌🇦‌🇳, [02/08/47 01:20 ص]
else:
                await context.bot.send_audio(chat_id=query.message.chat_id, audio=f, caption="🎵 تم استخراج الصوت")
        
        if os.path.exists(file_path):
            os.remove(file_path)
        await msg.delete()
    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text=f"❌ فشل: {str(e)}")

# --- تشغيل المحرك ---
if __name__ == "__main__":
    # تشغيل Flask
    Thread(target=run_web, daemon=True).start()
    
    # بناء البوت
    bot = ApplicationBuilder().token(TOKEN).build()
    
    bot.add_handler(CommandHandler("start", start))
    bot.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    bot.add_handler(CallbackQueryHandler(button_handler))
    
    print(">>> SHADOW SYSTEM ONLINE <<<")
    bot.run_polling()
