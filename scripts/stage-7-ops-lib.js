function opsToArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function opsText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function opsBool(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  return ["true", "1", "yes", "y"].includes(opsText(value).toLowerCase());
}

function opsConfig(configRows) {
  const config = {};
  for (const row of opsToArray(configRows)) {
    const key = opsText(row.key);
    if (key) config[key] = opsText(row.value);
  }
  return config;
}

function opsDatePartsInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const out = {};
  for (const part of parts) out[part.type] = part.value;
  return { year: Number(out.year), month: Number(out.month), day: Number(out.day) };
}

function opsTodayIso(timeZone) {
  const p = opsDatePartsInTimezone(new Date(), timeZone || "America/New_York");
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function opsIsoDate(value, timeZone) {
  const text = opsText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  const p = opsDatePartsInTimezone(date, timeZone || "America/New_York");
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function opsDaysBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const [sy, sm, sd] = String(startIso).split("-").map(Number);
  const [ey, em, ed] = String(endIso).split("-").map(Number);
  if (![sy, sm, sd, ey, em, ed].every(Number.isFinite)) return null;
  const start = Date.UTC(sy, sm - 1, sd, 12);
  const end = Date.UTC(ey, em - 1, ed, 12);
  return Math.round((end - start) / 86400000);
}

function opsCohortFor(days, hasLeaseEnd) {
  if (!hasLeaseEnd) return "NONE";
  if (days === null || days === undefined) return "NONE";
  if (days < 0) return "EXPIRED";
  if (days >= 105 && days <= 135) return "120";
  if (days >= 75 && days <= 104) return "90";
  if (days >= 45 && days <= 74) return "60";
  if (days >= 20 && days <= 44) return "30";
  return "NONE";
}

function isMeaningfulReplyLog(log) {
  const eventType = opsText(log.event_type).toUpperCase();
  const intent = opsText(log.intent).toUpperCase();
  if (!opsText(log.lease_id)) return false;
  if (intent === "NO_SIGNAL" || eventType === "NO_SIGNAL") return false;
  if (["REPLY_CLASSIFIED", "CLASSIFY_FAILED", "UNMATCHED_REPLY"].includes(eventType)) return true;
  if (opsBool(log.requires_human) && opsText(log.reply_text)) return true;
  return false;
}

function shouldEscalateNonResponse(lease, meaningfulReplyLeaseIds, baseDate, thresholdDays, timeZone) {
  const status = opsText(lease.status).toUpperCase();
  if (status !== "SENT") return false;
  if (meaningfulReplyLeaseIds.has(opsText(lease.lease_id))) return false;
  const sentDate = opsIsoDate(lease.sent_at, timeZone);
  if (!sentDate) return false;
  const daysSinceSent = opsDaysBetween(sentDate, baseDate);
  return daysSinceSent !== null && daysSinceSent > thresholdDays;
}

function cleanLeaseForTable(row) {
  return {
    lease_id: opsText(row.lease_id),
    tenant_name: opsText(row.tenant_name),
    tenant_first_name: opsText(row.tenant_first_name),
    unit: opsText(row.unit),
    email: opsText(row.email),
    email_valid: opsBool(row.email_valid),
    move_in_date: row.move_in_date || null,
    lease_end_date: row.lease_end_date || null,
    days_to_expiry: row.days_to_expiry === null || row.days_to_expiry === undefined || row.days_to_expiry === "" ? null : Number(row.days_to_expiry),
    cohort: opsText(row.cohort),
    tenure_months: row.tenure_months === null || row.tenure_months === undefined || row.tenure_months === "" ? null : Number(row.tenure_months),
    status: opsText(row.status) || "PENDING",
    draft_subject: opsText(row.draft_subject),
    draft_body: opsText(row.draft_body),
    ref_token: opsText(row.ref_token),
    sent_at: row.sent_at || null,
    opted_out: opsBool(row.opted_out),
    ingest_notes: opsText(row.ingest_notes),
  };
}

function prepareSweepUpdates(leases, outreachLog, config, requestBody = {}) {
  const timeZone = opsText(config.timezone) || "America/New_York";
  const baseDate = opsText(requestBody.base_date) || opsTodayIso(timeZone);
  const thresholdDays = Number(requestBody.escalate_after_days || config.escalate_after_days || 15);
  const meaningfulReplyLeaseIds = new Set(opsToArray(outreachLog).filter(isMeaningfulReplyLog).map((log) => opsText(log.lease_id)));
  const updates = [];
  const seenLeaseIds = new Set();
  let escalatedCount = 0;
  let currentAtRiskCount = 0;
  let currentStayingCount = 0;
  let currentEscalateCount = 0;

  for (const rawLease of opsToArray(leases)) {
    const lease = cleanLeaseForTable(rawLease);
    if (!lease.lease_id || seenLeaseIds.has(lease.lease_id)) continue;
    seenLeaseIds.add(lease.lease_id);

    const leaseEnd = opsIsoDate(lease.lease_end_date, timeZone);
    const days = leaseEnd ? opsDaysBetween(baseDate, leaseEnd) : null;
    const cohort = opsCohortFor(days, Boolean(leaseEnd));
    let status = lease.status || "PENDING";
    const wasStatus = status;

    if (shouldEscalateNonResponse(lease, meaningfulReplyLeaseIds, baseDate, thresholdDays, timeZone)) {
      status = "ESCALATE";
      escalatedCount += 1;
    }

    if (status === "AT_RISK") currentAtRiskCount += 1;
    if (status === "STAYING") currentStayingCount += 1;
    if (status === "ESCALATE") currentEscalateCount += 1;

    if (lease.days_to_expiry !== days || lease.cohort !== cohort || wasStatus !== status) {
      updates.push({
        ...lease,
        lease_end_date: leaseEnd || null,
        days_to_expiry: days,
        cohort,
        status,
      });
    }
  }

  const summary = {
    ok: true,
    action: "daily_sweep",
    base_date: baseDate,
    total_rows: seenLeaseIds.size,
    updated_count: updates.length,
    recomputed_count: seenLeaseIds.size,
    escalated_count: escalatedCount,
    current_escalate_count: currentEscalateCount,
    at_risk_count: currentAtRiskCount,
    staying_count: currentStayingCount,
    threshold_days: thresholdDays,
    digest_suppressed: opsBool(requestBody.suppress_digest),
    board_url: "http://localhost:5678/webhook/board",
  };

  return { updates, summary };
}

function buildSweepDigest(summary, config) {
  const company = opsText(config.company_name) || "Renewal retention demo";
  return `${company} sweep ${summary.base_date}: ${summary.recomputed_count} rows checked, ${summary.escalated_count} new escalations, ${summary.at_risk_count} at risk, ${summary.staying_count} staying.`;
}

function resetLeaseState(row) {
  return cleanLeaseForTable({
    ...row,
    status: "PENDING",
    draft_subject: "",
    draft_body: "",
    ref_token: "",
    sent_at: null,
    opted_out: false,
  });
}

function buildResetRows(rosterCsv, config) {
  if (typeof normalizeRoster !== "function") {
    throw new Error("Stage 3 normalizeRoster helper is required for reset.");
  }
  const timeZone = opsText(config.timezone) || "America/New_York";
  const normalized = normalizeRoster(rosterCsv, {
    timezone: timeZone,
    baseDate: opsText(config.demo_base_date) || "2026-08-04",
    demoRecipientEmail: opsText(config.demo_recipient_email),
    boardUrl: "http://localhost:5678/webhook/board",
    uploadedAt: new Date().toISOString(),
    existingRows: [],
  });
  const rows = normalized.rows.map(resetLeaseState);
  return {
    rows,
    summary: {
      ok: true,
      action: "reset_demo",
      loaded_count: rows.length,
      flagged_count: normalized.summary.flagged_count,
      cohort_counts: normalized.summary.cohort_counts,
      cleared_outreach_log: true,
      cleared_leases: true,
      gmail_processed_clear_requested: false,
      gmail_processed_clear_count: 0,
      board_url: "http://localhost:5678/webhook/board",
    },
  };
}

function buildErrorAlertText(input) {
  const execution = input.execution || {};
  const workflow = input.workflow || {};
  const error = execution.error || input.error || {};
  const workflowName = opsText(workflow.name || input.workflow_name) || "Unknown workflow";
  const nodeName = opsText(execution.lastNodeExecuted || input.node_name) || "Unknown node";
  const message = opsText(error.message || input.message) || "Unknown error";
  const executionUrl = opsText(execution.url || input.execution_url);
  return [
    `n8n workflow error - ${workflowName}`,
    `Node: ${nodeName}`,
    `Error: ${message}`,
    `Time: ${new Date().toISOString()}`,
    executionUrl ? `Execution: ${executionUrl}` : "",
  ].filter(Boolean).join("\n");
}

if (typeof module !== "undefined") {
  module.exports = {
    buildErrorAlertText,
    buildResetRows,
    buildSweepDigest,
    cleanLeaseForTable,
    isMeaningfulReplyLog,
    opsBool,
    opsCohortFor,
    opsConfig,
    opsDaysBetween,
    opsIsoDate,
    opsText,
    prepareSweepUpdates,
    resetLeaseState,
    shouldEscalateNonResponse,
  };
}
