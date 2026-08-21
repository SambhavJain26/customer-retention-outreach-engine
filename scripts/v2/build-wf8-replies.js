/**
 * Builds n8n-workflows/wf8-replies.json.
 *
 * WF8 finds a resident reply, matches it to the right resident, works out what
 * it means, and puts it in front of a human:
 *   POST /webhook/v2-check-replies              reads Gmail
 *   POST /webhook/v2-check-replies {reply_text} uses a manual fixture payload
 *
 * Matching is deterministic and never delegated to the model: the [R-xxxx]
 * reference code first, then an exact sender-email match. A reply that matches
 * neither raises an unmatched alert and is attached to nobody.
 *
 * Gmail note: this demo uses one mailbox as both sender and recipient, so Gmail
 * marks the outbound check-in as read the moment it is sent. Unread state is
 * therefore useless as a filter. Replies are identified by a "Re:" subject that
 * carries a reference code, and messages already recorded in the Outreach Log
 * are skipped.
 *
 * One reply is processed per run so the flow stays single-item and predictable.
 * The response reports how many others are waiting.
 */

const fs = require("fs");
const path = require("path");
const {
  KEYBOARDS,
  airtableListNode,
  airtableWriteNode,
  booleanCondition,
  branchConnection,
  codeNode,
  gmailSearchNode,
  ifNode,
  loadLib,
  loadStageLib,
  mainConnection,
  openAiNode,
  switchNode,
  telegramCardNode,
  webhookNode,
  workflow,
} = require("./workflow-common.js");

const telegramLib = loadLib("telegram-ui-lib.js");
const metricsLib = loadLib("metrics-lib.js");
const replyLib = loadStageLib("stage-6-reply-lib.js");

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
`;

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["STAYING", "WAVERING", "LEAVING", "GRIEVANCE", "UNCLEAR", "NO_SIGNAL", "OPT_OUT"] },
    grievance_present: { type: "boolean" },
    grievance_summary: { type: "string", maxLength: 300 },
    grievance_category: { type: "string", enum: ["NONE", "MAINTENANCE", "NEIGHBOURS", "FEES", "COMMUNICATION", "PROPERTY_CONDITION", "OTHER"] },
    urgency: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    compliance_flag: { type: "string", enum: ["NONE", "ACCOMMODATION_REQUEST", "HABITABILITY", "LEGAL_THREAT", "OPT_OUT", "DISCRIMINATION_CONCERN"] },
    suggested_human_action: { type: "string", maxLength: 200 },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
  },
  required: [
    "intent", "grievance_present", "grievance_summary", "grievance_category",
    "urgency", "compliance_flag", "suggested_human_action", "confidence",
  ],
  additionalProperties: false,
};

const prepareSourceCode = `${AIRTABLE_HELPERS}
${replyLib}

const body = $('Check Replies Webhook').first().json.body || {};
const leases = flattenAirtable($('Airtable Read Leases For Replies').all());
const config = configMap(flattenAirtable($('Airtable Read Config For Replies').all()));
const logRows = flattenAirtable($('Airtable Read Log For Replies').all());

const useManual = hasManualReplyPayload(body);

return [{
  json: {
    use_gmail: !useManual,
    use_manual: useManual,
    // Automatic polling passes silent:true so an empty check stays off the
    // manager's phone. A manual /check always answers, even with nothing to say.
    silent: Boolean(body.silent),
    manual_body: body,
    leases,
    config,
    log_rows: logRows,
    chat_id: config.telegram_chat_id || '',
    model: config.model_classify || 'gpt-5.6-luna',
    // Broad query on purpose; the real filtering happens in code so Gmail
    // search quirks cannot silently drop a reply.
    gmail_query: 'in:inbox newer_than:2d',
  },
}];
`;

/** Shared tail that turns a chosen reply into a work item. */
const SELECT_TAIL = `
function buildWorkItem(reply, prepared) {
  const workItem = prepareReplyWorkItem(reply, prepared.config, prepared.leases, prepared.log_rows);

  // The library decides routing itself: anything it did not mark _needs_ai has
  // already been finalized (duplicate, unmatched, auto-reply, or a deterministic
  // fast route) and must not be sent to the classifier.
  const needsAi = Boolean(workItem._needs_ai);

  // finalizeRoute() returns a summary that drops the reply and lease objects, so
  // both are re-attached here for the downstream card and Airtable write.
  const lease = workItem.lease && workItem.lease.lease_id
    ? workItem.lease
    : ((prepared.leases || []).find((row) => row.lease_id === workItem.lease_id) || null);

  return {
    json: Object.assign({}, workItem, {
      has_reply: true,
      is_terminal: !needsAi,
      needs_ai: needsAi,
      reply,
      lease,
      config: prepared.config,
      chat_id: prepared.chat_id,
      model: prepared.model,
      instructions: needsAi ? classificationInstructions() : '',
      prompt: needsAi ? buildClassificationPrompt(workItem) : '',
      waiting_count: prepared.waiting_count || 0,
    }),
  };
}
`;

const selectGmailCode = `${AIRTABLE_HELPERS}
${replyLib}
${SELECT_TAIL}

const prepared = $('Prepare Reply Source').first().json;
const messages = $('Gmail Search Replies').all().map((item) => item.json).filter((m) => m && (m.id || m.messageId));

const rosterEmails = new Set(
  (prepared.leases || [])
    .map((lease) => String(lease.email || '').trim().toLowerCase())
    .filter(Boolean)
);

const alreadyLogged = new Set(
  (prepared.log_rows || [])
    .map((row) => String(row.gmail_message_id || '').trim())
    .filter(Boolean)
);

// Nothing in the mailbox can be a reply to a message this demo has not sent yet.
// After a reset every sent_at is cleared, so leftover mail from an earlier
// rehearsal is ignored instead of being processed as new.
const sentTimes = (prepared.leases || [])
  .map((lease) => Date.parse(lease.sent_at || ''))
  .filter((value) => Number.isFinite(value));
const earliestSend = sentTimes.length ? Math.min.apply(null, sentTimes) : null;

const candidates = [];
for (const message of messages) {
  const reply = normalizeGmailMessage(message);
  const subject = String(reply.subject || '');
  const isReplySubject = /^\\s*re\\s*:/i.test(subject);
  const carriesToken = /\\[R-[A-Z0-9]+\\]/i.test(subject);
  const fromRoster = rosterEmails.has(String(reply.from_email || '').toLowerCase());

  // Ignore ordinary inbox mail. Only messages that look like they belong to this
  // system are considered, so an unrelated newsletter never raises an alert.
  if (!(isReplySubject && carriesToken) && !fromRoster) continue;

  // The outbound check-in lands in the same mailbox; it is not a reply.
  if (!isReplySubject) continue;

  if (alreadyLogged.has(reply.message_id)) continue;

  if (earliestSend === null) continue;
  const receivedAt = Number(message.internalDate || 0);
  if (receivedAt && receivedAt < earliestSend) continue;

  candidates.push(reply);
}

if (!candidates.length) {
  return [{
    json: {
      has_reply: false,
      is_terminal: true,
      needs_ai: false,
      chat_id: prepared.chat_id,
      silent: prepared.silent,
      processed_count: 0,
      alerted_count: 0,
      message: 'No new replies found.',
    },
  }];
}

const chosen = candidates[0];
return [buildWorkItem(chosen, Object.assign({}, prepared, { waiting_count: candidates.length - 1 }))];
`;

const selectManualCode = `${AIRTABLE_HELPERS}
${replyLib}
${SELECT_TAIL}

const prepared = $('Prepare Reply Source').first().json;
const reply = normalizeManualReply(prepared.manual_body || {});
return [buildWorkItem(reply, prepared)];
`;

const finalizeRouteCode = `${AIRTABLE_HELPERS}
${replyLib}
${telegramLib}
${metricsLib}

const selected = $('If Needs AI Classification').first().json;
const nowIso = new Date().toISOString();

if (!selected.has_reply) {
  return [{
    json: {
      has_writes: false,
      card_type: selected.silent ? 'none' : 'plain',
      chat_id: selected.chat_id,
      record_id: '',
      text: 'No new replies were found.',
      processed_count: 0,
      alerted_count: 0,
      ok: true,
    },
  }];
}

let routed;
if (selected.is_terminal) {
  routed = selected;
} else if (selected.needs_ai) {
  let aiOutput = null;
  try {
    aiOutput = $('OpenAI Classify Reply').first().json;
  } catch (error) {
    aiOutput = null;
  }
  routed = finalizeAiRoute(selected, aiOutput, nowIso);
} else {
  routed = selected;
}

const lease = routed.lease || selected.lease || null;
const classification = routed.classification || {};
const reply = routed.reply || selected.reply || {};
const isUnmatched = !lease;

const writes = [];
let cardType = 'plain';
let text = routed.message || 'Reply processed.';
let recordId = lease ? lease.record_id : '';

if (isUnmatched) {
  const card = unmatchedReplyCard(reply);
  text = card.text;
  cardType = 'plain';
} else {
  const complianceFlag = String(classification.compliance_flag || 'NONE');
  const isCompliance = complianceFlag && complianceFlag !== 'NONE';
  const intent = String(classification.intent || 'UNCLEAR');
  const requiresHuman = classification.requires_human === true;

  const fields = {
    reply_text: String(reply.reply_text || '').slice(0, 9000),
    intent,
    grievance_category: String(classification.grievance_category || 'NONE'),
    urgency: String(classification.urgency || 'LOW'),
    compliance_flag: complianceFlag,
    confidence: String(classification.confidence || 'LOW'),
    suggested_action: String(classification.suggested_human_action || ''),
  };

  if (intent === 'OPT_OUT') {
    fields.opted_out = true;
    fields.status = 'OPTED_OUT';
  } else if (intent === 'NO_SIGNAL') {
    // An out-of-office is recorded but never moves the resident or alerts anyone.
    fields.status = String(lease.status || 'SENT');
  } else if (requiresHuman) {
    fields.status = 'AT_RISK';
    fields.issue_status = 'OPEN';
    // A new grievance after a resolved one starts a fresh clock, otherwise
    // days_to_resolve would be measured from the previous, closed issue.
    const reopening = String(lease.issue_status || '') !== 'OPEN';
    fields.issue_opened_at = reopening ? nowIso : (lease.issue_opened_at || nowIso);
    if (reopening) fields.issue_resolved_at = null;
    fields.turnover_exposure = Number(selected.config && selected.config.avg_turnover_cost ? selected.config.avg_turnover_cost : 3900);
  } else {
    fields.status = 'STAYING';
  }

  writes.push({
    method: 'PATCH',
    table: 'Leases',
    body: { records: [{ id: lease.record_id, fields }], typecast: true },
  });

  const alertWorthy = requiresHuman && intent !== 'NO_SIGNAL';
  const cardLease = Object.assign({}, lease, fields, { record_id: lease.record_id });

  if (alertWorthy) {
    const card = atRiskAlertCard(cardLease, {});
    text = card.text;
    cardType = isCompliance ? 'atriskCompliance' : 'atrisk';
  } else {
    text = intent === 'NO_SIGNAL'
      ? 'Out-of-office reply logged for ' + lease.tenant_name + '. No action needed.'
      : 'Clean reply from ' + lease.tenant_name + ' (' + intent + '). Logged as a positive signal.';
    cardType = 'plain';
  }

  writes.push({
    method: 'POST',
    table: 'Outreach Log',
    body: {
      records: [{
        fields: {
          event_id: routed.event_id || ('reply-' + Date.now()),
          event_type: intent === 'NO_SIGNAL' ? 'NO_SIGNAL' : (intent === 'OPT_OUT' ? 'OPT_OUT' : 'REPLY_RECEIVED'),
          channel: 'EMAIL',
          direction: 'INBOUND',
          lease_id: lease.lease_id || '',
          tenant_name: lease.tenant_name || '',
          message_text: String(reply.reply_text || '').slice(0, 900),
          intent,
          grievance_category: fields.grievance_category,
          urgency: fields.urgency,
          compliance_flag: complianceFlag,
          confidence: fields.confidence,
          requires_human: requiresHuman,
          gmail_message_id: reply.message_id || '',
          created_at: nowIso,
        },
      }],
      typecast: true,
    },
  });
}

if (isUnmatched && !selected.duplicate) {
  writes.push({
    method: 'POST',
    table: 'Outreach Log',
    body: {
      records: [{
        fields: {
          event_id: routed.event_id || ('unmatched-' + Date.now()),
          event_type: 'UNMATCHED_REPLY',
          channel: 'EMAIL',
          direction: 'INBOUND',
          message_text: String(reply.reply_text || '').slice(0, 900),
          requires_human: true,
          gmail_message_id: reply.message_id || '',
          created_at: nowIso,
        },
      }],
      typecast: true,
    },
  });
}

if (selected.duplicate) {
  return [{
    json: {
      has_writes: false,
      card_type: 'none',
      chat_id: selected.chat_id,
      record_id: '',
      text: '',
      duplicate: true,
      processed_count: 0,
      alerted_count: 0,
      ok: true,
    },
  }];
}

return [{
  json: {
    writes,
    has_writes: writes.length > 0,
    card_type: cardType,
    chat_id: selected.chat_id,
    record_id: recordId,
    text,
    processed_count: 1,
    alerted_count: cardType.indexOf('atrisk') === 0 ? 1 : 0,
    unmatched: isUnmatched,
    waiting_count: selected.waiting_count || 0,
    ok: true,
  },
}];
`;

const emitWritesCode = `
const payload = $('Finalize Reply Route').first().json;
if (!payload.has_writes) return [];
return (payload.writes || []).map((write) => ({ json: write }));
`;

const buildCardCode = `
const payload = $('Finalize Reply Route').first().json;
return [{
  json: {
    chat_id: payload.chat_id,
    text: payload.text,
    record_id: payload.record_id || '',
    card_type: payload.card_type || 'plain',
    processed_count: payload.processed_count || 0,
    alerted_count: payload.alerted_count || 0,
    waiting_count: payload.waiting_count || 0,
    unmatched: Boolean(payload.unmatched),
    ok: true,
  },
}];
`;

const nodes = [
  webhookNode("Check Replies Webhook", "v2-check-replies", [-260, 300], { id: "wf8-check-replies" }),
  airtableListNode("Airtable Read Leases For Replies", "Leases", [-40, 300]),
  airtableListNode("Airtable Read Config For Replies", "Config", [160, 300]),
  airtableListNode("Airtable Read Log For Replies", "Outreach Log", [360, 300]),
  codeNode("Prepare Reply Source", prepareSourceCode, [560, 300]),
  ifNode("If Use Gmail", booleanCondition("={{ $json.use_gmail }}"), [760, 300]),
  gmailSearchNode("Gmail Search Replies", [980, 180]),
  codeNode("Select Gmail Reply", selectGmailCode, [1180, 180]),
  codeNode("Select Manual Reply", selectManualCode, [1180, 420]),
  ifNode("If Needs AI Classification", booleanCondition("={{ $json.needs_ai }}"), [1400, 300]),
  openAiNode("OpenAI Classify Reply", [1620, 180], "reply_classification", CLASSIFY_SCHEMA, { maxTokens: 700 }),
  codeNode("Finalize Reply Route", finalizeRouteCode, [1840, 300]),
  ifNode("If Has Reply Writes", booleanCondition("={{ $json.has_writes }}"), [2040, 300]),
  codeNode("Emit Reply Writes", emitWritesCode, [2260, 180]),
  airtableWriteNode("Airtable Write Reply", [2460, 180]),
  codeNode("Build Reply Card", buildCardCode, [2660, 300]),
  {
    parameters: {
      method: "POST",
      url: "http://localhost:5678/webhook/v2-sweep",
      sendBody: true,
      specifyBody: "json",
      jsonBody: '={{ JSON.stringify({ silent: true }) }}',
      options: { timeout: 120000 },
    },
    id: "wf8-refresh-metrics",
    name: "Refresh Metrics",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2860, 560],
    onError: "continueRegularOutput",
  },
  switchNode("Route Reply Card", [2860, 300], ["atrisk", "atriskCompliance", "none"]),
  telegramCardNode("Telegram At Risk Alert", [3080, 180], KEYBOARDS.atRisk),
  telegramCardNode("Telegram Compliance Alert", [3080, 340], KEYBOARDS.atRiskCompliance),
  telegramCardNode("Telegram Reply Notice", [3080, 500], null),
];

const connections = {
  "Check Replies Webhook": mainConnection("Airtable Read Leases For Replies"),
  "Airtable Read Leases For Replies": mainConnection("Airtable Read Config For Replies"),
  "Airtable Read Config For Replies": mainConnection("Airtable Read Log For Replies"),
  "Airtable Read Log For Replies": mainConnection("Prepare Reply Source"),
  "Prepare Reply Source": mainConnection("If Use Gmail"),
  "If Use Gmail": branchConnection(["Gmail Search Replies"], ["Select Manual Reply"]),
  "Gmail Search Replies": mainConnection("Select Gmail Reply"),
  "Select Gmail Reply": mainConnection("If Needs AI Classification"),
  "Select Manual Reply": mainConnection("If Needs AI Classification"),
  "If Needs AI Classification": branchConnection(["OpenAI Classify Reply"], ["Finalize Reply Route"]),
  "OpenAI Classify Reply": mainConnection("Finalize Reply Route"),
  "Finalize Reply Route": mainConnection("If Has Reply Writes"),
  "If Has Reply Writes": branchConnection(["Emit Reply Writes"], ["Build Reply Card"]),
  "Emit Reply Writes": mainConnection("Airtable Write Reply"),
  "Airtable Write Reply": mainConnection("Build Reply Card"),
  // The card and the scoreboard refresh run in parallel so the metrics table is
  // current without anyone triggering a sweep.
  "Build Reply Card": mainConnection("Route Reply Card", "Refresh Metrics"),
  "Route Reply Card": {
    main: [
      [{ node: "Telegram At Risk Alert", type: "main", index: 0 }],
      [{ node: "Telegram Compliance Alert", type: "main", index: 0 }],
      // "none" is deliberately a dead end: silent polls post nothing.
      [],
      [{ node: "Telegram Reply Notice", type: "main", index: 0 }],
    ],
  },
};

const wf = workflow("wf8-replies", "WF8 Reply Matching, Classification, and Routing", nodes, connections);

const outputPath = path.join(__dirname, "..", "..", "n8n-workflows", "wf8-replies.json");
fs.writeFileSync(outputPath, `${JSON.stringify(wf, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${nodes.length} nodes)`);
