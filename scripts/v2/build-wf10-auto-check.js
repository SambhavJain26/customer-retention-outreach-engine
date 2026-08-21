/**
 * Builds n8n-workflows/wf10-auto-check.json.
 *
 * Polls Gmail every minute and runs the same reply check that /check runs, so a
 * resident reply reaches the manager's phone with nobody triggering anything.
 * This is what makes the demo hands-free after the initial kickoff.
 *
 * Polls are silent: an empty check posts nothing. Only a real reply produces a
 * message. It adds no new logic and no new sending path - it just calls WF8.
 *
 * Deactivate it only if you specifically want to press /check on camera.
 */

const fs = require("fs");
const path = require("path");
const { codeNode, mainConnection, workflow } = require("./workflow-common.js");

const buildRequestCode = `
// WF8 owns all reply logic. This workflow only pokes it on a timer.
return [{
  json: {
    method: 'POST',
    url: 'http://localhost:5678/webhook/v2-check-replies',
    body: { silent: true },
  },
}];
`;

const nodes = [
  {
    parameters: {
      rule: { interval: [{ field: "minutes", minutesInterval: 1 }] },
    },
    id: "wf10-poll-timer",
    name: "Every Minute",
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [-260, 300],
  },
  codeNode("Build Check Request", buildRequestCode, [-40, 300]),
  {
    parameters: {
      method: "={{ $json.method }}",
      url: "={{ $json.url }}",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.body) }}",
      options: { timeout: 180000 },
    },
    id: "wf10-run-check",
    name: "Run Reply Check",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [180, 300],
    onError: "continueRegularOutput",
  },
];

const connections = {
  "Every Minute": mainConnection("Build Check Request"),
  "Build Check Request": mainConnection("Run Reply Check"),
};

// Imported inactive on purpose. Turn it on in the n8n UI when you want
// hands-free reply detection.
const wf = workflow("wf10-auto-check", "WF10 Automatic Reply Polling", nodes, connections);

const outputPath = path.join(__dirname, "..", "..", "n8n-workflows", "wf10-auto-check.json");
fs.writeFileSync(outputPath, `${JSON.stringify(wf, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath} (${nodes.length} nodes)`);
