function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function foldForComparison(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeBool(value) {
  if (value === true) return true;
  if (value === false) return false;
  return ["true", "1", "yes", "y"].includes(normalizeText(value).toLowerCase());
}

function buildConfig(configRows) {
  const config = {};
  for (const row of toArray(configRows)) {
    const key = normalizeText(row.key);
    if (key) config[key] = normalizeText(row.value);
  }
  return config;
}

function wordCount(text) {
  return normalizeText(text).split(/\s+/).filter(Boolean).length;
}

function hashHex(value) {
  let hash = 2166136261;
  const text = normalizeText(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function refTokenForLease(lease, usedTokens = new Set()) {
  const existing = normalizeText(lease.ref_token).toUpperCase();
  if (/^R-[0-9A-F]{4}$/.test(existing) && !usedTokens.has(existing)) {
    usedTokens.add(existing);
    return existing;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = `R-${hashHex(`${lease.lease_id}:${attempt}`).slice(0, 4)}`;
    if (!usedTokens.has(token)) {
      usedTokens.add(token);
      return token;
    }
  }

  throw new Error(`Could not allocate a unique ref_token for ${lease.lease_id}`);
}

function stripRefToken(subject) {
  return normalizeText(subject).replace(/\s*\[R-[0-9A-Fa-f]{4}\]\s*$/g, "").trim();
}

function appendRefToken(subject, refToken) {
  const base = stripRefToken(subject).replace(/\s+/g, " ");
  return `${base} [${refToken}]`;
}

function countQuestions(text) {
  return (normalizeText(text).match(/\?/g) || []).length;
}

function sentenceSimilarityKey(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\b[A-Z][a-z]+\b/g, "")
    .replace(/\b(cedar|willow|maple|river|pine|oak|birch|elm|spruce|meadow|hillcrest|sunset|orchard|vista|row|court|place|lane|terrace|tower|lofts|house|bend|gate|green|station|ridge|commons|point|walk|landing|run|square|heights)\b/g, "")
    .replace(/\b\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guardDraft(lease, subject, body) {
  const firstName = normalizeText(lease.tenant_first_name);
  const cleanSubject = stripRefToken(subject);
  const cleanBody = normalizeText(body);
  const combined = `${cleanSubject}\n${cleanBody}`;
  const violations = [];

  const banned = /\b(renew\w*|notice|offer|increase|expir\w*|deadline|sign(?:ing)?|lease\s+term|legal|evict\w*|nonrenew\w*|rent|price|amount|resident|tenant|occupant|valued)\b/i;
  const money = /(\$\s?\d|\d+\s?%|\bdollars?\b|\bcents?\b)/i;
  const dateLike = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b/i;
  const genericGreeting = /^(hi|hello|dear)\s+(resident|tenant|occupant|valued)\b/i;
  const wc = wordCount(cleanBody);

  if (!cleanSubject) violations.push("missing subject");
  if (cleanSubject.length > 70) violations.push("subject over 70 characters after token");
  if (!cleanBody) violations.push("missing body");
  if (banned.test(combined)) violations.push("banned rent, renewal, lease, legal, or generic-resident wording");
  if (money.test(combined)) violations.push("money or percentage wording");
  if (dateLike.test(combined)) violations.push("date or deadline-like wording");
  if (genericGreeting.test(cleanBody)) violations.push("generic resident greeting");
  if (wc < 35) violations.push("body under 35 words");
  if (wc > 95) violations.push("body over 95 words");
  if (firstName && !new RegExp(`\\b${foldForComparison(firstName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(foldForComparison(cleanBody))) {
    violations.push("missing tenant first name");
  }
  if (countQuestions(cleanBody) !== 1) violations.push("body must contain exactly one question");
  if (/!|•|[\u{1F300}-\u{1FAFF}]/u.test(cleanBody)) violations.push("exclamation mark, bullet, or emoji");
  if (/i hope this finds you well/i.test(cleanBody)) violations.push("generic opening phrase");
  if (/generated|software|automation|ai-assisted|artificial intelligence/i.test(combined)) {
    violations.push("mentions automation or AI");
  }

  return {
    ok: violations.length === 0,
    violations,
    word_count: wc,
    question_count: countQuestions(cleanBody),
  };
}

function extractJsonCandidate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    if (value.subject && value.body) return value;
    if (Array.isArray(value.drafts)) return value;
    for (const key of ["output", "text", "content", "message", "data", "response"]) {
      const found = extractJsonCandidate(value[key]);
      if (found) return found;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractJsonCandidate(item);
        if (found) return found;
      }
    }
    return null;
  }

  const text = normalizeText(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function extractDraftBatch(openAiOutput) {
  const parsed = extractJsonCandidate(openAiOutput);
  if (!parsed || !Array.isArray(parsed.drafts)) return [];
  return parsed.drafts
    .map((draft) => ({
      lease_id: normalizeText(draft.lease_id),
      subject: normalizeText(draft.subject || draft.email_subject || draft.title || "A quick home check-in"),
      body: normalizeText(draft.body || draft.email_body || draft.message || draft.draft),
    }))
    .filter((draft) => draft.lease_id && draft.body);
}

function repairDraftForLease(lease, draft) {
  const firstName = normalizeText(lease.tenant_first_name);
  const repaired = {
    subject: normalizeText(draft.subject || "A quick home check-in"),
    body: normalizeText(draft.body),
  };

  if (firstName && repaired.body && !new RegExp(`\\b${foldForComparison(firstName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(foldForComparison(repaired.body))) {
    const withoutGenericGreeting = repaired.body.replace(/^(hi|hello|dear)\s*[,:\-]?\s*/i, "");
    repaired.body = `Hi ${firstName}, ${withoutGenericGreeting}`;
  }

  return repaired;
}

function promptSystemInstructions() {
  return [
    "You write short, warm check-in messages from a residential property manager to current tenants.",
    "Purpose: open a conversation and find out whether anything about the home has gone unresolved. That is the only purpose.",
    "Hard rules: no rent, prices, amounts, percentages, renewal terms, lease terms, deadlines, dates, signing, notices, offers, increases, legal language, or expiration language.",
    "Never address anyone as Resident, Tenant, Occupant, or Valued.",
    "Never promise a repair, timeline, inspection, or visit.",
    "Never imply the tenant must reply or that anything happens if they do not.",
    "Never mention software, automation, AI, or that the message was generated.",
    "Each body must start with 'Hi {tenant_first_name},' and include one natural tenure reference, exactly one question about anything not sorted out, and the manager name as sign-off.",
    "Style: plain American English, 50 to 90 words, three or four short sentences, no exclamation marks, no bullets, no emoji, no 'I hope this finds you well'.",
    "Return only JSON matching the requested schema.",
  ].join("\n");
}

function buildDraftBatchPrompt(candidates, config) {
  const rows = candidates.map((lease) => ({
    lease_id: lease.lease_id,
    tenant_first_name: lease.tenant_first_name,
    unit: lease.unit,
    tenure_months: lease.tenure_months,
    manager_name: config.manager_name || "Maya Chen",
    company_name: config.company_name || "Harborview Property Management",
  }));

  return [
    `Write exactly ${rows.length} check-in drafts: one draft for each input row, no more and no fewer.`,
    "Return the drafts in the same order as the input rows. Do not create multiple variants for any row.",
    "Every input lease_id must appear exactly once in the drafts array. Do not duplicate a lease_id and do not omit any lease_id.",
    "Each draft must include the exact lease_id from the input row, a subject, and a body.",
    "Vary the structure and phrasing between drafts. Do not use a mail-merge template.",
    "Do not include email addresses in any output.",
    "",
    JSON.stringify({ rows }, null, 2),
  ].join("\n");
}

function buildRetryPrompt(failures, config) {
  const rows = failures.map((failure) => ({
    lease_id: failure.lease.lease_id,
    tenant_first_name: failure.lease.tenant_first_name,
    unit: failure.lease.unit,
    tenure_months: failure.lease.tenure_months,
    manager_name: config.manager_name || "Maya Chen",
    company_name: config.company_name || "Harborview Property Management",
    previous_violations: failure.violations,
  }));

  if (!rows.length) {
    return "No drafts failed deterministic guardrails. Return {\"drafts\":[]}.";
  }

  return [
    "Rewrite only the rows below. The previous drafts failed deterministic guardrails.",
    "Avoid every named violation. Return a JSON object with a drafts array using the exact lease_id values.",
    "",
    JSON.stringify({ failed_rows: rows }, null, 2),
  ].join("\n");
}

function eligibleDraftRows(leases, cohort) {
  const seen = new Set();
  return toArray(leases)
    .filter((lease) => normalizeText(lease.lease_id))
    .filter((lease) => normalizeText(lease.cohort) === normalizeText(cohort || "90"))
    .filter((lease) => normalizeText(lease.status).toUpperCase() === "PENDING")
    .filter((lease) => normalizeBool(lease.email_valid))
    .filter((lease) => !normalizeBool(lease.opted_out))
    .sort((a, b) => Number(a.days_to_expiry || 9999) - Number(b.days_to_expiry || 9999))
    .filter((lease) => {
      const leaseId = normalizeText(lease.lease_id);
      if (seen.has(leaseId)) return false;
      seen.add(leaseId);
      return true;
    });
}

function makeDraftRow(lease, draft, refToken, status, guard) {
  const subject = status === "DRAFT"
    ? appendRefToken(draft.subject, refToken)
    : appendRefToken("Needs manager wording", refToken);
  const body = status === "DRAFT"
    ? normalizeText(draft.body)
    : `Guardrail failed: ${guard.violations.join("; ")}`;

  return {
    ...lease,
    status,
    draft_subject: subject,
    draft_body: body,
    ref_token: refToken,
    _guardrail: guard,
  };
}

function finalizeDraftsFromBatch(candidates, firstDrafts, retryDrafts, config) {
  const firstByLease = new Map(firstDrafts.map((draft) => [draft.lease_id, draft]));
  const retryByLease = new Map(retryDrafts.map((draft) => [draft.lease_id, draft]));
  const usedTokens = new Set();
  const finalRows = [];
  const failures = [];

  for (const lease of candidates) {
    const first = firstByLease.get(lease.lease_id);
    let draft = first ? repairDraftForLease(lease, first) : null;
    let guard = draft ? guardDraft(lease, draft.subject, draft.body) : {
      ok: false,
      violations: ["missing draft from model output"],
      word_count: 0,
      question_count: 0,
    };

    if (!guard.ok) {
      failures.push({ lease, violations: guard.violations });
      const retry = retryByLease.get(lease.lease_id);
      if (retry) {
        const repairedRetry = repairDraftForLease(lease, retry);
        const retryGuard = guardDraft(lease, repairedRetry.subject, repairedRetry.body);
        if (retryGuard.ok) {
          draft = repairedRetry;
          guard = retryGuard;
        } else {
          guard = retryGuard;
          draft = repairedRetry;
        }
      }
    }

    const token = refTokenForLease(lease, usedTokens);
    finalRows.push(makeDraftRow(
      lease,
      draft || { subject: "", body: "" },
      token,
      guard.ok ? "DRAFT" : "REVIEW_FAILED",
      guard,
    ));
  }

  return {
    rows: finalRows,
    failures,
    generated_count: finalRows.filter((row) => row.status === "DRAFT").length,
    review_failed_count: finalRows.filter((row) => row.status === "REVIEW_FAILED").length,
    model: config.model_draft || "gpt-5.6-luna",
  };
}

function prepareApprovalChanges(action, body, leases) {
  const normalizedAction = normalizeText(action).toLowerCase();
  const leaseId = normalizeText(body.lease_id);
  const changes = [];

  function rowById(id) {
    return toArray(leases).find((lease) => normalizeText(lease.lease_id) === id);
  }

  function applyEditedFields(lease) {
    const updated = { ...lease };
    if (Object.prototype.hasOwnProperty.call(body, "edited_subject")) {
      updated.draft_subject = appendRefToken(body.edited_subject, normalizeText(lease.ref_token));
    }
    if (Object.prototype.hasOwnProperty.call(body, "edited_body")) {
      updated.draft_body = normalizeText(body.edited_body);
    }
    return updated;
  }

  if (normalizedAction === "approve_all") {
    for (const lease of toArray(leases)) {
      if (normalizeText(lease.status).toUpperCase() !== "DRAFT") continue;
      const guard = guardDraft(lease, lease.draft_subject, lease.draft_body);
      if (guard.ok) changes.push({ ...lease, status: "APPROVED", _approval_action: "approve_all" });
    }
    return changes;
  }

  if (!leaseId) throw new Error("lease_id is required for approve, edit, and skip actions.");
  const lease = rowById(leaseId);
  if (!lease) throw new Error(`No lease row found for lease_id ${leaseId}.`);

  if (normalizedAction === "skip") {
    changes.push({ ...lease, status: "SKIPPED", _approval_action: "skip" });
    return changes;
  }

  if (!["edit", "approve"].includes(normalizedAction)) {
    throw new Error(`Unsupported approval action: ${normalizedAction}`);
  }

  const updated = applyEditedFields(lease);
  const guard = guardDraft(updated, updated.draft_subject, updated.draft_body);
  if (!guard.ok) {
    throw new Error(`Edited draft failed guardrail: ${guard.violations.join("; ")}`);
  }

  updated.status = normalizedAction === "approve" ? "APPROVED" : normalizeText(lease.status).toUpperCase() || "DRAFT";
  updated._approval_action = normalizedAction;
  changes.push(updated);
  return changes;
}

function buildFooter(config) {
  const company = config.company_name || "Harborview Property Management";
  const manager = config.manager_name || "Maya Chen";
  return [
    "",
    "--",
    manager,
    company,
    "Demo check-in only. This is not a renewal offer, notice, or lease document.",
  ].join("\n");
}

function prepareSendCandidates(body, leases, config) {
  const requested = Array.isArray(body.lease_ids)
    ? new Set(body.lease_ids.map((id) => normalizeText(id)).filter(Boolean))
    : null;
  const demoEmail = normalizeText(config.demo_recipient_email).toLowerCase();
  const footer = buildFooter(config);
  const delay = Math.max(0, Number(config.send_delay_seconds || 0) || 0);

  return toArray(leases)
    .filter((lease) => normalizeText(lease.lease_id))
    .filter((lease) => !requested || requested.has(normalizeText(lease.lease_id)))
    .filter((lease) => normalizeText(lease.status).toUpperCase() === "APPROVED")
    .filter((lease) => normalizeBool(lease.email_valid))
    .filter((lease) => !normalizeBool(lease.opted_out))
    .filter((lease) => guardDraft(lease, lease.draft_subject, lease.draft_body).ok)
    .sort((a, b) => {
      const aPriority = demoEmail && normalizeText(a.email).toLowerCase() === demoEmail ? 0 : 1;
      const bPriority = demoEmail && normalizeText(b.email).toLowerCase() === demoEmail ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return normalizeText(a.tenant_name).localeCompare(normalizeText(b.tenant_name));
    })
    .map((lease, index) => ({
      ...lease,
      status: "SENDING",
      _send_body: `${normalizeText(lease.draft_body)}${footer}`,
      _sender_name: config.manager_name || "Maya Chen",
      _send_delay_seconds: index === 0 ? 0 : delay,
      _is_demo_priority: demoEmail && normalizeText(lease.email).toLowerCase() === demoEmail,
    }));
}

function sentEventForLease(lease, sentAt) {
  return {
    event_id: `sent-${sentAt.replace(/[^0-9A-Za-z]/g, "")}-${normalizeText(lease.lease_id)}`,
    lease_id: lease.lease_id,
    event_type: "SENT",
    reply_text: "",
    intent: "",
    grievance_category: "",
    grievance_summary: "",
    urgency: "",
    compliance_flag: "",
    confidence: "",
    requires_human: false,
    created_at: sentAt,
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    appendRefToken,
    buildConfig,
    buildDraftBatchPrompt,
    buildRetryPrompt,
    eligibleDraftRows,
    extractDraftBatch,
    finalizeDraftsFromBatch,
    guardDraft,
    prepareApprovalChanges,
    prepareSendCandidates,
    promptSystemInstructions,
    refTokenForLease,
    sentenceSimilarityKey,
    sentEventForLease,
    stripRefToken,
  };
}
