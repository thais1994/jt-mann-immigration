const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  const name = clean(body.name, 200);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 60);
  const message = clean(body.message, 5000);

  // Honeypot: bots fill this hidden field. Pretend success and drop it.
  if (body._gotcha) return res.status(200).json({ ok: true });

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const to = process.env.CONTACT_TO_EMAIL || 'jt@mannimmigrationlaw.com';
  const from = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

  const html =
    '<h2>New inquiry from mannimmigrationlaw.com</h2>' +
    '<p><strong>Name:</strong> ' + esc(name) + '</p>' +
    '<p><strong>Email:</strong> ' + esc(email) + '</p>' +
    '<p><strong>Phone:</strong> ' + esc(phone || '—') + '</p>' +
    '<p><strong>Message:</strong></p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>';
  const text =
    'New inquiry from mannimmigrationlaw.com\n\nName: ' + name + '\nEmail: ' + email +
    '\nPhone: ' + (phone || '—') + '\n\nMessage:\n' + message;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mann Immigration Law Website <' + from + '>',
        to: [to],
        reply_to: email,
        subject: 'New inquiry from mannimmigrationlaw.com — ' + name,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error', err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
