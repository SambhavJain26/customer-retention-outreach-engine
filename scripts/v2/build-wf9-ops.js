/**
 * Builds n8n-workflows/wf9-ops.json.
 *
 * WF9 is the background operations workflow:
 *   - 08:00 daily, or POST /webhook/v2-sweep, or /sweep in Telegram
 *   - recomputes days_to_expiry and cohort from lease_end_date only
 *   - escalates residents who were contacted and never meaningfully replied
 *   - refreshes the Metrics scoreboard (turnover exposure, resolution times)
 *   - posts a Telegram digest
 *   - catches failures from every other workflow and reports them to Telegram
 *
 * It never emails a resident. There is deliberately no Gmail node in this file.
 *
 * Sweep and escalation rules are reused from scripts/stage-7-ops-lib.js rather
 * than reimplemented, so v2 keeps the behaviour verified in Stage 7.
 */

const fs = require("fs");
const path = require("path");
const {
  PLACEHOLDER,
  airtableListNode,
  airtableWriteNode,
  booleanCondition,
  branchConnection,
  codeNode,
  ifNode,
  loadLib,
  loadStageLib,
  mainConnection,
  telegramCardNode,
  webhookNode,
  workflow,
} = require("./workflow-common.js");

const telegramLib = loadLib("telegram-ui-lib.js");
const metricsLib = loadLib("metrics-lib.js");
const opsLib = loadStageLib("stage-7-ops-lib.js");

const AIRTABLE_HELPERS = `
function flattenAirtable(items) {
  const out = [];
  for (const item of items || []) {
    const records = item && item.json && Array.isArray(item.json.records) ? item.json.records : [];
    for (const record of records) {
      out.push(Object.assign({ record_id: record.id }, record.fields || {}));
    }
  }
  return out;
}

function configMap(rows) {
  const map = {};
  for (const row of rows || []) {
    if (row.key) map[row.key] = row.value;
  }
  return map;
}

function chunkRecords(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
`;

const prepareSweepCode = `${AIRTABLE_HELPERS}
${opsLib}
${metricsLib}
${telegramLib}

let body = {};
try {
  body = $('Sweep Webhook').first().json.body || {};
} catch (error) {
  body = {}; // scheduled run has no webhook payload
}

const leases = flattenAirtable($('Airtable Read Leases For Sweep').all());
const configRows = flattenAirtable($('Airtable Read Config For Sweep').all());
const config = configMap(configRows);
const logRows = flattenAirtable($('Airtable Read Log For Sweep').all());
const metricsRows = flattenAirtable($('Airtable Read Metrics For Sweep').all());

const digestOnly = Boolean(body.digest_only);
// A silent sweep refreshes the scoreboard without putting anything on the
// manager's phone. Used by the automatic refresh after every state change.
const silent = Boolean(body.silent);
const nowIso = new Date().toISOString();

// Recompute timing and cohorts, and escalate long silences.
const sweep = prepareSweepUpdates(leases, logRows, config, body);
const updates = sweep.updates || [];
const summary = sweep.summary || {};

// Map the recomputed rows back onto their Airtable record ids.
const recordIdByLeaseId = new Map(leases.map((row) => [String(row.lease_id), row.record_id]));

const leaseWrites = digestOnly ? [] : chunkRecords(
  updates
    .map((row) => {
      const recordId = recordIdByLeaseId.get(String(row.lease_id));
      if (!recordId) return null;
      const fields = {
        days_to_expiry: row.days_to_expiry == null ? null : Number(row.days_to_expiry),
        cohort: row.cohort || 'NONE',
        status: row.status || 'PENDING',
      };
      // A resident escalated for silence carries turnover exposure again.
      if (String(row.status) === 'ESCALATE') {
        fields.turnover_exposure = Number(config.avg_turnover_cost || 3900);
      }
      return { id: recordId, fields };
    })
    .filter(Boolean),
  10
).map((batch) => ({
  method: 'PATCH',
  table: 'Leases',
  body: { records: batch, typecast: true },
}));

// Recompute the scoreboard from the post-sweep view of the roster.
const sweptLeases = leases.map((row) => {
  const updated = updates.find((entry) => String(entry.lease_id) === String(row.lease_id));
  return updated ? Object.assign({}, row, {
    status: updated.status,
    cohort: updated.cohort,
    days_to_expiry: updated.days_to_expiry,
  }) : row;
});

const metrics = computeMetrics(sweptLeases, logRows, config);
const metricsRecord = toMetricsRecord(metrics);
const existingMetrics = metricsRows[0] || null;

const metricsWrites = digestOnly ? [] : [
  existingMetrics
    ? {
        method: 'PATCH',
        table: 'Metrics',
        body: { records: [{ id: existingMetrics.record_id, fields: metricsRecord }], typecast: true },
      }
    : {
        method: 'POST',
        table: 'Metrics',
        body: { records: [{ fields: metricsRecord }], typecast: true },
      },
];

const writes = leaseWrites.concat(metricsWrites);

const digest = sweepDigestCard({
  company_name: config.company_name,
  recomputed_count: leases.length,
  at_risk_count: metrics.at_risk_count,
  staying_count: metrics.staying_count,
  escalated_count: summary.escalated_count || 0,
  issues_resolved: metrics.issues_resolved,
  turnover_exposure: metrics.turnover_exposure,
  exposure_recovered: metrics.exposure_recovered,
});

return [{
  json: {
    writes,
    has_writes: writes.length > 0,
    chat_id: config.telegram_chat_id || '',
    record_id: '',
    text: digest.text,
    digest_only: digestOnly,
    post_digest: !silent,
    changed_count: updates.length,
    escalated_count: summary.escalated_count || 0,
    metrics,
    ok: true,
    action: 'sweep',
    swept_at: nowIso,
  },
}];
`;

const emitSweepWritesCode = `
const payload = $('Prepare Sweep').first().json;
if (!payload.has_writes) return [];
return (payload.writes || []).map((write) => ({ json: write }));
`;

const buildDigestCode = `
const payload = $('Prepare Sweep').first().json;
return [{
  json: {
    chat_id: payload.chat_id,
    text: payload.text,
    post_digest: payload.post_digest,
    record_id: '',
    ok: true,
    action: 'sweep',
    changed_count: payload.changed_count,
    escalated_count: payload.escalated_count,
    metrics: payload.metrics,
  },
}];
`;

const buildErrorAlertCode = `${opsLib}

// Fired by n8n whenever any workflow in this project fails. A silent failure is
// the one outcome the demo must never have.
const input = $json || {};
return [{
  json: {
    chat_id: '',
    record_id: '',
    text: buildErrorAlertText(input),
  },
}];
`;

const attachErrorChatCode = `${AIRTABLE_HELPERS}

const config = configMap(flattenAirtable($('Airtable Read Config For Error').all()));
const alert = $('Build Error Alert').first().json;
return [{
  json: {
    chat_id: config.telegram_chat_id || '',
    record_id: '',
    text: alert.text,
  },
}];
`;

const nodes = [
  webhookNode("Sweep Webhook", "v2-sweep", [-260, 300], { id: "wf9-sweep-webhook" }),
  {
    parameters: {
      rule: { interval: [{ field: "cronExpression", expression: "0 8 * * *" }] },
    },
    id: "wf9-daily-0800",
    name: "Scheduled Daily Sweep 0800",
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [-260, 480],
  },
  airtableListNode("Airtable Read Leases For Sweep", "Leases", [-40, 380]),
  airtableListNode("Airtable Read Config For Sweep", "Config", [160, 380]),
  airtableListNode("Airtable Read Log For Sweep", "Outreach Log", [360, 380]),
  airtableListNode("Airtable Read Metrics For Sweep", "Metrics", [560, 380]),
  codeNode("Prepare Sweep", prepareSweepCode, [760, 380]),
  ifNode("If Has Sweep Writes", booleanCondition("={{ $json.has_writes }}"), [960, 380]),
  codeNode("Emit Sweep Writes", emitSweepWritesCode, [1180, 260]),
  airtableWriteNode("Airtable Write Sweep", [1380, 260]),
  codeNode("Build Sweep Digest", buildDigestCode, [1580, 380]),
  ifNode("If Should Post Digest", booleanCondition("={{ $json.post_digest }}"), [1780, 380]),
  telegramCardNode("Telegram Sweep Digest", [1980, 300], null),

  // Error alerting
  {
    parameters: {},
    id: "wf9-error-trigger",
    name: "Workflow Error Trigger",
    type: "n8n-nodes-base.errorTrigger",
    typeVersion: 1,
    position: [-260, 700],
  },
  codeNode("Build Error Alert", buildErrorAlertCode, [-40, 700]),
  airtableListNode("Airtable Read Config For Error", "Config", [160, 700]),
  codeNode("Attach Error Chat", attachErrorChatCode, [360, 700]),
  telegramCardNode("Telegram Error Alert", [560, 700], null),
];

const connections = {
  "Sweep Webhook": mainConnection("Airtable Read Leases For Sweep"),
  "Scheduled Daily Sweep 0800": mainConnection("Airtable Read Leases For Sweep"),
  "Airtable Read Leases For Sweep": mainConnection("Airtable Read Config For Sweep"),
  "Airtable Read Config For Sweep": mainConnection("Airtable Read Log For Sweep"),
  "Airtable Read Log For Sweep": mainConnection("Airtable Read Metrics For Sweep"),
  "Airtable Read Metrics For Sweep": mainConnection("Prepare Sweep"),
  "Prepare Sweep": mainConnection("If Has Sweep Writes"),
  "If Has Sweep Writes": branchConnection(["Emit Sweep Writes"], ["Build Sweep Digest"]),
  "Emit Sweep Writes": mainConnection("Airtable Write Sweep"),
  "Airtable Write Sweep": mainConnection("Build Sweep Digest"),
  "Build Sweep Digest": mainConnection("If Should Post Digest"),
  "If Should Post Digest": branchConnection(["Telegram Sweep Digest"], []),

  "Workflow Error Trigger": mainConnection("Build Error Alert"),
  "Build Error Alert": mainConnection("Airtable Read Config For Error"),
  "Airtable Read Config For Error": mainConnection("Attach Error Chat"),
  "Attach Error Chat": mainConnection("Telegram Error Alert"),
};

const wf = workflow("wf9-ops", "WF9 Daily Sweep, Metrics, and Error Alerts", nodes, connections);

const outputPath = path.join(__dirname, "..", "..", "n8n-workflows", "wf9-ops.json");
fs.writeFileSync(outputPath, `${JSON.stringify(wf, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${nodes.length} nodes)`);
