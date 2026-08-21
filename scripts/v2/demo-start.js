/**
 * The one command to run before recording.
 *
 *   node scripts/v2/demo-start.js
 *
 * It checks the stack is healthy, repairs the tunnel if it has dropped, resets
 * Airtable to the clean 40-resident state, kicks off the 90-day check-in
 * generation, and reports what landed.
 * From that point the demo is hands-free: every other step is a Telegram button,
 * and resident replies are picked up automatically by WF10.
 *
 * Use --no-reset to generate without wiping current state.
 * Use --no-repair to fail on a dead tunnel instead of fixing it.
 */

const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..", "..");
const N8N = "http://localhost:5678";
const REQUIRED_WORKFLOWS = ["wf6-telegram-router", "wf7-outreach", "wf8-replies", "wf9-ops", "wf10-auto-check"];

function loadDotEnv() {
  const fs = require("fs");
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function reachable(url, timeoutMs = 6000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch (error) {
    return false;
  }
}

function activeWorkflows() {
  try {
    const out = execFileSync(
      "docker",
      ["compose", "exec", "-T", "n8n", "n8n", "list:workflow", "--active=true"],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" }
    );
    return out.split(/\r?\n/).map((line) => line.split("|")[0].trim()).filter(Boolean);
  } catch (error) {
    return [];
  }
}

async function waitFor(check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
}

function run(command, args) {
  execFileSync(command, args, { cwd: REPO_ROOT, stdio: "inherit" });
}

async function main() {
  loadDotEnv();
  const problems = [];

  console.log("Checking the stack...\n");

  const localOk = await reachable(`${N8N}/healthz`);
  console.log(`  n8n local     : ${localOk ? "ok" : "UNREACHABLE"}`);
  if (!localOk) problems.push("n8n is not running. Run: docker compose up -d n8n");

  let tunnelUrl = process.env.TUNNEL_URL || "";
  let tunnelOk = tunnelUrl ? await reachable(`${tunnelUrl}/healthz`) : false;
  console.log(`  public tunnel : ${tunnelOk ? "ok" : "DEAD"}`);

  // The tunnel is the most common failure and the fix is always the same, so it
  // is repaired here rather than left as an instruction. A quick tunnel gets a
  // new hostname every run, n8n only reads WEBHOOK_URL at container start, and
  // the bot webhook has to be re-registered afterwards.
  if (!tunnelOk && localOk && !process.argv.includes("--no-repair")) {
    console.log("");
    console.log("  Repairing the tunnel. This takes about a minute...");
    console.log("");
    try {
      run("node", [path.join(__dirname, "start-tunnel.js")]);
      run("node", [path.join(__dirname, "import-v2-workflows.js"), "wf6-telegram-router"]);
      await waitFor(() => reachable(`${N8N}/healthz`), 120000);
      loadDotEnv.cache = null;
      delete process.env.TUNNEL_URL;
      loadDotEnv();
      tunnelUrl = process.env.TUNNEL_URL || "";
      tunnelOk = tunnelUrl ? await reachable(`${tunnelUrl}/healthz`) : false;
      console.log("");
      console.log(`  public tunnel : ${tunnelOk ? "repaired" : "STILL DEAD"}`);
    } catch (error) {
      console.log(`  tunnel repair failed: ${error.message}`);
    }
  }

  if (!tunnelOk) {
    problems.push("The tunnel is down, so Telegram buttons will not work. Run: node scripts/v2/start-tunnel.js");
  }

  const active = activeWorkflows();
  const missing = REQUIRED_WORKFLOWS.filter((id) => !active.includes(id));
  console.log(`  workflows     : ${missing.length ? `MISSING ${missing.join(", ")}` : "all active"}`);
  if (missing.length) {
    problems.push(`Inactive workflows: ${missing.join(", ")}. Run: node scripts/v2/import-v2-workflows.js`);
  }

  if (problems.length) {
    console.error("\nNot ready to record:\n");
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }

  if (!process.argv.includes("--no-reset")) {
    console.log("\nResetting the demo data...\n");
    run("node", [path.join(__dirname, "seed-airtable-demo.js")]);
  }

  console.log("\nGenerating the 90-day check-ins. This takes about 30 seconds...\n");
  const response = await fetch(`${N8N}/webhook/v2-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ touch: "CHECK_IN_90" }),
    signal: AbortSignal.timeout(180000),
  });

  const body = await response.json();
  const result = Array.isArray(body) ? body[0] : body;

  if (!response.ok || !result || result.ok !== true) {
    console.error("\nGeneration failed:");
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("Ready to record.\n");
  console.log(`  drafted           : ${result.generated_count}`);
  console.log(`  needs wording     : ${result.review_failed_count}`);
  console.log(`  awaiting approval : ${result.approvable_count}`);
  console.log(`  turnover exposure : $${Number(result.exposure || 0).toLocaleString("en-US")}`);
  console.log("\nCheck Telegram for the summary card and the first approval card.");
  console.log("Everything from here is a button. Replies are picked up automatically.");
}

main().catch((error) => {
  console.error(`\ndemo-start failed: ${error.message}`);
  process.exit(1);
});
