# Pre-Renewal Retention: Solution Brief Template

A reusable, prospect-personalized 4-page square solution brief (9 in × 9 in / 864 px × 864 px) designed for multifamily property management executives and operations leaders.

The brief answers four core business questions:
1. **What problem does this solve, and what changes?** (Page 1: Comparison between manual lease administration and the early-warning retention loop)
2. **What does the system actually do from start to finish?** (Page 2: 7-stage workflow from 120-day watchlist to 30-day formal renewal handoff, with strict human approval gates)
3. **What tools connect, and what information moves?** (Page 3: System architecture separating existing PMS/maintenance/email tools, client-dedicated n8n orchestration, and external AI)
4. **What do people decide, and what are the practical results?** (Page 4: Daily operating view, human authority boundaries, fail-visible controls, and measured pilot metrics)

---

## Directory Structure

```
concept-brief/
├── assets/
│   ├── fonts/                   # Bundled OFL Geist & Manrope fonts
│   └── icons/                   # Licensed icon definitions & license
├── fixtures/
│   └── prospect-data.qa.json    # Verified sample prospect fixture
├── scripts/
│   └── render-brief.cjs         # Node.js + Playwright render & automated QA script
├── prospect-data.template.json  # Reusable editable JSON template
├── square-brief.html            # Solution brief HTML source
├── square-brief.css             # Square print & screen CSS stylesheet
├── square-brief-icons.js        # SVG icon geometry renderer
└── README.md                    # This guide
```

Generated PDFs and QA screenshots:
- `output/pdf/` — Exported PDFs (reusable template baseline and distinct prospect briefs)
- `tmp/brief-qa/<slug>/` — High-resolution per-page QA screenshots

---

## How to Generate a New Prospect Brief

### Step 1: Create the Prospect Data File
Copy the template to your prospect data location:
```powershell
Copy-Item concept-brief/prospect-data.template.json concept-brief/fixtures/my-prospect.json
```

### Step 2: Fill in Verified Prospect Details
Edit `my-prospect.json`:
- **`slug`**: A short, lowercase, hyphenated identifier (e.g. `summit-residential`). This determines the output filename.
- **`company`**: The property management company name (e.g. `Summit Residential Group`).
- **`decisionMaker`**: The executive or operations leader (e.g. `Elena Rostova`).
- **`research.reviewed`**: 1 to 3 short source strings (e.g. `["Portfolio website", "Multifamily directory", "Operating profile"]`).
- **`research.note`**: A concise, non-hype observation (under 200 characters) connecting their portfolio scale to the value of early grievance discovery.
- **`research.evidence`**: An array of internal research facts and links. **This stays strictly internal and is never rendered in the prospect PDF.**
- **`systems`**: Known software for `hosting`, `pms`, `mailbox`, `managerChannel`, `maintenance`, and `reportingTool`.
- **`routes`**: Confirmed or proposed integration paths for `pmsSync`, `residentEmail`, `managerChannel`, `maintenance`, `hosting`, and `reporting`. Any unconfirmed routes remain visibly marked as `[to confirm]`.

### Step 3: Run the Render Command
```powershell
node concept-brief/scripts/render-brief.cjs --data concept-brief/fixtures/my-prospect.json
```

To specify an explicit custom output location:
```powershell
node concept-brief/scripts/render-brief.cjs --data concept-brief/fixtures/my-prospect.json --output output/pdf/custom-name.pdf
```

The script will:
1. Validate required fields and character limits.
2. Render prospect text safely as text (`textContent`, no HTML injection).
3. Execute automated boundary, text-clipping, tightness (≥12px), and layout alignment checks.
4. Save 4 high-resolution page screenshots in `tmp/brief-qa/<slug>/`.
5. Export a print-ready, tagged, accessible PDF to `output/pdf/<slug>-renewal-retention-brief.pdf`.

---

## Safety and Reusability Rules

1. **Protected baseline:** The baseline template PDF (`output/pdf/renewal-retention-solution-brief.pdf`) is protected and cannot be overwritten by a prospect export.
2. **Distinct filenames:** Each prospect generates a dedicated PDF matching their slug.
3. **Template integrity:** Running the script without `--data` generates the baseline template with visible bracketed placeholders (`[Client Company]`, `[Client PMS]`, etc.):
   ```powershell
   node concept-brief/scripts/render-brief.cjs
   ```
4. **Internal evidence separation:** `research.evidence` records fact sources for internal review only; it is never injected into the prospect-facing document.
