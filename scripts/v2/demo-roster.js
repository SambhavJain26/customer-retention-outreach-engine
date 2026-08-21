/**
 * Builds the v2 demo roster from the committed client fixture.
 *
 * fixtures/roster-demo.csv holds absolute dates anchored to 2026-08-04. Rather
 * than freezing the demo to that date, the seed shifts every ISO date forward by
 * the gap between that anchor and the seed run date. Cohort distribution is
 * preserved exactly (120=6, 90=14, 60=11, 30=6, NONE=2, EXPIRED=1) while the data
 * stays live-correct on the day it is recorded.
 *
 * Deliberately messy cells are left untouched so they still demonstrate the
 * data-quality path: the ambiguous slash date, the typo email domain, the missing
 * email, the missing lease end date, and the duplicate unit.
 *
 * All normalization, cohort banding, and flagging is delegated to the v1
 * normalizer in scripts/stage-3-ingest-lib.js so v2 cannot drift from verified
 * behaviour.
 */

const fs = require("fs");
const path = require("path");
const { normalizeRoster } = require("../stage-3-ingest-lib.js");

const FIXTURE_BASE_DATE = "2026-08-04";
const FIXTURE_PATH = path.join(__dirname, "..", "..", "fixtures", "roster-demo.csv");
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDays(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function fromUtcDays(days) {
  return new Date(days * 86400000).toISOString().slice(0, 10);
}

function todayIso(timeZone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

function shiftIsoDate(value, deltaDays) {
  const text = String(value || "").trim();
  if (!ISO_DATE.test(text)) return value;
  return fromUtcDays(toUtcDays(text) + deltaDays);
}

/**
 * Shifts ISO dates in the raw CSV text without disturbing anything else -
 * quoting, BOM, blank lines, and the ambiguous slash date all survive.
 */
function shiftCsvDates(csvText, deltaDays) {
  if (!deltaDays) return csvText;
  return csvText
    .split(/\r?\n/)
    .map((line, index) => {
      if (index === 0 || !line.trim()) return line;
      return line.replace(/(^|,)(\d{4}-\d{2}-\d{2})(?=,|$)/g, (match, prefix, isoDate) => {
        return `${prefix}${shiftIsoDate(isoDate, deltaDays)}`;
      });
    })
    .join("\n");
}

/**
 * @param {object} options
 * @param {string} [options.baseDate] seed run date, ISO. Defaults to today.
 * @param {string} [options.demoRecipientEmail] used for the demo-priority row and
 *   for `extraDemoRecipients` further residents in the 90-day cohort.
 * @param {number} [options.extraDemoRecipients] how many additional 90-day residents
 *   should point at the demo inbox, so approving a second and third draft on camera
 *   actually delivers. Defaults to 3. Every other resident keeps an @example.com
 *   address, which is IANA-reserved and cannot reach a real person.
 * @param {string} [options.timezone]
 */
function buildDemoRoster(options = {}) {
  const timezone = options.timezone || "America/New_York";
  const baseDate = options.baseDate || todayIso(timezone);
  const deltaDays = toUtcDays(baseDate) - toUtcDays(FIXTURE_BASE_DATE);

  const rawCsv = fs.readFileSync(FIXTURE_PATH, "utf8");
  const shiftedCsv = shiftCsvDates(rawCsv, deltaDays);

  const normalized = normalizeRoster(shiftedCsv, {
    baseDate,
    timezone,
    demoRecipientEmail: options.demoRecipientEmail || "",
  });

  const demoEmail = String(options.demoRecipientEmail || "").trim();
  const extraCount = options.extraDemoRecipients == null ? 3 : Number(options.extraDemoRecipients);
  const demoInboxLeaseIds = [];

  if (demoEmail && extraCount > 0) {
    // Only residents in the 90-day cohort that already hold a usable address are
    // redirected, so the data-quality rows keep demonstrating their own problems.
    const eligible = normalized.rows
      .filter((row) => row.cohort === "90" && !row._is_demo_priority && row.email_valid)
      .sort((a, b) => Number(a.days_to_expiry || 9999) - Number(b.days_to_expiry || 9999))
      .slice(0, extraCount);

    for (const row of eligible) {
      row.email = demoEmail;
      demoInboxLeaseIds.push(row.lease_id);
    }
  }

  const priority = normalized.rows.find((row) => row._is_demo_priority);
  if (priority) demoInboxLeaseIds.unshift(priority.lease_id);

  return {
    baseDate,
    deltaDays,
    rows: normalized.rows,
    summary: normalized.summary,
    demo_inbox_lease_ids: demoInboxLeaseIds,
  };
}

/**
 * Maps a normalized roster row onto the Airtable Leases schema.
 * Empty values are omitted so Airtable keeps the cell blank rather than
 * storing an empty string in a typed field.
 */
function toAirtableLease(row, config = {}) {
  const exposure = 0; // no resident is at risk at seed time
  const fields = {
    lease_id: row.lease_id,
    tenant_name: row.tenant_name,
    tenant_first_name: row.tenant_first_name,
    unit: row.unit,
    status: "PENDING",
    touch_stage: "NONE",
    cohort: row.cohort || "NONE",
    issue_status: "NONE",
    opted_out: false,
    is_demo_priority: Boolean(row._is_demo_priority),
    needs_attention: Boolean(row.ingest_notes),
    turnover_exposure: exposure,
  };

  if (row.email) fields.email = row.email;
  if (row.move_in_date) fields.move_in_date = row.move_in_date;
  if (row.lease_end_date) fields.lease_end_date = row.lease_end_date;
  if (row.days_to_expiry != null) fields.days_to_expiry = Number(row.days_to_expiry);
  if (row.tenure_months != null) fields.tenure_months = Number(row.tenure_months);
  if (row.ingest_notes) fields.data_quality = row.ingest_notes;

  return fields;
}

module.exports = {
  FIXTURE_BASE_DATE,
  FIXTURE_PATH,
  buildDemoRoster,
  shiftCsvDates,
  toAirtableLease,
  todayIso,
};
