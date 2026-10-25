/**
 * Render and check the editable HTML solution brief for Pre-Renewal Retention.
 * Exports high-resolution screenshots and an accessible, tagged PDF.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const templatePdf = path.join(root, "output/pdf/renewal-retention-solution-brief.pdf");

function parseOptions(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag !== "--data" && flag !== "--output") throw new Error(`Unknown option: ${flag}`);
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`${flag} needs a path`);
    options[flag.slice(2)] = argv[++i];
  }
  if (options.output && !options.data) throw new Error("--output requires --data");
  return options;
}

function loadProspect(file) {
  if (!file) return null;
  const data = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  const filled = (value, field) => {
    if (typeof value !== "string" || !value.trim() || /\[[^\]]+\]/.test(value)) {
      throw new Error(`Fill ${field} with verified prospect information`);
    }
    return value.trim();
  };

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug || "") || data.slug === "replace-with-prospect-slug") {
    throw new Error("Set slug to a short lowercase hyphenated prospect name");
  }

  data.company = filled(data.company, "company");
  data.decisionMaker = filled(data.decisionMaker, "decisionMaker");

  if (!data.research || !Array.isArray(data.research.reviewed) || data.research.reviewed.length < 1 || data.research.reviewed.length > 3) {
    throw new Error("research.reviewed needs one to three short source labels");
  }
  data.research.reviewed = data.research.reviewed.map((item, i) => filled(item, `research.reviewed[${i}]`));
  data.research.note = filled(data.research.note, "research.note");
  if (data.research.note.length > 200) {
    throw new Error("Keep research.note under 200 characters so the research panel remains readable");
  }

  for (const group of ["systems", "routes"]) {
    data[group] ||= {};
    if (typeof data[group] !== "object" || Array.isArray(data[group])) throw new Error(`${group} must be an object`);
    for (const [name, value] of Object.entries(data[group])) {
      if (typeof value !== "string") throw new Error(`${group}.${name} must be text or an empty string`);
      data[group][name] = value.trim();
    }
  }

  return data;
}

const options = parseOptions(process.argv.slice(2));
const prospect = loadProspect(options.data);
const output = prospect
  ? path.resolve(options.output || path.join(root, "output/pdf", `${prospect.slug}-renewal-retention-brief.pdf`))
  : templatePdf;

if (prospect) {
  const protectedPdfs = [
    templatePdf,
    path.join(root, "output/pdf/renewal-retention-solution-brief.pdf")
  ];
  if (protectedPdfs.some((file) => path.normalize(file).toLowerCase() === path.normalize(output).toLowerCase())) {
    throw new Error("Prospect output cannot overwrite a reusable or baseline brief");
  }
}

let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(path.join(os.homedir(), ".cache/playwright-runtimes/dependencies/node/node_modules/playwright"));
}

(async () => {
  const browser = await playwright.chromium.launch({
    channel: process.env.BRIEF_BROWSER || "msedge",
    headless: true
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(pathToFileURL(path.join(root, "concept-brief/square-brief.html")).href);

    if (prospect) {
      await page.evaluate((data) => {
        const values = {
          company: data.company,
          decisionMaker: data.decisionMaker,
          "research.reviewed": data.research.reviewed.join("\n"),
          "research.note": data.research.note,
          "systems.hosting": data.systems.hosting,
          "systems.pms": data.systems.pms,
          "systems.mailbox": data.systems.mailbox,
          "systems.managerChannel": data.systems.managerChannel,
          "systems.maintenance": data.systems.maintenance,
          "systems.reportingTool": data.systems.reportingTool,
          "routes.pmsSync": data.routes.pmsSync,
          "routes.residentEmail": data.routes.residentEmail,
          "routes.managerChannel": data.routes.managerChannel,
          "routes.maintenance": data.routes.maintenance,
          "routes.hosting": data.routes.hosting,
          "routes.reporting": data.routes.reporting,
        };

        for (const [field, value] of Object.entries(values)) {
          if (!value) continue;
          const targets = document.querySelectorAll(`[data-prospect="${field}"]`);
          if (!targets.length) throw new Error(`No document field for ${field}`);
          for (const target of targets) target.textContent = value;
        }
        document.title = `${data.company} | Pre-Renewal Retention Brief`;
      }, prospect);
    }

    await page.evaluate(() => document.fonts.ready);

    const link = await page.locator(".cta a").getAttribute("href");

    const checks = await page.evaluate(() => [...document.querySelectorAll(".page")].map((paper) => {
      const pageRect = paper.getBoundingClientRect();
      const footer = paper.querySelector(".page-footer").getBoundingClientRect();

      const escaped = [...paper.querySelectorAll("h1,h2,h3,p,.comparison-card,.stage,.external-card,.stack-card,.routes,.cta")]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.left < pageRect.left - 0.5 || box.right > pageRect.right + 0.5 || box.bottom > footer.top - 1;
        })
        .map((element) => element.className || element.tagName);

      const clipped = [...paper.querySelectorAll(".comparison-card,.stage,.external-card,.stack-card,.research-copy,.daily .shell-inner,.authority .shell-inner,.controls,.cta .shell-inner")]
        .filter((parent) => {
          const box = parent.getBoundingClientRect();
          return [...parent.querySelectorAll("h2,h3,p,strong,.actor,a")].some((child) => {
            const b = child.getBoundingClientRect();
            return b.right > box.right + 1 || b.bottom > box.bottom + 1;
          });
        })
        .map((element) => element.className);

      const tight = [...paper.querySelectorAll(".research-sources,.research-copy,.comparison-card,.responsibility,.external-card,.stack-card,.daily .shell-inner,.authority .shell-inner,.controls,.cta .shell-inner")]
        .map((parent) => {
          const box = parent.getBoundingClientRect();
          const text = [...parent.querySelectorAll("h2,h3,p,.small-label,strong")];
          if (!text.length) return null;
          const bottom = Math.min(...text.map((child) => box.bottom - child.getBoundingClientRect().bottom));
          const right = Math.min(...text.map((child) => box.right - child.getBoundingClientRect().right));
          return { component: parent.className, bottom: +bottom.toFixed(1), right: +right.toFixed(1) };
        })
        .filter((entry) => entry && (entry.bottom < 12 || entry.right < 12));

      const comparison = paper.querySelector(".comparison");
      const key = paper.querySelector(".comparison-key");
      if (comparison && key) {
        const bottom = +(comparison.getBoundingClientRect().bottom - key.getBoundingClientRect().bottom).toFixed(1);
        if (bottom < 12) tight.push({ component: "comparison key to panel", bottom });
      }

      const hostingInner = paper.querySelector(".hosting-inner");
      const hostingNote = paper.querySelector(".hosting-note");
      if (hostingInner && hostingNote) {
        const innerBox = hostingInner.getBoundingClientRect();
        const noteBox = hostingNote.getBoundingClientRect();
        const rightClearance = +(innerBox.right - noteBox.right).toFixed(1);
        if (rightClearance < 12) {
          tight.push({ component: "hosting-note right clearance", right: rightClearance });
        }
        if (noteBox.right > innerBox.right + 0.5) {
          clipped.push("hosting-note leaking out of hosting-inner");
        }
      }

      const misaligned = [];
      const matchEdge = (name, selectorA, selectorB, edge) => {
        const a = paper.querySelector(selectorA);
        const b = paper.querySelector(selectorB);
        if (a && b && Math.abs(a.getBoundingClientRect()[edge] - b.getBoundingClientRect()[edge]) > 1) {
          misaligned.push(name);
        }
      };

      matchEdge("comparison lane tops", ".lane", ".added-lane", "top");
      matchEdge("existing card tops", ".intake", ".pms", "top");
      matchEdge("existing title alignment", ".zone-title.right", ".pms", "left");
      matchEdge("operations card tops", ".daily", ".authority", "top");

      const spine = paper.querySelector(".flow-spine");
      if (spine) {
        const line = spine.getBoundingClientRect();
        const center = line.left + line.width / 2;
        for (const number of paper.querySelectorAll(".stage .number")) {
          const circle = number.getBoundingClientRect();
          if (Math.abs(circle.left + circle.width / 2 - center) > 0.5) {
            misaligned.push(`number ${number.textContent} to process spine`);
          }
        }
        const decision = paper.querySelector(".stage.decision");
        if (decision) {
          const stage = decision.getBoundingClientRect();
          const circle = decision.querySelector(".number").getBoundingClientRect();
          const title = decision.querySelector("h2").getBoundingClientRect();
          const actor = decision.querySelector(".actor").getBoundingClientRect();
          if (title.left - circle.right < 10) misaligned.push("decision title spacing");
        }
      }

      return { width: pageRect.width, height: pageRect.height, escaped, clipped, tight, misaligned };
    }));

    const dest = path.join(root, "tmp/brief-qa", prospect?.slug || "template");
    fs.mkdirSync(dest, { recursive: true });
    for (let i = 0; i < 4; i++) {
      await page.locator(".page").nth(i).screenshot({ path: path.join(dest, `page-${i + 1}.png`) });
    }

    if (
      errors.length ||
      link !== "https://cal.com/sambhav-builds/pm-automation-audit" ||
      checks.length !== 4 ||
      checks.some((check) => check.width !== 864 || check.height !== 864 || check.escaped.length || check.clipped.length || check.tight.length || check.misaligned.length)
    ) {
      throw new Error(JSON.stringify({ errors, link, checks }, null, 2));
    }

    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: output,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      tagged: true
    });

    console.log(JSON.stringify({ checks, link, screenshots: dest, output }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
