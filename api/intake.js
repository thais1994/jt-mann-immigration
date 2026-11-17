const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Sections and fields of the consultation form, in the order they appear in the email.
// Only keys listed here are read from the request (anything else is ignored).
const SECTIONS = [
  ['Contact details', [
    ['Full legal name', 'name'],
    ['Email', 'email'],
    ['Phone / WhatsApp', 'phone'],
    ['Country now', 'country'],
    ['U.S. state', 'us_state'],
    ['Preferred language', 'language'],
    ['Best way to reach', 'reach'],
    ['Best days / times (time zone)', 'times'],
  ]],
  ['Main goal', [
    ['Main goal', 'goal'],
    ['If "Other"', 'goal_other'],
  ]],
  ['Situation', [
    ['Current immigration status', 'status'],
    ['Status / permission ends', 'status_end'],
    ['End date unknown', 'status_end_unknown'],
    ['Connection to goal', 'connections'],
    ['About the connection', 'connection_detail'],
    ['Prior filings / cases', 'prior'],
    ['What was filed / happened', 'prior_detail'],
    ['Prior problems (denial, overstay, removal...)', 'problem'],
    ['Important upcoming date?', 'has_date'],
    ['Date', 'date_when'],
    ['What it is for', 'date_for'],
  ]],
  ['In their own words', [
    ['Story', 'story'],
  ]],
  ['Other', [
    ['Website language', 'site_lang'],
  ]],
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  // Honeypot: bots fill this hidden field. Pretend success and drop it.
  if (body._gotcha) return res.status(200).json({ ok: true });

  const data = {};
  SECTIONS.forEach(function (section) {
    section[1].forEach(function (f) {
      data[f[1]] = clean(body[f[1]], f[1] === 'story' ? 5000 : 1000);
    });
  });

  if (!data.name || !data.goal || !data.status || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !clean(body.consent, 10)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const to = process.env.CONTACT_TO_EMAIL || 'info@mannimmigrationlaw.com';
  const from = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

  let html = '<h2>New consultation form — mannimmigrationlaw.com</h2>';
  let text = 'New consultation form — mannimmigrationlaw.com\n';
  SECTIONS.forEach(function (section) {
    html += '<h3 style="margin:18px 0 6px">' + esc(section[0]) + '</h3>';
    text += '\n== ' + section[0] + ' ==\n';
    section[1].forEach(function (f) {
      const v = data[f[1]] || '—';
      html += '<p style="margin:2px 0"><strong>' + esc(f[0]) + ':</strong> ' + esc(v).replace(/\n/g, '<br>') + '</p>';
      text += f[0] + ': ' + v + '\n';
    });
  });
  html += '<p style="margin-top:18px;color:#666">Client accepted: information only, not legal advice, no attorney-client relationship. They were then shown the booking calendar.</p>';

  const subject = ('New consultation form — ' + data.name + ' — ' + data.goal).replace(/[\r\n]+/g, ' ').slice(0, 200);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mann Immigration Law Website <' + from + '>',
        to: [to],
        reply_to: data.email,
        subject,
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
    console.error('Intake form error', err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
