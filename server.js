// Static file server + form endpoints that write submissions into Notion.
// Run with: node --env-file=.env server.js   (Node 20.6+ needed for --env-file)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const CONTACT_DB_ID = process.env.NOTION_CONTACT_DB_ID;
const SURVEY_DB_ID = process.env.NOTION_SURVEY_DB_ID;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json'
};

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function missingFields(body, required) {
  return required.filter((f) => !String(body[f] ?? '').trim());
}

async function handleApi(req, res, url) {
  const body = await readJsonBody(req);

  if (url.pathname === '/api/contact') {
    const missing = missingFields(body, ['name', 'phone']);
    if (missing.length) return sendJson(res, 400, { ok: false, error: `Missing: ${missing.join(', ')}` });
    await notionCreatePage(CONTACT_DB_ID, contactProperties(body));
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/survey') {
    const missing = missingFields(body, ['name', 'age', 'gender', 'city', 'mobile']);
    if (missing.length) return sendJson(res, 400, { ok: false, error: `Missing: ${missing.join(', ')}` });
    await notionCreatePage(SURVEY_DB_ID, surveyProperties(body));
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  let filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { ok: false, error: 'Forbidden' });
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
  try {
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`DAD Reports site running at http://localhost:${PORT}`));
}
