const REQUIRED_COLUMNS = [
  "tenant_name",
  "unit",
  "email",
  "move_in_date",
  "lease_end_date",
  "is_demo_priority",
];

const STATE_FIELDS = [
  "status",
  "draft_subject",
  "draft_body",
  "ref_token",
  "sent_at",
  "opted_out",
];

function datePartsInTimezone(date, timeZone) {
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

function todayIso(timeZone) {
  const p = datePartsInTimezone(new Date(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function daysBetween(startIso, endIso) {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd, 12);
  const end = Date.UTC(ey, em - 1, ed, 12);
  return Math.round((end - start) / 86400000);
}

function parseCsv(csv) {
  const text = String(csv || "").charCodeAt(0) === 0xfeff ? String(csv || "").slice(1) : String(csv || "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === "\"" && next === "\"") {
        field += "\"";
        i++;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function parseDate(value) {
  const text = String(value || "").trim();
  if (!text) return { value: null, rawKey: "no-end-date", note: "NO_END_DATE" };
  if (isIsoDate(text)) return { value: text, rawKey: text, note: null };
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) {
    return { value: null, rawKey: text, note: "AMBIGUOUS_DATE" };
  }
  return { value: null, rawKey: text, note: "INVALID_DATE" };
}

function titleCaseName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\p{L}[\p{L}'-]*/gu, (word) => word[0].toUpperCase() + word.slice(1));
}

function normalizeTenantName(rawName) {
  const trimmed = String(rawName || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((part) => part.trim());
    return `${titleCaseName(first)} ${titleCaseName(last)}`.trim();
  }
  return titleCaseName(trimmed);
}

function tenantFirstName(rawName) {
  const trimmed = String(rawName || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.includes(",")) {
    const firstPart = trimmed.split(",")[1] || "";
    return titleCaseName(firstPart.trim().split(/\s+/)[0] || "");
  }
  return titleCaseName(trimmed.split(/\s+|&/)[0] || "");
}

function isKnownTypoDomain(email) {
  const domain = String(email || "").split("@")[1] || "";
  return ["gmial.com", "yaho.com", "hotmial.com"].includes(domain.toLowerCase());
}

function emailValid(email) {
  const text = String(email || "").trim();
  if (!text) return false;
  if (isKnownTypoDomain(text)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function cohortFor(days, hasRawLeaseEnd) {
  if (!hasRawLeaseEnd) return "NONE";
  if (days == null) return "NONE";
  if (days < 0) return "EXPIRED";
  if (days >= 105 && days <= 135) return "120";
  if (days >= 75 && days <= 104) return "90";
  if (days >= 45 && days <= 74) return "60";
  if (days >= 20 && days <= 44) return "30";
  return "NONE";
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeBoolean(value) {
  return ["true", "1", "yes", "y"].includes(String(value || "").trim().toLowerCase());
}

function uniqueLeaseId(base, usedIds) {
  let id = base || "lease";
  let next = id;
  let index = 2;
  while (usedIds.has(next)) {
    next = `${id}-${index}`;
    index++;
  }
  usedIds.add(next);
  return next;
}

function normalizeRoster(csvText, options = {}) {
  const timezone = options.timezone || "America/New_York";
  const baseDate = options.baseDate || todayIso(timezone);
  const demoRecipientEmail = String(options.demoRecipientEmail || "").trim();
  const existingRows = Array.isArray(options.existingRows) ? options.existingRows : [];
  const existingByLeaseId = new Map(existingRows.filter((row) => row.lease_id).map((row) => [String(row.lease_id), row]));
  const parsedRows = parseCsv(csvText);
  if (parsedRows.length === 0) throw new Error("CSV is empty.");

  const headers = parsedRows[0].map((header) => String(header || "").trim().replace(/^\ufeff/, ""));
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rawRecords = parsedRows.slice(1).map((row, index) => ({ row, rowNumber: index + 1 }));
  const blankRowCount = rawRecords.filter(({ row }) => row.every((field) => String(field || "").trim() === "")).length;
  const visibleRecords = rawRecords.filter(({ row }) => !row.every((field) => String(field || "").trim() === ""));

  const normalizedUnits = new Map();
  for (const { row } of visibleRecords) {
    const unit = String(row[columnIndex.unit] || "").trim();
    normalizedUnits.set(unit, (normalizedUnits.get(unit) || 0) + 1);
  }

  const usedLeaseIds = new Set();
  const rows = visibleRecords.map(({ row, rowNumber }) => {
    const raw = {};
    for (const column of REQUIRED_COLUMNS) raw[column] = String(row[columnIndex[column]] || "");

    const notes = new Set();
    const tenantName = normalizeTenantName(raw.tenant_name);
    const firstName = tenantFirstName(raw.tenant_name);
    const unit = raw.unit.trim();
    const inputEmail = raw.email.trim();
    const moveIn = parseDate(raw.move_in_date);
    const leaseEnd = parseDate(raw.lease_end_date);
    const hasRawLeaseEnd = raw.lease_end_date.trim().length > 0;

    if (!tenantName) notes.add("MISSING_TENANT_NAME");
    if (!unit) notes.add("MISSING_UNIT");
    if (leaseEnd.note) notes.add(leaseEnd.note);
    if (moveIn.note) notes.add(moveIn.note === "NO_END_DATE" ? "NO_MOVE_IN_DATE" : "INVALID_MOVE_IN_DATE");
    if (!inputEmail) notes.add("MISSING_EMAIL");
    if (isKnownTypoDomain(inputEmail)) notes.add("INVALID_EMAIL_DOMAIN");
    if ((normalizedUnits.get(unit) || 0) > 1) notes.add("DUPLICATE_UNIT");

    const daysToExpiry = leaseEnd.value ? daysBetween(baseDate, leaseEnd.value) : null;
    const tenureMonths = moveIn.value ? Math.floor(daysBetween(moveIn.value, baseDate) / 30.4375) : null;
    if (tenureMonths != null && tenureMonths < 6) notes.add("TENURE_UNDER_6M");
    if (daysToExpiry != null && daysToExpiry < 0) notes.add("EXPIRED_LEASE");

    const cohort = cohortFor(daysToExpiry, hasRawLeaseEnd);
    const isDemoPriority = normalizeBoolean(raw.is_demo_priority);
    const email = isDemoPriority && demoRecipientEmail ? demoRecipientEmail : inputEmail;
    const leaseId = uniqueLeaseId(slugify(`${unit}-${leaseEnd.value || leaseEnd.rawKey}`), usedLeaseIds);
    const existing = existingByLeaseId.get(leaseId);

    const rowOut = {
      lease_id: leaseId,
      tenant_name: tenantName,
      tenant_first_name: firstName,
      unit,
      email,
      email_valid: emailValid(email),
      move_in_date: moveIn.value,
      lease_end_date: leaseEnd.value,
      days_to_expiry: daysToExpiry,
      cohort,
      tenure_months: tenureMonths,
      status: existing ? existing.status : "PENDING",
      draft_subject: existing ? existing.draft_subject : "",
      draft_body: existing ? existing.draft_body : "",
      ref_token: existing ? existing.ref_token : "",
      sent_at: existing ? existing.sent_at : null,
      opted_out: existing ? Boolean(existing.opted_out) : false,
      ingest_notes: [...notes].sort().join(";"),
      _row_number_after_header: rowNumber,
      _is_demo_priority: isDemoPriority,
    };

    for (const field of STATE_FIELDS) {
      if (existing && Object.prototype.hasOwnProperty.call(existing, field)) rowOut[field] = existing[field];
    }

    return rowOut;
  });

  const cohortCounts = rows.reduce((acc, row) => {
    acc[row.cohort] = (acc[row.cohort] || 0) + 1;
    return acc;
  }, {});
  const flaggedRows = rows.filter((row) => row.ingest_notes);

  return {
    rows,
    summary: {
      loaded_count: rows.length,
      visible_row_count: rows.length,
      blank_row_count: blankRowCount,
      flagged_count: flaggedRows.length,
      cohort_counts: cohortCounts,
      board_url: options.boardUrl || "http://localhost:5678/webhook/board",
      uploaded_at: options.uploadedAt || new Date().toISOString(),
      warnings: flaggedRows.map((row) => ({
        lease_id: row.lease_id,
        unit: row.unit,
        ingest_notes: row.ingest_notes,
      })),
    },
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    REQUIRED_COLUMNS,
    STATE_FIELDS,
    normalizeRoster,
    parseCsv,
    slugify,
  };
}
