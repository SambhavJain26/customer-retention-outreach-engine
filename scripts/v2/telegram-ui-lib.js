/**
 * Telegram card and inline-keyboard builders for the v2 demo.
 *
 * This file is inlined into n8n Code nodes at import time, the same way the v1
 * stage libraries are, so it must stay dependency-free and browser-safe.
 *
 * Telegram constraints enforced here:
 *  - callback_data must be 64 bytes or fewer. Actions use 3-character prefixes
 *    plus an Airtable record id (17 chars), so the longest payload is ~21 bytes.
 *  - message text must be 4096 characters or fewer. Long drafts are truncated
 *    for display only; the stored draft is never shortened.
 *  - only one Telegram Trigger may be active per bot, so every button in this
 *    file is routed through WF6.
 */

const CALLBACK_MAX_BYTES = 64;
const MESSAGE_MAX_CHARS = 4096;

const ACTIONS = {
  APPROVE_SEND: "apv",
  SKIP_DRAFT: "skp",
  NEXT_DRAFT: "nxt",
  DRAFT_ASSIST: "ast",
  SEND_ASSIST: "snd",
  DISCARD_ASSIST: "dis",
  MARK_RESOLVED: "res",
  SEND_CONFIRMATION: "cnf",
  ACK_HANDOFF: "hnd",
  EDIT_DRAFT: "edt",
};

function textOf(value) {
  return value == null ? "" : String(value).trim();
}

function escapeHtml(value) {
  return textOf(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(value, limit) {
  const text = textOf(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1))}…`;
}

/** Encodes a button payload and fails loudly rather than letting Telegram reject it. */
function encodeCallback(action, recordId) {
  const payload = `${action}:${textOf(recordId)}`;
  const size = Buffer.byteLength(payload, "utf8");
  if (size > CALLBACK_MAX_BYTES) {
    throw new Error(`callback_data is ${size} bytes, over Telegram's ${CALLBACK_MAX_BYTES}-byte cap: ${payload}`);
  }
  return payload;
}

function decodeCallback(callbackData) {
  const raw = textOf(callbackData);
  const separator = raw.indexOf(":");
  if (separator === -1) return { action: raw, record_id: "" };
  return {
    action: raw.slice(0, separator),
    record_id: raw.slice(separator + 1),
  };
}

function keyboard(rows) {
  return { inline_keyboard: rows.filter((row) => row && row.length) };
}

function button(label, action, recordId) {
  return { text: label, callback_data: encodeCallback(action, recordId) };
}

function formatDate(value) {
  const text = textOf(value);
  if (!text) return "unknown";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toISOString().slice(0, 10);
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "$0";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function badgeLine(lease) {
  return [
    textOf(lease.intent),
    textOf(lease.grievance_category) && textOf(lease.grievance_category) !== "NONE"
      ? textOf(lease.grievance_category)
      : "",
    textOf(lease.compliance_flag) && textOf(lease.compliance_flag) !== "NONE"
      ? textOf(lease.compliance_flag)
      : "",
    textOf(lease.urgency),
  ]
    .filter(Boolean)
    .join(" / ");
}

function residentHeader(lease) {
  const days = textOf(lease.days_to_expiry);
  const leaseEnd = formatDate(lease.lease_end_date);
  const tenure = textOf(lease.tenure_months);
  const parts = [`Lease ends ${leaseEnd}`];
  if (days) parts.push(`${days} days out`);
  if (tenure) parts.push(`${tenure} months resident`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ cards */

/**
 * Summary posted once per generation run, before the individual draft cards.
 */
function generationSummaryCard(summary) {
  const lines = [
    `<b>${escapeHtml(summary.touch_label || "Check-ins")} drafted</b>`,
    "",
    `${summary.drafted_count} ready for review`,
  ];

  if (summary.review_failed_count) {
    lines.push(`${summary.review_failed_count} need wording (checks failed twice)`);
  }
  if (summary.handoff_count) {
    lines.push(`${summary.handoff_count} flagged for leasing handoff (no resident email)`);
  }
  if (summary.exposure != null) {
    lines.push("", `Turnover exposure in this window: <b>${formatMoney(summary.exposure)}</b>`);
  }

  lines.push("", "Nothing sends until you approve it.");

  return {
    text: lines.join("\n"),
    reply_markup: summary.first_record_id
      ? keyboard([[button("▶️ Review first draft", ACTIONS.NEXT_DRAFT, summary.first_record_id)]])
      : undefined,
  };
}

/**
 * A single draft awaiting approval. This is the core approval moment.
 */
function draftApprovalCard(lease, options = {}) {
  const lines = [
    `<b>${escapeHtml(lease.tenant_name)} · ${escapeHtml(lease.unit)}</b>`,
    residentHeader(lease),
    "",
    `<b>Subject:</b> ${escapeHtml(lease.draft_subject)}`,
    "",
    escapeHtml(truncate(lease.draft_body, 2400)),
  ];

  if (options.position && options.total) {
    lines.push("", `Draft ${options.position} of ${options.total}`);
  }

  const rows = [
    [
      button("✅ Approve & Send", ACTIONS.APPROVE_SEND, lease.record_id),
      button("⏭ Skip", ACTIONS.SKIP_DRAFT, lease.record_id),
    ],
  ];

  if (options.next_record_id) {
    rows.push([button("➡️ Next draft", ACTIONS.NEXT_DRAFT, options.next_record_id)]);
  }

  return { text: truncate(lines.join("\n"), MESSAGE_MAX_CHARS), reply_markup: keyboard(rows) };
}

/**
 * A draft that failed guardrails twice. Deliberately has no approve button.
 */
function reviewFailedCard(lease) {
  return {
    text: [
      `<b>Needs wording · ${escapeHtml(lease.tenant_name)}, ${escapeHtml(lease.unit)}</b>`,
      "",
      `The draft failed the safety checks twice: ${escapeHtml(lease.data_quality || "see workflow log")}`,
      "",
      "No approve button is offered. Write this one yourself.",
    ].join("\n"),
  };
}

/**
 * 30-day cohort handoff. Internal only - never emails the resident.
 */
function leasingHandoffCard(leases) {
  const lines = [
    `<b>Leasing handoff · ${leases.length} residents at 30 days</b>`,
    "",
    "These are inside the renewal-offer window. No resident email is sent from here — this is a handoff to your leasing team.",
    "",
  ];

  leases.slice(0, 15).forEach((lease) => {
    lines.push(`• ${escapeHtml(lease.tenant_name)}, ${escapeHtml(lease.unit)} — ends ${formatDate(lease.lease_end_date)}`);
  });

  return { text: truncate(lines.join("\n"), MESSAGE_MAX_CHARS) };
}

/**
 * A reply that needs a person. Mirrors the v1 alert content and adds actions.
 */
function atRiskAlertCard(lease, options = {}) {
  const complianceFlag = textOf(lease.compliance_flag);
  const isCompliance = complianceFlag && complianceFlag !== "NONE";

  const lines = [
    `<b>AT RISK · ${escapeHtml(lease.tenant_name)}, ${escapeHtml(lease.unit)}</b>`,
    residentHeader(lease),
    "",
    badgeLine(lease),
    "",
    `<i>"${escapeHtml(truncate(lease.reply_text, 1200))}"</i>`,
    "",
    `<b>Action:</b> ${escapeHtml(lease.suggested_action)}`,
    `Confidence: ${escapeHtml(lease.confidence)}`,
  ];

  if (isCompliance) {
    lines.push("", "<b>No response was drafted.</b>");
  }

  const rows = [];

  // Compliance-sensitive replies get no one-tap assist. A person decides first.
  if (!isCompliance) {
    rows.push([button("✍️ Draft my reply", ACTIONS.DRAFT_ASSIST, lease.record_id)]);
  }
  if (options.allow_resolve !== false) {
    rows.push([button("✅ Mark resolved", ACTIONS.MARK_RESOLVED, lease.record_id)]);
  }

  return {
    text: truncate(lines.join("\n"), MESSAGE_MAX_CHARS),
    reply_markup: rows.length ? keyboard(rows) : undefined,
  };
}

/**
 * A drafted reply to the resident, awaiting explicit approval before it sends.
 */
function assistApprovalCard(lease) {
  return {
    text: truncate(
      [
        `<b>Suggested reply · ${escapeHtml(lease.tenant_name)}, ${escapeHtml(lease.unit)}</b>`,
        "",
        escapeHtml(truncate(lease.assist_draft, 2800)),
        "",
        "This has not been sent. Approve it and it goes to the resident as written.",
      ].join("\n"),
      MESSAGE_MAX_CHARS
    ),
    reply_markup: keyboard([
      [
        button("✅ Send reply", ACTIONS.SEND_ASSIST, lease.record_id),
        button("⏭ Discard", ACTIONS.DISCARD_ASSIST, lease.record_id),
      ],
    ]),
  };
}

/**
 * Confirmation that the issue is closed, plus the optional resident follow-up.
 */
function resolutionCard(lease, options = {}) {
  const lines = [
    `<b>Issue resolved · ${escapeHtml(lease.tenant_name)}, ${escapeHtml(lease.unit)}</b>`,
    "",
  ];

  if (lease.days_to_resolve != null && lease.days_to_resolve !== "") {
    lines.push(`Closed in ${lease.days_to_resolve} days.`);
  }
  if (options.exposure_recovered != null) {
    lines.push(`Turnover exposure recovered: <b>${formatMoney(options.exposure_recovered)}</b>`);
  }

  if (textOf(lease.assist_draft)) {
    lines.push("", "<b>Follow-up ready for the resident:</b>", "", escapeHtml(truncate(lease.assist_draft, 2000)));
    return {
      text: truncate(lines.join("\n"), MESSAGE_MAX_CHARS),
      reply_markup: keyboard([
        [
          button("✅ Send confirmation", ACTIONS.SEND_CONFIRMATION, lease.record_id),
          button("⏭ Skip", ACTIONS.DISCARD_ASSIST, lease.record_id),
        ],
      ]),
    };
  }

  return { text: truncate(lines.join("\n"), MESSAGE_MAX_CHARS) };
}

/**
 * A reply that could not be matched to a resident. Never guesses an owner.
 */
function unmatchedReplyCard(reply) {
  return {
    text: truncate(
      [
        "<b>Unmatched reply</b>",
        "",
        `From: ${escapeHtml(reply.from_email || "unknown sender")}`,
        `Subject: ${escapeHtml(reply.subject || "(none)")}`,
        "",
        `<i>"${escapeHtml(truncate(reply.reply_text, 1000))}"</i>`,
        "",
        "No reference code matched and the sender is not in the roster. No resident was assigned. Find the resident manually before replying.",
      ].join("\n"),
      MESSAGE_MAX_CHARS
    ),
  };
}

/** Daily sweep digest. */
function sweepDigestCard(summary) {
  return {
    text: [
      `<b>${escapeHtml(summary.company_name || "Portfolio")} daily sweep</b>`,
      "",
      `${summary.recomputed_count} residents checked`,
      `${summary.at_risk_count} at risk · ${summary.staying_count} staying · ${summary.escalated_count} newly escalated`,
      `${summary.issues_resolved || 0} issues resolved`,
      "",
      `Exposure open: <b>${formatMoney(summary.turnover_exposure)}</b>`,
      `Exposure recovered: <b>${formatMoney(summary.exposure_recovered)}</b>`,
    ].join("\n"),
  };
}

/** Short acknowledgement text shown in Telegram's toast after a button press. */
function acknowledgement(action, outcome) {
  const map = {
    [ACTIONS.APPROVE_SEND]: outcome === "already_sent" ? "Already sent" : "Approved and sent",
    [ACTIONS.SKIP_DRAFT]: "Skipped",
    [ACTIONS.NEXT_DRAFT]: "Loading next draft",
    [ACTIONS.DRAFT_ASSIST]: "Drafting a reply",
    [ACTIONS.SEND_ASSIST]: outcome === "already_sent" ? "Already sent" : "Reply sent",
    [ACTIONS.DISCARD_ASSIST]: "Discarded",
    [ACTIONS.MARK_RESOLVED]: "Marked resolved",
    [ACTIONS.SEND_CONFIRMATION]: outcome === "already_sent" ? "Already sent" : "Confirmation sent",
    [ACTIONS.ACK_HANDOFF]: "Acknowledged",
    [ACTIONS.EDIT_DRAFT]: "Waiting for your wording",
  };
  return map[action] || "Done";
}

if (typeof module !== "undefined") {
  module.exports = {
    ACTIONS,
    CALLBACK_MAX_BYTES,
    MESSAGE_MAX_CHARS,
    acknowledgement,
    assistApprovalCard,
    atRiskAlertCard,
    badgeLine,
    decodeCallback,
    draftApprovalCard,
    encodeCallback,
    escapeHtml,
    formatMoney,
    generationSummaryCard,
    leasingHandoffCard,
    residentHeader,
    resolutionCard,
    reviewFailedCard,
    sweepDigestCard,
    truncate,
    unmatchedReplyCard,
  };
}
