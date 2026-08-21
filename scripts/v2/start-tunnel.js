/**
 * Establishes the public HTTPS tunnel the Telegram Trigger needs, points n8n at
 * it, and recreates the container so the new webhook URL takes effect.
 *
 * Usage:
 *   node scripts/v2/start-tunnel.js
 *
 * Why this exists: cloudflared quick tunnels get a brand new hostname on every
 * run, and n8n only reads WEBHOOK_URL at container start. Any time the tunnel
 * drops - or Docker Desktop restarts and takes it down - Telegram buttons stop
 * working until this whole sequence is repeated. Run this before every rehearsal
 * and before recording.
 *
 * The generated URL is written to ignored .env only. It is never committed.
 */

const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..", "..");
const LOG_PATH = path.join(REPO_ROOT, "tmp", "cloudflared.log");
const CLOUDFLARED = process.env.CLOUDFLARED_PATH || "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";
const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function docker(args) {
  return execFileSync("docker", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" });
}

function startCloudflared() {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, "");

  const out = fs.openSync(LOG_PATH, "a");
  const child = spawn(CLOUDFLARED, ["tunnel", "--url", "http://localhost:5678", "--no-autoupdate"], {
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  return child.pid;
}

async function waitForTunnelUrl(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(LOG_PATH)) {
      const match = fs.readFileSync(LOG_PATH, "utf8").match(URL_PATTERN);
      if (match) return match[0];
    }
    await sleep(1000);
  }
  throw new Error(`cloudflared did not report a URL within ${timeoutMs / 1000}s. Check ${LOG_PATH}`);
}

function updateEnv(tunnelUrl) {
  const envPath = path.join(REPO_ROOT, ".env");
  let text = fs.readFileSync(envPath, "utf8");

  const set = (key, value) => {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\n*$/, "\n")}${line}\n`;
  };

  set("WEBHOOK_URL", `${tunnelUrl}/`);
  set("N8N_EDITOR_BASE_URL", `${tunnelUrl}/`);
  set("TUNNEL_URL", tunnelUrl);

  fs.writeFileSync(envPath, text, "utf8");
}

async function waitForHealth(url, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return true;
    } catch (error) {
      // not up yet
    }
    await sleep(4000);
  }
  return false;
}

async function main() {
  console.log("Starting cloudflared quick tunnel...");
  const pid = startCloudflared();
  const tunnelUrl = await waitForTunnelUrl();
  console.log(`  tunnel: ${tunnelUrl} (pid ${pid})`);

  console.log("\nPointing n8n at the tunnel (.env)...");
  updateEnv(tunnelUrl);

  console.log("Recreating the n8n container so WEBHOOK_URL takes effect...");
  docker(["compose", "up", "-d", "--force-recreate", "n8n"]);

  console.log("Waiting for n8n...");
  const localOk = await waitForHealth("http://localhost:5678/healthz");
  console.log(`  local  : ${localOk ? "ok" : "FAILED"}`);

  const tunnelOk = await waitForHealth(`${tunnelUrl}/healthz`, 60000);
  console.log(`  tunnel : ${tunnelOk ? "ok" : "FAILED"}`);

  if (!localOk || !tunnelOk) {
    throw new Error("n8n did not come up cleanly through both routes.");
  }

  console.log("\nTunnel ready. Telegram buttons should work now.");
  console.log("If buttons stay dead, re-import WF6 so it re-registers the bot webhook:");
  console.log("  node scripts/v2/import-v2-workflows.js wf6-telegram-router");
}

main().catch((error) => {
  console.error(`\nTunnel setup failed: ${error.message}`);
  process.exit(1);
});
