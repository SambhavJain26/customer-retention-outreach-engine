/**
 * Airtable REST helpers for the v2 demo setup and seed scripts (Node side).
 *
 * Workflows do NOT use this file - they use n8n's built-in Airtable node with the
 * Airtable credential, the same way v1 used Data Table nodes. This module exists
 * so the one-off setup/seed/reset scripts can talk to the Meta and Data APIs.
 *
 * Airtable limits enforced here:
 *  - 10 records per create/update/delete request
 *  - 5 requests per second per base
 */

const META_BASE = "https://api.airtable.com/v0/meta/bases";
const DATA_BASE = "https://api.airtable.com/v0";

const RATE_LIMIT_MS = 220; // ~4.5 req/sec, safely under Airtable's 5/sec cap

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(
      `Missing ${name}. Set it in .env (never commit it) or export it before running this script.`
    );
  }
  return String(value).trim();
}

function readConfigFromEnv() {
  return {
    token: requireEnv("AIRTABLE_PAT"),
    baseId: requireEnv("AIRTABLE_BASE_ID"),
  };
}

async function airtableRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const bodyText = await response.text();
  let body = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      body = { raw: bodyText };
    }
  }

  if (!response.ok) {
    const detail = body && body.error ? JSON.stringify(body.error) : bodyText;
    throw new Error(`Airtable ${response.status} ${options.method || "GET"} ${url}: ${detail}`);
  }

  await sleep(RATE_LIMIT_MS);
  return body;
}

/* ---------------------------------------------------------------- Meta API */

async function listTables(token, baseId) {
  const body = await airtableRequest(token, `${META_BASE}/${baseId}/tables`);
  return (body && body.tables) || [];
}

async function createTable(token, baseId, table) {
  return airtableRequest(token, `${META_BASE}/${baseId}/tables`, {
    method: "POST",
    body: JSON.stringify(table),
  });
}

async function createField(token, baseId, tableId, field) {
  return airtableRequest(token, `${META_BASE}/${baseId}/tables/${tableId}/fields`, {
    method: "POST",
    body: JSON.stringify(field),
  });
}

/* ---------------------------------------------------------------- Data API */

function encodeTable(tableName) {
  return encodeURIComponent(tableName);
}

async function listRecords(token, baseId, tableName, params = {}) {
  const records = [];
  let offset = null;

  do {
    const query = new URLSearchParams();
    if (params.view) query.set("view", params.view);
    if (params.filterByFormula) query.set("filterByFormula", params.filterByFormula);
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    (params.fields || []).forEach((field) => query.append("fields[]", field));
    if (offset) query.set("offset", offset);

    const url = `${DATA_BASE}/${baseId}/${encodeTable(tableName)}?${query.toString()}`;
    const body = await airtableRequest(token, url);
    records.push(...((body && body.records) || []));
    offset = body && body.offset ? body.offset : null;
  } while (offset);

  return records;
}

async function createRecords(token, baseId, tableName, records) {
  const created = [];
  for (const batch of chunk(records, 10)) {
    const body = await airtableRequest(token, `${DATA_BASE}/${baseId}/${encodeTable(tableName)}`, {
      method: "POST",
      body: JSON.stringify({
        records: batch.map((fields) => ({ fields })),
        typecast: true,
      }),
    });
    created.push(...((body && body.records) || []));
  }
  return created;
}

async function updateRecords(token, baseId, tableName, records) {
  const updated = [];
  for (const batch of chunk(records, 10)) {
    const body = await airtableRequest(token, `${DATA_BASE}/${baseId}/${encodeTable(tableName)}`, {
      method: "PATCH",
      body: JSON.stringify({ records: batch, typecast: true }),
    });
    updated.push(...((body && body.records) || []));
  }
  return updated;
}

async function deleteRecords(token, baseId, tableName, recordIds) {
  let deleted = 0;
  for (const batch of chunk(recordIds, 10)) {
    const query = new URLSearchParams();
    batch.forEach((id) => query.append("records[]", id));
    const body = await airtableRequest(
      token,
      `${DATA_BASE}/${baseId}/${encodeTable(tableName)}?${query.toString()}`,
      { method: "DELETE" }
    );
    deleted += ((body && body.records) || []).length;
  }
  return deleted;
}

async function clearTable(token, baseId, tableName) {
  const existing = await listRecords(token, baseId, tableName, { fields: [] });
  if (!existing.length) return 0;
  return deleteRecords(token, baseId, tableName, existing.map((record) => record.id));
}

module.exports = {
  chunk,
  sleep,
  requireEnv,
  readConfigFromEnv,
  airtableRequest,
  listTables,
  createTable,
  createField,
  listRecords,
  createRecords,
  updateRecords,
  deleteRecords,
  clearTable,
};
