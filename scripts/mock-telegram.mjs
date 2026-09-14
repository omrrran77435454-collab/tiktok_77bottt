/**
 * خادم وهمي لـ Telegram Bot API — للاختبارات المحلية و E2E فقط.
 *
 * لماذا؟ اختبار مسار الربط والتحقق يحتاج استجابة من Telegram، ولا يجوز
 * استخدام توكن حقيقي أو قناة حقيقية في الاختبارات. هذا الخادم يحاكي
 * getChatMember و sendMessage فقط.
 *
 * التشغيل:  node scripts/mock-telegram.mjs [port]
 * ثم اضبط في ‎.dev.vars‎:  TELEGRAM_API_BASE=http://127.0.0.1:8788
 */
import { createServer } from 'node:http';

const port = Number(process.argv[2] ?? 8788);

/** حالة العضوية لكل مستخدم: telegramUserId -> status */
const members = new Map();
/** الرسائل المُرسلة (للتفتيش في الاختبارات). */
const sentMessages = [];

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const body = await readBody(request);

  // نقاط تحكّم خاصة بالاختبار (ليست جزءاً من Telegram API).
  if (url.pathname === '/__control/member' && request.method === 'POST') {
    members.set(String(body.userId), body.status ?? 'member');
    return json(response, 200, { ok: true });
  }
  if (url.pathname === '/__control/messages') {
    return json(response, 200, { ok: true, result: sentMessages });
  }
  if (url.pathname === '/__control/reset' && request.method === 'POST') {
    members.clear();
    sentMessages.length = 0;
    return json(response, 200, { ok: true });
  }

  const match = /^\/bot[^/]+\/(\w+)$/.exec(url.pathname);
  if (!match) return json(response, 404, { ok: false, description: 'Not Found' });

  const method = match[1];

  if (method === 'getChatMember') {
    const status = members.get(String(body.user_id)) ?? 'left';
    return json(response, 200, {
      ok: true,
      result: { status, user: { id: body.user_id, is_bot: false } },
    });
  }

  if (method === 'sendMessage') {
    sentMessages.push({ chatId: body.chat_id, text: body.text });
    return json(response, 200, { ok: true, result: { message_id: sentMessages.length } });
  }

  return json(response, 200, { ok: false, description: `Unsupported method: ${method}` });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[mock-telegram] listening on http://127.0.0.1:${port}`);
});
