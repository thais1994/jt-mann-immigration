const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Sections and fields of the consultation form, in the order they appear in the email.
// Only keys listed here are read from the request (anything else is ignored).
// stage 'quick'   = the short form sent before booking.
// stage 'details' = the optional extra questions, sent after the booking calendar is shown.
const SECTIONS = [
  ['Contact details', 'quick', [
    ['Full legal name', 'name'],
    ['Email', 'email'],
    ['Phone / WhatsApp', 'phone'],
    ['Country now', 'country'],
    ['Preferred language', 'language'],
  ]],
  ['Main goal', 'quick', [
    ['Main goal', 'goal'],
    ['If "Other"', 'goal_other'],
  ]],
  ['Contact preferences', 'details', [
    ['Full legal name', 'name'],
    ['Email', 'email'],
    ['U.S. state', 'us_state'],
    ['Best way to reach', 'reach'],
    ['Best days / times (time zone)', 'times'],
  ]],
  ['Situation', 'details', [
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
  ['In their own words', 'details', [
    ['Story', 'story'],
  ]],
  ['Other', 'both', [
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

  const stage = body.stage === 'details' ? 'details' : 'quick';
  const sections = SECTIONS.filter(function (sec) { return sec[1] === stage || sec[1] === 'both'; });

  const data = {};
  sections.forEach(function (section) {
    section[2].forEach(function (f) {
      data[f[1]] = clean(body[f[1]], f[1] === 'story' ? 5000 : 1000);
    });
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const valid = stage === 'quick'
    ? data.name && data.goal && validEmail && clean(body.consent, 10)
    : data.name && validEmail;
  if (!valid) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const to = process.env.CONTACT_TO_EMAIL || 'info@mannimmigrationlaw.com';
  const from = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

  const title = stage === 'quick' ? 'New consultation request' : 'Consultation details (optional questions)';
  let html = '<h2>' + title + ' — mannimmigrationlaw.com</h2>';
  let text = title + ' — mannimmigrationlaw.com\n';
  sections.forEach(function (section) {
    html += '<h3 style="margin:18px 0 6px">' + esc(section[0]) + '</h3>';
    text += '\n== ' + section[0] + ' ==\n';
    section[2].forEach(function (f) {
      const v = data[f[1]] || '—';
      html += '<p style="margin:2px 0"><strong>' + esc(f[0]) + ':</strong> ' + esc(v).replace(/\n/g, '<br>') + '</p>';
      text += f[0] + ': ' + v + '\n';
    });
  });
  html += stage === 'quick'
    ? '<p style="margin-top:18px;color:#666">Client accepted: information only, not legal advice, no attorney-client relationship. They were then shown the booking calendar. If they fill in the optional questions, you will get a second email with the same email address.</p>'
    : '<p style="margin-top:18px;color:#666">These are the optional extra answers from the same person (match by email address).</p>';

  const subject = (title + ' — ' + data.name + (stage === 'quick' ? ' — ' + data.goal : '')).replace(/[\r\n]+/g, ' ').slice(0, 200);

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
