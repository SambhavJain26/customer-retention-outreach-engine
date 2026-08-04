function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function escapeHtml(value) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  const text = normalizeText(value);
  if (!text) return "No date";
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function formatTenure(months) {
  const numeric = Number(months);
  if (!Number.isFinite(numeric)) return "Tenure unknown";
  if (numeric < 12) return `${Math.max(0, Math.round(numeric))} mo`;
  const years = Math.floor(numeric / 12);
  const remainder = Math.round(numeric % 12);
  if (!remainder) return `${years} yr`;
  return `${years} yr ${remainder} mo`;
}

function splitNotes(notes) {
  return normalizeText(notes)
    .split(";")
    .map((note) => note.trim())
    .filter(Boolean);
}

function statusMeta(lease, latestLog) {
  const rawStatus = normalizeText(lease.status).toUpperCase() || "PENDING";
  const complianceFlag = normalizeText(lease.compliance_flag || latestLog?.compliance_flag);
  if (rawStatus === "COMPLIANCE" || complianceFlag) {
    return { key: "compliance", label: complianceFlag || "Compliance flag" };
  }
  if (["AT_RISK", "ESCALATE", "NEEDS_HUMAN"].includes(rawStatus)) {
    return { key: "risk", label: rawStatus.replace(/_/g, " ") };
  }
  if (rawStatus === "STAYING") return { key: "staying", label: "Staying" };
  if (["DRAFT", "APPROVED", "SENDING"].includes(rawStatus)) {
    const labels = { DRAFT: "Draft ready", APPROVED: "Approved", SENDING: "Sending" };
    return { key: "draft", label: labels[rawStatus] };
  }
  if (rawStatus === "SENT") return { key: "staying", label: "Sent" };
  if (["REVIEW_FAILED", "SEND_FAILED"].includes(rawStatus)) {
    return { key: "risk", label: rawStatus === "REVIEW_FAILED" ? "Needs wording" : "Send failed" };
  }
  if (rawStatus === "PENDING") return { key: "pending", label: "Pending" };
  return { key: "unknown", label: rawStatus.replace(/_/g, " ") };
}

function buildConfig(configRows) {
  const config = {};
  for (const row of configRows) {
    const key = normalizeText(row.key);
    if (key) config[key] = normalizeText(row.value);
  }
  return config;
}

function latestLogByLease(logRows) {
  const byLease = {};
  for (const log of logRows) {
    const leaseId = normalizeText(log.lease_id);
    if (!leaseId) continue;
    const createdAt = Date.parse(log.created_at || "") || 0;
    const currentAt = Date.parse(byLease[leaseId]?.created_at || "") || 0;
    if (!byLease[leaseId] || createdAt >= currentAt) byLease[leaseId] = log;
  }
  return byLease;
}

function renderBadge(text, className = "") {
  if (!normalizeText(text)) return "";
  return `<span class="badge ${className}">${escapeHtml(text)}</span>`;
}

function renderLeaseCard(lease, latestLog) {
  const notes = splitNotes(lease.ingest_notes);
  const meta = statusMeta(lease, latestLog);
  const issueBadges = notes.slice(0, 2).map((note) => renderBadge(note, "issue")).join("");
  const hiddenIssues = notes.length > 2 ? renderBadge(`+${notes.length - 2}`, "issue") : "";
  const days = Number(lease.days_to_expiry);
  const daysLabel = Number.isFinite(days) ? `${days} days out` : "Days unknown";
  const emailValid = lease.email_valid === true || normalizeText(lease.email_valid).toLowerCase() === "true";
  const emailLabel = emailValid ? "" : renderBadge("Email issue", "issue");

  return `
    <article class="lease-card status-${meta.key}">
      <div class="card-topline">
        <span class="status-dot" aria-hidden="true"></span>
        <span>${escapeHtml(meta.label)}</span>
      </div>
      <h3>${escapeHtml(lease.tenant_name || "Unnamed tenant")}</h3>
      <p class="unit">${escapeHtml(lease.unit || "No unit")}</p>
      <dl>
        <div><dt>Lease end</dt><dd>${escapeHtml(formatDate(lease.lease_end_date))}</dd></div>
        <div><dt>Tenure</dt><dd>${escapeHtml(formatTenure(lease.tenure_months))}</dd></div>
        <div><dt>Window</dt><dd>${escapeHtml(daysLabel)}</dd></div>
      </dl>
      <div class="card-badges">${emailLabel}${issueBadges}${hiddenIssues}</div>
    </article>`;
}

function renderPipeline(leases, latestLogs) {
  const cohortOrder = ["120", "90", "60", "30"];
  return cohortOrder.map((cohort) => {
    const rows = leases
      .filter((lease) => normalizeText(lease.cohort) === cohort)
      .sort((a, b) => (Number(a.days_to_expiry) || 9999) - (Number(b.days_to_expiry) || 9999));
    const cards = rows.length
      ? rows.map((lease) => renderLeaseCard(lease, latestLogs[normalizeText(lease.lease_id)])).join("")
      : `<div class="empty-state">No leases in this window.</div>`;
    return `
      <section class="cohort-column" aria-labelledby="cohort-${cohort}">
        <div class="column-heading">
          <h2 id="cohort-${cohort}">${cohort} days</h2>
          <span class="count-pill" data-cohort-count="${cohort}">${rows.length}</span>
        </div>
        <div class="card-stack">${cards}</div>
      </section>`;
  }).join("");
}

function renderFlaggedRows(flaggedRows) {
  if (!flaggedRows.length) {
    return `<div class="empty-state">No ingest issues are currently flagged.</div>`;
  }
  const rows = flaggedRows.map((lease) => {
    const notes = splitNotes(lease.ingest_notes).map((note) => renderBadge(note, "issue")).join("");
    return `
      <article class="flag-row">
        <div>
          <h3>${escapeHtml(lease.tenant_name || "Unnamed tenant")}</h3>
          <p>${escapeHtml(lease.unit || "No unit")} - ${escapeHtml(formatDate(lease.lease_end_date))}</p>
        </div>
        <div class="flag-badges">${notes}</div>
      </article>`;
  }).join("");
  return `<div class="flag-list">${rows}</div>`;
}

function renderApprovalQueue(leases) {
  const draftRows = leases
    .filter((lease) => ["DRAFT", "APPROVED", "REVIEW_FAILED", "SENDING", "SEND_FAILED", "SENT"].includes(normalizeText(lease.status).toUpperCase()))
    .sort((a, b) => normalizeText(a.tenant_name).localeCompare(normalizeText(b.tenant_name)));

  const cards = draftRows.length
    ? draftRows.map((lease) => {
      const status = normalizeText(lease.status).toUpperCase();
      const isEditable = ["DRAFT", "APPROVED", "REVIEW_FAILED", "SEND_FAILED"].includes(status);
      const isApprovable = ["DRAFT", "REVIEW_FAILED", "SEND_FAILED"].includes(status);
      const isTerminal = ["SENDING", "SENT"].includes(status);
      return `
      <article class="approval-card" data-lease-id="${escapeHtml(lease.lease_id)}">
        <div class="approval-meta">
          <div>
            <h3>${escapeHtml(lease.tenant_name || "Unnamed tenant")}</h3>
            <span>${escapeHtml(lease.unit || "No unit")}</span>
          </div>
          ${renderBadge(status.replace(/_/g, " "))}
        </div>
        <label>
          <span>Subject</span>
          <input data-field="subject" type="text" value="${escapeHtml(lease.draft_subject || "")}" ${isEditable ? "" : "readonly"}>
        </label>
        <label>
          <span>Body</span>
          <textarea data-field="body" ${isEditable ? "" : "readonly"}>${escapeHtml(lease.draft_body || "")}</textarea>
        </label>
        <div class="button-row">
          <button type="button" data-action="approve" ${isApprovable ? "" : "disabled"}>Approve</button>
          <button type="button" data-action="skip" ${isTerminal ? "disabled" : ""}>Skip</button>
          <button type="button" data-action="edit" ${isEditable ? "" : "disabled"}>Save edit</button>
        </div>
      </article>`;
    }).join("")
    : `<div class="empty-state">Drafts will appear here after generation runs.</div>`;

  const approvedCount = draftRows.filter((lease) => normalizeText(lease.status).toUpperCase() === "APPROVED").length;

  return `
    <div class="approval-banner">Nothing has been sent. Nothing sends until you press Send approved below.</div>
    <div class="approval-grid">${cards}</div>
    <div class="approval-footer">
      <button type="button" data-action="approve-all" ${draftRows.length ? "" : "disabled"}>Approve all</button>
      <button type="button" class="primary" data-action="send" ${approvedCount ? "" : "disabled"}>Send approved (${approvedCount} of ${draftRows.length})</button>
    </div>`;
}

function renderRiskFeed(logRows, leasesById) {
  const riskRows = logRows
    .filter((log) => {
      const requiresHuman = log.requires_human === true || normalizeText(log.requires_human).toLowerCase() === "true";
      return requiresHuman || normalizeText(log.compliance_flag) || normalizeText(log.intent) || normalizeText(log.reply_text);
    })
    .sort((a, b) => (Date.parse(b.created_at || "") || 0) - (Date.parse(a.created_at || "") || 0));

  if (!riskRows.length) {
    return `<div class="empty-state">Reply classifications will appear here after inbound replies are checked.</div>`;
  }

  return riskRows.map((log) => {
    const lease = leasesById[normalizeText(log.lease_id)] || {};
    const isCompliance = Boolean(normalizeText(log.compliance_flag));
    const actionText = isCompliance
      ? "Routed to you. No response was drafted."
      : normalizeText(log.event_type) === "UNMATCHED_REPLY"
        ? "Find the tenant manually before replying."
        : normalizeText(log.grievance_summary) || "Review this reply and follow up personally.";
    return `
      <article class="risk-entry ${isCompliance ? "compliance-entry" : ""}">
        <div class="risk-heading">
          <div>
            <h3>${escapeHtml(lease.tenant_name || "Unmatched reply")}</h3>
            <p>${escapeHtml(lease.unit || "No unit")} - ${escapeHtml(formatDate(lease.lease_end_date))}</p>
          </div>
          <time>${escapeHtml(formatDate(log.created_at))}</time>
        </div>
        <blockquote>${escapeHtml(log.reply_text || "No reply text captured.")}</blockquote>
        <div class="risk-badges">
          ${renderBadge(log.intent || "Intent pending")}
          ${renderBadge(log.grievance_category || "Category pending")}
          ${renderBadge(log.urgency || "Urgency pending")}
          ${renderBadge(log.confidence || "Confidence pending")}
          ${renderBadge(log.compliance_flag, "compliance")}
        </div>
        <p class="human-action">${escapeHtml(actionText)}</p>
      </article>`;
  }).join("");
}

function buildDashboardHtml({ leases, outreachLog, configRows, generatedAt }) {
  const cleanLeases = toArray(leases).filter((row) => normalizeText(row.lease_id));
  const cleanLogs = toArray(outreachLog).filter((row) => normalizeText(row.event_id) || normalizeText(row.lease_id));
  const config = buildConfig(toArray(configRows).filter((row) => normalizeText(row.key)));
  const latestLogs = latestLogByLease(cleanLogs);
  const leasesById = Object.fromEntries(cleanLeases.map((lease) => [normalizeText(lease.lease_id), lease]));
  const flaggedRows = cleanLeases.filter((lease) => splitNotes(lease.ingest_notes).length > 0);
  const ninetyCount = cleanLeases.filter((lease) => normalizeText(lease.cohort) === "90").length;
  const totalUnits = Number(config.total_units) || 168;
  const updatedLabel = generatedAt ? new Date(generatedAt).toLocaleString("en-US", { timeZone: config.timezone || "America/New_York" }) : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Renewal Retention Board</title>
  <style>
    :root {
      --bg: #f6f7f4;
      --surface: #ffffff;
      --surface-subtle: #eef1ed;
      --text: #17201b;
      --muted: #647067;
      --border: #d7ddd5;
      --accent: #0f766e;
      --accent-strong: #0b5e59;
      --pending: #89938c;
      --draft: #2563eb;
      --risk: #b45309;
      --staying: #15803d;
      --compliance: #b91c1c;
      --shadow: 0 14px 34px rgba(23, 32, 27, 0.08);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
    }
    a { color: inherit; }
    .skip-link {
      position: absolute;
      left: 16px;
      top: -48px;
      background: var(--text);
      color: #fff;
      padding: 10px 12px;
      border-radius: 6px;
      z-index: 20;
    }
    .skip-link:focus { top: 16px; }
    .shell {
      width: min(100% - 32px, 1440px);
      margin: 0 auto;
      padding: 24px 0 40px;
    }
    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: end;
      margin-bottom: 16px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.15; letter-spacing: 0; }
    h2 { font-size: 18px; line-height: 1.25; }
    h3 { font-size: 15px; line-height: 1.25; }
    .eyebrow {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .header-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
    }
    .metric {
      color: var(--muted);
      font-size: 14px;
    }
    .metric strong { color: var(--text); font-weight: 700; }
    .metric-button {
      border: 0;
      background: transparent;
      color: var(--accent-strong);
      font: inherit;
      font-weight: 700;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .tab-button {
      border: 0;
      border-bottom: 3px solid transparent;
      background: transparent;
      color: var(--muted);
      min-height: 44px;
      padding: 10px 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .tab-button[aria-selected="true"] {
      color: var(--text);
      border-color: var(--accent);
    }
    .tab-panel[hidden] { display: none; }
    .pipeline-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }
    .cohort-column {
      min-width: 0;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
    }
    .column-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      margin-bottom: 10px;
    }
    .count-pill, .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--muted);
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .card-stack {
      display: grid;
      gap: 8px;
    }
    .lease-card, .approval-card, .risk-entry, .flag-row {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .lease-card {
      padding: 10px;
      min-height: 176px;
      border-left: 4px solid var(--pending);
    }
    .lease-card.status-draft { border-left-color: var(--draft); }
    .lease-card.status-risk { border-left-color: var(--risk); }
    .lease-card.status-staying { border-left-color: var(--staying); }
    .lease-card.status-compliance { border-left-color: var(--compliance); outline: 2px solid rgba(185, 28, 28, 0.22); }
    .card-topline {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      min-height: 20px;
      margin-bottom: 6px;
    }
    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--pending);
      flex: 0 0 auto;
    }
    .status-draft .status-dot { background: var(--draft); }
    .status-risk .status-dot { background: var(--risk); }
    .status-staying .status-dot { background: var(--staying); }
    .status-compliance .status-dot { background: var(--compliance); }
    .unit {
      color: var(--muted);
      font-size: 13px;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }
    dl {
      display: grid;
      gap: 4px;
      margin: 10px 0 0;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 700; text-align: right; }
    .card-badges, .flag-badges, .risk-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .badge.issue {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #9a3412;
    }
    .badge.compliance {
      background: #fef2f2;
      border-color: #fecaca;
      color: var(--compliance);
    }
    .stage-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      border: 1px solid var(--accent);
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }
    .section-block {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid var(--border);
    }
    .section-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 10px;
    }
    .flag-list, .approval-grid, .risk-list {
      display: grid;
      gap: 10px;
    }
    .flag-row {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(180px, 2fr);
      gap: 12px;
      padding: 12px;
      align-items: center;
    }
    .flag-row p, .approval-meta span, .risk-heading p, .human-action {
      color: var(--muted);
      font-size: 13px;
    }
    .approval-banner {
      background: #ecfdf5;
      border: 1px solid #99f6e4;
      color: #064e3b;
      border-radius: 8px;
      padding: 12px 14px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .approval-card {
      padding: 12px;
      display: grid;
      gap: 10px;
    }
    .approval-meta, .risk-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    label {
      display: grid;
      gap: 4px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fbfcfa;
      color: var(--text);
      padding: 10px;
      font: inherit;
      font-size: 14px;
    }
    textarea {
      min-height: 118px;
      resize: vertical;
    }
    .button-row, .approval-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button {
      min-height: 44px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      padding: 9px 12px;
      font-weight: 800;
      cursor: pointer;
    }
    button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    button:disabled {
      opacity: 0.52;
      cursor: not-allowed;
    }
    button:hover { filter: brightness(0.98); }
    button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
      outline: 3px solid rgba(15, 118, 110, 0.35);
      outline-offset: 2px;
    }
    .risk-tools {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }
    .risk-entry {
      padding: 14px;
      border-left: 4px solid var(--risk);
    }
    .risk-entry.compliance-entry {
      border-left-color: var(--compliance);
    }
    blockquote {
      margin: 12px 0 0;
      padding: 10px 12px;
      background: var(--surface-subtle);
      border-left: 3px solid var(--border);
      color: var(--text);
      font-size: 14px;
    }
    .empty-state {
      min-height: 72px;
      display: flex;
      align-items: center;
      border: 1px dashed var(--border);
      border-radius: 8px;
      color: var(--muted);
      padding: 12px;
      background: rgba(255, 255, 255, 0.58);
      font-size: 14px;
    }
    .toast {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(360px, calc(100vw - 32px));
      background: var(--text);
      color: #fff;
      border-radius: 8px;
      padding: 12px 14px;
      box-shadow: var(--shadow);
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
      transition: opacity 160ms ease-out, transform 160ms ease-out;
      z-index: 30;
    }
    .toast.visible { opacity: 1; transform: translateY(0); }
    @media (max-width: 1100px) {
      .pipeline-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      header { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .shell { width: min(100% - 20px, 1440px); padding-top: 16px; }
      .pipeline-grid, .flag-row { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
      .header-strip { align-items: flex-start; }
      .stage-action, .approval-footer button, .button-row button { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="shell">
    <header>
      <div>
        <h1>Renewal Retention Board</h1>
        <p class="eyebrow">Demo roster last rendered ${escapeHtml(updatedLabel || "just now")}</p>
      </div>
      <button class="stage-action" type="button" data-action="generate">Generate check-ins for the 90-day window (${ninetyCount})</button>
    </header>

    <div class="header-strip" aria-label="Portfolio summary">
      <span class="metric"><strong>Leases expiring in the next 4 months</strong></span>
      <span class="metric"><strong>${cleanLeases.length}</strong> of ${totalUnits} units</span>
      <span class="metric"><button class="metric-button" type="button" id="attention-link">${flaggedRows.length} need attention</button></span>
      <span class="metric"><strong>${ninetyCount}</strong> in the 90-day window</span>
    </div>

    <nav class="tabs" aria-label="Dashboard views" role="tablist">
      <button class="tab-button" id="tab-pipeline" role="tab" aria-controls="panel-pipeline" aria-selected="true" type="button">Pipeline</button>
      <button class="tab-button" id="tab-approval" role="tab" aria-controls="panel-approval" aria-selected="false" type="button">Approval queue</button>
      <button class="tab-button" id="tab-risk" role="tab" aria-controls="panel-risk" aria-selected="false" type="button">At-risk feed</button>
    </nav>

    <main id="main">
      <section id="panel-pipeline" class="tab-panel" role="tabpanel" aria-labelledby="tab-pipeline">
        <div class="pipeline-grid">${renderPipeline(cleanLeases, latestLogs)}</div>
        <section class="section-block" id="flagged-rows" aria-labelledby="flagged-heading">
          <div class="section-heading">
            <div>
              <h2 id="flagged-heading">Rows Needing Attention</h2>
              <p class="eyebrow">Messy roster rows stay visible so they can be fixed before outreach.</p>
            </div>
            <span class="count-pill">${flaggedRows.length}</span>
          </div>
          ${renderFlaggedRows(flaggedRows)}
        </section>
      </section>

      <section id="panel-approval" class="tab-panel" role="tabpanel" aria-labelledby="tab-approval" hidden>
        ${renderApprovalQueue(cleanLeases)}
      </section>

      <section id="panel-risk" class="tab-panel" role="tabpanel" aria-labelledby="tab-risk" hidden>
        <div class="risk-tools">
          <button type="button" data-action="check-replies">Check for replies now</button>
        </div>
        <div class="risk-list">${renderRiskFeed(cleanLogs, leasesById)}</div>
      </section>
    </main>
  </div>
  <div class="toast" role="status" aria-live="polite" id="toast"></div>
  <script>
    (function () {
      var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
      var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));
      var toast = document.getElementById('toast');
      var toastTimer = null;

      function showTab(tab) {
        tabs.forEach(function (item) {
          var selected = item === tab;
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.id !== tab.getAttribute('aria-controls');
        });
      }

      function showToast(message) {
        toast.textContent = message;
        toast.classList.add('visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
          toast.classList.remove('visible');
        }, 2600);
      }

      function postJson(path, payload) {
        return fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload || {})
        }).then(function (response) {
          return response.text().then(function (text) {
            var data = {};
            if (text) {
              try { data = JSON.parse(text); } catch (error) { data = { raw: text }; }
            }
            if (!response.ok || data.ok === false) {
              throw new Error(data.message || data.error || ('Request failed with HTTP ' + response.status));
            }
            return data;
          });
        });
      }

      function reloadSoon() {
        window.setTimeout(function () { window.location.reload(); }, 650);
      }

      function setBusy(button, label) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = label;
      }

      function clearBusy(button) {
        if (button.dataset.originalText) button.textContent = button.dataset.originalText;
        button.disabled = false;
      }

      function approvalPayload(card, action) {
        return {
          action: action,
          lease_id: card.getAttribute('data-lease-id'),
          edited_subject: card.querySelector('[data-field="subject"]').value,
          edited_body: card.querySelector('[data-field="body"]').value
        };
      }

      function handleAction(button) {
        var action = button.getAttribute('data-action');
        var request;
        if (action === 'generate') {
          setBusy(button, 'Generating...');
          request = postJson('/webhook/generate', { cohort: '90' }).then(function (data) {
            showToast('Generated ' + data.generated_count + ' drafts.');
            showTab(document.getElementById('tab-approval'));
            reloadSoon();
          });
        } else if (action === 'approve-all') {
          setBusy(button, 'Approving...');
          request = postJson('/webhook/approve', { action: 'approve_all' }).then(function (data) {
            showToast('Approved ' + data.updated_count + ' drafts.');
            reloadSoon();
          });
        } else if (action === 'send') {
          setBusy(button, 'Sending...');
          request = postJson('/webhook/send', {}).then(function (data) {
            showToast('Sent ' + data.sent_count + ' check-ins.');
            reloadSoon();
          });
        } else if (action === 'check-replies') {
          setBusy(button, 'Checking...');
          request = postJson('/webhook/check-replies', {}).then(function (data) {
            showToast('Processed ' + data.processed_count + ' replies. Alerts ' + data.alerted_count + '.');
            showTab(document.getElementById('tab-risk'));
            reloadSoon();
          });
        } else if (['approve', 'skip', 'edit'].indexOf(action) >= 0) {
          var card = button.closest('.approval-card');
          setBusy(button, action === 'edit' ? 'Saving...' : 'Working...');
          request = postJson('/webhook/approve', approvalPayload(card, action)).then(function () {
            showToast(action === 'edit' ? 'Edit saved.' : 'Draft updated.');
            reloadSoon();
          });
        }

        if (request) {
          request.catch(function (error) {
            showToast(error.message || 'Action failed.');
            clearBusy(button);
          });
        }
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { showTab(tab); });
      });

      document.getElementById('attention-link').addEventListener('click', function () {
        showTab(document.getElementById('tab-pipeline'));
        document.getElementById('flagged-rows').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      document.querySelectorAll('[data-action]').forEach(function (button) {
        button.addEventListener('click', function () { handleAction(button); });
      });

      document.querySelectorAll('[data-stub]').forEach(function (button) {
        button.addEventListener('click', function () { showToast('This action is not wired yet.'); });
      });
    }());
  </script>
</body>
</html>`;
}
