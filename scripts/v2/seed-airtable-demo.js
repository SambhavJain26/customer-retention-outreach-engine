/**
 * Seeds (or re-seeds) the v2 demo data in Airtable.
 *
 * Usage:
 *   node scripts/v2/seed-airtable-demo.js
 *
 * This is the v2 equivalent of the WF5 reset path. It:
 *   1. clears Leases, Outreach Log, and Metrics
 *   2. rebuilds 40 residents from fixtures/roster-demo.csv, re-anchored to today
 *   3. seeds Config defaults, preserving any local values already present
 *   4. writes a zeroed Metrics snapshot
 *
 * Config values that are local-only secrets (demo_recipient_email,
 * telegram_chat_id) are read from .env and never committed.
 */

const {
  readConfigFromEnv,
  listRecords,
  createRecords,
  clearTable,
} = require("./airtable-lib.js");
const {
  TABLE_LEASES,
  TABLE_LOG,
  TABLE_CONFIG,
  TABLE_METRICS,
} = require("./airtable-schema.js");
const { buildDemoRoster, toAirtableLease, todayIso } = require("./demo-roster.js");

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

function configDefaults() {
  return [
    ["manager_name", "Maya Chen", "string", "Signs every draft and owns approvals."],
    ["company_name", "Harborview Property Management", "string", "Appears in the email footer."],
    ["timezone", "America/New_York", "string", "Cohort and sweep timezone."],
    ["total_units", "168", "number", "Portfolio size quoted on camera."],
    ["model_draft", "gpt-5.6-luna", "string", "Drafting model. Omit temperature for this model."],
    ["model_classify", "gpt-5.6-luna", "string", "Reply classification model."],
    ["avg_turnover_cost", "3900", "number", "Cost of one turnover. Drives turnover_exposure."],
    ["send_delay_seconds", "2", "number", "Pause between Gmail sends."],
    ["nudge_after_days", "14", "number", "Silence before a 60-day nudge is offered."],
    ["escalate_after_days", "15", "number", "Silence before a sent row escalates."],
    ["demo_recipient_email", process.env.DEMO_RECIPIENT_EMAIL || process.env.STAGE1_TEST_EMAIL || "", "email", "Local demo inbox. Never commit."],
    ["telegram_chat_id", process.env.TELEGRAM_MANAGER_CHAT_ID || "", "string", "Manager chat. Never commit."],
  ];
}

async function seedConfig(token, baseId, nowIso) {
  const existing = await listRecords(token, baseId, TABLE_CONFIG);
  const existingByKey = new Map(
    existing.map((record) => [String((record.fields || {}).key || ""), record])
  );

  const toCreate = [];
  for (const [key, value, valueType, description] of configDefaults()) {
    if (existingByKey.has(key)) continue;
    if (!value) {
      console.log(`  config "${key}" left unset - add it in Airtable or .env`);
    }
    toCreate.push({
      key,
      value: String(value),
      value_type: valueType,
      description,
      updated_at: nowIso,
    });
  }

  if (toCreate.length) {
    await createRecords(token, baseId, TABLE_CONFIG, toCreate);
  }
  return { created: toCreate.length, preserved: existing.length };
}

async function main() {
  loadDotEnv();
  const { token, baseId } = readConfigFromEnv();
  const nowIso = new Date().toISOString();
  const baseDate = todayIso("America/New_York");

  console.log(`Seeding demo data in base ${baseId} (anchor ${baseDate})\n`);

  const demoRecipient = process.env.DEMO_RECIPIENT_EMAIL || process.env.STAGE1_TEST_EMAIL || "";
  if (!demoRecipient) {
    console.log("Warning: DEMO_RECIPIENT_EMAIL is not set in .env.");
    console.log("The demo-priority resident will keep the fixture placeholder address,");
    console.log("so the live send step will not reach a real inbox.\n");
  }

  const extraDemoRecipients = process.env.DEMO_EXTRA_RECIPIENTS == null
    ? 3
    : Number(process.env.DEMO_EXTRA_RECIPIENTS);
  const roster = buildDemoRoster({ baseDate, demoRecipientEmail: demoRecipient, extraDemoRecipients });

  console.log("Clearing existing demo rows...");
  const clearedLog = await clearTable(token, baseId, TABLE_LOG);
  const clearedLeases = await clearTable(token, baseId, TABLE_LEASES);
  const clearedMetrics = await clearTable(token, baseId, TABLE_METRICS);
  console.log(`  removed ${clearedLeases} leases, ${clearedLog} log rows, ${clearedMetrics} metrics rows`);

  console.log("\nInserting residents...");
  const leaseRecords = roster.rows.map((row) => toAirtableLease(row));
  await createRecords(token, baseId, TABLE_LEASES, leaseRecords);
  console.log(`  inserted ${leaseRecords.length} residents`);

  console.log("\nSeeding config...");
  const configResult = await seedConfig(token, baseId, nowIso);
  console.log(`  created ${configResult.created}, preserved ${configResult.preserved}`);

  console.log("\nWriting metrics snapshot...");
  const ninetyCount = roster.rows.filter((row) => row.cohort === "90").length;
  await createRecords(token, baseId, TABLE_METRICS, [
    {
      snapshot: "current",
      residents_in_window: ninetyCount,
      check_ins_sent: 0,
      replies_received: 0,
      issues_found: 0,
      issues_resolved: 0,
      avg_resolution_days: 0,
      at_risk_count: 0,
      turnover_exposure: 0,
      exposure_recovered: 0,
      updated_at: nowIso,
    },
  ]);

  const counts = roster.summary.cohort_counts;
  console.log("\nSeed complete.");
  console.log(`  residents:        ${roster.rows.length}`);
  console.log(`  90-day window:    ${ninetyCount}`);
  console.log(`  needs attention:  ${roster.summary.flagged_count}`);
  console.log(`  cohorts:          120=${counts["120"] || 0} 90=${counts["90"] || 0} 60=${counts["60"] || 0} 30=${counts["30"] || 0} NONE=${counts.NONE || 0} EXPIRED=${counts.EXPIRED || 0}`);

  const priority = roster.rows.find((row) => row._is_demo_priority);
  if (priority) {
    console.log(`  demo priority:    ${priority.tenant_name}, ${priority.unit} (${priority.email || "no email"})`);
  }

  const liveInbox = roster.rows.filter((row) => demoRecipient && row.email === demoRecipient);
  console.log(`  live inboxes:     ${liveInbox.length} of ${roster.rows.length} reach a real mailbox`);
  liveInbox.forEach((row) => console.log(`                    - ${row.tenant_name}, ${row.unit}`));
  console.log(`  everyone else uses @example.com and cannot receive mail.`);
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exit(1);
});
