# Wiring the two forms to Notion

Both forms (early-access on the homepage, and the survey) now POST to a
local Node server (`server.js`) which writes each submission into Notion
as a new database row. Do this once:

## 1. Create the Notion integration (gives you `NOTION_TOKEN`)

1. Go to https://www.notion.so/my-integrations → **New integration**.
2. Name it (e.g. "DAD Reports Website"), pick your workspace, Submit.
3. Copy the **Internal Integration Secret** — this is `NOTION_TOKEN`.

## 2. Create the two databases

Create two databases in Notion (as full-page databases), with these columns:

**Contact / Early Access database**
| Property | Type |
|---|---|
| Name | Title |
| Phone | Phone |
| Email | Email |
| City | Text |
| Submitted | Date |

**Survey database**
| Property | Type |
|---|---|
| Name | Title |
| Age | Number |
| Gender | Select |
| City | Text |
| Mobile | Phone |
| Answers | Text |
| Submitted | Date |

(`Answers` holds all 23 question responses as one readable block — easier
to set up than 23 separate columns. Ask if you'd rather have per-question
columns and I'll add them.)

## 3. Share each database with the integration

Open each database → `•••` menu (top right) → **Connections** → add the
integration you created in step 1. Do this for both databases.

## 4. Get each database ID

Open the database as a full page, copy its URL:
`https://www.notion.so/myworkspace/<DATABASE_ID>?v=...`
The 32-character chunk right after your workspace name is the ID.

## 5. Fill in `.env`

```
cp .env.example .env
```

Edit `.env` and paste in:
- `NOTION_TOKEN` from step 1
- `NOTION_CONTACT_DB_ID` from step 4 (contact database)
- `NOTION_SURVEY_DB_ID` from step 4 (survey database)

## 6. Run it

```
node --env-file=.env server.js
```

Open http://localhost:8080 — submitting either form now creates a row in
the matching Notion database. `node test_server.mjs` runs a self-check
that doesn't touch real Notion (routing + payload shape only).
