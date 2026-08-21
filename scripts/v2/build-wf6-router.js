/**
 * Builds n8n-workflows/wf6-telegram-router.json.
 *
 * WF6 owns the bot's Telegram webhook. Telegram allows exactly one webhook per
 * bot, so every button press and every slash command in the demo enters here.
 *
 * Two entry paths:
 *   callback_query -> approve, skip, next, draft assist, send assist, discard,
 *                     mark resolved, send confirmation
 *   message        -> /generate, /nudge, /handoff, /check, /sweep, /reset, /status
 *
 * The callback path is deliberately linear rather than one branch per action:
 * a single Decide Action node resolves what the tap means, then the flow passes
 * through at most one OpenAI call and at most one Gmail send before writing to
 * Airtable and answering in Telegram. Every resident-facing send on this path is
 * the direct result of a manager tapping a button.
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
  gmailSendNode,
  ifNode,
  loadLib,
  loadStageLib,
  mainConnection,
  KEYBOARDS,
  openAiNode,
  switchNode,
  telegramCardNode,
  workflow,
} = require("./workflow-common.js");

const cadenceLib = loadLib("cadence-lib.js");
const telegramLib = loadLib("telegram-ui-lib.js");
const metricsLib = loadLib("metrics-lib.js");
const outboundLib = loadStageLib("stage-5-outbound-lib.js");

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

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", maxLength: 90 },
    body: { type: "string", maxLength: 900 },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

const routeUpdateCode = `${telegramLib}

const update = $json;
const callback = update.callback_query || null;
const message = update.message || null;

if (callback) {
  const decoded = decodeCallback(callback.data);
  return [{
    json: {
      kind: 'callback',
      action: decoded.action,
      record_id: decoded.record_id,
      chat_id: String(callback.message && callback.message.chat ? callback.message.chat.id : ''),
      callback_query_id: String(callback.id || ''),
      edit_text: '',
      is_callback: true,
      is_edit_text: false,
      needs_lease_lookup: true,
      is_command: false,
    },
  }];
}

const text = message && message.text ? String(message.text).trim() : '';
const command = text.split(/\\s+/)[0].replace(/^\\//, '').toLowerCase();

const COMMANDS = {
  generate: { path: 'v2-generate', body: { touch: 'CHECK_IN_90' } },
  nudge: { path: 'v2-generate', body: { touch: 'NUDGE_60' } },
  handoff: { path: 'v2-generate', body: { touch: 'HANDOFF_30' } },
  check: { path: 'v2-check-replies', body: {} },
  sweep: { path: 'v2-sweep', body: {} },
  status: { path: 'v2-sweep', body: { digest_only: true } },
};

const mapped = COMMANDS[command] || null;
const isSlashCommand = text.charAt(0) === '/';

// Any plain message that is not a slash command is treated as replacement
// wording for whichever draft the manager last tapped Edit on.
const isEditText = !mapped && !isSlashCommand && Boolean(text);

return [{
  json: {
    kind: mapped ? 'command' : (isEditText ? 'edit_text' : 'ignore'),
    command,
    action: isEditText ? 'edt_apply' : '',
    edit_text: isEditText ? text : '',
    record_id: '',
    callback_query_id: '',
    target_path: mapped ? mapped.path : '',
    target_body: mapped ? mapped.body : {},
    chat_id: String(message && message.chat ? message.chat.id : ''),
    is_callback: false,
    is_edit_text: isEditText,
    needs_lease_lookup: isEditText,
    is_command: Boolean(mapped),
  },
}];
`;

const commandRequestCode = `
const routed = $json;
return [{
  json: {
    method: 'POST',
    url: 'http://localhost:5678/webhook/' + routed.target_path,
    body: routed.target_body || {},
    chat_id: routed.chat_id,
    command: routed.command,
  },
}];
`;

const decideActionCode = `${AIRTABLE_HELPERS}
${telegramLib}
${cadenceLib}
${outboundLib}

const routed = $('Route Telegram Update').first().json;
const leases = flattenAirtable($('Airtable Read Leases For Action').all());
const configRows = flattenAirtable($('Airtable Read Config For Action').all());
const config = configMap(configRows);

// A pending edit remembers which draft the manager tapped Edit on, so the next
// plain message they send can be applied to the right resident and field.
const pendingRow = configRows.find((row) => row.key === 'pending_edit') || null;
const pendingParts = String((pendingRow && pendingRow.value) || '').split('|');
const pendingRecordId = pendingParts[0] || '';
const pendingField = pendingParts[1] || 'draft_body';

const action = routed.action;
const targetRecordId = action === 'edt_apply' ? pendingRecordId : routed.record_id;
const lease = leases.find((row) => row.record_id === targetRecordId) || null;
const status = lease ? String(lease.status || '').toUpperCase() : '';

const result = {
  action,
  record_id: targetRecordId,
  edit_text: routed.edit_text || '',
  edit_field: pendingField,
  pending_config_record_id: pendingRow ? pendingRow.record_id : '',
  chat_id: routed.chat_id,
  callback_query_id: routed.callback_query_id,
  config,
  lease,
  needs_openai: false,
  needs_gmail: false,
  outcome: 'ok',
  prompt: '',
  instructions: '',
  model: config.model_draft || 'gpt-5.6-luna',
};

if (action === 'edt_apply' && !pendingRecordId) {
  result.outcome = 'no_pending_edit';
  result.text = 'Nothing is waiting to be edited. Tap "Edit wording" on a draft first, then send the new text.';
  return [{ json: result }];
}

if (!lease) {
  result.outcome = 'missing_record';
  result.text = 'That resident record could not be found.';
  return [{ json: result }];
}

// Idempotency guards. A second tap must never produce a second email.
if (action === ACTIONS.APPROVE_SEND && status === 'SENT') {
  result.outcome = 'already_sent';
  result.text = 'Already sent to ' + lease.tenant_name + '. No second email was sent.';
  return [{ json: result }];
}

if (action === ACTIONS.APPROVE_SEND && status !== 'AWAITING_APPROVAL') {
  result.outcome = 'not_approvable';
  result.text = 'That draft is no longer awaiting approval (status ' + status + ').';
  return [{ json: result }];
}

if (action === ACTIONS.SEND_CONFIRMATION && lease.confirmation_sent_at) {
  result.outcome = 'already_sent';
  result.text = 'The confirmation was already sent.';
  return [{ json: result }];
}

// Skip may only retire a draft that is still awaiting a decision. Skipping an
// already-sent resident would clear the sent record and make them eligible for
// a second check-in, so it is refused outright.
if (action === ACTIONS.SKIP_DRAFT && status !== 'AWAITING_APPROVAL' && status !== 'REVIEW_FAILED') {
  result.outcome = 'not_skippable';
  result.text = status === 'SENT'
    ? 'Already sent to ' + lease.tenant_name + '. Skip does nothing once a message has gone out.'
    : 'There is no pending draft to skip (status ' + status + ').';
  return [{ json: result }];
}

if (action === ACTIONS.APPROVE_SEND) {
  result.needs_gmail = true;
} else if (action === ACTIONS.SEND_ASSIST) {
  if (!String(lease.assist_draft || '').trim()) {
    result.outcome = 'no_draft';
    result.text = 'There is no drafted reply to send.';
  } else {
    result.needs_gmail = true;
  }
} else if (action === ACTIONS.DRAFT_ASSIST) {
  result.needs_openai = true;
  result.instructions = 'Return only JSON with keys subject and body.';
  result.prompt = buildAssistPrompt(lease, config);
} else if (action === ACTIONS.MARK_RESOLVED) {
  result.needs_openai = true;
  result.instructions = 'Return only JSON with keys subject and body.';
  result.prompt = buildConfirmationPrompt(lease, config);
} else if (action === ACTIONS.SEND_CONFIRMATION) {
  result.needs_gmail = Boolean(String(lease.assist_draft || '').trim());
  if (!result.needs_gmail) {
    result.outcome = 'no_draft';
    result.text = 'There is no confirmation message to send.';
  }
}

return [{ json: result }];
`;

const applyActionCode = `${AIRTABLE_HELPERS}
${telegramLib}
${cadenceLib}
${metricsLib}
${outboundLib}

const decided = $('Decide Action').first().json;
const lease = decided.lease;
const config = decided.config || {};
const action = decided.action;
const nowIso = new Date().toISOString();

const out = {
  action,
  record_id: decided.record_id,
  chat_id: decided.chat_id,
  callback_query_id: decided.callback_query_id,
  outcome: decided.outcome,
  needs_gmail: false,
  lease,
  config,
  airtable_fields: null,
  log_row: null,
  config_write: null,
  pending_config_record_id: decided.pending_config_record_id || '',
  text: decided.text || '',
  card_type: 'plain',
};

if (decided.outcome !== 'ok' || !lease) {
  return [{ json: out }];
}

// Pull the model's reply draft when this action produced one.
let modelDraft = null;
if (decided.needs_openai) {
  try {
    const raw = $('OpenAI Draft Reply').first().json;
    const parsed = extractJsonCandidate(raw);
    if (parsed && (parsed.body || parsed.subject)) {
      modelDraft = { subject: String(parsed.subject || ''), body: String(parsed.body || '') };
    }
  } catch (error) {
    modelDraft = null;
  }
}

const footer = buildFooter(config);
const refSubject = String(lease.draft_subject || '').trim();

function replySubject() {
  return refSubject ? (/^re:/i.test(refSubject) ? refSubject : 'Re: ' + refSubject) : 'Re: your message';
}

if (action === ACTIONS.APPROVE_SEND) {
  // Guardrails re-run here, not just at drafting time, because a manager may have
  // edited draft_body in Airtable since. Whatever is about to be sent is what gets
  // checked.
  const guard = guardDraft(lease, lease.draft_subject, lease.draft_body);
  if (!guard.ok) {
    out.outcome = 'guard_failed';
    out.text = 'This message was not sent. The edited wording failed the safety checks: '
      + guard.violations.join('; ') + '. Fix it in Airtable and approve again.';
    return [{ json: out }];
  }
  out.needs_gmail = true;
  out.to_email = lease.email;
  out.subject = lease.draft_subject;
  out.body = String(lease.draft_body || '') + footer;
  out.airtable_fields = { status: 'SENT', sent_at: nowIso };
  out.log_row = {
    event_type: 'SENT',
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    message_text: lease.draft_subject,
    approved_by: config.manager_name || 'manager',
  };
  out.text = 'Sent to ' + lease.tenant_name + ' at ' + lease.unit + '.';
} else if (action === ACTIONS.SKIP_DRAFT) {
  out.airtable_fields = { status: 'PENDING', touch_stage: 'NONE', draft_subject: '', draft_body: '' };
  out.log_row = { event_type: 'SKIPPED', channel: 'SYSTEM', direction: 'INTERNAL', message_text: 'Draft skipped by manager' };
  out.text = 'Skipped ' + lease.tenant_name + '. Nothing was sent.';
} else if (action === ACTIONS.EDIT_DRAFT) {
  // Arm an edit. The field chosen depends on what the card was showing.
  const field = String(lease.assist_draft || '').trim() ? 'assist_draft' : 'draft_body';
  out.config_write = { key: 'pending_edit', value: lease.record_id + '|' + field };
  out.text = 'Send me the new wording for ' + lease.tenant_name
    + ' as a plain message. It replaces the current text and still has to pass the safety checks.';
} else if (action === 'edt_apply') {
  const field = decided.edit_field === 'assist_draft' ? 'assist_draft' : 'draft_body';
  const newText = String(decided.edit_text || '').trim();

  // The manager's own wording is checked exactly like the model's.
  const guard = field === 'assist_draft'
    ? guardReply(lease, replySubject(), newText)
    : guardDraft(lease, lease.draft_subject, newText);

  if (!guard.ok) {
    out.outcome = 'guard_failed';
    out.text = 'That wording was not saved. It failed the safety checks: '
      + guard.violations.join('; ') + '. Send a revised version.';
  } else {
    const fields = {};
    fields[field] = newText;
    out.airtable_fields = fields;
    out.config_write = { key: 'pending_edit', value: '' };
    out.log_row = {
      event_type: 'DRAFTED',
      channel: 'SYSTEM',
      direction: 'INTERNAL',
      message_text: 'Manager edited the ' + field.replace('_', ' '),
      approved_by: config.manager_name || 'manager',
    };

    const updated = Object.assign({}, lease, fields);
    if (field === 'assist_draft') {
      const card = assistApprovalCard(updated);
      out.text = card.text;
      out.card_type = 'assist';
    } else {
      const card = draftApprovalCard(updated, {});
      out.text = card.text;
      out.card_type = 'draft';
    }
  }
} else if (action === ACTIONS.NEXT_DRAFT) {
  const card = draftApprovalCard(lease, {});
  out.text = card.text;
  out.card_type = String(lease.status || '').toUpperCase() === 'AWAITING_APPROVAL' ? 'draft' : 'plain';
} else if (action === ACTIONS.DRAFT_ASSIST) {
  if (!modelDraft) {
    out.outcome = 'openai_failed';
    out.text = 'The reply could not be drafted. Nothing was sent. Write this one yourself.';
  } else {
    const guard = guardReply(lease, modelDraft.subject, modelDraft.body);
    if (!guard.ok) {
      out.outcome = 'guard_failed';
      out.text = 'The drafted reply failed the safety checks (' + guard.violations.join('; ') + '). Nothing was sent.';
    } else {
      // Stored without the footer: the footer mentions renewal and lease wording
      // that the reply guardrail would reject on the re-check at send time.
      const draftText = modelDraft.body;
      out.airtable_fields = { assist_draft: draftText };
      const card = assistApprovalCard(Object.assign({}, lease, { assist_draft: draftText }));
      out.text = card.text;
      out.card_type = 'assist';
    }
  }
} else if (action === ACTIONS.SEND_ASSIST) {
  const guard = guardReply(lease, replySubject(), lease.assist_draft);
  if (!guard.ok) {
    out.outcome = 'guard_failed';
    out.text = 'This reply was not sent. The wording failed the safety checks: '
      + guard.violations.join('; ') + '. Fix it in Airtable and send again.';
    return [{ json: out }];
  }
  out.needs_gmail = true;
  out.to_email = lease.email;
  out.subject = replySubject();
  out.body = String(lease.assist_draft || '') + footer;
  out.airtable_fields = { assist_draft: '' };
  out.log_row = {
    event_type: 'ASSIST_SENT',
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    message_text: String(lease.assist_draft || '').slice(0, 900),
    approved_by: config.manager_name || 'manager',
  };
  out.text = 'Reply sent to ' + lease.tenant_name + '.';
} else if (action === ACTIONS.DISCARD_ASSIST) {
  out.airtable_fields = { assist_draft: '' };
  out.log_row = { event_type: 'SKIPPED', channel: 'SYSTEM', direction: 'INTERNAL', message_text: 'Drafted reply discarded' };
  out.text = 'Discarded. Nothing was sent to the resident.';
} else if (action === ACTIONS.MARK_RESOLVED) {
  const openedAt = lease.issue_opened_at || lease.sent_at || nowIso;
  const elapsedDays = Math.max(0, Math.round(((new Date(nowIso) - new Date(openedAt)) / 86400000) * 10) / 10);
  const turnoverCost = Number(config.avg_turnover_cost || 3900);

  const fields = {
    issue_status: 'RESOLVED',
    issue_resolved_at: nowIso,
    days_to_resolve: elapsedDays,
    status: 'RESOLVED',
    turnover_exposure: 0,
  };

  if (modelDraft) {
    const guard = guardReply(lease, modelDraft.subject, modelDraft.body);
    fields.assist_draft = guard.ok ? modelDraft.body : '';
  }

  out.airtable_fields = fields;
  out.log_row = {
    event_type: 'RESOLVED',
    channel: 'SYSTEM',
    direction: 'INTERNAL',
    message_text: 'Issue marked resolved after ' + elapsedDays + ' days',
    approved_by: config.manager_name || 'manager',
  };

  const card = resolutionCard(
    Object.assign({}, lease, { days_to_resolve: elapsedDays, assist_draft: fields.assist_draft || '' }),
    { exposure_recovered: turnoverCost }
  );
  out.text = card.text;
  out.card_type = fields.assist_draft ? 'resolution' : 'plain';
} else if (action === ACTIONS.SEND_CONFIRMATION) {
  const guard = guardReply(lease, replySubject(), lease.assist_draft);
  if (!guard.ok) {
    out.outcome = 'guard_failed';
    out.text = 'The confirmation was not sent. The wording failed the safety checks: '
      + guard.violations.join('; ') + '. Fix it in Airtable and send again.';
    return [{ json: out }];
  }
  out.needs_gmail = true;
  out.to_email = lease.email;
  out.subject = replySubject();
  out.body = String(lease.assist_draft || '') + footer;
  out.airtable_fields = { confirmation_sent_at: nowIso, assist_draft: '' };
  out.log_row = {
    event_type: 'CONFIRMATION_SENT',
    channel: 'EMAIL',
    direction: 'OUTBOUND',
    message_text: String(lease.assist_draft || '').slice(0, 900),
    approved_by: config.manager_name || 'manager',
  };
  out.text = 'Confirmation sent to ' + lease.tenant_name + '.';
} else {
  out.outcome = 'unknown_action';
  out.text = 'That button is not recognised.';
}

return [{ json: out }];
`;

const finalizeActionCode = `${AIRTABLE_HELPERS}

const applied = $('Apply Action').first().json;
const nowIso = new Date().toISOString();

let gmailId = '';
let gmailFailed = false;
if (applied.needs_gmail) {
  try {
    const sent = $('Gmail Send Resident Message').first().json;
    gmailId = String(sent.id || sent.messageId || '');
    if (sent.error) gmailFailed = true;
  } catch (error) {
    gmailFailed = true;
  }
}

const writes = [];

// A failed Gmail send must be visible, never silent.
let fields = applied.airtable_fields;
let text = applied.text;

if (gmailFailed) {
  fields = { status: 'SEND_FAILED' };
  text = 'The send failed for ' + (applied.lease ? applied.lease.tenant_name : 'this resident') + '. Nothing reached the resident. Check the Gmail node.';
}

if (fields && applied.record_id) {
  writes.push({
    method: 'PATCH',
    table: 'Leases',
    body: { records: [{ id: applied.record_id, fields }], typecast: true },
  });
}

// Pending-edit state lives in the Config table so it survives restarts.
if (applied.config_write && !gmailFailed) {
  if (applied.pending_config_record_id) {
    writes.push({
      method: 'PATCH',
      table: 'Config',
      body: {
        records: [{
          id: applied.pending_config_record_id,
          fields: { value: applied.config_write.value, updated_at: nowIso },
        }],
        typecast: true,
      },
    });
  } else if (applied.config_write.value) {
    writes.push({
      method: 'POST',
      table: 'Config',
      body: {
        records: [{
          fields: {
            key: applied.config_write.key,
            value: applied.config_write.value,
            value_type: 'string',
            description: 'Draft currently awaiting edited wording from Telegram.',
            updated_at: nowIso,
          },
        }],
        typecast: true,
      },
    });
  }
}

if (applied.log_row && !gmailFailed) {
  const lease = applied.lease || {};
  writes.push({
    method: 'POST',
    table: 'Outreach Log',
    body: {
      records: [{
        fields: Object.assign(
          {
            event_id: applied.action + '-' + (lease.lease_id || applied.record_id) + '-' + Date.now(),
            lease_id: lease.lease_id || '',
            tenant_name: lease.tenant_name || '',
            gmail_message_id: gmailId,
            created_at: nowIso,
          },
          applied.log_row
        ),
      }],
      typecast: true,
    },
  });
}

return [{
  json: {
    writes,
    has_writes: writes.length > 0,
    chat_id: applied.chat_id,
    text,
    card_type: gmailFailed ? 'plain' : (applied.card_type || 'plain'),
    record_id: applied.record_id,
    callback_query_id: applied.callback_query_id,
    action: applied.action,
    outcome: gmailFailed ? 'send_failed' : applied.outcome,
  },
}];
`;

const emitWritesCode = `
const payload = $('Finalize Action').first().json;
if (!payload.has_writes) return [];
return (payload.writes || []).map((write) => ({ json: write }));
`;

const buildReplyCode = `
const payload = $('Finalize Action').first().json;
return [{
  json: {
    chat_id: payload.chat_id,
    text: payload.text,
    card_type: payload.card_type || 'plain',
    record_id: payload.record_id || '',
    callback_query_id: payload.callback_query_id,
    action: payload.action,
    outcome: payload.outcome,
  },
}];
`;

const nodes = [
  {
    parameters: { updates: ["callback_query", "message"], additionalFields: {} },
    id: "wf6-telegram-trigger",
    name: "Telegram Trigger",
    type: "n8n-nodes-base.telegramTrigger",
    typeVersion: 1.2,
    position: [-260, 300],
    webhookId: "wf6-telegram-trigger",
    credentials: {
      telegramApi: { id: PLACEHOLDER.TELEGRAM_CRED, name: "Telegram account" },
    },
  },
  codeNode("Route Telegram Update", routeUpdateCode, [-40, 300]),
  ifNode("If Needs Lease Lookup", booleanCondition("={{ $json.needs_lease_lookup }}"), [180, 300]),

  // Command path
  ifNode("If Is Command", booleanCondition("={{ $json.is_command }}"), [400, 520]),
  codeNode("Build Command Request", commandRequestCode, [620, 520]),
  {
    parameters: {
      method: "={{ $json.method }}",
      url: "={{ $json.url }}",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.body) }}",
      options: { timeout: 180000 },
    },
    id: "wf6-run-command",
    name: "Run Command Workflow",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [840, 520],
    onError: "continueRegularOutput",
  },

  // Callback path
  airtableListNode("Airtable Read Leases For Action", "Leases", [400, 180]),
  airtableListNode("Airtable Read Config For Action", "Config", [600, 180]),
  codeNode("Decide Action", decideActionCode, [800, 180]),
  ifNode("If Needs OpenAI", booleanCondition("={{ $json.needs_openai }}"), [1000, 180]),
  openAiNode("OpenAI Draft Reply", [1220, 80], "resident_reply", REPLY_SCHEMA, { maxTokens: 900 }),
  codeNode("Apply Action", applyActionCode, [1440, 180]),
  ifNode("If Needs Gmail", booleanCondition("={{ $json.needs_gmail }}"), [1640, 180]),
  gmailSendNode("Gmail Send Resident Message", [1860, 80]),
  codeNode("Finalize Action", finalizeActionCode, [2080, 180]),
  ifNode("If Has Writes", booleanCondition("={{ $json.has_writes }}"), [2280, 180]),
  codeNode("Emit Action Writes", emitWritesCode, [2500, 80]),
  airtableWriteNode("Airtable Write Action", [2700, 80]),
  codeNode("Build Telegram Reply", buildReplyCode, [2500, 300]),
  switchNode("Route Card Type", [2700, 300], ["draft", "assist", "resolution"]),
  telegramCardNode("Telegram Reply Draft Card", [2920, 120], KEYBOARDS.draft),
  telegramCardNode("Telegram Reply Assist Card", [2920, 280], KEYBOARDS.assist),
  telegramCardNode("Telegram Reply Resolution Card", [2920, 440], KEYBOARDS.resolution),
  telegramCardNode("Telegram Reply Plain", [2920, 600], null),
];

const connections = {
  "Telegram Trigger": mainConnection("Route Telegram Update"),
  "Route Telegram Update": mainConnection("If Needs Lease Lookup"),
  "If Needs Lease Lookup": branchConnection(["Airtable Read Leases For Action"], ["If Is Command"]),

  "If Is Command": branchConnection(["Build Command Request"], []),
  "Build Command Request": mainConnection("Run Command Workflow"),

  "Airtable Read Leases For Action": mainConnection("Airtable Read Config For Action"),
  "Airtable Read Config For Action": mainConnection("Decide Action"),
  "Decide Action": mainConnection("If Needs OpenAI"),
  "If Needs OpenAI": branchConnection(["OpenAI Draft Reply"], ["Apply Action"]),
  "OpenAI Draft Reply": mainConnection("Apply Action"),
  "Apply Action": mainConnection("If Needs Gmail"),
  "If Needs Gmail": branchConnection(["Gmail Send Resident Message"], ["Finalize Action"]),
  "Gmail Send Resident Message": mainConnection("Finalize Action"),
  "Finalize Action": mainConnection("If Has Writes"),
  "If Has Writes": branchConnection(["Emit Action Writes"], ["Build Telegram Reply"]),
  "Emit Action Writes": mainConnection("Airtable Write Action"),
  "Airtable Write Action": mainConnection("Build Telegram Reply"),
  "Build Telegram Reply": mainConnection("Route Card Type"),
  "Route Card Type": {
    main: [
      [{ node: "Telegram Reply Draft Card", type: "main", index: 0 }],
      [{ node: "Telegram Reply Assist Card", type: "main", index: 0 }],
      [{ node: "Telegram Reply Resolution Card", type: "main", index: 0 }],
      [{ node: "Telegram Reply Plain", type: "main", index: 0 }],
    ],
  },
};

const wf = workflow("wf6-telegram-router", "WF6 Telegram Router and Actions", nodes, connections);

const outputPath = path.join(__dirname, "..", "..", "n8n-workflows", "wf6-telegram-router.json");
fs.writeFileSync(outputPath, `${JSON.stringify(wf, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${nodes.length} nodes)`);
