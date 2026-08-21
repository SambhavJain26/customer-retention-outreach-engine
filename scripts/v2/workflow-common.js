/**
 * Shared node factories for building the v2 workflow JSON exports.
 *
 * Committed workflow JSON keeps placeholder credential and base ids
 * (__AIRTABLE_BASE_ID__, __OPENAI_CREDENTIAL_ID__, ...) exactly as v1 does, so no
 * local runtime identifier is ever committed. The import helper substitutes real
 * values from .env and the running n8n instance.
 *
 * Airtable access uses HTTP Request nodes with the predefined `airtableTokenApi`
 * credential rather than the built-in Airtable node. Two reasons:
 *   1. writes go 10 records per request, which keeps the demo inside Airtable's
 *      5-requests-per-second limit instead of firing one call per resident;
 *   2. the request body is explicit, so batch update payloads are predictable.
 * OpenAI still uses the built-in node with JSON Schema structured output, as the
 * repository rules require.
 */

const fs = require("fs");
const path = require("path");

const PLACEHOLDER = {
  AIRTABLE_BASE: "__AIRTABLE_BASE_ID__",
  AIRTABLE_CRED: "__AIRTABLE_CREDENTIAL_ID__",
  OPENAI_CRED: "__OPENAI_CREDENTIAL_ID__",
  GMAIL_CRED: "__GMAIL_CREDENTIAL_ID__",
  TELEGRAM_CRED: "__TELEGRAM_CREDENTIAL_ID__",
};

const AIRTABLE_API = "https://api.airtable.com/v0";

/** Reads a v2 library and strips its module.exports tail so it can be inlined. */
function loadLib(name) {
  const source = fs.readFileSync(path.join(__dirname, name), "utf8");
  return source.replace(/if \(typeof module !== "undefined"\) \{[\s\S]*$/m, "").trimEnd();
}

/** Reads a v1 stage library the same way, so verified logic is reused verbatim. */
function loadStageLib(name) {
  const source = fs.readFileSync(path.join(__dirname, "..", name), "utf8");
  return source.replace(/if \(typeof module !== "undefined"\) \{[\s\S]*$/m, "").trimEnd();
}

function webhookNode(name, urlPath, position, options = {}) {
  return {
    parameters: {
      httpMethod: options.method || "POST",
      path: urlPath,
      responseMode: "lastNode",
      responseData: "allEntries",
      options: { responseContentType: "application/json" },
    },
    id: options.id || urlPath,
    name,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2.1,
    position,
    webhookId: options.id || urlPath,
  };
}

function codeNode(name, code, position, options = {}) {
  const node = {
    parameters: {
      mode: options.mode || "runOnceForAllItems",
      jsCode: code,
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  };
  if (options.executeOnce) node.executeOnce = true;
  return node;
}

/**
 * Airtable read. Returns one n8n item per Airtable record page; the following
 * Code node is responsible for flattening.
 */
function airtableListNode(name, tableName, position, options = {}) {
  const node = {
    parameters: {
      method: "GET",
      url: `=${AIRTABLE_API}/${PLACEHOLDER.AIRTABLE_BASE}/${encodeURIComponent(tableName)}?pageSize=100`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "airtableTokenApi",
      options: {},
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: {
      airtableTokenApi: { id: PLACEHOLDER.AIRTABLE_CRED, name: "Airtable account" },
    },
    alwaysOutputData: true,
  };
  if (options.executeOnce !== false) node.executeOnce = true;
  return node;
}

/**
 * Airtable write. The incoming item must carry `json.method`, `json.table`, and
 * `json.body`, so one node can serve create and update in batches of ten.
 */
function airtableWriteNode(name, position, options = {}) {
  return {
    parameters: {
      method: "={{ $json.method }}",
      url: `=${AIRTABLE_API}/${PLACEHOLDER.AIRTABLE_BASE}/{{ encodeURIComponent($json.table) }}`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "airtableTokenApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.body) }}",
      options: {},
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: {
      airtableTokenApi: { id: PLACEHOLDER.AIRTABLE_CRED, name: "Airtable account" },
    },
    alwaysOutputData: true,
  };
}

/**
 * OpenAI Responses call with JSON Schema structured output.
 * gpt-5.6-luna rejects `temperature`, so it is never sent.
 */
function openAiNode(name, position, schemaName, schema, options = {}) {
  return {
    parameters: {
      resource: "text",
      operation: "response",
      modelId: { __rl: true, mode: "id", value: options.model || "={{ $json.model }}" },
      responses: {
        values: [{ type: "text", role: "user", content: "={{ $json.prompt }}" }],
      },
      builtInTools: {},
      options: {
        instructions: "={{ $json.instructions }}",
        maxTokens: options.maxTokens || 5200,
        store: false,
        textFormat: {
          textOptions: [
            { type: "json_schema", name: schemaName, schema, strict: true },
          ],
        },
      },
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "@n8n/n8n-nodes-langchain.openAi",
    typeVersion: 2.3,
    position,
    credentials: {
      openAiApi: { id: PLACEHOLDER.OPENAI_CRED, name: "OpenAI account" },
    },
    onError: "continueErrorOutput",
  };
}

function gmailSendNode(name, position, options = {}) {
  return {
    parameters: {
      resource: "message",
      operation: "send",
      sendTo: "={{ $json.to_email }}",
      subject: "={{ $json.subject }}",
      emailType: "text",
      message: "={{ $json.body }}",
      options: {},
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.gmail",
    typeVersion: 2.2,
    position,
    credentials: {
      gmailOAuth2: { id: PLACEHOLDER.GMAIL_CRED, name: "Gmail account" },
    },
    onError: "continueErrorOutput",
  };
}

function gmailSearchNode(name, position, options = {}) {
  return {
    parameters: {
      resource: "message",
      operation: "getAll",
      returnAll: false,
      limit: options.limit || 25,
      simple: false,
      filters: { q: "={{ $json.gmail_query }}" },
      options: { downloadAttachments: false },
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.gmail",
    typeVersion: 2.2,
    position,
    credentials: {
      gmailOAuth2: { id: PLACEHOLDER.GMAIL_CRED, name: "Gmail account" },
    },
    alwaysOutputData: true,
    onError: "continueRegularOutput",
  };
}

/**
 * Telegram message with an optional inline keyboard.
 *
 * n8n's Telegram node takes `replyMarkup` as a top-level enum and reads the
 * button grid from a fixed collection - it will not accept a JSON string of
 * reply_markup. The grid structure therefore has to be static per node, which is
 * fine because button labels are fixed per card type; only the Airtable record
 * id in callback_data varies, and that comes from an expression.
 *
 * @param {Array<Array<{label: string, action: string}>>|null} keyboard
 *   null posts a plain message with no buttons.
 */
function telegramCardNode(name, position, keyboard, options = {}) {
  const parameters = {
    chatId: "={{ $json.chat_id }}",
    text: "={{ $json.text }}",
    replyMarkup: keyboard && keyboard.length ? "inlineKeyboard" : "none",
    additionalFields: {
      parse_mode: "HTML",
      appendAttribution: false,
    },
  };

  if (keyboard && keyboard.length) {
    parameters.inlineKeyboard = {
      rows: keyboard.map((row) => ({
        row: {
          buttons: row.map((button) => ({
            text: button.label,
            additionalFields: {
              // Most buttons act on the card's own record; navigation buttons
              // point at a different one via their own field.
              callback_data: `={{ '${button.action}:' + $json.${button.field || "record_id"} }}`,
            },
          })),
        },
      })),
    };
  }

  return {
    parameters,
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    position,
    credentials: {
      telegramApi: { id: PLACEHOLDER.TELEGRAM_CRED, name: "Telegram account" },
    },
    onError: "continueRegularOutput",
  };
}

/** Keyboard layouts, kept together so every card uses the same action codes. */
const KEYBOARDS = {
  summary: [[{ label: "▶️ Review first draft", action: "nxt" }]],
  draft: [
    [
      { label: "✅ Approve & Send", action: "apv" },
      { label: "⏭ Skip", action: "skp" },
    ],
    [
      { label: "✏️ Edit wording", action: "edt" },
      { label: "➡️ Next draft", action: "nxt", field: "next_record_id" },
    ],
  ],
  atRisk: [
    [{ label: "✍️ Draft my reply", action: "ast" }],
    [{ label: "✅ Mark resolved", action: "res" }],
  ],
  atRiskCompliance: [[{ label: "✅ Mark resolved", action: "res" }]],
  assist: [
    [
      { label: "✅ Send reply", action: "snd" },
      { label: "⏭ Discard", action: "dis" },
    ],
    [{ label: "✏️ Edit wording", action: "edt" }],
  ],
  resolution: [[
    { label: "✅ Send confirmation", action: "cnf" },
    { label: "⏭ Skip", action: "dis" },
  ]],
};

/** Routes items to one output per card type using $json.card_type. */
function switchNode(name, position, outputs, options = {}) {
  return {
    parameters: {
      rules: {
        values: outputs.map((value) => ({
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
            conditions: [{
              id: `sw-${value}`,
              leftValue: "={{ $json.card_type }}",
              rightValue: value,
              operator: { type: "string", operation: "equals" },
            }],
            combinator: "and",
          },
          outputKey: value,
        })),
      },
      options: { fallbackOutput: "extra" },
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.switch",
    typeVersion: 3.2,
    position,
  };
}

/** Legacy plain-text sender kept for messages that never carry buttons. */
function telegramSendNode(name, position, options = {}) {
  return {
    parameters: {
      chatId: "={{ $json.chat_id }}",
      text: "={{ $json.text }}",
      replyMarkup: "none",
      additionalFields: {
        parse_mode: "HTML",
        appendAttribution: false,
      },
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    position,
    credentials: {
      telegramApi: { id: PLACEHOLDER.TELEGRAM_CRED, name: "Telegram account" },
    },
    onError: "continueRegularOutput",
  };
}

function ifNode(name, condition, position, options = {}) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [condition],
        combinator: "and",
      },
      options: {},
    },
    id: options.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position,
  };
}

function booleanCondition(leftExpression) {
  return {
    id: `cond-${Math.random().toString(36).slice(2, 8)}`,
    leftValue: leftExpression,
    rightValue: "",
    operator: { type: "boolean", operation: "true", singleValue: true },
  };
}

function mainConnection(...nodeNames) {
  return { main: [nodeNames.map((node) => ({ node, type: "main", index: 0 }))] };
}

/** Two-output connection for IF nodes: [trueNodes], [falseNodes]. */
function branchConnection(trueNodes, falseNodes) {
  return {
    main: [
      (trueNodes || []).map((node) => ({ node, type: "main", index: 0 })),
      (falseNodes || []).map((node) => ({ node, type: "main", index: 0 })),
    ],
  };
}

function workflow(id, name, nodes, connections, options = {}) {
  return {
    id,
    name,
    active: options.active !== false,
    nodes,
    connections,
    settings: { executionOrder: "v1", ...(options.settings || {}) },
    tags: [],
  };
}

module.exports = {
  AIRTABLE_API,
  KEYBOARDS,
  PLACEHOLDER,
  airtableListNode,
  airtableWriteNode,
  booleanCondition,
  branchConnection,
  codeNode,
  gmailSearchNode,
  gmailSendNode,
  ifNode,
  loadLib,
  loadStageLib,
  mainConnection,
  openAiNode,
  switchNode,
  telegramCardNode,
  telegramSendNode,
  webhookNode,
  workflow,
};
