// Minimal self-check: run with `node test_server.mjs`.
// Stubs global.fetch so it exercises real routing/validation without calling Notion.
import assert from 'node:assert';

// env vars must be set before server.js is loaded (it reads them at module init)
process.env.NOTION_TOKEN = 'test-token';
process.env.NOTION_CONTACT_DB_ID = 'contact-db';
process.env.NOTION_SURVEY_DB_ID = 'survey-db';

let capturedBody = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('api.notion.com')) {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ id: 'fake-page-id' }) };
  }
  return realFetch(url, opts);
};

const { server, contactProperties, surveyProperties } = await import('./server.js');

server.listen(0);
const base = `http://localhost:${server.address().port}`;

async function post(path, body) {
  const res = await fetch(base + path, { method: 'POST', body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
}

// contact: missing required field -> 400
{
  const { status, json } = await post('/api/contact', { phone: '123' });
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

// unit-level: property builders shape data as Notion expects
assert.equal(contactProperties({ name: 'X' }).Name.title[0].text.content, 'X');
assert.equal(surveyProperties({ gender: 'Female' }).Gender.select.name, 'Female');

server.close();
console.log('All server checks passed.');
