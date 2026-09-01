// Minimal self-check: run with `node test_server.mjs`.
// Stubs global.fetch so it exercises real routing/validation without calling Notion.
import assert from 'node:assert';

// env vars must be set before server.js is loaded (it reads them at module init)
process.env.NOTION_TOKEN = 'test-token';
process.env.NOTION_CONTACT_DB_ID = 'contact-db';
process.env.NOTION_SURVEY_DB_ID = 'survey-db';

let capturedBody = null;
let notionShouldFail = false;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('api.notion.com')) {
    capturedBody = JSON.parse(opts.body);
    if (notionShouldFail) return { ok: false, status: 400, json: async () => ({ message: 'body.properties.Gender.select.name should be defined' }) };
    return { ok: true, json: async () => ({ id: 'fake-page-id' }) };
  }
  return realFetch(url, opts);
};

const { server, contactProperties, surveyProperties } = await import('./server.js');

server.listen(0);
const base = `http://localhost:${server.address().port}`;

async function post(path, body, raw) {
  const res = await fetch(base + path, { method: 'POST', body: raw !== undefined ? raw : JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
}
async function get(path) {
  const res = await fetch(base + path);
  return { status: res.status, text: await res.text() };
}

// contact: missing required field -> 400
{
  const { status, json } = await post('/api/contact', { phone: '9990001111' });
  assert.equal(status, 400);
  assert.equal(json.ok, false);
}

// contact: valid submission -> 200, correct Notion payload
{
  const { status, json } = await post('/api/contact', { name: 'Ada', phone: '9990001111', email: 'a@b.com', city: 'Pune' });
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(capturedBody.parent.data_source_id, 'contact-db');
  assert.equal(capturedBody.properties.Name.title[0].text.content, 'Ada');
}

// contact: malformed email -> 400, never reaches Notion
{
  capturedBody = null;
  const { status, json } = await post('/api/contact', { name: 'Ada', phone: '9990001111', email: 'not-an-email' });
  assert.equal(status, 400);
  assert.equal(json.ok, false);
  assert.equal(capturedBody, null);
}

// contact: junk phone -> 400
{
  const { status } = await post('/api/contact', { name: 'Ada', phone: 'call me maybe' });
  assert.equal(status, 400);
}

// survey: valid submission -> 200, answers folded into one text field
{
  const { status, json } = await post('/api/survey', {
    name: 'Bo', age: 30, gender: 'Male', city: 'Delhi', mobile: '9998887777',
    question_1: 'Yes', question_12: ['A', 'B']
  });
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(capturedBody.parent.data_source_id, 'survey-db');
  assert.match(capturedBody.properties.Answers.rich_text[0].text.content, /question_1: Yes/);
  assert.match(capturedBody.properties.Answers.rich_text[0].text.content, /question_12: A, B/);
}

// survey: out-of-range age -> 400
{
  const { status } = await post('/api/survey', { name: 'Bo', age: 999, gender: 'Male', city: 'Delhi', mobile: '9998887777' });
  assert.equal(status, 400);
}

// survey: gender not in the allowed set -> 400
{
  const { status } = await post('/api/survey', { name: 'Bo', age: 30, gender: 'Robot', city: 'Delhi', mobile: '9998887777' });
  assert.equal(status, 400);
}

// malformed JSON body -> 400, not 500
{
  const { status, json } = await post('/api/contact', undefined, '{not json');
  assert.equal(status, 400);
  assert.equal(json.ok, false);
}

// oversized body -> 413
{
  const { status } = await post('/api/contact', undefined, JSON.stringify({ name: 'x'.repeat(200_000) }));
  assert.equal(status, 413);
}

// Notion API failure is logged, but client only sees a generic message (no internal details leaked)
{
  notionShouldFail = true;
  const { status, json } = await post('/api/contact', { name: 'Ada', phone: '9990001111' });
  notionShouldFail = false;
  assert.equal(status, 500);
  assert.equal(json.ok, false);
  assert.doesNotMatch(json.error, /Gender|properties/);
}

// .env must never be servable, even though it sits right next to server.js
{
  const { status, text } = await get('/.env');
  assert.equal(status, 404);
  assert.ok(!text.includes('NOTION_TOKEN'));
}

// dotfiles/dot-dirs blocked in general (.git, .gitignore, etc.)
{
  const { status } = await get('/.gitignore');
  assert.equal(status, 404);
}

// real public file still serves normally
{
  const { status, text } = await get('/app.js');
  assert.equal(status, 200);
  assert.ok(text.length > 0);
}

// backend/project files are not part of the public allowlist — must not be servable
for (const path of ['/server.js', '/package.json', '/test_server.mjs', '/NOTION_SETUP.md', '/DEPLOY.md']) {
  const { status } = await get(path);
  assert.equal(status, 404, `${path} should be blocked`);
}

// allowlisted directory still resolves nested files
{
  const { status } = await get('/survey/survey.js');
  assert.equal(status, 200);
}

// traversal through an allowlisted dir prefix must not reach a blocked file
{
  const { status } = await get('/survey/../server.js');
  assert.equal(status, 404);
}

// unit-level: property builders shape data as Notion expects
assert.equal(contactProperties({ name: 'X' }).Name.title[0].text.content, 'X');
assert.equal(surveyProperties({ gender: 'Female' }).Gender.select.name, 'Female');

server.close();
console.log('All server checks passed.');
