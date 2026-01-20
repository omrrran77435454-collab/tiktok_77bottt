import os
import asyncio
import yt_dlp
from flask import Flask
from threading import Thread
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

# --- إعدادات النظام ---
TOKEN = "8090822378:AAH6CIhLzNbHU8T6_F12JP6zl5S7Rzdd388"
ADMIN_ID = 5559869840

# --- كود البقاء حياً على Render ---
app = Flask('')
@app.route('/')
def home(): return "Shadow Bot is Online 2026 🚀"
def run(): app.run(host='0.0.0.0', port=8080)

# --- محرك التحميل الاحترافي ---
def download_tiktok(url, mode='video'):
    file_name = f"shadow_{int(asyncio.get_event_loop().time())}"
    ydl_opts = {
        'format': 'bestvideo+bestaudio/best' if mode == 'video' else 'bestaudio/best',
        'outtmpl': f'{file_name}.%(ext)s',
        'quiet': True,
        'no_warnings': True,
    }
    if mode == 'audio':
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)

# --- واجهة المستخدم (UI) ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome_text = (
        f"🌟 مرحباً بك يا {user.first_name} في بوت الاستحواذ!\n"
        "━━━━━━━━━━━━━━\n"
        "🌀 أنا أسرع بوت لتحميل فيديوهات تيك توك 2026\n"
        "💎 تصميم سلس • سرعة فائقة • جودة أصلية\n"
        "━━━━━━━━━━━━━━\n"
        "👇 أرسل الآن رابط الفيديو الذي تريده:"
    )
    await update.message.reply_text(welcome_text)

async def handle_url(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = update.message.text
    if "tiktok.com" in url:
        msg = await update.message.reply_text("🔍 جاري فحص الرابط في الهاوية الرقمية...")
        
        keyboard = [
            [InlineKeyboardButton("🎬 تحميل الفيديو (HD)", callback_data=f"vid|{url}")],
            [InlineKeyboardButton("🎵 استخراج الصوت (MP3)", callback_data=f"aud|{url}")],
            [InlineKeyboardButton("❌ إلغاء العملية", callback_data="cancel")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await msg.edit_text("✨ تم العثور على الفيديو! اختر ماذا تريد:", reply_markup=reply_markup)
    else:
        await update.message.reply_text("⚠️ عذراً، هذا الرابط ليس من تيك توك!")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "cancel":
        await query.edit_message_text("🗑️ تم إلغاء العملية بنجاح.")
        return

    data, url = query.data.split('|')
    mode = 'video' if data == 'vid' else 'audio'
    
    await query.edit_message_text(f"⏳ جاري معالجة الـ {mode}.. انتظر قليلاً!")

    try:
        file_path = download_tiktok(url, mode)
        
        with open(file_path, 'rb') as file:
            if mode == 'video':
                await context.bot.send_video(chat_id=query.message.chat_id, video=file, caption="✅ تم التحميل بواسطة @ShadowBot")
            else:
                await context.bot.send_audio(chat_id=query.message.chat_id, audio=file, caption="🎵 تم استخراج الصوت بنجاح")
        
        # تنظيف الملفات بعد الإرسال
        if os.path.exists(file_path): os.remove(file_path)

    except Exception as e:
        await context.bot.send_message(chat_id=query.message.chat_id, text=f"❌ خطأ تقني: {str(e)}")

# --- لوحة التحكم (Admin Panel) ---
async def admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("🚫 تطاولت على صلاحيات الإله - كيو! هذا الأمر للمشرف فقط.")
        return
    
    keyboard = [
        [InlineKeyboardButton("📊 إحصائيات البوت", callback_data="stats")],
        [InlineKeyboardButton("📢 إذاعة للمستخدمين", callback_data="broadcast")]
    ]
    await update.message.reply_text("⚙️ لوحة تحكم السيادة الظلية:", reply_markup=InlineKeyboardMarkup(keyboard))

# --- التشغيل النهائي ---
if __name__ == '__main__':
    # تشغيل Flask في خيط منفصل لـ Render
    Thread(target=run).start()

    application = Application.builder().token(TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("admin", admin_panel))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_url))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print("Shadow Hacker Bot is Running...")
    application.run_polling()

