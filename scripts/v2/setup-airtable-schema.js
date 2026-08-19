/**
 * Creates the v2 demo tables and fields inside an Airtable base you already own.
 *
 * Usage (from the repo root, with AIRTABLE_PAT and AIRTABLE_BASE_ID set in .env):
 *   node scripts/v2/setup-airtable-schema.js
 *
 * The script is idempotent: existing tables are reused and only missing fields
 * are added, so it is safe to re-run after a partial failure.
 *
 * It never deletes anything. If the base still holds Airtable's default
 * "Table 1", delete that by hand once the demo tables exist.
 */

const {
  readConfigFromEnv,
  listTables,
  createTable,
  createField,
} = require("./airtable-lib.js");
const { TABLES, TABLE_LEASES, TABLE_LOG, leaseLinkField } = require("./airtable-schema.js");

function loadDotEnv() {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

async function ensureTable(token, baseId, existingTables, definition) {
  const existing = existingTables.find((table) => table.name === definition.name);

  if (!existing) {
    const created = await createTable(token, baseId, definition);
    console.log(`  created table "${definition.name}" with ${definition.fields.length} fields`);
    return created;
  }

  const existingFieldNames = new Set((existing.fields || []).map((field) => field.name));
  const missing = definition.fields.filter((field) => !existingFieldNames.has(field.name));

  if (!missing.length) {
    console.log(`  table "${definition.name}" already complete`);
    return existing;
  }

  for (const field of missing) {
    await createField(token, baseId, existing.id, field);
    console.log(`  added field "${definition.name}.${field.name}"`);
  }
  return existing;
}

async function main() {
  loadDotEnv();
  const { token, baseId } = readConfigFromEnv();

  console.log(`Setting up Airtable schema in base ${baseId}\n`);

  let existingTables = await listTables(token, baseId);

  for (const definition of TABLES) {
    console.log(`${definition.name}:`);
    await ensureTable(token, baseId, existingTables, definition);
    existingTables = await listTables(token, baseId);
  }

  // Second pass: the log's link to Leases needs the Leases table id.
  const leases = existingTables.find((table) => table.name === TABLE_LEASES);
  const log = existingTables.find((table) => table.name === TABLE_LOG);

  if (leases && log) {
    const hasLink = (log.fields || []).some((field) => field.name === "lease");
    if (hasLink) {
      console.log(`\n${TABLE_LOG}.lease link already present`);
    } else {
      await createField(token, baseId, log.id, leaseLinkField(leases.id));
      console.log(`\nadded link field "${TABLE_LOG}.lease" -> ${TABLE_LEASES}`);
    }
  }

  const defaultTable = existingTables.find((table) => /^Table \d+$/.test(table.name));

  console.log("\nSchema ready.");
  if (defaultTable) {
    console.log(`Note: Airtable's default table "${defaultTable.name}" is still present. Delete it by hand.`);
  }
  console.log("\nNext: node scripts/v2/seed-airtable-demo.js");
  console.log("Then add the demo views by hand - see docs/v2-airtable-setup.md");
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
});
