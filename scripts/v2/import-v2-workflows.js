/**
 * Imports and activates the v2 workflows in local n8n.
 *
 * Usage:
 *   node scripts/v2/import-v2-workflows.js [wf7-outreach ...]
 *
 * Committed workflow JSON carries placeholders only. This script resolves the
 * Airtable base id from .env and the credential ids from the running n8n
 * instance, writes a substituted copy into ignored tmp/, then imports it through
 * the n8n CLI inside the container.
 *
 * Nothing resolved here is ever written back to a committed file.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..", "..");
const WORKFLOW_DIR = path.join(REPO_ROOT, "n8n-workflows");
const TMP_DIR = path.join(REPO_ROOT, "tmp");
const CONTAINER = "renewal-retention-n8n";

const CREDENTIAL_PLACEHOLDERS = {
  airtableTokenApi: "__AIRTABLE_CREDENTIAL_ID__",
  openAiApi: "__OPENAI_CREDENTIAL_ID__",
  gmailOAuth2: "__GMAIL_CREDENTIAL_ID__",
  telegramApi: "__TELEGRAM_CREDENTIAL_ID__",
};

function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", ...options });
}

/** Reads credential ids from n8n without ever decrypting credential data. */
function resolveCredentialIds() {
  const script = [
    "n8n export:credentials --all --output=/tmp/v2creds.json >/dev/null 2>&1",
    "node -e \"require('/tmp/v2creds.json').forEach(c=>console.log(c.type+'='+c.id))\"",
    "rm -f /tmp/v2creds.json",
  ].join("; ");

  const output = docker(["compose", "exec", "-T", "n8n", "sh", "-lc", script], { cwd: REPO_ROOT });
  const ids = {};
  for (const line of output.split(/\r?\n/)) {
    const [type, id] = line.trim().split("=");
    if (type && id) ids[type] = id;
  }
  return ids;
}

function substitute(raw, baseId, credentialIds) {
  let out = raw.split("__AIRTABLE_BASE_ID__").join(baseId);

  for (const [type, placeholder] of Object.entries(CREDENTIAL_PLACEHOLDERS)) {
    const id = credentialIds[type];
    if (!id) {
      if (out.includes(placeholder)) {
        throw new Error(`Workflow needs the "${type}" credential but n8n has none. Create it first.`);
      }
      continue;
    }
    out = out.split(placeholder).join(id);
  }

  const leftover = out.match(/__[A-Z_]+__/g);
  if (leftover) {
    throw new Error(`Unresolved placeholders: ${[...new Set(leftover)].join(", ")}`);
  }
  return out;
}

function importWorkflow(name, baseId, credentialIds) {
  const sourcePath = path.join(WORKFLOW_DIR, `${name}.json`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing ${sourcePath}`);

  const raw = fs.readFileSync(sourcePath, "utf8");
  const resolved = substitute(raw, baseId, credentialIds);
  const parsed = JSON.parse(resolved);

  fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${name}.resolved.json`);
  // No BOM: the n8n CLI rejects a UTF-8 BOM at the first character.
  fs.writeFileSync(tmpPath, JSON.stringify(parsed, null, 2), { encoding: "utf8" });

  docker(["cp", tmpPath, `${CONTAINER}:/tmp/${name}.json`], { cwd: REPO_ROOT });
  docker(["compose", "exec", "-T", "n8n", "n8n", "import:workflow", `--input=/tmp/${name}.json`], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });

  // Respect the exported active flag. Optional workflows (WF10) ship inactive so
  // importing them never silently starts polling.
  const shouldActivate = parsed.active !== false;
  docker([
    "compose", "exec", "-T", "n8n", "n8n", "update:workflow",
    `--id=${parsed.id}`, `--active=${shouldActivate ? "true" : "false"}`,
  ], { cwd: REPO_ROOT, stdio: "pipe" });

  try {
    docker(["compose", "exec", "-T", "n8n", "n8n", "publish:workflow", `--id=${parsed.id}`], {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
  } catch (error) {
    // publish:workflow is not present on every n8n build; activation is what matters.
  }

  return { id: parsed.id, name: parsed.name, nodes: parsed.nodes.length, active: shouldActivate };
}

function main() {
  loadDotEnv();

  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!baseId) throw new Error("AIRTABLE_BASE_ID is not set in .env");

  const requested = process.argv.slice(2);
  const names = requested.length
    ? requested
    : fs
        .readdirSync(WORKFLOW_DIR)
        .filter((file) => /^wf(?:[6-9]|1\d)-.*\.json$/.test(file))
        .map((file) => file.replace(/\.json$/, ""));

  if (!names.length) {
    console.log("No v2 workflows found to import.");
    return;
  }

  const credentialIds = resolveCredentialIds();
  console.log(`Resolved credentials: ${Object.keys(credentialIds).join(", ")}\n`);

  for (const name of names) {
    const result = importWorkflow(name, baseId, credentialIds);
    const state = result.active ? "activated" : "imported INACTIVE";
    console.log(`${state}: ${result.id} - ${result.name} (${result.nodes} nodes)`);
  }

  console.log("\nRestarting n8n so active webhooks register...");
  docker(["compose", "restart", "n8n"], { cwd: REPO_ROOT, stdio: "pipe" });
  console.log("Done. Give n8n a few seconds, then probe a webhook to confirm registration.");
}

try {
  main();
} catch (error) {
  console.error(`\nImport failed: ${error.message}`);
  if (error.stdout) console.error(String(error.stdout));
  if (error.stderr) console.error(String(error.stderr));
  process.exit(1);
}
