/**
 * Airtable schema definition for the v2 renewal-retention demo.
 *
 * The Airtable Meta API cannot create formula, rollup, lookup, or count fields.
 * Every derived value (days_to_expiry, cohort, tenure_months, data_quality,
 * turnover_exposure, days_to_resolve) is therefore a plain field that n8n
 * computes and writes, exactly as the v1 Data Table build did. The seed and the
 * WF9 sweep keep them current.
 *
 * Field names stay snake_case to match the v1 helpers in scripts/stage-*-lib.js
 * so ported logic needs no renaming.
 */

const TABLE_LEASES = "Leases";
const TABLE_LOG = "Outreach Log";
const TABLE_CONFIG = "Config";
const TABLE_METRICS = "Metrics";

function select(name, choices) {
  return { name, type: "singleSelect", options: { choices } };
}

function choice(name, color) {
  return { name, color };
}

function text(name) {
  return { name, type: "singleLineText" };
}

function longText(name) {
  return { name, type: "multilineText" };
}

function number(name, precision = 0) {
  return { name, type: "number", options: { precision } };
}

function currency(name) {
  return { name, type: "currency", options: { precision: 0, symbol: "$" } };
}

function checkbox(name, color = "greenBright") {
  return { name, type: "checkbox", options: { icon: "check", color } };
}

function date(name) {
  return { name, type: "date", options: { dateFormat: { name: "iso" } } };
}

function dateTime(name, timeZone = "America/New_York") {
  return {
    name,
    type: "dateTime",
    options: {
      dateFormat: { name: "iso" },
      timeFormat: { name: "24hour" },
      timeZone,
    },
  };
}

const STATUS_CHOICES = [
  choice("PENDING", "grayLight2"),
  choice("DRAFT", "blueLight2"),
  choice("AWAITING_APPROVAL", "yellowLight2"),
  choice("APPROVED", "tealLight2"),
  choice("SENT", "greenLight2"),
  choice("AT_RISK", "redBright"),
  choice("STAYING", "greenBright"),
  choice("RESOLVED", "tealBright"),
  choice("ESCALATE", "orangeBright"),
  choice("OPTED_OUT", "grayBright"),
  choice("SEND_FAILED", "redLight2"),
  choice("REVIEW_FAILED", "orangeLight2"),
];

const COHORT_CHOICES = [
  choice("120", "blueLight2"),
  choice("90", "greenLight2"),
  choice("60", "yellowLight2"),
  choice("30", "orangeLight2"),
  choice("NONE", "grayLight2"),
  choice("EXPIRED", "redLight2"),
];

const TOUCH_CHOICES = [
  choice("NONE", "grayLight2"),
  choice("WATCH_120", "blueLight2"),
  choice("CHECK_IN_90", "greenLight2"),
  choice("NUDGE_60", "yellowLight2"),
  choice("HANDOFF_30", "orangeLight2"),
];

const INTENT_CHOICES = [
  choice("STAYING", "greenBright"),
  choice("WAVERING", "yellowLight2"),
  choice("LEAVING", "redLight2"),
  choice("GRIEVANCE", "orangeBright"),
  choice("UNCLEAR", "grayLight2"),
  choice("NO_SIGNAL", "grayBright"),
  choice("OPT_OUT", "purpleLight2"),
];

const GRIEVANCE_CHOICES = [
  choice("NONE", "grayLight2"),
  choice("MAINTENANCE", "orangeLight2"),
  choice("NEIGHBOURS", "yellowLight2"),
  choice("FEES", "blueLight2"),
  choice("COMMUNICATION", "cyanLight2"),
  choice("PROPERTY_CONDITION", "redLight2"),
  choice("OTHER", "grayLight2"),
];

const URGENCY_CHOICES = [
  choice("HIGH", "redBright"),
  choice("MEDIUM", "yellowLight2"),
  choice("LOW", "grayLight2"),
];

const COMPLIANCE_CHOICES = [
  choice("NONE", "grayLight2"),
  choice("ACCOMMODATION_REQUEST", "purpleBright"),
  choice("HABITABILITY", "redBright"),
  choice("LEGAL_THREAT", "redBright"),
  choice("OPT_OUT", "purpleLight2"),
  choice("DISCRIMINATION_CONCERN", "redBright"),
];

const CONFIDENCE_CHOICES = [
  choice("HIGH", "greenLight2"),
  choice("MEDIUM", "yellowLight2"),
  choice("LOW", "redLight2"),
];

const ISSUE_STATUS_CHOICES = [
  choice("NONE", "grayLight2"),
  choice("OPEN", "redBright"),
  choice("RESOLVED", "greenBright"),
];

const EVENT_TYPE_CHOICES = [
  choice("DRAFTED", "blueLight2"),
  choice("APPROVED", "tealLight2"),
  choice("SENT", "greenLight2"),
  choice("REPLY_RECEIVED", "cyanLight2"),
  choice("ALERT_SENT", "orangeLight2"),
  choice("ASSIST_SENT", "purpleLight2"),
  choice("RESOLVED", "greenBright"),
  choice("CONFIRMATION_SENT", "tealBright"),
  choice("NO_SIGNAL", "grayLight2"),
  choice("UNMATCHED_REPLY", "yellowLight2"),
  choice("OPT_OUT", "purpleBright"),
  choice("ESCALATED", "orangeBright"),
  choice("SKIPPED", "grayBright"),
  choice("ERROR", "redBright"),
];

/**
 * Table definitions. The first field in each list becomes the primary field,
 * so it must be a type Airtable accepts as primary (text/number/date).
 */
const TABLES = [
  {
    name: TABLE_LEASES,
    description: "Synthetic demo residents. Cohorts derive from lease_end_date only.",
    fields: [
      text("lease_id"),
      text("tenant_name"),
      text("tenant_first_name"),
      text("unit"),
      { name: "email", type: "email" },
      date("move_in_date"),
      date("lease_end_date"),
      number("days_to_expiry"),
      select("cohort", COHORT_CHOICES),
      number("tenure_months"),
      longText("data_quality"),
      checkbox("needs_attention", "orangeBright"),
      select("status", STATUS_CHOICES),
      select("touch_stage", TOUCH_CHOICES),
      text("draft_subject"),
      longText("draft_body"),
      text("ref_token"),
      dateTime("sent_at"),
      checkbox("opted_out", "grayBright"),
      checkbox("is_demo_priority", "blueBright"),
      longText("reply_text"),
      select("intent", INTENT_CHOICES),
      select("grievance_category", GRIEVANCE_CHOICES),
      select("urgency", URGENCY_CHOICES),
      select("compliance_flag", COMPLIANCE_CHOICES),
      select("confidence", CONFIDENCE_CHOICES),
      longText("suggested_action"),
      select("issue_status", ISSUE_STATUS_CHOICES),
      dateTime("issue_opened_at"),
      dateTime("issue_resolved_at"),
      dateTime("confirmation_sent_at"),
      number("days_to_resolve", 1),
      currency("turnover_exposure"),
      longText("assist_draft"),
    ],
  },
  {
    name: TABLE_LOG,
    description: "Every outreach, reply, alert, and approval event in the demo.",
    fields: [
      text("event_id"),
      // lease link is added after Leases exists (needs its table id)
      select("event_type", EVENT_TYPE_CHOICES),
      select("channel", [
        choice("EMAIL", "greenLight2"),
        choice("TELEGRAM", "blueLight2"),
        choice("SYSTEM", "grayLight2"),
      ]),
      select("direction", [
        choice("OUTBOUND", "orangeLight2"),
        choice("INBOUND", "cyanLight2"),
        choice("INTERNAL", "grayLight2"),
      ]),
      text("lease_id"),
      text("tenant_name"),
      longText("message_text"),
      select("intent", INTENT_CHOICES),
      select("grievance_category", GRIEVANCE_CHOICES),
      select("urgency", URGENCY_CHOICES),
      select("compliance_flag", COMPLIANCE_CHOICES),
      select("confidence", CONFIDENCE_CHOICES),
      checkbox("requires_human", "redBright"),
      text("approved_by"),
      text("gmail_message_id"),
      dateTime("created_at"),
    ],
  },
  {
    name: TABLE_CONFIG,
    description: "Demo configuration. Local values only - never real client data.",
    fields: [
      text("key"),
      text("value"),
      select("value_type", [
        choice("string", "grayLight2"),
        choice("number", "blueLight2"),
        choice("email", "greenLight2"),
        choice("boolean", "yellowLight2"),
      ]),
      longText("description"),
      dateTime("updated_at"),
    ],
  },
  {
    name: TABLE_METRICS,
    description: "Live demo scoreboard. Turnover exposure is the headline number.",
    fields: [
      text("snapshot"),
      number("residents_in_window"),
      number("check_ins_sent"),
      number("replies_received"),
      number("issues_found"),
      number("issues_resolved"),
      number("avg_resolution_days", 1),
      number("at_risk_count"),
      currency("turnover_exposure"),
      currency("exposure_recovered"),
      dateTime("updated_at"),
    ],
  },
];

/**
 * The link field is created in a second pass because it needs the Leases table id.
 */
function leaseLinkField(leasesTableId) {
  return {
    name: "lease",
    type: "multipleRecordLinks",
    options: { linkedTableId: leasesTableId },
  };
}

module.exports = {
  TABLE_LEASES,
  TABLE_LOG,
  TABLE_CONFIG,
  TABLE_METRICS,
  TABLES,
  leaseLinkField,
  choices: {
    STATUS_CHOICES,
    COHORT_CHOICES,
    TOUCH_CHOICES,
    INTENT_CHOICES,
    GRIEVANCE_CHOICES,
    URGENCY_CHOICES,
    COMPLIANCE_CHOICES,
    CONFIDENCE_CHOICES,
    ISSUE_STATUS_CHOICES,
    EVENT_TYPE_CHOICES,
  },
};
