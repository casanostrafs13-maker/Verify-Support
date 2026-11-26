export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, description: 'method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ ok: false, description: 'env missing' });

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (!raw.length) return res.status(400).json({ ok: false, description: 'empty body' });

  const ct = req.headers['content-type'] || '';
  const base = `https://api.telegram.org/bot${token}/`;
  let url, headers, body;

  if (ct.includes('application/json')) {
    let j = {};
    try { j = JSON.parse(raw.toString() || '{}'); } catch {}
    if (!j.text || !j.chat_id) return res.status(400).json({ ok: false, description: 'missing fields' });
    url = base + 'sendMessage';
    headers = { 'content-type': 'application/json' };
    body = JSON.stringify({
      chat_id: j.chat_id,
      text: j.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } else if (ct.includes('multipart/form-data')) {
    url = base + 'sendPhoto';
    headers = { 'content-type': ct };
    body = raw;
  } else {
    return res.status(415).json({ ok: false, description: 'unsupported content-type' });
  }

  const tg = await fetch(url, { method: 'POST', headers, body });
  const data = await tg.json().catch(() => ({ ok: false, description: 'bad json' }));

  if (!tg.ok || data.ok === false) {
    console.error('telegram', data);
    return res.status(502).json({ ok: false, description: data.description || 'telegram failed' });
  }
  return res.status(200).json({ ok: true });
}
