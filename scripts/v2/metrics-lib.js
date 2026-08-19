/**
 * Demo scoreboard maths for the v2 Metrics table and the Telegram digest.
 *
 * The headline number is turnover exposure: the money at risk in the residents
 * currently flagged AT_RISK or ESCALATE, valued at config.avg_turnover_cost.
 * Exposure recovered is the same figure for issues a manager has closed.
 *
 * These are demo-grade proxies, not a financial model. The POC does not claim a
 * resolved issue guarantees a renewal - only that the exposure was surfaced and
 * acted on. Say that out loud when presenting the number.
 *
 * This file is inlined into n8n Code nodes at import time.
 */

const AT_RISK_STATUSES = new Set(["AT_RISK", "ESCALATE"]);

function txt(value) {
  return value == null ? "" : String(value).trim();
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * @param {Array} leases  every lease row
 * @param {Array} logRows every outreach log row
 * @param {object} config config key/value map
 */
function computeMetrics(leases, logRows, config = {}) {
  const rows = leases || [];
  const log = logRows || [];
  const turnoverCost = num(config.avg_turnover_cost, 3900);

  const residentsInWindow = rows.filter((lease) => txt(lease.cohort) === "90").length;

  const checkInsSent = log.filter((row) => txt(row.event_type) === "SENT").length;
  const repliesReceived = log.filter((row) => txt(row.event_type) === "REPLY_RECEIVED").length;

  const issuesOpen = rows.filter((lease) => txt(lease.issue_status) === "OPEN");
  const issuesResolved = rows.filter((lease) => txt(lease.issue_status) === "RESOLVED");
  const issuesFound = issuesOpen.length + issuesResolved.length;

  const atRisk = rows.filter((lease) => AT_RISK_STATUSES.has(txt(lease.status).toUpperCase()));
  const staying = rows.filter((lease) => txt(lease.status).toUpperCase() === "STAYING");

  const resolutionDays = issuesResolved
    .map((lease) => num(lease.days_to_resolve, null))
    .filter((value) => value != null && Number.isFinite(value));

  const avgResolutionDays = resolutionDays.length
    ? round1(resolutionDays.reduce((sum, value) => sum + value, 0) / resolutionDays.length)
    : 0;

  return {
    snapshot: "current",
    residents_in_window: residentsInWindow,
    check_ins_sent: checkInsSent,
    replies_received: repliesReceived,
    issues_found: issuesFound,
    issues_resolved: issuesResolved.length,
    avg_resolution_days: avgResolutionDays,
    at_risk_count: atRisk.length,
    staying_count: staying.length,
    turnover_exposure: atRisk.length * turnoverCost,
    exposure_recovered: issuesResolved.length * turnoverCost,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Exposure for a cohort before anything has been sent - used in the generation
 * summary card so the prospect sees a number at the very start of the demo.
 */
function windowExposure(leases, cohort, config = {}) {
  const turnoverCost = num(config.avg_turnover_cost, 3900);
  const count = (leases || []).filter((lease) => txt(lease.cohort) === txt(cohort)).length;
  return count * turnoverCost;
}

/** Fields written to the Metrics table (strips the digest-only keys). */
function toMetricsRecord(metrics) {
  return {
    snapshot: metrics.snapshot || "current",
    residents_in_window: metrics.residents_in_window,
    check_ins_sent: metrics.check_ins_sent,
    replies_received: metrics.replies_received,
    issues_found: metrics.issues_found,
    issues_resolved: metrics.issues_resolved,
    avg_resolution_days: metrics.avg_resolution_days,
    at_risk_count: metrics.at_risk_count,
    turnover_exposure: metrics.turnover_exposure,
    exposure_recovered: metrics.exposure_recovered,
    updated_at: metrics.updated_at,
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    AT_RISK_STATUSES,
    computeMetrics,
    toMetricsRecord,
    windowExposure,
  };
}
