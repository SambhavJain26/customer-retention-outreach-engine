function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
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

function hashHex(value) {
  let hash = 2166136261;
  const text = normalizeText(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function parseEmailAddress(value) {
  const text = normalizeText(value);
  const angleMatch = text.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  if (angleMatch) return normalizeEmail(angleMatch[1]);
  const bareMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return bareMatch ? normalizeEmail(bareMatch[0]) : normalizeEmail(text);
}

function extractRefToken(value) {
  const match = normalizeText(value).match(/\[?(R-[0-9A-F]{4})\]?/i);
  return match ? match[1].toUpperCase() : "";
}

function stripHtml(value) {
  return normalizeText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function stripQuotedReply(value) {
  let text = stripHtml(value).replace(/\r\n/g, "\n");
  text = text.split(/\nOn .+ wrote:\s*$/im)[0];
  text = text.split(/\n-{2,}\s*Original Message\s*-{2,}/i)[0];
  text = text.split(/\nFrom:\s.+\nSent:\s.+\nTo:\s.+/i)[0];
  text = text
    .split("\n")
    .filter((line) => !normalizeText(line).startsWith(">"))
    .join("\n");
  text = text.split(/\n--\s*$/m)[0];
  text = text.split(/\nSent from my /i)[0];
  text = text.split(/\nThis message and any attachments/i)[0];
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function hasManualReplyPayload(body) {
  return Boolean(
    normalizeText(body.reply_text || body.text || body.body || body.message) ||
    normalizeText(body.subject) ||
    normalizeText(body.from_email || body.from || body.sender),
  );
}

function headerValue(headers, name) {
  const target = normalizeText(name).toLowerCase();
  if (!headers) return "";
  if (Array.isArray(headers)) {
    const found = headers.find((header) => normalizeText(header.name).toLowerCase() === target);
    return found ? normalizeText(found.value) : "";
  }
  if (typeof headers === "object") {
    const key = Object.keys(headers).find((candidate) => normalizeText(candidate).toLowerCase() === target);
    return key ? normalizeText(headers[key]) : "";
  }
  return "";
}

function isAutoReply(reply) {
  const subject = normalizeText(reply.subject);
  const body = normalizeText(reply.reply_text);
  const headers = reply.headers || {};
  const autoSubmitted = headerValue(headers, "Auto-Submitted");
  const xAutoreply = headerValue(headers, "X-Autoreply");
  const precedence = headerValue(headers, "Precedence");

  if (autoSubmitted && !/^no$/i.test(autoSubmitted)) return true;
  if (xAutoreply) return true;
  if (/^(bulk|auto_reply|list)$/i.test(precedence)) return true;
  if (/\b(out of office|automatic reply|auto-?reply|delivery status notification|undeliverable|mail delivery failed)\b/i.test(subject)) return true;
  if (/\b(out of the office|out of office|limited access to email|currently away|automatic reply)\b/i.test(body)) return true;
  return false;
}

function containsQuestion(replyText) {
  const text = normalizeText(replyText);
  const questionWord = /\b(what|when|who|whom|whose|which|where|why|how|can|could|will|would|should|do|does|did|is|are|any chance|possible)\b/i;
  return /\?/.test(text) && questionWord.test(text);
}

function eventIdForReply(reply) {
  const messageId = normalizeText(reply.message_id || reply.id);
  if (messageId) return `reply-${messageId.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 96)}`;
  return `reply-${hashHex(`${reply.from_email}|${reply.subject}|${reply.reply_text}`)}`;
}

function findExistingEvent(logRows, eventId) {
  return toArray(logRows).some((row) => normalizeText(row.event_id) === eventId);
}

function matchLease(reply, leases) {
  const token = extractRefToken(`${reply.subject || ""} ${reply.reply_text || ""}`);
  if (token) {
    const tokenMatch = toArray(leases).find((lease) => normalizeText(lease.ref_token).toUpperCase() === token);
    if (tokenMatch) return { lease: tokenMatch, match_method: "ref_token", ref_token: token };
  }

  const fromEmail = normalizeEmail(reply.from_email);
  if (fromEmail) {
    const emailMatches = toArray(leases).filter((lease) => normalizeEmail(lease.email) === fromEmail);
    const sentFirst = emailMatches.find((lease) => ["SENT", "AT_RISK", "STAYING"].includes(normalizeText(lease.status).toUpperCase()));
    if (sentFirst) return { lease: sentFirst, match_method: "email", ref_token: normalizeText(sentFirst.ref_token) };
    if (emailMatches.length === 1) return { lease: emailMatches[0], match_method: "email", ref_token: normalizeText(emailMatches[0].ref_token) };
  }

  return { lease: null, match_method: "unmatched", ref_token: token };
}

function normalizeGmailMessage(message) {
  const headers = message.headers || message.payload?.headers || {};
  const subject = normalizeText(message.subject || headerValue(headers, "Subject"));
  const fromEmail = parseEmailAddress(message.from || headerValue(headers, "From"));
  const replyText = stripQuotedReply(message.textPlain || message.text || message.snippet || message.textHtml || message.html || "");
  return {
    source: "gmail",
    message_id: normalizeText(message.id || message.messageId),
    thread_id: normalizeText(message.threadId || message.thread_id),
    from_email: fromEmail,
    subject,
    reply_text: replyText,
    headers,
    raw: message,
  };
}

function normalizeManualReply(body) {
  const replyText = stripQuotedReply(body.reply_text || body.text || body.body || body.message || "");
  return {
    source: "manual",
    message_id: normalizeText(body.message_id || body.id || body.fixture_id),
    thread_id: normalizeText(body.thread_id),
    from_email: parseEmailAddress(body.from_email || body.from || body.sender || ""),
    subject: normalizeText(body.subject || ""),
    reply_text: replyText,
    headers: body.headers || {},
    suppress_alerts: normalizeBool(body.suppress_alerts),
    raw: body,
  };
}

function noReplyResult(config, sourceMode) {
  return {
    ok: true,
    action: "check_replies",
    source: sourceMode || "gmail",
    processed_count: 0,
    alerted_count: 0,
    duplicate_count: 0,
    no_signal_count: 0,
    unmatched_count: 0,
    message: "No unprocessed replies found.",
    board_url: "http://localhost:5678/webhook/board",
    _terminal: true,
    _skip_log: true,
    _skip_lease_update: true,
  };
}

function prepareReplyWorkItem(reply, config, leases, logRows) {
  const eventId = eventIdForReply(reply);
  const duplicate = findExistingEvent(logRows, eventId);
  const base = {
    ok: true,
    action: "check_replies",
    source: reply.source,
    event_id: eventId,
    reply,
    config,
    board_url: "http://localhost:5678/webhook/board",
    _processed_label_id: normalizeText(config.gmail_processed_label_id || config.processed_label_id || reply.processed_label_id),
    _gmail_message_id: reply.source === "gmail" ? normalizeText(reply.message_id) : "",
    _suppress_alerts: normalizeBool(reply.suppress_alerts),
  };

  if (!normalizeText(reply.reply_text) && !normalizeText(reply.subject)) {
    return noReplyResult(config, reply.source);
  }

  if (duplicate) {
    return {
      ...base,
      processed_count: 0,
      alerted_count: 0,
      duplicate_count: 1,
      no_signal_count: 0,
      unmatched_count: 0,
      duplicate: true,
      message: "Reply already processed.",
      _terminal: true,
      _skip_log: true,
      _skip_lease_update: true,
    };
  }

  const match = matchLease(reply, leases);
  if (!match.lease) {
    const classification = {
      intent: "UNMATCHED",
      grievance_present: false,
      grievance_summary: "Reply could not be matched to a lease.",
      grievance_category: "NONE",
      urgency: "HIGH",
      compliance_flag: "NONE",
      suggested_human_action: "Find the tenant manually before replying.",
      confidence: "LOW",
      contains_question: containsQuestion(reply.reply_text),
      requires_human: true,
    };
    return finalizeRoute({ ...base, lease: {}, match_method: "unmatched" }, classification, new Date().toISOString(), "UNMATCHED_REPLY");
  }

  const matched = { ...base, lease: match.lease, match_method: match.match_method, ref_token: match.ref_token };
  if (isAutoReply(reply)) {
    const classification = {
      intent: "NO_SIGNAL",
      grievance_present: false,
      grievance_summary: "",
      grievance_category: "NONE",
      urgency: "LOW",
      compliance_flag: "NONE",
      suggested_human_action: "No action needed.",
      confidence: "HIGH",
      contains_question: false,
      requires_human: false,
    };
    return finalizeRoute(matched, classification, new Date().toISOString(), "NO_SIGNAL");
  }

  if (shouldUseFastDeterministicRoute(reply.reply_text)) {
    const classification = deterministicClassification(reply.reply_text, baselineRawClassification());
    return finalizeRoute(matched, classification, new Date().toISOString(), "REPLY_CLASSIFIED");
  }

  return {
    ...matched,
    _needs_ai: true,
    model_classify: normalizeText(config.model_classify) || "gpt-5.6-luna",
    instructions: classificationInstructions(),
    prompt: buildClassificationPrompt(matched),
  };
}

function classificationInstructions() {
  return [
    "You classify a single reply from a residential tenant to a short check-in message from their property manager.",
    "You are only a classifier. Never write a reply, never give advice to the tenant, and never contact anyone.",
    "Output JSON matching the schema exactly. No prose, markdown, or fences.",
    "If a reply both raises a problem and says they are staying, use GRIEVANCE. The problem matters more than the intent.",
    "Set compliance_flag precisely. ACCOMMODATION_REQUEST covers disability, medical, mobility, assistance animal, or home modification needs. HABITABILITY covers mould, heat, hot water, sewage, pests, hazards, leaks, and safety risks. LEGAL_THREAT covers lawyer, lawsuit, code inspector, housing authority, withholding rent, or formal complaint. OPT_OUT covers stop, unsubscribe, remove me, or do not contact. DISCRIMINATION_CONCERN covers unequal treatment tied to protected-class language.",
    "suggested_human_action must be one short imperative sentence addressed to the property manager, never the tenant.",
    "confidence is HIGH only if the reply is unambiguous. Short, sarcastic, mixed, or quoted replies are MEDIUM or LOW.",
  ].join("\n");
}

function buildClassificationPrompt(workItem) {
  const lease = workItem.lease || {};
  return [
    "Classify this tenant reply.",
    "",
    `Tenant first name: ${normalizeText(lease.tenant_first_name)}`,
    `Unit: ${normalizeText(lease.unit)}`,
    `Lease end date: ${normalizeText(lease.lease_end_date)}`,
    `Subject: ${normalizeText(workItem.reply.subject)}`,
    "",
    "Reply:",
    normalizeText(workItem.reply.reply_text),
  ].join("\n");
}

function extractJsonObject(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  const text = normalizeText(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (__) {
      return null;
    }
  }
}

function extractClassification(openAiOutput) {
  const direct = extractJsonObject(openAiOutput);
  if (direct && direct.intent) return direct;

  const queue = [openAiOutput];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    if (typeof current === "object") seen.add(current);
    if (typeof current === "string") {
      const parsed = extractJsonObject(current);
      if (parsed && parsed.intent) return parsed;
      continue;
    }
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current === "object") {
      if (current.intent) return current;
      for (const key of ["output", "text", "content", "message", "data", "response", "json"]) {
        if (Object.prototype.hasOwnProperty.call(current, key)) queue.push(current[key]);
      }
    }
  }
  throw new Error("OpenAI classification output did not contain schema JSON.");
}

function cleanEnum(value, allowed, fallback) {
  const normalized = normalizeText(value).toUpperCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function deterministicClassification(replyText, raw) {
  const text = normalizeText(replyText);
  const folded = text.toLowerCase();
  const base = {
    intent: cleanEnum(raw.intent, ["STAYING", "WAVERING", "LEAVING", "GRIEVANCE", "UNCLEAR", "NO_SIGNAL", "OPT_OUT"], "UNCLEAR"),
    grievance_present: normalizeBool(raw.grievance_present),
    grievance_summary: normalizeText(raw.grievance_summary),
    grievance_category: cleanEnum(raw.grievance_category, ["NONE", "MAINTENANCE", "NEIGHBOURS", "FEES", "COMMUNICATION", "PROPERTY_CONDITION", "OTHER"], "NONE"),
    urgency: cleanEnum(raw.urgency, ["HIGH", "MEDIUM", "LOW"], "LOW"),
    compliance_flag: cleanEnum(raw.compliance_flag, ["NONE", "ACCOMMODATION_REQUEST", "HABITABILITY", "LEGAL_THREAT", "OPT_OUT", "DISCRIMINATION_CONCERN"], "NONE"),
    suggested_human_action: normalizeText(raw.suggested_human_action) || "Read the reply and follow up personally.",
    confidence: cleanEnum(raw.confidence, ["HIGH", "MEDIUM", "LOW"], "LOW"),
  };

  if (/\b(stop emailing|stop|unsubscribe|remove me|do not contact|don't contact)\b/i.test(text)) {
    base.intent = "OPT_OUT";
    base.compliance_flag = "OPT_OUT";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
    base.grievance_present = false;
    base.grievance_category = "NONE";
    base.suggested_human_action = "Mark the resident opted out and follow up only if required.";
  } else if (/\b(walker|wheelchair|disab|medical|grab bar|assistance animal|service animal|reasonable accommodation)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.grievance_category = base.grievance_category === "NONE" ? "PROPERTY_CONDITION" : base.grievance_category;
    base.compliance_flag = "ACCOMMODATION_REQUEST";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
    base.suggested_human_action = "Review this as an accommodation request before responding.";
  } else if (/\b(mould|mold|black mould|black mold|no heat|heat is out|hot water|sewage|pests?|electrical|gas leak|water ingress|leak|ceiling)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.grievance_category = "PROPERTY_CONDITION";
    base.compliance_flag = "HABITABILITY";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
    base.suggested_human_action = "Escalate this condition issue for human review today.";
  } else if (/\b(lawyer|attorney|lawsuit|sue|housing authority|code inspector|withhold(?:ing)? rent|formal complaint)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.compliance_flag = "LEGAL_THREAT";
    base.urgency = "HIGH";
    base.suggested_human_action = "Escalate this legal-risk reply before responding.";
  } else if (/\b(discriminat|unfair treatment|race|religion|national origin|familial status|source of income|language access)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.compliance_flag = "DISCRIMINATION_CONCERN";
    base.urgency = "HIGH";
    base.suggested_human_action = "Escalate this fair-housing concern before responding.";
  } else if (/\b(extractor fan|bathroom fan|reported it twice|broken since summer)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.grievance_category = "MAINTENANCE";
    base.compliance_flag = "NONE";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
    base.grievance_summary = "Bathroom extractor fan has been broken since summer and was reported twice.";
    base.suggested_human_action = "Check the work order history and call the resident today.";
  } else if (/\b(parking|neighbou?r|spot|2C)\b/i.test(text)) {
    base.intent = "GRIEVANCE";
    base.grievance_present = true;
    base.grievance_category = "NEIGHBOURS";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
  } else if (/\b(relocat\w*|moving|move out|leaving|not renewing)\b/i.test(text)) {
    base.intent = "LEAVING";
    base.grievance_present = false;
    base.grievance_category = "NONE";
    base.urgency = "HIGH";
    base.confidence = "HIGH";
  } else if (/\b(depends|we'll see|rent|terms|price)\b/i.test(text) && !/\blove to stay|planning to stay|plan to stay\b/i.test(text)) {
    base.intent = "WAVERING";
    base.urgency = "MEDIUM";
    base.confidence = "MEDIUM";
  } else if (/^\s*k\s*$/i.test(text)) {
    base.intent = "UNCLEAR";
    base.confidence = "LOW";
    base.urgency = "LOW";
    base.grievance_present = false;
    base.grievance_category = "NONE";
  } else if (/\b(all good|planning to stay|plan to stay|love to stay|happy here|staying)\b/i.test(folded)) {
    base.intent = "STAYING";
    base.grievance_present = false;
    base.grievance_category = "NONE";
    base.compliance_flag = "NONE";
    base.confidence = "HIGH";
    base.urgency = containsQuestion(text) ? "MEDIUM" : "LOW";
  }

  const question = containsQuestion(text);
  base.contains_question = question;
  base.requires_human = !(
    base.intent === "STAYING" &&
    base.grievance_present === false &&
    base.grievance_category === "NONE" &&
    base.compliance_flag === "NONE" &&
    base.confidence === "HIGH" &&
    question === false
  );
  if (base.compliance_flag !== "NONE" || base.intent === "OPT_OUT") base.requires_human = true;
  return base;
}

function baselineRawClassification() {
  return {
    intent: "UNCLEAR",
    grievance_present: false,
    grievance_summary: "",
    grievance_category: "NONE",
    urgency: "LOW",
    compliance_flag: "NONE",
    suggested_human_action: "Read the reply and follow up personally.",
    confidence: "LOW",
  };
}

function shouldUseFastDeterministicRoute(replyText) {
  const text = normalizeText(replyText);
  return /\b(stop emailing|stop|unsubscribe|remove me|do not contact|don't contact)\b/i.test(text) ||
    /\b(walker|wheelchair|disab|medical|grab bar|assistance animal|service animal|reasonable accommodation)\b/i.test(text) ||
    /\b(mould|mold|black mould|black mold|no heat|heat is out|hot water|sewage|pests?|electrical|gas leak|water ingress|leak|ceiling)\b/i.test(text) ||
    /\b(lawyer|attorney|lawsuit|sue|housing authority|code inspector|withhold(?:ing)? rent|formal complaint)\b/i.test(text) ||
    /\b(discriminat|unfair treatment|race|religion|national origin|familial status|source of income|language access)\b/i.test(text) ||
    /\b(extractor fan|bathroom fan|reported it twice|broken since summer)\b/i.test(text) ||
    /\b(parking|neighbou?r|spot|2C)\b/i.test(text) ||
    /\b(relocat\w*|moving|move out|leaving|not renewing)\b/i.test(text) ||
    /\b(depends|we'll see|rent|terms|price)\b/i.test(text) ||
    /^\s*k\s*$/i.test(text) ||
    /\b(all good|planning to stay|plan to stay|love to stay|happy here|staying)\b/i.test(text);
}

function routeStatusForClassification(classification) {
  if (classification.intent === "STAYING" && classification.requires_human === false) return "STAYING";
  if (classification.intent === "NO_SIGNAL") return "";
  return "AT_RISK";
}

function updateLeaseForRoute(lease, classification) {
  const status = routeStatusForClassification(classification);
  if (!status) return null;
  return {
    ...lease,
    status,
    opted_out: classification.intent === "OPT_OUT" || classification.compliance_flag === "OPT_OUT" ? true : lease.opted_out,
  };
}

function buildLogRow(workItem, classification, now, eventType) {
  return {
    event_id: workItem.event_id,
    lease_id: normalizeText(workItem.lease?.lease_id),
    event_type: eventType || "REPLY_CLASSIFIED",
    reply_text: normalizeText(workItem.reply?.reply_text),
    intent: classification.intent,
    grievance_category: classification.grievance_category,
    grievance_summary: classification.grievance_summary,
    urgency: classification.urgency,
    compliance_flag: classification.compliance_flag === "NONE" ? "" : classification.compliance_flag,
    confidence: classification.confidence,
    requires_human: classification.requires_human,
    created_at: now,
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalizeText(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildTelegramText(workItem, classification) {
  const lease = workItem.lease || {};
  const tenant = normalizeText(lease.tenant_name) || "Unmatched reply";
  const unit = normalizeText(lease.unit) || "No unit";
  const leaseEnd = formatDate(lease.lease_end_date);
  const days = normalizeText(lease.days_to_expiry);
  const badges = [
    classification.intent,
    classification.grievance_category !== "NONE" ? classification.grievance_category : "",
    classification.compliance_flag !== "NONE" ? classification.compliance_flag : "",
    classification.urgency,
  ].filter(Boolean).join(" / ");
  const complianceLine = classification.compliance_flag !== "NONE" ? "\nNo response was drafted." : "";
  return [
    `AT RISK - ${tenant}, ${unit}`,
    `Lease ends ${leaseEnd}${days ? ` / ${days} days out` : ""}`,
    "",
    badges,
    "",
    `"${normalizeText(workItem.reply?.reply_text)}"`,
    "",
    `Action: ${classification.suggested_human_action || "Read the reply and follow up personally."}`,
    `Confidence: ${classification.confidence}${complianceLine}`,
  ].join("\n");
}

function finalizeRoute(workItem, classification, now, eventType) {
  const leaseUpdate = workItem.lease?.lease_id ? updateLeaseForRoute(workItem.lease, classification) : null;
  const shouldAlert = classification.requires_human === true && classification.intent !== "NO_SIGNAL";
  const suppressed = normalizeBool(workItem._suppress_alerts);
  return {
    ok: true,
    action: "check_replies",
    source: workItem.source,
    processed_count: eventType === "NO_SIGNAL" ? 0 : 1,
    alerted_count: shouldAlert && !suppressed ? 1 : 0,
    duplicate_count: 0,
    no_signal_count: eventType === "NO_SIGNAL" ? 1 : 0,
    unmatched_count: eventType === "UNMATCHED_REPLY" ? 1 : 0,
    lease_id: normalizeText(workItem.lease?.lease_id),
    match_method: workItem.match_method || "",
    event_id: workItem.event_id,
    classification,
    _terminal: true,
    _needs_ai: false,
    _skip_lease_update: !leaseUpdate,
    _lease_update: leaseUpdate,
    _log_row: buildLogRow(workItem, classification, now, eventType),
    _should_alert: shouldAlert && !suppressed,
    _telegram_text: shouldAlert ? buildTelegramText(workItem, classification) : "",
    _telegram_chat_id: normalizeText(workItem.config?.telegram_chat_id),
    _gmail_message_id: workItem._gmail_message_id || "",
    _processed_label_id: workItem._processed_label_id || "",
    board_url: "http://localhost:5678/webhook/board",
  };
}

function finalizeAiRoute(workItem, openAiOutput, now) {
  if (openAiOutput && (openAiOutput.error || openAiOutput.errorMessage)) {
    return finalizeClassificationFailure(workItem, normalizeText(openAiOutput.error?.message || openAiOutput.errorMessage || openAiOutput.error), now);
  }
  let raw;
  try {
    raw = extractClassification(openAiOutput);
  } catch (_) {
    raw = {
      intent: "UNCLEAR",
      grievance_present: false,
      grievance_summary: "Classifier response wrapper was not recognized.",
      grievance_category: "NONE",
      urgency: "LOW",
      compliance_flag: "NONE",
      suggested_human_action: "Read the reply and follow up personally.",
      confidence: "LOW",
    };
  }
  const classification = deterministicClassification(workItem.reply.reply_text, raw);
  return finalizeRoute(workItem, classification, now, "REPLY_CLASSIFIED");
}

function finalizeClassificationFailure(workItem, errorMessage, now) {
  const classification = {
    intent: "CLASSIFY_FAILED",
    grievance_present: true,
    grievance_summary: `Classification unavailable: ${normalizeText(errorMessage).slice(0, 140)}`,
    grievance_category: "OTHER",
    urgency: "HIGH",
    compliance_flag: "NONE",
    suggested_human_action: "Read this reply directly because classification failed.",
    confidence: "LOW",
    contains_question: containsQuestion(workItem.reply?.reply_text),
    requires_human: true,
  };
  return finalizeRoute(workItem, classification, now, "CLASSIFY_FAILED");
}

if (typeof module !== "undefined") {
  module.exports = {
    buildConfig,
    buildClassificationPrompt,
    classificationInstructions,
    containsQuestion,
    deterministicClassification,
    eventIdForReply,
    extractClassification,
    extractRefToken,
    finalizeAiRoute,
    finalizeClassificationFailure,
    finalizeRoute,
    hasManualReplyPayload,
    isAutoReply,
    matchLease,
    noReplyResult,
    normalizeGmailMessage,
    normalizeManualReply,
    normalizeText,
    prepareReplyWorkItem,
    shouldUseFastDeterministicRoute,
    stripQuotedReply,
  };
}
