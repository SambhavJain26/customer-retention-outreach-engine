/**
 * Cadence selection, prompts, and reply guardrails for the v2 demo.
 *
 * The v1 build had a single 90-day touch. v2 runs a four-stage program driven
 * entirely by cohort, which is derived from lease_end_date alone:
 *
 *   120 -> WATCH_120    watchlist only, no resident contact
 *    90 -> CHECK_IN_90  soft check-in, emailed on approval
 *    60 -> NUDGE_60     only for residents who never replied to the 90-day touch
 *    30 -> HANDOFF_30   internal leasing handoff, never emails the resident
 *
 * Draft guardrails for outbound check-ins are reused from
 * scripts/stage-5-outbound-lib.js. Replies and fix-confirmations need different
 * rules (they may reference the resident's issue and are not limited to one
 * question), so guardReply() is defined here.
 *
 * This file is inlined into n8n Code nodes at import time, so it stays
 * dependency-free.
 */

const TOUCH = {
  WATCH_120: "WATCH_120",
  CHECK_IN_90: "CHECK_IN_90",
  NUDGE_60: "NUDGE_60",
  HANDOFF_30: "HANDOFF_30",
};

const TOUCH_BY_COHORT = {
  120: TOUCH.WATCH_120,
  90: TOUCH.CHECK_IN_90,
  60: TOUCH.NUDGE_60,
  30: TOUCH.HANDOFF_30,
};

const TOUCH_LABEL = {
  [TOUCH.WATCH_120]: "120-day watchlist",
  [TOUCH.CHECK_IN_90]: "90-day check-ins",
  [TOUCH.NUDGE_60]: "60-day nudges",
  [TOUCH.HANDOFF_30]: "30-day leasing handoff",
};

/** Touches that may result in an email to a resident. */
const EMAILING_TOUCHES = new Set([TOUCH.CHECK_IN_90, TOUCH.NUDGE_60]);

function txt(value) {
  return value == null ? "" : String(value).trim();
}

function bool(value) {
  if (typeof value === "boolean") return value;
  const text = txt(value).toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function daysBetween(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

/**
 * Airtable stores no email_valid flag. Validity is derived from the address and
 * the data-quality notes written at seed time, mirroring v1's isValidEmail().
 */
function emailValidFor(lease) {
  const email = txt(lease.email);
  if (!email) return false;
  const notes = txt(lease.data_quality).toUpperCase();
  if (notes.includes("MISSING_EMAIL") || notes.includes("INVALID_EMAIL")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function touchForCohort(cohort) {
  return TOUCH_BY_COHORT[txt(cohort)] || null;
}

/**
 * True when a resident received the 90-day check-in, enough time has passed, and
 * no meaningful reply ever came back. NO_SIGNAL auto-replies do not count as a reply.
 */
function isSilentAfterCheckIn(lease, logRows, config, nowIso) {
  if (txt(lease.status).toUpperCase() !== "SENT") return false;
  const sentAt = txt(lease.sent_at);
  if (!sentAt) return false;

  const elapsed = daysBetween(sentAt, nowIso);
  const threshold = Number(config.nudge_after_days || 14);
  if (elapsed == null || elapsed < threshold) return false;

  const meaningful = (logRows || []).some((row) => {
    if (txt(row.lease_id) !== txt(lease.lease_id)) return false;
    if (txt(row.event_type) !== "REPLY_RECEIVED") return false;
    return txt(row.intent).toUpperCase() !== "NO_SIGNAL";
  });

  return !meaningful;
}

/**
 * Splits the roster into the four cadence stages.
 * Nothing here consults anything except cohort, status, opt-out, and reply history.
 */
function selectTouchCandidates(leases, logRows, config, nowIso) {
  const result = {
    [TOUCH.WATCH_120]: [],
    [TOUCH.CHECK_IN_90]: [],
    [TOUCH.NUDGE_60]: [],
    [TOUCH.HANDOFF_30]: [],
    skipped: [],
  };

  const seen = new Set();

  for (const lease of leases || []) {
    const leaseId = txt(lease.lease_id);
    if (!leaseId || seen.has(leaseId)) continue;
    seen.add(leaseId);

    const touch = touchForCohort(lease.cohort);
    if (!touch) continue;

    if (bool(lease.opted_out)) {
      result.skipped.push({ lease, reason: "opted_out" });
      continue;
    }

    if (touch === TOUCH.WATCH_120 || touch === TOUCH.HANDOFF_30) {
      result[touch].push(lease);
      continue;
    }

    if (!emailValidFor(lease)) {
      result.skipped.push({ lease, reason: "no_usable_email" });
      continue;
    }

    if (touch === TOUCH.CHECK_IN_90) {
      if (txt(lease.status).toUpperCase() !== "PENDING") {
        result.skipped.push({ lease, reason: `status_${txt(lease.status).toLowerCase()}` });
        continue;
      }
      result[touch].push(lease);
      continue;
    }

    if (touch === TOUCH.NUDGE_60) {
      if (!isSilentAfterCheckIn(lease, logRows, config, nowIso)) {
        result.skipped.push({ lease, reason: "not_silent" });
        continue;
      }
      result[touch].push(lease);
    }
  }

  for (const touch of Object.keys(TOUCH_BY_COHORT).map((cohort) => TOUCH_BY_COHORT[cohort])) {
    result[touch].sort((a, b) => Number(a.days_to_expiry || 9999) - Number(b.days_to_expiry || 9999));
  }

  return result;
}

/* ---------------------------------------------------------------- prompts */

function touchPromptInstructions(touch) {
  const shared = [
    "You write short, plain, human property-management emails.",
    "Never mention rent, price, renewal, lease terms, deadlines, legal matters, or eviction.",
    "Never state or imply a date.",
    "Never mention software, automation, or AI.",
    "No exclamation marks, bullets, or emoji.",
    "Address the resident by first name.",
  ];

  if (touch === TOUCH.NUDGE_60) {
    return [
      ...shared,
      "This is a second, lighter message to a resident who did not reply to an earlier check-in.",
      "Acknowledge briefly that you reached out before, without any hint of pressure or complaint.",
      "Body must be 30 to 70 words and contain exactly one question.",
    ].join(" ");
  }

  return [
    ...shared,
    "This is a soft check-in months before any renewal conversation.",
    "Include one natural reference to how long they have lived there.",
    "Body must be 35 to 95 words and contain exactly one question about anything that is not sorted out.",
  ].join(" ");
}

function buildTouchPrompt(touch, candidates, config) {
  const managerName = txt(config.manager_name) || "the property manager";
  const companyName = txt(config.company_name) || "the property team";

  const rows = (candidates || []).map((lease) => ({
    lease_id: txt(lease.lease_id),
    tenant_first_name: txt(lease.tenant_first_name),
    unit: txt(lease.unit),
    tenure_months: lease.tenure_months,
  }));

  return [
    touchPromptInstructions(touch),
    `Sign every message as ${managerName} at ${companyName}.`,
    "Return one draft per resident with keys lease_id, subject, and body.",
    "",
    JSON.stringify({ residents: rows }),
  ].join("\n");
}

/**
 * Prompt for a suggested reply to a resident who raised an issue.
 * The manager approves the result before anything sends.
 */
function buildAssistPrompt(lease, config) {
  const managerName = txt(config.manager_name) || "the property manager";
  const companyName = txt(config.company_name) || "the property team";

  return [
    "Write a short reply from a property manager to a resident who raised an issue.",
    "Acknowledge the specific issue in their own terms and say what happens next in general terms.",
    "Never promise a date, a cost, a repair outcome, or a renewal or rent decision.",
    "Never reference legal matters, lease terms, or eviction.",
    "Never mention software, automation, or AI.",
    "No exclamation marks, bullets, or emoji.",
    "Keep the body between 30 and 90 words. Address the resident by first name.",
    `Sign as ${managerName} at ${companyName}.`,
    "Return JSON with keys subject and body.",
    "",
    JSON.stringify({
      tenant_first_name: txt(lease.tenant_first_name),
      unit: txt(lease.unit),
      resident_message: txt(lease.reply_text),
      issue_summary: txt(lease.suggested_action),
    }),
  ].join("\n");
}

/**
 * Prompt for the fix-confirmation sent after a manager marks an issue resolved.
 */
function buildConfirmationPrompt(lease, config) {
  const managerName = txt(config.manager_name) || "the property manager";
  const companyName = txt(config.company_name) || "the property team";

  return [
    "Write a short follow-up from a property manager to a resident whose reported issue has now been dealt with.",
    "Reference the issue they raised and ask one question confirming it is genuinely resolved for them.",
    "Never promise anything further, and never mention rent, renewal, lease terms, deadlines, or legal matters.",
    "Never mention software, automation, or AI.",
    "No exclamation marks, bullets, or emoji.",
    "Keep the body between 25 and 80 words. Address the resident by first name.",
    `Sign as ${managerName} at ${companyName}.`,
    "Return JSON with keys subject and body.",
    "",
    JSON.stringify({
      tenant_first_name: txt(lease.tenant_first_name),
      unit: txt(lease.unit),
      original_message: txt(lease.reply_text),
    }),
  ].join("\n");
}

/* ------------------------------------------------------------- guardrails */

/**
 * Guardrail for resident-facing replies and confirmations.
 *
 * Deliberately looser than guardDraft() in stage-5-outbound-lib.js: a reply may
 * reference the resident's issue and is not held to exactly one question. The
 * hard boundaries - money, renewal, legal, dates, promises - still apply.
 */
function guardReply(lease, subject, body) {
  const cleanSubject = txt(subject);
  const cleanBody = txt(body);
  const combined = `${cleanSubject}\n${cleanBody}`;
  const violations = [];

  const banned = /\b(renew\w*|rent|lease\s+term|evict\w*|legal|attorney|lawyer|notice\s+to|nonrenew\w*)\b/i;
  const money = /(\$\s?\d|\d+\s?%|\bdollars?\b|\bcents?\b)/i;
  const dateLike = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b/i;
  const promise = /\b(guarantee\w*|we will (?:fix|repair|replace|resolve|complete)|by (?:tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|within \d+\s*(?:hours?|days?|weeks?))\b/i;

  const words = cleanBody.split(/\s+/).filter(Boolean).length;
  const firstName = txt(lease.tenant_first_name);

  if (!cleanSubject) violations.push("missing subject");
  if (!cleanBody) violations.push("missing body");
  if (banned.test(combined)) violations.push("banned rent, renewal, lease, or legal wording");
  if (money.test(combined)) violations.push("money or percentage wording");
  if (dateLike.test(combined)) violations.push("date or deadline-like wording");
  if (promise.test(combined)) violations.push("promises a specific outcome or timeframe");
  if (words < 20) violations.push("body under 20 words");
  if (words > 110) violations.push("body over 110 words");
  if (/!|•|[\u{1F300}-\u{1FAFF}]/u.test(cleanBody)) violations.push("exclamation mark, bullet, or emoji");
  if (/generated|software|automation|ai-assisted|artificial intelligence/i.test(combined)) {
    violations.push("mentions automation or AI");
  }
  if (firstName && !new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(cleanBody)) {
    violations.push("missing resident first name");
  }

  return { ok: violations.length === 0, violations, word_count: words };
}

if (typeof module !== "undefined") {
  module.exports = {
    EMAILING_TOUCHES,
    TOUCH,
    TOUCH_BY_COHORT,
    TOUCH_LABEL,
    buildAssistPrompt,
    buildConfirmationPrompt,
    buildTouchPrompt,
    daysBetween,
    emailValidFor,
    guardReply,
    isSilentAfterCheckIn,
    selectTouchCandidates,
    touchForCohort,
    touchPromptInstructions,
  };
}
