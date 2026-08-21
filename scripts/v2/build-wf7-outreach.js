/**
 * Builds n8n-workflows/wf7-outreach.json.
 *
 * WF7 runs one cadence touch on demand:
 *   POST /webhook/v2-generate  { "touch": "CHECK_IN_90" }
 *
 * It selects candidates by cohort, drafts with OpenAI under JSON Schema, applies
 * the verified v1 guardrails with one retry, writes drafts back to Airtable, and
 * posts a Telegram summary plus the first approval card.
 *
 * Nothing here sends a resident email. Sending only ever happens from WF6 after a
 * manager taps Approve.
 */

const fs = require("fs");
const path = require("path");
const {
  airtableListNode,
  airtableWriteNode,
  booleanCondition,
  branchConnection,
  codeNode,
  ifNode,
  loadLib,
  loadStageLib,
  mainConnection,
  KEYBOARDS,
  openAiNode,
  telegramCardNode,
  webhookNode,
  workflow,
} = require("./workflow-common.js");

const cadenceLib = loadLib("cadence-lib.js");
const metricsLib = loadLib("metrics-lib.js");
const telegramLib = loadLib("telegram-ui-lib.js");
const outboundLib = loadStageLib("stage-5-outbound-lib.js");

/** Shared preamble for turning Airtable HTTP responses into flat rows. */
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

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    drafts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          lease_id: { type: "string" },
          subject: { type: "string", maxLength: 60 },
          body: { type: "string", maxLength: 700 },
        },
        required: ["lease_id", "subject", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["drafts"],
  additionalProperties: false,
};

const prepareBatchCode = `${AIRTABLE_HELPERS}
${cadenceLib}
${metricsLib}
${outboundLib}

const body = $('Generate Outreach Webhook').first().json.body || {};
const touch = String(body.touch || 'CHECK_IN_90').toUpperCase();

const leases = flattenAirtable($('Airtable Read Leases').all());
const config = configMap(flattenAirtable($('Airtable Read Config').all()));
const logRows = flattenAirtable($('Airtable Read Log').all());

const nowIso = new Date().toISOString();
const selection = selectTouchCandidates(leases, logRows, config, nowIso);
const candidates = selection[touch] || [];

// The 120-day watchlist and the 30-day handoff never contact a resident.
const emailingTouch = EMAILING_TOUCHES.has(touch);

const exposure = windowExposure(leases, touch === 'NUDGE_60' ? '60' : '90', config);

const instructions = touch === 'CHECK_IN_90'
  ? promptSystemInstructions()
  : touchPromptInstructions(touch);

const prompt = touch === 'CHECK_IN_90'
  ? buildDraftBatchPrompt(candidates, config)
  : buildTouchPrompt(touch, candidates, config);

return [{
  json: {
    touch,
    touch_label: TOUCH_LABEL[touch] || touch,
    emailing_touch: emailingTouch,
    has_candidates: emailingTouch && candidates.length > 0,
    candidate_count: candidates.length,
    candidates,
    config,
    chat_id: config.telegram_chat_id || '',
    model: config.model_draft || 'gpt-5.6-luna',
    exposure,
    instructions,
    prompt,
    skipped: selection.skipped.map((entry) => ({
      lease_id: entry.lease.lease_id,
      reason: entry.reason,
    })),
    non_emailing_rows: emailingTouch ? [] : candidates,
    now: nowIso,
  },
}];
`;

const assessFirstCode = `${outboundLib}

const prepared = $('Prepare Touch Batch').first().json;
const drafts = extractDraftBatch($json);
const candidates = prepared.candidates || [];

const failures = [];
for (const lease of candidates) {
  const draft = drafts.find((entry) => entry.lease_id === lease.lease_id);
  if (!draft) {
    failures.push({ lease, violations: ['missing draft from model output'] });
    continue;
  }
  const repaired = repairDraftForLease(lease, draft);
  const guard = guardDraft(lease, repaired.subject, repaired.body);
  if (!guard.ok) failures.push({ lease, violations: guard.violations });
}

return [{
  json: {
    first_drafts: drafts,
    failures,
    has_failures: failures.length > 0,
    retry_prompt: failures.length ? buildRetryPrompt(failures, prepared.config) : '',
    instructions: promptSystemInstructions(),
    prompt: failures.length ? buildRetryPrompt(failures, prepared.config) : '',
    model: prepared.model,
  },
}];
`;

const emptyRetryCode = `return [{ json: { retry_drafts: [] } }];`;

const finalizeCode = `${AIRTABLE_HELPERS}
${outboundLib}
${metricsLib}
${telegramLib}

const prepared = $('Prepare Touch Batch').first().json;
const assessed = $('Assess First Draft Batch').first().json;

let retryDrafts = [];
try {
  const retryItem = $('OpenAI Retry Draft Batch').first();
  retryDrafts = extractDraftBatch(retryItem.json);
} catch (error) {
  retryDrafts = [];
}

const result = finalizeDraftsFromBatch(
  prepared.candidates || [],
  assessed.first_drafts || [],
  retryDrafts,
  prepared.config || {}
);

const nowIso = new Date().toISOString();

// Airtable update payloads, ten records per request.
const updates = result.rows.map((row) => ({
  id: row.record_id,
  fields: {
    status: row.status === 'DRAFT' ? 'AWAITING_APPROVAL' : 'REVIEW_FAILED',
    touch_stage: prepared.touch,
    draft_subject: row.draft_subject,
    draft_body: row.draft_body,
    ref_token: row.ref_token,
  },
}));

const writes = chunkRecords(updates, 10).map((batch) => ({
  method: 'PATCH',
  table: 'Leases',
  body: { records: batch, typecast: true },
}));

const logRows = result.rows.map((row) => ({
  event_id: 'drafted-' + row.lease_id + '-' + Date.now(),
  event_type: 'DRAFTED',
  channel: 'SYSTEM',
  direction: 'INTERNAL',
  lease_id: row.lease_id,
  tenant_name: row.tenant_name,
  message_text: row.draft_subject,
  created_at: nowIso,
}));

const logWrites = chunkRecords(logRows, 10).map((batch) => ({
  method: 'POST',
  table: 'Outreach Log',
  body: { records: batch.map((fields) => ({ fields })), typecast: true },
}));

// The demo-priority resident is reviewed first so the live send in the video
// always targets the controlled inbox.
const approvable = result.rows
  .filter((row) => row.status === 'DRAFT')
  .sort((a, b) => {
    const priority = (b.is_demo_priority ? 1 : 0) - (a.is_demo_priority ? 1 : 0);
    if (priority !== 0) return priority;
    return Number(a.days_to_expiry || 9999) - Number(b.days_to_expiry || 9999);
  });
const first = approvable[0] || null;

return [{
  json: {
    touch: prepared.touch,
    touch_label: prepared.touch_label,
    generated_count: result.generated_count,
    review_failed_count: result.review_failed_count,
    exposure: prepared.exposure,
    chat_id: prepared.chat_id,
    first_record_id: first ? first.record_id : '',
    first_lease: first || null,
    next_record_id: approvable[1] ? approvable[1].record_id : '',
    approvable_count: approvable.length,
    writes: writes.concat(logWrites),
    model: result.model,
  },
}];
`;

const emitWritesCode = `
const payload = $json;
return (payload.writes || []).map((write) => ({ json: write }));
`;

const buildSummaryCardCode = `${telegramLib}

const summary = $('Finalize Drafts').first().json;
const card = generationSummaryCard({
  touch_label: summary.touch_label,
  drafted_count: summary.generated_count,
  review_failed_count: summary.review_failed_count,
  exposure: summary.exposure,
  first_record_id: summary.first_record_id,
});

return [{
  json: {
    chat_id: summary.chat_id,
    text: card.text,
    record_id: summary.first_record_id,
  },
}];
`;

const buildFirstDraftCardCode = `${telegramLib}

const summary = $('Finalize Drafts').first().json;
if (!summary.first_lease) return [];

const card = draftApprovalCard(summary.first_lease, {
  position: 1,
  total: summary.approvable_count,
});

return [{
  json: {
    chat_id: summary.chat_id,
    text: card.text,
    record_id: summary.first_lease.record_id,
    next_record_id: summary.next_record_id || summary.first_lease.record_id,
  },
}];
`;

const noCandidatesCode = `${telegramLib}
${cadenceLib}

const prepared = $('Prepare Touch Batch').first().json;

// The 30-day handoff is a real outcome, not an empty result: it posts an
// internal card and deliberately never emails a resident.
if (prepared.touch === 'HANDOFF_30' && (prepared.non_emailing_rows || []).length) {
  const card = leasingHandoffCard(prepared.non_emailing_rows);
  return [{
    json: {
      chat_id: prepared.chat_id,
      text: card.text,
      record_id: '',
      ok: true,
      action: 'handoff',
      touch: prepared.touch,
      handoff_count: prepared.non_emailing_rows.length,
    },
  }];
}

return [{
  json: {
    chat_id: prepared.chat_id,
    text: '<b>' + (prepared.touch_label || prepared.touch) + '</b>\\n\\nNo residents are eligible for this touch right now.',
    record_id: '',
    ok: true,
    action: 'none',
    touch: prepared.touch,
    candidate_count: prepared.candidate_count,
  },
}];
`;

const responseCode = `
const summary = $('Finalize Drafts').first().json;
return [{
  json: {
    ok: true,
    action: 'generate',
    touch: summary.touch,
    generated_count: summary.generated_count,
    review_failed_count: summary.review_failed_count,
    approvable_count: summary.approvable_count,
    exposure: summary.exposure,
    model: summary.model,
  },
}];
`;

const nodes = [
  webhookNode("Generate Outreach Webhook", "v2-generate", [-260, 300], { id: "wf7-generate-webhook" }),
  airtableListNode("Airtable Read Leases", "Leases", [-40, 300]),
  airtableListNode("Airtable Read Config", "Config", [160, 300]),
  airtableListNode("Airtable Read Log", "Outreach Log", [360, 300]),
  codeNode("Prepare Touch Batch", prepareBatchCode, [560, 300]),
  ifNode("If Has Candidates", booleanCondition("={{ $json.has_candidates }}"), [760, 300]),
  openAiNode("OpenAI First Draft Batch", [980, 180], "draft_batch", DRAFT_SCHEMA),
  codeNode("Assess First Draft Batch", assessFirstCode, [1200, 180]),
  ifNode("If Draft Failures", booleanCondition("={{ $json.has_failures }}"), [1400, 180]),
  openAiNode("OpenAI Retry Draft Batch", [1620, 80], "draft_batch", DRAFT_SCHEMA),
  codeNode("Empty Retry Draft Batch", emptyRetryCode, [1620, 300]),
  codeNode("Finalize Drafts", finalizeCode, [1840, 180]),
  codeNode("Emit Airtable Writes", emitWritesCode, [2040, 180]),
  airtableWriteNode("Airtable Write Drafts", [2240, 180]),
  codeNode("Build Summary Card", buildSummaryCardCode, [2440, 180]),
  telegramCardNode("Telegram Post Summary", [2640, 180], KEYBOARDS.summary),
  codeNode("Build First Draft Card", buildFirstDraftCardCode, [2840, 180]),
  telegramCardNode("Telegram Post Draft Card", [3040, 180], KEYBOARDS.draft),
  codeNode("Build Generate Response", responseCode, [3240, 180]),
  codeNode("Build No Candidate Card", noCandidatesCode, [980, 460]),
  telegramCardNode("Telegram Post Notice", [1200, 460], null),
];

const connections = {
  "Generate Outreach Webhook": mainConnection("Airtable Read Leases"),
  "Airtable Read Leases": mainConnection("Airtable Read Config"),
  "Airtable Read Config": mainConnection("Airtable Read Log"),
  "Airtable Read Log": mainConnection("Prepare Touch Batch"),
  "Prepare Touch Batch": mainConnection("If Has Candidates"),
  "If Has Candidates": branchConnection(["OpenAI First Draft Batch"], ["Build No Candidate Card"]),
  "OpenAI First Draft Batch": mainConnection("Assess First Draft Batch"),
  "Assess First Draft Batch": mainConnection("If Draft Failures"),
  "If Draft Failures": branchConnection(["OpenAI Retry Draft Batch"], ["Empty Retry Draft Batch"]),
  "OpenAI Retry Draft Batch": mainConnection("Finalize Drafts"),
  "Empty Retry Draft Batch": mainConnection("Finalize Drafts"),
  "Finalize Drafts": mainConnection("Emit Airtable Writes"),
  "Emit Airtable Writes": mainConnection("Airtable Write Drafts"),
  "Airtable Write Drafts": mainConnection("Build Summary Card"),
  "Build Summary Card": mainConnection("Telegram Post Summary"),
  "Telegram Post Summary": mainConnection("Build First Draft Card"),
  "Build First Draft Card": mainConnection("Telegram Post Draft Card"),
  "Telegram Post Draft Card": mainConnection("Build Generate Response"),
  "Build No Candidate Card": mainConnection("Telegram Post Notice"),
};

const wf = workflow("wf7-outreach", "WF7 Outreach Generation and Approval Cards", nodes, connections);

const outputPath = path.join(__dirname, "..", "..", "n8n-workflows", "wf7-outreach.json");
fs.writeFileSync(outputPath, `${JSON.stringify(wf, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${nodes.length} nodes)`);
