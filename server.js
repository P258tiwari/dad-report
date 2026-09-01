// Static file server + form endpoints that write submissions into Notion.
// Run with: node --env-file=.env server.js   (Node 20.6+ needed for --env-file)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, sep } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const CONTACT_DB_ID = process.env.NOTION_CONTACT_DB_ID;
const SURVEY_DB_ID = process.env.NOTION_SURVEY_DB_ID;
const MAX_BODY_BYTES = 100_000; // form submissions are tiny; this just blocks abuse

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json'
};

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9 +()-]{8,15}$/;

async function notionCreatePage(dataSourceId, properties) {
  if (!NOTION_TOKEN || !dataSourceId) {
    throw new Error('Notion is not configured — set NOTION_TOKEN and the database id env vars (see .env.example).');
  }
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03', // both DBs are Notion's newer multi-data-source type
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Notion API error ${res.status}`);
  return data;
}

const text = (s) => ({ rich_text: [{ text: { content: String(s ?? '').slice(0, 2000) } }] });
const title = (s) => ({ title: [{ text: { content: String(s ?? '').slice(0, 2000) } }] });

export function contactProperties(body) {
  return {
    Name: title(body.name),
    Phone: { phone_number: body.phone || null },
    Email: { email: body.email || null },
    City: text(body.city),
    Submitted: { date: { start: new Date().toISOString() } }
  };
}

export function surveyProperties(body) {
  // ponytail: one "Answers" text column instead of 24 separate Notion columns —
  // upgrade to per-question columns only if you actually need to filter/sort by answer.
  const answers = Object.keys(body)
    .filter((k) => k.startsWith('question_'))
    .sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)))
    .map((k) => `${k}: ${Array.isArray(body[k]) ? body[k].join(', ') : body[k]}`)
    .join('\n');
  return {
    Name: title(body.name),
    Age: { number: body.age ? Number(body.age) : null },
    Gender: body.gender ? { select: { name: body.gender } } : { select: null },
    City: text(body.city),
    Mobile: { phone_number: body.mobile || null },
    Answers: text(answers),
    Submitted: { date: { start: new Date().toISOString() } }
  };
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function readJsonBody(req) {
  // ponytail: drains-then-rejects rather than hard-aborting the socket, so an oversized
  // request still gets a clean 413 instead of a raw connection reset. Bounds memory (stops
  // buffering past the cap) but not time/bandwidth on a very slow/huge upload — add a
  // request timeout at the nginx layer if that ever becomes a real abuse vector.
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { tooLarge = true; return; }
      raw += chunk;
    });
    req.on('end', () => {
      if (tooLarge) return reject(new HttpError(413, 'Request body too large'));
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new HttpError(400, 'Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function missingFields(body, required) {
  return required.filter((f) => !String(body[f] ?? '').trim());
}

// Trust-boundary validation: HTML5 `required`/`pattern`/`type` attributes only guard the
// browser form — anyone can POST directly to these endpoints, so re-check shape here too.
function validationErrors(body, { phoneField, requireEmailFormat }) {
  const errors = [];
  if (body[phoneField] && !PHONE_RE.test(String(body[phoneField]))) errors.push(`${phoneField} looks invalid`);
  if (requireEmailFormat && body.email && !EMAIL_RE.test(String(body.email))) errors.push('email looks invalid');
  if (body.age !== undefined) {
    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) errors.push('age must be a number between 1 and 120');
  }
  if (body.gender !== undefined && !GENDER_OPTIONS.includes(body.gender)) errors.push('gender is not a recognized option');
  return errors;
}

async function handleApi(req, res, url) {
  const body = await readJsonBody(req);

  if (url.pathname === '/api/contact') {
    const missing = missingFields(body, ['name', 'phone']);
    if (missing.length) throw new HttpError(400, `Missing: ${missing.join(', ')}`);
    const invalid = validationErrors(body, { phoneField: 'phone', requireEmailFormat: true });
    if (invalid.length) throw new HttpError(400, invalid.join('; '));
    await notionCreatePage(CONTACT_DB_ID, contactProperties(body));
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/survey') {
    const missing = missingFields(body, ['name', 'age', 'gender', 'city', 'mobile']);
    if (missing.length) throw new HttpError(400, `Missing: ${missing.join(', ')}`);
    const invalid = validationErrors(body, { phoneField: 'mobile', requireEmailFormat: false });
    if (invalid.length) throw new HttpError(400, invalid.join('; '));
    await notionCreatePage(SURVEY_DB_ID, surveyProperties(body));
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, 'Not found');
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Allowlist, not blocklist: only these are the actual public site. Everything else in the
// project root (server.js, package.json, test_server.mjs, *.md, .env, .git, …) is backend/
// project plumbing that must never be reachable over HTTP — new public pages need adding here.
const PUBLIC_FILES = new Set(['index.html', 'privacy.html', 'terms.html', 'app.js', 'styles.css', 'footer.css']);
const PUBLIC_DIRS = ['assets/', 'survey/'];

function isPublic(relPosix) {
  return PUBLIC_FILES.has(relPosix) || PUBLIC_DIRS.some((dir) => relPosix.startsWith(dir));
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = normalize(join(ROOT, rel));
  // exact-match ROOT or ROOT+separator, not a string-prefix check — avoids the classic
  // "/var/www/dad-report-evil" sibling-directory bypass of a naive startsWith(ROOT).
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    return sendJson(res, 403, { ok: false, error: 'Forbidden' });
  }
  const relFromRoot = filePath.slice(ROOT.length + 1).split(sep).join('/');
  if (!isPublic(relFromRoot)) return sendJson(res, 404, { ok: false, error: 'Not found' });
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { ok: false, error: err.message });
    } else {
      // Never forward raw error text (Notion errors can include internal property/schema
      // names) to the client — log full detail server-side, return a generic message.
      console.error(err);
      sendJson(res, 500, { ok: false, error: 'Something went wrong. Please try again.' });
    }
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`DAD Reports site running at http://localhost:${PORT}`));
}
